/**
 * LocalFilesystemMemoryTool: A file-based memory backend for Claude
 *
 * This implementation provides persistent memory storage using the local filesystem.
 * Claude can autonomously create, read, update, and delete memory files within the /memories directory.
 *
 * For production use with security considerations, see:
 * https://docs.claude.com/en/docs/agents-and-tools/tool-use/memory-tool
 */

import * as fs from 'fs';
import * as path from 'path';
import { betaTool } from '@anthropic-ai/sdk/helpers/beta/json-schema';
import { SessionTrace } from './session-trace';
import { MemoryOperationLogger, MemoryOperationType } from './memory-operation-logger';

export class LocalFilesystemMemoryTool {
  private basePath: string;
  private memoryRoot: string;
  private trace: SessionTrace | null = null;
  private logger: MemoryOperationLogger;

  constructor(basePath: string = './memories', logDir: string = './logs') {
    this.basePath = basePath;
    this.memoryRoot = basePath;  // Use the base path directly as the memory root

    // Create memory directory if it doesn't exist
    if (!fs.existsSync(this.memoryRoot)) {
      fs.mkdirSync(this.memoryRoot, { recursive: true });
    }

    // Initialize dedicated memory operation logger
    this.logger = new MemoryOperationLogger(logDir);

    console.log(`[MEMORY] Initialized with root: ${path.resolve(this.memoryRoot)}`);
  }

  setTrace(trace: SessionTrace): void {
    this.trace = trace;
    console.log('[MEMORY] Session trace connected');
  }

  /**
   * Normalize a memory path to consistent format (without /memories/ prefix)
   * e.g., "/memories/notes.txt" -> "notes.txt"
   * e.g., "notes.txt" -> "notes.txt"
   */
  private _normalizePath(memoryPath: string): string {
    if (memoryPath.startsWith('/memories/')) {
      return memoryPath.substring('/memories/'.length);
    }
    if (memoryPath.startsWith('/memories')) {
      return memoryPath.substring('/memories'.length).replace(/^\//, '') || '/';
    }
    return memoryPath;
  }

  private _validatePath(memoryPath: string): string {
    /**
     * Validate that a path is within the memory directory.
     *
     * NOTE: For simplicity, this implementation does basic path validation.
     * For production use with untrusted input, implement robust path traversal
     * protection. See: https://docs.claude.com/en/docs/agents-and-tools/tool-use/memory-tool#security
     */
    if (!memoryPath.startsWith('/memories')) {
      throw new Error(`Path must start with /memories, got: ${memoryPath}`);
    }

    // Remove /memories prefix
    const relativePath = memoryPath.substring('/memories'.length).replace(/^\//, '');
    const fullPath = relativePath ? path.join(this.memoryRoot, relativePath) : this.memoryRoot;

    // Validate path stays within memory directory
    const resolvedPath = path.resolve(fullPath);
    const resolvedRoot = path.resolve(this.memoryRoot);

    if (!resolvedPath.startsWith(resolvedRoot)) {
      throw new Error(`Path ${memoryPath} would escape /memories directory`);
    }

    return fullPath;
  }

  view(command: { path: string; view_range?: [number, number] }): string {
    console.log(`[MEMORY] view() called: path=${command.path}, view_range=${command.view_range}`);

    // Log tool call to trace
    if (this.trace) {
      this.trace.logToolCall('memory', 'view', {
        path: command.path,
        view_range: command.view_range
      });
    }

    try {
      const fullPath = this._validatePath(command.path);

      // Check if it's a directory
      if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
        const items: string[] = [];
        const entries = fs.readdirSync(fullPath);

        for (const entry of entries.sort()) {
          if (entry.startsWith('.')) continue;

          const entryPath = path.join(fullPath, entry);
          const isDir = fs.statSync(entryPath).isDirectory();
          items.push(isDir ? `${entry}/` : entry);
        }

        const result = `Directory: ${command.path}\n${items.map(item => `- ${item}`).join('\n')}`;
        console.log(`[MEMORY] Listed directory: ${command.path} - Found ${items.length} items`);
        return result;
      }

      // File reading
      if (!fs.existsSync(fullPath)) {
        throw new Error(`Path ${command.path} does not exist`);
      }

      let content = fs.readFileSync(fullPath, 'utf-8');
      let lines = content.split('\n');

      // Apply line range if specified
      const viewRange = command.view_range;
      if (viewRange) {
        const startLine = Math.max(0, viewRange[0] - 1);
        const endLine = viewRange[1] === -1 ? lines.length : viewRange[1];
        lines = lines.slice(startLine, endLine);
      }

      const result = lines.join('\n');

      const normalizedPath = this._normalizePath(command.path);

      // Log to dedicated memory operations log
      this.logger.log({
        timestamp: new Date().toISOString(),
        operation: 'READ',
        path: normalizedPath,
        details: `${lines.length} lines, ${result.length} bytes`
      });

      // Log tool result to trace
      if (this.trace) {
        this.trace.logToolResult('memory', 'view', result, true);
      }

      return result;
    } catch (error: any) {
      console.warn(`[MEMORY] Error in view: ${error.message}`);

      // Log error to trace
      if (this.trace) {
        this.trace.logToolResult('memory', 'view', '', false, error.message);
      }

      throw error;
    }
  }

  create(command: { path: string; file_text: string }): string {
    console.log(`[MEMORY] create() called: path=${command.path}`);

    // Log tool call to trace
    if (this.trace) {
      this.trace.logToolCall('memory', 'create', {
        path: command.path,
        content_length: command.file_text.length
      });
    }

    try {
      const fullPath = this._validatePath(command.path);

      if (fs.existsSync(fullPath)) {
        throw new Error(
          `File already exists: ${command.path}. Use str_replace or insert to modify.`
        );
      }

      // Create parent directories if needed
      const dirPath = path.dirname(fullPath);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }

      fs.writeFileSync(fullPath, command.file_text, 'utf-8');

      const normalizedPath = this._normalizePath(command.path);
      const lines = command.file_text.split('\n');

      // Log to dedicated memory operations log
      this.logger.log({
        timestamp: new Date().toISOString(),
        operation: 'CREATE',
        path: normalizedPath,
        details: `${lines.length} lines, ${command.file_text.length} bytes`
      });

      const resultMsg = `Successfully created ${command.path}`;

      // Log tool result to trace
      if (this.trace) {
        this.trace.logToolResult('memory', 'create', resultMsg, true);
      }

      return resultMsg;
    } catch (error: any) {
      console.warn(`[MEMORY] Error in create: ${error.message}`);

      // Log error to trace
      if (this.trace) {
        this.trace.logToolResult('memory', 'create', '', false, error.message);
      }

      throw error;
    }
  }

