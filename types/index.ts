// Type definitions for Memory System v2

export interface AppState {
  sessionActive: boolean;
  apiKey: string;
  model: string;
  systemPromptFile: string;
  availablePrompts: SystemPrompt[];
}

export interface SystemPrompt {
  name: string;
  path: string;
}

export interface MemoryFile {
  name: string;
  path: string;
  size: number;
  modified: string;
  accessed?: string;
  isNew?: boolean;
  lastOperation?: 'create' | 'read' | 'update' | 'delete' | 'rename';
  operationTimestamp?: string;
}

export interface Session {
  id: string;
  start_time: string;
  end_time?: string;
  model: string;
  event_count: number;
  total_tokens: number;
  events?: SessionEvent[];
  system_prompt?: string;
  session_id?: string;
}

export interface SessionEvent {
  event_type: string;
  timestamp: string;
  details?: any;
}

export interface TokenUsage {
  total_input: number;
  total_output: number;
  total_cache_read: number;
  total_cache_write: number;
  last_request: {
    input_tokens: number;
    output_tokens: number;
    cache_read_tokens: number;
    cache_write_tokens: number;
  };
}

export interface StreamEvent {
  type: 'thinking' | 'text' | 'memory_operation' | 'tool_use_start' | 'done' | 'error';
  data: any;
}

export interface MemoryOperationEvent {
  operation: 'create' | 'read' | 'update' | 'delete' | 'rename';
  path: string;
  timestamp: string;
  new_path?: string;
}
