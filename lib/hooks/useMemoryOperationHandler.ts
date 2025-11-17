import { useEffect, useCallback } from 'react';
import { MemoryOperationEvent, MemoryFile } from '@/types';
import { useMemoryContext } from '@/lib/contexts/MemoryContext';

interface UseMemoryOperationHandlerOptions {
  memoryFiles: MemoryFile[];
  setMemoryFiles: React.Dispatch<React.SetStateAction<MemoryFile[]>>;
  selectedFile: MemoryFile | null;
  refreshMemoryFiles: () => Promise<void>;
  closeViewer: () => void;
  triggerHDDLight?: (type: 'read' | 'write') => void;
  setShowUpdateBanner?: (show: boolean) => void;
}

/**
 * Custom hook to handle memory operations from SSE stream
 * Extracted from MemoryBrowser to improve reusability and testability
 */
export function useMemoryOperationHandler({
  memoryFiles,
  setMemoryFiles,
  selectedFile,
  refreshMemoryFiles,
  closeViewer,
  triggerHDDLight,
  setShowUpdateBanner,
}: UseMemoryOperationHandlerOptions) {
  const { subscribeToOperations } = useMemoryContext();

  const handleOperation = useCallback(
    async (event: MemoryOperationEvent) => {
      console.log('[useMemoryOperationHandler] Handling operation:', event);

      switch (event.operation) {
        case 'create':
          await refreshMemoryFiles();
          // Mark new file
          setMemoryFiles((prev) =>
            prev.map((f) =>
              f.path === event.path
                ? { ...f, isNew: true, lastOperation: 'create', operationTimestamp: event.timestamp }
                : f
            )
          );
          break;

        case 'read':
          await refreshMemoryFiles();
          // Mark file with read operation for animation
          setMemoryFiles((prev) =>
            prev.map((f) =>
              f.path === event.path
                ? { ...f, lastOperation: 'read', operationTimestamp: event.timestamp }
                : f
            )
          );
          // Clear animation after it completes (1 second)
          setTimeout(() => {
            setMemoryFiles((prev) =>
              prev.map((f) =>
                f.path === event.path && f.lastOperation === 'read'
                  ? { ...f, lastOperation: undefined }
                  : f
              )
            );
          }, 1000);
          if (selectedFile?.path === event.path && triggerHDDLight) {
            triggerHDDLight('read');
          }
          break;

        case 'update':
          await refreshMemoryFiles();
          setMemoryFiles((prev) =>
            prev.map((f) =>
              f.path === event.path
                ? { ...f, isNew: false, lastOperation: 'update', operationTimestamp: event.timestamp }
                : f
            )
          );
          // Clear animation after it completes (1 second)
          setTimeout(() => {
            setMemoryFiles((prev) =>
              prev.map((f) =>
                f.path === event.path && f.lastOperation === 'update'
                  ? { ...f, lastOperation: undefined }
                  : f
              )
            );
          }, 1000);
          if (selectedFile?.path === event.path) {
            if (setShowUpdateBanner) {
              setShowUpdateBanner(true);
            }
            if (triggerHDDLight) {
              triggerHDDLight('write');
            }
          }
          break;

        case 'delete':
          setMemoryFiles((prev) => prev.filter((f) => f.path !== event.path));
          if (selectedFile?.path === event.path) {
            closeViewer();
          }
          break;

        case 'rename':
          await refreshMemoryFiles();
          break;
      }
    },
    [
      selectedFile,
      setMemoryFiles,
      refreshMemoryFiles,
      closeViewer,
      triggerHDDLight,
      setShowUpdateBanner,
    ]
  );

  useEffect(() => {
    const unsubscribe = subscribeToOperations(handleOperation);
    return unsubscribe;
  }, [subscribeToOperations, handleOperation]);
}
