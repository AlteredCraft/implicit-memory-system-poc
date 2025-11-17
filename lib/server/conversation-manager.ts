/**
 * Core conversation logic for handling streaming responses from Claude with memory tool integration.
 * Manages conversation history, memory tool operations, and session tracing.
 */

import Anthropic from '@anthropic-ai/sdk';
import { LocalFilesystemMemoryTool } from './memory-tool';
import { SessionTrace } from './session-trace';

export interface StreamEvent {
  type: 'thinking' | 'memory_operation' | 'text' | 'done' | 'error';
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

      // Create the message with tool support
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 2048,
        system: this.systemPrompt,
        messages: this.messages as any,
        tools: [this.memoryTool.toAnthropicTool()],
      });

      // Handle tool uses
      let currentMessages = [...this.messages];
      let currentResponse = response;
      let iterationCount = 0;
      const maxIterations = 10; // Prevent infinite loops

      while (currentResponse.stop_reason === 'tool_use' && iterationCount < maxIterations) {
        iterationCount++;

        // Add assistant's response with tool uses to messages
        currentMessages.push({
          role: 'assistant',
          content: currentResponse.content
        });

        // Process each tool use
        const toolResults: any[] = [];

        for (const content of currentResponse.content) {
          if (content.type === 'tool_use') {
            console.log(`[ConversationManager] Tool use detected: ${content.name}`);

            try {
              // Execute the tool
              const result = this.memoryTool.execute(content.input);

              toolResults.push({
                type: 'tool_result',
                tool_use_id: content.id,
                content: result
              });
            } catch (error: any) {
              console.error(`[ConversationManager] Tool execution error:`, error);

              toolResults.push({
                type: 'tool_result',
                tool_use_id: content.id,
                content: `Error: ${error.message}`,
                is_error: true
              });
            }
          }
        }

        // Add tool results to messages
        if (toolResults.length > 0) {
          currentMessages.push({
            role: 'user',
            content: toolResults
          });
        }

        // Get memory operations and emit them
        const memoryOperations = this.memoryTool.getAndClearRecentOperations();
        for (const operation of memoryOperations) {
          console.log(`[ConversationManager] Emitting memory operation: ${operation.operation} on ${operation.path}`);
          yield {
            type: 'memory_operation',
            data: operation
          };
        }

        // Continue the conversation
        currentResponse = await this.client.messages.create({
          model: this.model,
          max_tokens: 2048,
          system: this.systemPrompt,
          messages: currentMessages as any,
          tools: [this.memoryTool.toAnthropicTool()],
        });
      }

      // Extract final response text
      let responseText = '';
      for (const content of currentResponse.content) {
        if (content.type === 'text') {
          responseText = content.text;
          break;
        }
      }

      // Yield complete response
      yield {
        type: 'text',
        data: responseText
      };

      // Update messages with final response
      this.messages = currentMessages;
      this.messages.push({ role: 'assistant', content: responseText });
      this.trace.logLlmResponse(responseText);

      // Track token usage
      const usage = currentResponse.usage;
      const lastInput = usage.input_tokens;
      const lastOutput = usage.output_tokens;
      const lastCacheRead = (usage as any).cache_read_input_tokens || 0;
      const lastCacheWrite = (usage as any).cache_creation_input_tokens || 0;

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
