'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { ToolCallEvent } from '@/types';
import { useToolCallContext } from '@/lib/contexts/ToolCallContext';

interface LogEntry extends ToolCallEvent {
  id: number;
}

const COMMAND_COLORS: Record<string, string> = {
  view: 'text-cyan-400',
  create: 'text-green-400',
  str_replace: 'text-yellow-400',
  insert: 'text-yellow-400',
  delete: 'text-red-400',
  rename: 'text-purple-400',
};

function formatTime(isoTimestamp: string): string {
  try {
    const date = new Date(isoTimestamp);
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return '--:--:--';
  }
}

function extractFilename(path: string): string {
  const parts = path.split('/');
  return parts[parts.length - 1] || path;
}

function formatParameters(params: Record<string, any>, command: string): string {
  const parts: string[] = [];

  if (params.path) {
    const filename = extractFilename(params.path);
    parts.push(`path=${filename}`);
  }

  if (params.content_length !== undefined) {
    parts.push(`len=${params.content_length}`);
  }

  if (params.old_str_length !== undefined && params.new_str_length !== undefined) {
    parts.push(`${params.old_str_length}→${params.new_str_length}b`);
  }

  if (params.line !== undefined) {
    parts.push(`line=${params.line}`);
  }

  if (params.insert_length !== undefined) {
    parts.push(`len=${params.insert_length}`);
  }

  if (params.view_range) {
    parts.push(`range=[${params.view_range.join(',')}]`);
  }

  if (params.old_path && params.new_path) {
    const oldFile = extractFilename(params.old_path);
    const newFile = extractFilename(params.new_path);
    parts.push(`${oldFile}→${newFile}`);
  }

  return parts.join(' ');
}

interface ToolCallConsoleProps {
  sessionKey: number;
}

export default function ToolCallConsole({ sessionKey }: ToolCallConsoleProps) {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const nextIdRef = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { subscribeToToolCalls } = useToolCallContext();

  const handleToolCall = useCallback((event: ToolCallEvent) => {
    const id = nextIdRef.current++;
    setEntries((prev) => {
      const newEntry: LogEntry = { ...event, id };
      // Keep last 100 entries
      return [...prev, newEntry].slice(-100);
    });
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToToolCalls(handleToolCall);
    return unsubscribe;
  }, [subscribeToToolCalls, handleToolCall]);

  // Auto-scroll to bottom on new entries
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries]);

  // Clear console when session is reinitialized
  useEffect(() => {
    setEntries([]);
  }, [sessionKey]);

  const clearConsole = useCallback(() => {
    setEntries([]);
  }, []);

  return (
    <div className="flex-shrink-0 mx-3 mt-3 rounded-lg overflow-hidden border border-gray-700/50">
      {/* Terminal header bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-gray-800 border-b border-gray-700">
        <span className="font-mono text-xs uppercase tracking-wider text-gray-300 font-medium">
          Memory Tool Calls
        </span>
        <button
          onClick={clearConsole}
          className="text-xs uppercase tracking-wider text-gray-400 hover:text-white transition-colors font-mono"
          title="Clear console"
        >
          Clear
        </button>
      </div>

      {/* Terminal body with CRT-style effects */}
      <div
        ref={scrollRef}
        className="relative h-[200px] overflow-y-auto overflow-x-hidden bg-gray-900/95 font-mono text-sm"
        style={{
          backgroundImage: `
            repeating-linear-gradient(
              0deg,
              transparent,
              transparent 2px,
              rgba(0, 0, 0, 0.03) 2px,
              rgba(0, 0, 0, 0.03) 4px
            )
          `,
        }}
      >
        {/* Fade overlay at top */}
        <div className="sticky top-0 left-0 right-0 h-4 bg-gradient-to-b from-gray-900 to-transparent pointer-events-none z-10" />

        {entries.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500 text-xs tracking-wide">
            <span>Waiting for tool calls...</span>
            <span className="ml-1 animate-pulse">_</span>
          </div>
        ) : (
          <div className="px-3 pb-2 pt-1 space-y-0.5">
            {entries.map((entry, index) => {
              const cmdColor = COMMAND_COLORS[entry.command] || 'text-gray-400';
              const isNew = index === entries.length - 1;
              const params = formatParameters(entry.parameters, entry.command);

              return (
                <div
                  key={entry.id}
                  className={`flex items-center gap-2 py-0.5 ${isNew ? 'animate-fade-in' : ''}`}
                >
                  {/* Timestamp */}
                  <span className="text-gray-400 tabular-nums shrink-0 text-xs">
                    {formatTime(entry.timestamp)}
                  </span>

                  {/* CALL label */}
                  <span className="text-blue-400 text-xs font-bold shrink-0">
                    CALL
                  </span>

                  {/* Command */}
                  <span
                    className={`uppercase text-xs font-medium shrink-0 ${cmdColor}`}
                    style={{
                      textShadow: isNew ? `0 0 8px currentColor` : 'none',
                    }}
                  >
                    {entry.command}
                  </span>

                  {/* Parameters */}
                  <span className="text-gray-400 truncate text-sm" title={params}>
                    {params}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Fade overlay at bottom */}
        <div className="sticky bottom-0 left-0 right-0 h-3 bg-gradient-to-t from-gray-900 to-transparent pointer-events-none" />
      </div>
    </div>
  );
}
