import { useEffect, useCallback } from 'react';
import { MemoryOperationEvent, MemoryFile } from '@/types';
import { useMemoryContext } from '@/lib/contexts/MemoryContext';

interface UseMemoryOperationHandlerOptions {
  setMemoryFiles: React.Dispatch<React.SetStateAction<MemoryFile[]>>;
  selectedFile: MemoryFile | null;
  refreshMemoryFiles: () => Promise<void>;
  closeViewer: () => void;
  triggerHDDLight?: (type: 'read' | 'write') => void;
  setShowUpdateBanner?: (show: boolean) => void;
}

/**
 * Custom hook to handle memory operations from SSE stream
 * Updates UI timestamps from SSE event timestamps (not filesystem timestamps)
 */
export function useMemoryOperationHandler({
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
      const timestamp = event.timestamp;

      switch (event.operation) {
        case 'read':
          // For reads, just update timestamp in place - no need to refresh file list
          setMemoryFiles((prev) =>
            prev.map((f) =>
              f.path === event.path
                ? { ...f, lastOperation: 'read', lastAccessedByLLM: timestamp }
                : f
            )
          );
          // Clear animation after 1.5 seconds
          setTimeout(() => {
            setMemoryFiles((prev) =>
              prev.map((f) =>
                f.path === event.path && f.lastOperation === 'read'
                  ? { ...f, lastOperation: undefined }
                  : f
              )
            );
          }, 1500);
          // Trigger HDD light for any read (not just selected file)
          if (triggerHDDLight) {
            triggerHDDLight('read');
          }
          break;

        case 'create':
          // Refresh to get new file, then mark it
          await refreshMemoryFiles();
          setMemoryFiles((prev) =>
            prev.map((f) =>
              f.path === event.path
                ? { ...f, isNew: true, lastOperation: 'create', lastModifiedByLLM: timestamp }
                : f
            )
          );
          if (triggerHDDLight) {
            triggerHDDLight('write');
          }
          break;

        case 'update':
          // Refresh to get updated content/size, then update timestamp
          await refreshMemoryFiles();
          setMemoryFiles((prev) =>
            prev.map((f) =>
              f.path === event.path
                ? { ...f, isNew: false, lastOperation: 'update', lastModifiedByLLM: timestamp }
                : f
            )
          );
          // Clear animation after 1.5 seconds
          setTimeout(() => {
            setMemoryFiles((prev) =>
              prev.map((f) =>
                f.path === event.path && f.lastOperation === 'update'
                  ? { ...f, lastOperation: undefined }
                  : f
              )
            );
          }, 1500);
          // Show update banner if viewing this file
          if (selectedFile?.path === event.path) {
            if (setShowUpdateBanner) {
              setShowUpdateBanner(true);
            }
          }
          if (triggerHDDLight) {
            triggerHDDLight('write');
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
