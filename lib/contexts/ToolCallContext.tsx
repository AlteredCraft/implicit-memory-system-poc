'use client';

import { createContext, useContext, useCallback, useState, ReactNode } from 'react';
import { ToolCallEvent } from '@/types';

interface ToolCallContextType {
  triggerToolCall: (event: ToolCallEvent) => void;
  subscribeToToolCalls: (callback: (event: ToolCallEvent) => void) => () => void;
}

const ToolCallContext = createContext<ToolCallContextType | undefined>(undefined);

export function ToolCallProvider({ children }: { children: ReactNode }) {
  const [subscribers, setSubscribers] = useState<Set<(event: ToolCallEvent) => void>>(new Set());

  const subscribeToToolCalls = useCallback((callback: (event: ToolCallEvent) => void) => {
    setSubscribers((prev) => new Set(prev).add(callback));
    return () => {
      setSubscribers((prev) => {
        const next = new Set(prev);
        next.delete(callback);
        return next;
      });
    };
  }, []);

  const triggerToolCall = useCallback(
    (event: ToolCallEvent) => {
      subscribers.forEach((callback) => callback(event));
    },
    [subscribers]
  );

  return (
    <ToolCallContext.Provider value={{ triggerToolCall, subscribeToToolCalls }}>
      {children}
    </ToolCallContext.Provider>
  );
}

export function useToolCallContext() {
  const context = useContext(ToolCallContext);
  if (!context) {
    throw new Error('useToolCallContext must be used within ToolCallProvider');
  }
  return context;
}
