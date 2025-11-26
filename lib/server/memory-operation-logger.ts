/**
 * MemoryOperationLogger: Dedicated debug logging for memory file operations
 *
 * Provides consistent, immediate logging to both file and terminal.
 * Log format: [MEMOP] timestamp | OPERATION | path | details
 */

import * as fs from 'fs';
import * as path from 'path';

export type MemoryOperationType = 'READ' | 'CREATE' | 'UPDATE' | 'DELETE' | 'RENAME';

export interface MemoryLogEntry {
  timestamp: string;
  operation: MemoryOperationType;
  path: string;
  details: string;
}

export class MemoryOperationLogger {
  private logPath: string;
  private logDir: string;

  constructor(logDir: string = './logs') {
    this.logDir = logDir;
    this.logPath = path.join(logDir, 'memory-operations.log');

    // Create log directory if it doesn't exist
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }

    console.log(`[MEMOP] Logger initialized: ${path.resolve(this.logPath)}`);
  }

  /**
   * Log a memory operation to both file and console
   */
  log(entry: MemoryLogEntry): void {
    const formatted = this.formatEntry(entry);

    // Log to console
    console.log(formatted);

    // Append to log file (synchronous to preserve order)
    try {
      fs.appendFileSync(this.logPath, formatted + '\n');
    } catch (error: any) {
      console.error(`[MEMOP] Failed to write to log file: ${error.message}`);
    }
  }

  /**
   * Format a log entry with consistent structure
   * Format: [MEMOP] timestamp | OPERATION | path | details
   */
  private formatEntry(entry: MemoryLogEntry): string {
    // Pad operation to 6 chars for alignment (longest is RENAME/DELETE/CREATE)
    const paddedOp = entry.operation.padEnd(6);
    return `[MEMOP] ${entry.timestamp} | ${paddedOp} | ${entry.path} | ${entry.details}`;
  }

  /**
   * Get the log file path
   */
  getLogPath(): string {
    return this.logPath;
  }
}