  str_replace(command: { path: string; old_str: string; new_str: string }): string {
    console.log(`[MEMORY] str_replace() called: path=${command.path}`);

    // Log tool call to trace
    if (this.trace) {
      this.trace.logToolCall('memory', 'str_replace', {
        path: command.path,
        old_str_length: command.old_str.length,
        new_str_length: command.new_str.length
      });
    }

    try {
      const fullPath = this._validatePath(command.path);

      if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isFile()) {
        throw new Error(`File not found: ${command.path}`);
      }

      const content = fs.readFileSync(fullPath, 'utf-8');

      // Verify old_str appears exactly once
      const count = (content.match(new RegExp(command.old_str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
      if (count === 0) {
        throw new Error(`String not found in ${command.path}`);
      } else if (count > 1) {
        throw new Error(`String appears ${count} times in ${command.path}. Must be unique.`);
      }

      const newContent = content.replace(command.old_str, command.new_str);
      fs.writeFileSync(fullPath, newContent, 'utf-8');

      const normalizedPath = this._normalizePath(command.path);

      // Log to dedicated memory operations log
      this.logger.log({
        timestamp: new Date().toISOString(),
        operation: 'UPDATE',
        path: normalizedPath,
        details: `str_replace: ${command.old_str.length} -> ${command.new_str.length} bytes`
      });

      const resultMsg = `Successfully replaced string in ${command.path}`;

      // Log tool result to trace
      if (this.trace) {
        this.trace.logToolResult('memory', 'str_replace', resultMsg, true);
      }

      return resultMsg;
    } catch (error: any) {
      console.warn(`[MEMORY] Error in str_replace: ${error.message}`);

      // Log error to trace
      if (this.trace) {
        this.trace.logToolResult('memory', 'str_replace', '', false, error.message);
      }

      throw error;
    }
  }

  insert(command: { path: string; line: number; insert_line: string }): string {
    console.log(`[MEMORY] insert() called: path=${command.path}, line=${command.line}`);

    // Log tool call to trace
    if (this.trace) {
      this.trace.logToolCall('memory', 'insert', {
        path: command.path,
        line: command.line,
        insert_length: command.insert_line.length
      });
    }

    try {
      const fullPath = this._validatePath(command.path);

      if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isFile()) {
        throw new Error(`File not found: ${command.path}`);
      }

      const content = fs.readFileSync(fullPath, 'utf-8');
      const lines = content.split('\n');

      // Convert 1-indexed to 0-indexed
      const insertIdx = command.line - 1;

      if (insertIdx < 0 || insertIdx > lines.length) {
        throw new Error(`Line ${command.line} is out of range (file has ${lines.length} lines)`);
      }

      // Ensure insert_line ends with newline (if not last line)
      let insertText = command.insert_line;
      if (insertIdx < lines.length && !insertText.endsWith('\n')) {
        // Insert will create a new line, so we need to preserve the original line structure
      }

      lines.splice(insertIdx, 0, insertText);
      fs.writeFileSync(fullPath, lines.join('\n'), 'utf-8');

      const normalizedPath = this._normalizePath(command.path);

      // Log to dedicated memory operations log
      this.logger.log({
        timestamp: new Date().toISOString(),
        operation: 'UPDATE',
        path: normalizedPath,
        details: `insert at line ${command.line}: ${command.insert_line.length} bytes`
      });

      const resultMsg = `Successfully inserted line in ${command.path}`;

      // Log tool result to trace
      if (this.trace) {
        this.trace.logToolResult('memory', 'insert', resultMsg, true);
      }

      return resultMsg;
    } catch (error: any) {
      console.warn(`[MEMORY] Error in insert: ${error.message}`);

      // Log error to trace
      if (this.trace) {
        this.trace.logToolResult('memory', 'insert', '', false, error.message);
      }

      throw error;
    }
  }

  delete(command: { path: string }): string {
    console.log(`[MEMORY] delete() called: path=${command.path}`);

    // Log tool call to trace
    if (this.trace) {
      this.trace.logToolCall('memory', 'delete', { path: command.path });
    }

    try {
      const fullPath = this._validatePath(command.path);

      if (!fs.existsSync(fullPath)) {
        throw new Error(`Path not found: ${command.path}`);
      }

      const normalizedPath = this._normalizePath(command.path);
      const isDirectory = fs.statSync(fullPath).isDirectory();

      let resultMsg: string;
      if (isDirectory) {
        fs.rmSync(fullPath, { recursive: true, force: true });
        resultMsg = `Successfully deleted directory ${command.path}`;
      } else {
        fs.unlinkSync(fullPath);
        resultMsg = `Successfully deleted ${command.path}`;
      }

      // Log to dedicated memory operations log
      this.logger.log({
        timestamp: new Date().toISOString(),
        operation: 'DELETE',
        path: normalizedPath,
        details: isDirectory ? 'directory' : 'file'
      });

      // Log tool result to trace
      if (this.trace) {
        this.trace.logToolResult('memory', 'delete', resultMsg, true);
      }

      return resultMsg;
    } catch (error: any) {
      console.warn(`[MEMORY] Error in delete: ${error.message}`);

      // Log error to trace
      if (this.trace) {
        this.trace.logToolResult('memory', 'delete', '', false, error.message);
      }

      throw error;
    }
  }

  rename(command: { old_path: string; new_path: string }): string {
    console.log(`[MEMORY] rename() called: old_path=${command.old_path}, new_path=${command.new_path}`);

    // Log tool call to trace
    if (this.trace) {
      this.trace.logToolCall('memory', 'rename', {
        old_path: command.old_path,
        new_path: command.new_path
      });
    }

    try {
      const fullOldPath = this._validatePath(command.old_path);
      const fullNewPath = this._validatePath(command.new_path);

      if (!fs.existsSync(fullOldPath)) {
        throw new Error(`File not found: ${command.old_path}`);
      }

      if (fs.existsSync(fullNewPath)) {
        throw new Error(`Destination already exists: ${command.new_path}`);
      }

      // Create parent directories if needed
      const newDir = path.dirname(fullNewPath);
      if (!fs.existsSync(newDir)) {
        fs.mkdirSync(newDir, { recursive: true });
      }

      fs.renameSync(fullOldPath, fullNewPath);

      const normalizedOldPath = this._normalizePath(command.old_path);
      const normalizedNewPath = this._normalizePath(command.new_path);

      // Log to dedicated memory operations log
      this.logger.log({
        timestamp: new Date().toISOString(),
        operation: 'RENAME',
        path: normalizedNewPath,
        details: `from ${normalizedOldPath}`
      });

      const resultMsg = `Successfully renamed ${command.old_path} to ${command.new_path}`;

      // Log tool result to trace
      if (this.trace) {
        this.trace.logToolResult('memory', 'rename', resultMsg, true);
      }

      return resultMsg;
    } catch (error: any) {
      console.warn(`[MEMORY] Error in rename: ${error.message}`);

      // Log error to trace
      if (this.trace) {
        this.trace.logToolResult('memory', 'rename', '', false, error.message);
      }

      throw error;
    }
  }

  clearAllMemory(): string {
    console.warn('[MEMORY] clearAllMemory() called - deleting all memories');

    try {
      if (fs.existsSync(this.memoryRoot)) {
        fs.rmSync(this.memoryRoot, { recursive: true, force: true });
        fs.mkdirSync(this.memoryRoot, { recursive: true });
      }

      console.log('[MEMORY] ✓ All memories cleared');
      return 'All memories have been cleared';
    } catch (error: any) {
      console.error(`[MEMORY] Error clearing memories: ${error.message}`);
      return `Error clearing memories: ${error.message}`;
    }
  }

  // Convert to Anthropic SDK tool format
  toAnthropicTool() {
    return {
      name: 'memory',
      description: 'Manage persistent memory storage for the conversation',
      input_schema: {
        type: 'object' as const,
        properties: {
          command: {
            type: 'string' as const,
            enum: ['view', 'create', 'str_replace', 'insert', 'delete', 'rename'],
            description: 'The memory operation to perform'
          },
          path: {
            type: 'string' as const,
            description: 'Path within /memories directory'
          },
          file_text: {
            type: 'string' as const,
            description: 'Content for create operation'
          },
          old_str: {
            type: 'string' as const,
            description: 'String to replace in str_replace operation'
          },
          new_str: {
            type: 'string' as const,
            description: 'Replacement string in str_replace operation'
          },
          line: {
            type: 'number' as const,
            description: 'Line number for insert operation'
          },
          insert_line: {
            type: 'string' as const,
            description: 'Text to insert'
          },
          view_range: {
            type: 'array' as const,
            items: { type: 'number' as const },
            description: 'Optional [start, end] line range for view'
          },
          old_path: {
            type: 'string' as const,
            description: 'Old path for rename operation'
          },
          new_path: {
            type: 'string' as const,
            description: 'New path for rename operation'
          }
        },
        required: ['command']
      }
    };
  }

  // Convert to a runnable tool for use with toolRunner
  toRunnableTool() {
    const self = this;
    return betaTool({
      name: 'memory',
      description: 'Manage persistent memory storage for the conversation',
      inputSchema: this.toAnthropicTool().input_schema as any,
      run: (input: any) => {
        return self.execute(input);
      }
    });
  }

  // Execute a tool call
  execute(input: any): string {
    const command = input.command;

    switch (command) {
      case 'view':
        return this.view({ path: input.path, view_range: input.view_range });
      case 'create':
        return this.create({ path: input.path, file_text: input.file_text });
      case 'str_replace':
        return this.str_replace({ path: input.path, old_str: input.old_str, new_str: input.new_str });
      case 'insert':
        return this.insert({ path: input.path, line: input.line, insert_line: input.insert_line });
      case 'delete':
        return this.delete({ path: input.path });
      case 'rename':
        return this.rename({ old_path: input.old_path, new_path: input.new_path });
      default:
        throw new Error(`Unknown memory command: ${command}`);
    }
  }
}
