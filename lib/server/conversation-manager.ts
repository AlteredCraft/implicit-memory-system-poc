/**
 * Core conversation logic for handling streaming responses from Claude with memory tool integration.
 * Manages conversation history, memory tool operations, and session tracing.
 */

import Anthropic from '@anthropic-ai/sdk';
import { LocalFilesystemMemoryTool } from './memory-tool';
import { SessionTrace } from './session-trace';
import { AsyncEventQueue } from './async-event-queue';

export interface StreamEvent {
  type: 'thinking' | 'tool_call' | 'text' | 'text_delta' | 'done' | 'error';
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
  private eventQueue: AsyncEventQueue<{ type: string; data: any }>;

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

    // Initialize event queue for real-time streaming
    this.eventQueue = new AsyncEventQueue();

    // Initialize session trace with callback to capture events
    this.trace = new SessionTrace(
      './sessions',
      model,
      systemPrompt,
      (event) => this.eventQueue.enqueue(event)
    );
    this.memoryTool.setTrace(this.trace);

    console.log(`[ConversationManager] Initialized with model: ${model}`);
  }

  /**
   * Helper generator to drain queued tool call events
   */
  private *drainEventQueue(): Generator<StreamEvent, void, undefined> {
    for (const traceEvent of this.eventQueue.drain()) {
      yield {
        type: traceEvent.type as 'tool_call',
        data: traceEvent.data
      };
    }
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

          // Drain tool call events after every SDK event (real-time streaming)
          // This ensures tool calls are emitted immediately, even before text generation
          yield* this.drainEventQueue();
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

        // Drain any remaining tool call events after this message completes
        yield* this.drainEventQueue();
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

      // Final drain to ensure all events are sent before completion
      yield* this.drainEventQueue();

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

      // Drain any remaining events before error
      yield* this.drainEventQueue();

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

    // Reset event queue
    this.eventQueue = new AsyncEventQueue();

    // Start new trace with callback
    this.trace.finalize();
    this.trace = new SessionTrace(
      './sessions',
      this.model,
      this.systemPrompt,
      (event) => this.eventQueue.enqueue(event)
    );
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
