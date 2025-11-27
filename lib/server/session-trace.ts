/**
 * Session Trace: Records LLM interactions for analysis and debugging
 *
 * This module provides a JSON-based trace system that captures:
 * - User inputs
 * - LLM decisions (tool calls)
 * - Tool execution results
 * - LLM responses
 * - Token usage statistics
 *
 * Each session is stored in a separate timestamped JSON file in the sessions/ directory.
 */

import * as fs from 'fs';
import * as path from 'path';
import { randomBytes } from 'crypto';

type TraceEventCallback = (event: { type: string; data: any }) => void;

interface TraceEvent {
  timestamp: string;
  event_type: string;
  [key: string]: any;
}

interface TraceData {
  session_id: string;
  start_time: string;
  end_time?: string;
  model: string;
  system_prompt: string;
  events: TraceEvent[];
}

export class SessionTrace {
  private basePath: string;
  private sessionId: string;
  private trace: TraceData;
  private traceFile: string;
  private eventCallback?: TraceEventCallback;

  constructor(
    basePath: string = './sessions',
    model: string = '',
    systemPrompt: string = '',
    eventCallback?: TraceEventCallback
  ) {
    this.eventCallback = eventCallback;
    this.basePath = basePath;

    // Create sessions directory if it doesn't exist
    if (!fs.existsSync(this.basePath)) {
      fs.mkdirSync(this.basePath, { recursive: true });
    }

    // Generate session ID with timestamp and unique suffix
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '_').split('.')[0];
    const uniqueId = randomBytes(4).toString('hex');
    this.sessionId = `${timestamp}_${uniqueId}`;

    // Initialize trace structure
    this.trace = {
      session_id: this.sessionId,
      start_time: new Date().toISOString(),
      model,
      system_prompt: systemPrompt,
      events: []
    };

    // Determine trace file path
    this.traceFile = path.join(this.basePath, `session_${this.sessionId}.json`);

    console.log(`[TRACE] Session started: ${this.sessionId}`);
    console.log(`[TRACE] Trace file: ${this.traceFile}`);

    // Write initial trace file
    this._save();
  }

  private _save(): void {
    try {
      fs.writeFileSync(this.traceFile, JSON.stringify(this.trace, null, 2), 'utf-8');
    } catch (error) {
      console.error('[TRACE] Failed to save trace file:', error);
    }
  }

  private _addEvent(eventType: string, data: Record<string, any> = {}): void {
    const event: TraceEvent = {
      timestamp: new Date().toISOString(),
      event_type: eventType,
      ...data
    };

    this.trace.events.push(event);
    this._save();

    console.log(`[TRACE] Event recorded: ${eventType}`);
  }

  logUserInput(content: string): void {
    this._addEvent('user_input', { content });
  }

  logLlmRequest(messagesCount: number, tools: string[]): void {
    this._addEvent('llm_request', {
      messages_count: messagesCount,
      tools
    });
  }

  logToolCall(toolName: string, command: string, parameters: Record<string, any>): void {
    this._addEvent('tool_call', {
      tool_name: toolName,
      command,
      parameters
    });

    // Emit real-time event via callback
    this.eventCallback?.({
      type: 'tool_call',
      data: {
        tool_name: toolName,
        command,
        parameters,
        timestamp: new Date().toISOString()
      }
    });
  }

  logToolResult(
    toolName: string,
    command: string,
    result: string,
    success: boolean = true,
    error?: string
  ): void {
    // Truncate very long results for readability
    let resultData = result;
    if (result.length > 1000) {
      resultData = result.substring(0, 1000) + `... (truncated, total length: ${result.length} chars)`;
    }

    const eventData: Record<string, any> = {
      tool_name: toolName,
      command,
      result: resultData,
      success,
      result_length: result.length
    };

    if (error) {
      eventData.error = error;
    }

    this._addEvent('tool_result', eventData);
  }

  logLlmResponse(content: string): void {
    this._addEvent('llm_response', { content });
  }

  logTokenUsage(
    inputTokens: number,
    outputTokens: number,
    cacheReadTokens: number = 0,
    cacheWriteTokens: number = 0,
    totalInputTokens: number = 0,
    totalOutputTokens: number = 0,
    totalCacheReadTokens: number = 0,
    totalCacheWriteTokens: number = 0
  ): void {
    this._addEvent('token_usage', {
      last_request: {
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        cache_read_tokens: cacheReadTokens,
        cache_write_tokens: cacheWriteTokens
      },
      cumulative: {
        total_input_tokens: totalInputTokens,
        total_output_tokens: totalOutputTokens,
        total_cache_read_tokens: totalCacheReadTokens,
        total_cache_write_tokens: totalCacheWriteTokens
      }
    });
  }

  logError(errorType: string, message: string, traceback?: string): void {
    const eventData: Record<string, any> = {
      error_type: errorType,
      message
    };

    if (traceback) {
      eventData.traceback = traceback;
    }

    this._addEvent('error', eventData);
  }

  finalize(): string {
    this.trace.end_time = new Date().toISOString();
    this._save();

    console.log(`[TRACE] Session finalized: ${this.sessionId}`);
    return this.traceFile;
  }

  getSessionId(): string {
    return this.sessionId;
  }
}
