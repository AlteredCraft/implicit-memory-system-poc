/**
 * Generate Mermaid Sequence Diagram from Session Trace
 *
 * This module reads a session trace JSON and generates a Mermaid sequence diagram
 * showing the interaction flow between User, Host App, LLM, and Memory System.
 */

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

function escapeText(text: string, maxLength: number = 50): string {
  /**
   * Escape special characters and truncate text for Mermaid diagram.
   */
  // Replace newlines and quotes
  let escaped = text.replace(/\n/g, '<br/>').replace(/"/g, "'");

  // Truncate if too long
  if (escaped.length > maxLength) {
    escaped = escaped.substring(0, maxLength) + '...';
  }

  return escaped;
}

export function generateMermaidDiagram(traceData: TraceData): string {
  /**
   * Generate a Mermaid sequence diagram from session trace data.
   */
  const lines: string[] = [
    '---',
    `Session ID: ${traceData.session_id || 'unknown'}`,
    `Start Time: ${traceData.start_time || 'unknown'}`,
    `Model: ${traceData.model || 'unknown'}`,
    '---',
    '',
    '```mermaid',
    'sequenceDiagram',
    '    participant User',
    '    participant HostApp as Host App<br/>(chat.py)',
    '    participant LLM as Claude LLM',
    '    participant MemorySystem as Memory System<br/>(memory_tool)',
    '',
    '    Note over HostApp: Session Started',
  ];

  const events = traceData.events || [];
  let turnNumber = 0;
  let inTurn = false;

  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    const eventType = event.event_type;

    if (eventType === 'user_input') {
      // Start a new conversation turn
      turnNumber++;
      const content = escapeText(event.content || '');

      lines.push('');
      lines.push('    rect rgb(200, 220, 255)');
      lines.push(`        Note over User,MemorySystem: Turn ${turnNumber}: User Input`);
      lines.push('');
      lines.push(`        User->>HostApp: "${content}"`);
      lines.push('        HostApp->>HostApp: Append to messages');
      inTurn = true;
    } else if (eventType === 'llm_request') {
      if (inTurn) {
        lines.push('');
        lines.push(`        HostApp->>LLM: POST /messages<br/>tools: ${JSON.stringify(event.tools || [])}`);
      }
    } else if (eventType === 'tool_call') {
      const toolName = event.tool_name || '';
      const command = event.command || '';
      const parameters = event.parameters || {};

      if (toolName === 'memory') {
        // Format parameters for display
        let paramsStr = Object.entries(parameters)
          .map(([k, v]) => `${k}=${JSON.stringify(v).substring(0, 30)}`)
          .join(', ');

        if (paramsStr.length > 50) {
          paramsStr = paramsStr.substring(0, 50) + '...';
        }

        lines.push('');
        lines.push(`        Note over LLM: Decides to ${command}`);
        lines.push(`        LLM->>MemorySystem: ${command}(${paramsStr})`);
        lines.push('        activate MemorySystem');
      }
    } else if (eventType === 'tool_result') {
      const toolName = event.tool_name || '';
      const command = event.command || '';
      const success = event.success !== false;
      const error = event.error;
      const result = event.result || '';

      if (toolName === 'memory') {
        if (success) {
          const resultPreview = escapeText(result, 40);
          lines.push(`        MemorySystem-->>LLM: ${resultPreview}`);
        } else {
          const errorMsg = escapeText(error || 'Error', 40);
          lines.push(`        MemorySystem-->>LLM: ERROR: ${errorMsg}`);
        }
        lines.push('        deactivate MemorySystem');
      }
    } else if (eventType === 'llm_response') {
      const content = escapeText(event.content || '', 60);

      lines.push('');
      lines.push('        Note over LLM: Ready to respond');
      lines.push(`        LLM-->>HostApp: "${content}"`);
      lines.push('        HostApp->>HostApp: Append to messages');
      lines.push(`        HostApp-->>User: "${content}"`);

      if (inTurn) {
        lines.push('    end');
        inTurn = false;
      }
    } else if (eventType === 'error') {
      const errorMsg = escapeText(event.message || 'Unknown error', 40);
      lines.push(`    Note over HostApp: ERROR: ${errorMsg}`);
    }
  }

  // Close any open turn
  if (inTurn) {
    lines.push('    end');
  }

  lines.push('');
  lines.push('    Note over HostApp: Session Ended');
  lines.push('```');

  return lines.join('\n');
}
