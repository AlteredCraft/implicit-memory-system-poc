'use client';

import { createContext, useContext, useCallback, useState, ReactNode } from 'react';
import { MemoryOperationEvent } from '@/types';

interface MemoryContextType {
  triggerMemoryOperation: (event: MemoryOperationEvent) => void;
  subscribeToOperations: (callback: (event: MemoryOperationEvent) => void) => () => void;
}

const MemoryContext = createContext<MemoryContextType | undefined>(undefined);

export function MemoryProvider({ children }: { children: ReactNode }) {
  const [subscribers, setSubscribers] = useState<Set<(event: MemoryOperationEvent) => void>>(
    new Set()
  );

  const subscribeToOperations = useCallback((callback: (event: MemoryOperationEvent) => void) => {
    setSubscribers((prev) => new Set(prev).add(callback));

    // Return unsubscribe function
    return () => {
      setSubscribers((prev) => {
        const next = new Set(prev);
        next.delete(callback);
        return next;
      });
    };
  }, []);

  const triggerMemoryOperation = useCallback(
    (event: MemoryOperationEvent) => {
      console.log('[MemoryContext] Broadcasting operation:', event);
      subscribers.forEach((callback) => callback(event));
    },
    [subscribers]
  );

  return (
    <MemoryContext.Provider value={{ triggerMemoryOperation, subscribeToOperations }}>
      {children}
    </MemoryContext.Provider>
  );
}

export function useMemoryContext() {
  const context = useContext(MemoryContext);
  if (!context) {
    throw new Error('useMemoryContext must be used within MemoryProvider');
  }
  return context;
}
