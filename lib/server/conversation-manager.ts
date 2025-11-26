/**
 * Core conversation logic for handling streaming responses from Claude with memory tool integration.
 * Manages conversation history, memory tool operations, and session tracing.
 */

import Anthropic from '@anthropic-ai/sdk';
import { LocalFilesystemMemoryTool } from './memory-tool';
import { SessionTrace } from './session-trace';

export interface StreamEvent {
  type: 'thinking' | 'memory_operation' | 'text' | 'text_delta' | 'done' | 'error';
  data: any;
}

export interface TokenStats {
  total_input: number;
  total_output: number;
  total_cache_read: number;
  total_cache_write: number;
}

interface Message {
  role: 'user' | 'assistant';
  content: string | any[];
}

export class ConversationManager {
  private client: Anthropic;
  private model: string;
  private systemPrompt: string;
  private memoryTool: LocalFilesystemMemoryTool;
  private messages: Message[] = [];
  private trace: SessionTrace;

  // Token tracking
  private totalInputTokens = 0;
  private totalOutputTokens = 0;
  private totalCacheReadTokens = 0;
  private totalCacheWriteTokens = 0;

  constructor(apiKey: string, model: string, systemPrompt: string) {
    this.client = new Anthropic({ apiKey });
    this.model = model;
    this.systemPrompt = systemPrompt;
    this.memoryTool = new LocalFilesystemMemoryTool();

    // Initialize session trace
    this.trace = new SessionTrace('./sessions', model, systemPrompt);
    this.memoryTool.setTrace(this.trace);

    console.log(`[ConversationManager] Initialized with model: ${model}`);
  }

  async *sendMessageStreaming(userMessage: string): AsyncGenerator<StreamEvent> {
    // Add user message
    this.messages.push({ role: 'user', content: userMessage });
    this.trace.logUserInput(userMessage);

    // Log request
    this.trace.logLlmRequest(this.messages.length, ['memory']);
    console.log(`[ConversationManager] Sending message to LLM: ${userMessage.substring(0, 100)}...`);

    try {
      // Send initial processing indicator
      yield {
        type: 'thinking',
        data: 'Processing...'
      };

      // Use toolRunner with streaming - handles the agentic loop automatically
      // NOTE: The SDK's beta-parser adds 'parsed: null' to text blocks during streaming,
      // which causes 400 errors on subsequent API calls. We clean this in-place after
      // each finalMessage() call below.
      const runner = this.client.beta.messages.toolRunner({
        model: this.model,
        max_tokens: 2048,
        system: this.systemPrompt,
        messages: this.messages as any,
        tools: [this.memoryTool.toRunnableTool()],
        stream: true, // Enable streaming
      });

      // Track accumulated response text across all messages
      let responseText = '';

      // Process nested streams for real-time text
      for await (const messageStream of runner) {
        // Process each streaming event within this message
        for await (const event of messageStream) {
          // Emit text deltas as they arrive
          if (event.type === 'content_block_delta') {
            const delta = event.delta as any;
            if (delta?.type === 'text_delta' && delta?.text) {
              responseText += delta.text;
              yield {
                type: 'text_delta',
                data: delta.text
              };
            }
          }

          // Log tool use events
          if (event.type === 'content_block_start') {
            const contentBlock = event.content_block as any;
            if (contentBlock?.type === 'tool_use') {
              console.log(`[ConversationManager] Tool use started: ${contentBlock.name}`);
            }
          }
        }

        // Get the final message from this stream for tool logging
        const message = await messageStream.finalMessage();

        // CRITICAL: Clean the message content IN PLACE before the SDK pushes it.
        // The SDK's beta-parser adds 'parsed: null' to text blocks internally, which causes
        // 400 errors on subsequent API calls. Since finalMessage() returns the same object
        // reference that the SDK uses internally, mutating it here cleans it before the
        // SDK pushes it to params.messages. This avoids using setMessagesParams() which
        // would set _mutated=true and break the loop's exit condition.
        for (let i = 0; i < message.content.length; i++) {
          const block = message.content[i] as any;
          if (block.type === 'text' && 'parsed' in block) {
            delete block.parsed;
          }
        }

        // Log tool calls to trace
        for (const content of message.content) {
          if (content.type === 'tool_use') {
            const toolInput = content.input as Record<string, any>;
            console.log(`[ConversationManager] Tool use detected: ${content.name}`);
            this.trace.logToolCall('memory', toolInput.command, toolInput);
          }
        }

        // Emit memory operations for UI updates (after tool execution)
        const memoryOperations = this.memoryTool.getAndClearRecentOperations();
        for (const operation of memoryOperations) {
          console.log(`[ConversationManager] Emitting memory operation: ${operation.operation} on ${operation.path}`);
          yield {
            type: 'memory_operation',
            data: operation
          };
        }
      }

      // Get final result from runner
      const finalMessage = await runner;

      // Update messages with final response
      this.messages.push({ role: 'assistant', content: responseText });
      this.trace.logLlmResponse(responseText);

      // Track token usage from final message
      const usage = finalMessage.usage;
      const lastInput = usage?.input_tokens || 0;
      const lastOutput = usage?.output_tokens || 0;
      const lastCacheRead = (usage as any)?.cache_read_input_tokens || 0;
      const lastCacheWrite = (usage as any)?.cache_creation_input_tokens || 0;

      this.totalInputTokens += lastInput;
      this.totalOutputTokens += lastOutput;
      this.totalCacheReadTokens += lastCacheRead;
      this.totalCacheWriteTokens += lastCacheWrite;

      // Log token usage
      this.trace.logTokenUsage(
        lastInput,
        lastOutput,
        lastCacheRead,
        lastCacheWrite,
        this.totalInputTokens,
        this.totalOutputTokens,
        this.totalCacheReadTokens,
        this.totalCacheWriteTokens
      );

      // Send final done event with token info
      yield {
        type: 'done',
        data: {
          tokens: {
            last_input: lastInput,
            last_output: lastOutput,
            last_cache_read: lastCacheRead,
            last_cache_write: lastCacheWrite,
            total_input: this.totalInputTokens,
            total_output: this.totalOutputTokens,
            total_cache_read: this.totalCacheReadTokens,
            total_cache_write: this.totalCacheWriteTokens
          }
        }
      };
    } catch (error: any) {
      console.error(`[ConversationManager] Error in conversation:`, error);
      this.trace.logError(error.constructor.name, error.message);

      yield {
        type: 'error',
        data: { message: error.message }
      };
    }
  }

  getMemoryContents(): string {
    return this.memoryTool.view({ path: '/memories' });
  }

  clearMemories(): string {
    const result = this.memoryTool.clearAllMemory();
    this.messages = [];

    // Reset token counters
    this.totalInputTokens = 0;
    this.totalOutputTokens = 0;
    this.totalCacheReadTokens = 0;
    this.totalCacheWriteTokens = 0;

    // Start new trace
    this.trace.finalize();
    this.trace = new SessionTrace('./sessions', this.model, this.systemPrompt);
    this.memoryTool.setTrace(this.trace);

    return result;
  }

  finalize(): string {
    return this.trace.finalize();
  }

  getTokenStats(): TokenStats {
    return {
      total_input: this.totalInputTokens,
      total_output: this.totalOutputTokens,
      total_cache_read: this.totalCacheReadTokens,
      total_cache_write: this.totalCacheWriteTokens
    };
  }

  getMessageCount(): number {
    return this.messages.length;
  }

  getSessionId(): string {
    return this.trace.getSessionId();
  }
}
