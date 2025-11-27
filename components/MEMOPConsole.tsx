'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useMemoryContext } from '@/lib/contexts/MemoryContext';
import { MemoryOperationEvent } from '@/types';

interface LogEntry extends MemoryOperationEvent {
  id: number;
}

const OPERATION_STYLES: Record<string, { color: string }> = {
  read: { color: 'text-emerald-400' },
  create: { color: 'text-amber-400' },
  update: { color: 'text-yellow-300' },
  delete: { color: 'text-rose-400' },
  rename: { color: 'text-cyan-400' },
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

export default function MEMOPConsole() {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const nextIdRef = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { subscribeToOperations } = useMemoryContext();

  const handleOperation = useCallback((event: MemoryOperationEvent) => {
    const id = nextIdRef.current++;
    setEntries((prev) => {
      const newEntry: LogEntry = { ...event, id };
      // Keep last 100 entries
      return [...prev, newEntry].slice(-100);
    });
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToOperations(handleOperation);
    return unsubscribe;
  }, [subscribeToOperations, handleOperation]);

  // Auto-scroll to bottom on new entries
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries]);

  const clearConsole = useCallback(() => {
    setEntries([]);
  }, []);

  return (
    <div className="flex-shrink-0 mx-3 mt-3 rounded-lg overflow-hidden border border-gray-700/50">
      {/* Terminal header bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-gray-800 border-b border-gray-700">
        <span className="font-mono text-[11px] uppercase tracking-wider text-gray-300 font-medium">
          Memory Operations
        </span>
        <button
          onClick={clearConsole}
          className="text-[11px] uppercase tracking-wider text-gray-400 hover:text-white transition-colors font-mono"
          title="Clear console"
        >
          Clear
        </button>
      </div>

      {/* Terminal body with CRT-style effects */}
      <div
        ref={scrollRef}
        className="relative h-[120px] overflow-y-auto overflow-x-hidden bg-gray-900/95 font-mono text-xs"
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
          <div className="flex items-center justify-center h-full text-gray-500 text-[11px] tracking-wide">
            <span>Waiting for operations...</span>
            <span className="ml-1 animate-pulse">_</span>
          </div>
        ) : (
          <div className="px-3 pb-2 pt-1 space-y-0.5">
            {entries.map((entry, index) => {
              const style = OPERATION_STYLES[entry.operation] || OPERATION_STYLES.read;
              const isNew = index === entries.length - 1;

              return (
                <div
                  key={entry.id}
                  className={`flex items-center gap-2 py-0.5 ${isNew ? 'animate-fade-in' : ''}`}
                >
                  {/* Timestamp */}
                  <span className="text-gray-500 tabular-nums shrink-0">
                    {formatTime(entry.timestamp)}
                  </span>

                  {/* Operation badge */}
                  <span
                    className={`uppercase text-[10px] font-bold tracking-wider w-14 shrink-0 ${style.color}`}
                    style={{
                      textShadow: isNew ? `0 0 8px currentColor` : 'none',
                    }}
                  >
                    {entry.operation}
                  </span>

                  {/* File path */}
                  <span className="text-gray-400 truncate" title={entry.path}>
                    {extractFilename(entry.path)}
                  </span>

                  {/* Rename indicator */}
                  {entry.operation === 'rename' && entry.new_path && (
                    <>
                      <span className="text-gray-600">→</span>
                      <span className="text-gray-400 truncate" title={entry.new_path}>
                        {extractFilename(entry.new_path)}
                      </span>
                    </>
                  )}
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
