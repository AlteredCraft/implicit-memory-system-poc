'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { MemoryFile } from '@/types';
import { formatRelativeTime } from '@/lib/utils';
import { useMemoryOperationHandler } from '@/lib/hooks/useMemoryOperationHandler';
import CurrentSessionBox from './CurrentSessionBox';
import ToolCallConsole from './ToolCallConsole';

export default function MemoryBrowser() {
  const [memoryFiles, setMemoryFiles] = useState<MemoryFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<MemoryFile | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [showUpdateBanner, setShowUpdateBanner] = useState(false);
  const [readLightActive, setReadLightActive] = useState(false);
  const [writeLightActive, setWriteLightActive] = useState(false);

  const refreshMemoryFiles = useCallback(async () => {
    try {
      const data = await api.getMemoryFiles();
      setMemoryFiles(data.files || []);
    } catch (error: any) {
      console.error('Failed to load memory files:', error);
    }
  }, []);

  useEffect(() => {
    refreshMemoryFiles();
  }, [refreshMemoryFiles]);

  const viewFile = useCallback(async (file: MemoryFile) => {
    try {
      const data = await api.getMemoryFile(file.path);
      setSelectedFile(file);
      setFileContent(data.content);
      setShowUpdateBanner(false);

      // Mark file as no longer new
      setMemoryFiles((prev) =>
        prev.map((f) => (f.path === file.path ? { ...f, isNew: false } : f))
      );
    } catch (error: any) {
      console.error('Failed to load memory file:', error);
    }
  }, []);

  const closeViewer = useCallback(() => {
    setSelectedFile(null);
    setFileContent('');
    setShowUpdateBanner(false);
  }, []);

  const reloadViewer = useCallback(() => {
    if (selectedFile) {
      viewFile(selectedFile);
    }
  }, [selectedFile, viewFile]);

  const handleClearMemory = useCallback(async () => {
    if (!confirm('Are you sure you want to clear all memories? This cannot be undone.')) {
      return;
    }

    try {
      await api.clearMemory();
      refreshMemoryFiles();
      closeViewer();
    } catch (error: any) {
      console.error('Failed to clear memories:', error);
    }
  }, [refreshMemoryFiles, closeViewer]);

  const triggerHDDLight = useCallback((type: 'read' | 'write') => {
    console.log(`[MEMORY_ANIMATION] Triggering HDD ${type} light`);
    if (type === 'read') {
      setReadLightActive(true);
      setTimeout(() => setReadLightActive(false), 1500);
    } else {
      setWriteLightActive(true);
      setTimeout(() => setWriteLightActive(false), 1500);
    }
  }, []);

  // Handle memory operations using custom hook
  useMemoryOperationHandler({
    setMemoryFiles,
    selectedFile,
    refreshMemoryFiles,
    closeViewer,
    triggerHDDLight,
    setShowUpdateBanner,
  });

  return (
    <div className="flex flex-col h-full border-l border-gray-200">
      <div className="flex-shrink-0 border-b border-gray-200 bg-gray-50 px-4 py-3">
        <div className="flex justify-between items-center">
          <h2 className="font-semibold flex items-center gap-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 16 16">
              <path d="M1 2.5A1.5 1.5 0 0 1 2.5 1h3.563a2 2 0 0 1 1.414.586l.647.646a.5.5 0 0 0 .354.146H14.5A1.5 1.5 0 0 1 16 4v7a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 0 11V2.5A1.5 1.5 0 0 1 1.5 1h.5a.5.5 0 0 1 0 1h-.5a.5.5 0 0 0-.5.5V11a.5.5 0 0 0 .5.5h13a.5.5 0 0 0 .5-.5V4a.5.5 0 0 0-.5-.5H6.854a1.5 1.5 0 0 1-1.06-.44L5.146 2.414A1 1 0 0 0 4.438 2H2.5a.5.5 0 0 0-.5.5V4h13V2.5z" />
            </svg>
            Memory Files
          </h2>
          <div className="flex gap-1">
            <button
              onClick={refreshMemoryFiles}
              className="p-2 text-gray-600 hover:bg-gray-200 rounded transition-colors"
              title="Refresh"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
                <path
                  fillRule="evenodd"
                  d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"
                />
                <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z" />
              </svg>
            </button>
            <button
              onClick={handleClearMemory}
              className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
              title="Clear All"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
                <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5Zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5Zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6Z" />
                <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1ZM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118ZM2.5 3h11V2h-11v1Z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Current Session Box */}
      <CurrentSessionBox />

      {/* Tool Call Console */}
      <ToolCallConsole />

      <div className="flex-1 overflow-y-auto p-3">
        {memoryFiles.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <svg className="w-16 h-16 mx-auto mb-2 text-gray-300" fill="currentColor" viewBox="0 0 16 16">
              <path d="M1 2.5A1.5 1.5 0 0 1 2.5 1h3.563a2 2 0 0 1 1.414.586l.647.646a.5.5 0 0 0 .354.146H14.5A1.5 1.5 0 0 1 16 4v7a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 0 11V2.5A1.5 1.5 0 0 1 1.5 1h.5a.5.5 0 0 1 0 1h-.5a.5.5 0 0 0-.5.5V11a.5.5 0 0 0 .5.5h13a.5.5 0 0 0 .5-.5V4a.5.5 0 0 0-.5-.5H6.854a1.5 1.5 0 0 1-1.06-.44L5.146 2.414A1 1 0 0 0 4.438 2H2.5a.5.5 0 0 0-.5.5V4h13V2.5z" />
            </svg>
            <p className="font-medium">No memory files yet</p>
            <p className="text-sm mt-1">Claude will create memory files as you chat</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {memoryFiles.map((file) => (
              <div
                key={file.path}
                onClick={() => viewFile(file)}
                className={`cursor-pointer border border-gray-200 rounded-lg p-2 hover:bg-gray-50 transition-colors ${
                  selectedFile?.path === file.path ? 'bg-blue-50 border-blue-500 border-l-4' : ''
                } ${file.isNew ? 'animate-slide-in-from-top' : ''}`}
              >
                {/* Line 1: File icon + name + new badge */}
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-500 shrink-0" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M5 4a.5.5 0 0 0 0 1h6a.5.5 0 0 0 0-1H5zm-.5 2.5A.5.5 0 0 1 5 6h6a.5.5 0 0 1 0 1H5a.5.5 0 0 1-.5-.5zM5 8a.5.5 0 0 0 0 1h6a.5.5 0 0 0 0-1H5zm0 2a.5.5 0 0 0 0 1h3a.5.5 0 0 0 0-1H5z" />
                    <path d="M2 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2zm10-1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1z" />
                  </svg>
                  <span className="font-medium text-sm truncate">{file.name}</span>
                  {file.isNew && (
                    <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium shrink-0">
                      new
                    </span>
                  )}
                </div>

                {/* Line 2: Timestamps + size (compact) */}
                <div className="flex items-center gap-3 mt-1 text-[11px] text-gray-500">
                  <span
                    className={`flex items-center gap-1 rounded px-1 -mx-1 ${
                      file.lastOperation === 'update' || file.lastOperation === 'create' ? 'animate-flash-write' : ''
                    }`}
                    title="Last modified"
                  >
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 16 16">
                      <path d="M12.854.146a.5.5 0 0 0-.707 0L10.5 1.793 14.207 5.5l1.647-1.646a.5.5 0 0 0 0-.708l-3-3zm.646 6.061L9.793 2.5 3.293 9H3.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.207l6.5-6.5zm-7.468 7.468A.5.5 0 0 1 6 13.5V13h-.5a.5.5 0 0 1-.5-.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.5-.5V10h-.5a.499.499 0 0 1-.175-.032l-.179.178a.5.5 0 0 0-.11.168l-2 5a.5.5 0 0 0 .65.65l5-2a.5.5 0 0 0 .168-.11l.178-.178z"/>
                    </svg>
                    {file.lastModifiedByLLM ? formatRelativeTime(file.lastModifiedByLLM) : '—'}
                  </span>
                  <span
                    className={`flex items-center gap-1 rounded px-1 -mx-1 ${
                      file.lastOperation === 'read' ? 'animate-flash-read' : ''
                    }`}
                    title="Last accessed"
                  >
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 16 16">
                      <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8zM1.173 8a13.133 13.133 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.133 13.133 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5c-2.12 0-3.879-1.168-5.168-2.457A13.134 13.134 0 0 1 1.172 8z"/>
                      <path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0z"/>
                    </svg>
                    {file.lastAccessedByLLM ? formatRelativeTime(file.lastAccessedByLLM) : '—'}
                  </span>
                  <span className="text-gray-400">
                    {file.size < 1024
                      ? `${file.size} B`
                      : `${(file.size / 1024).toFixed(1)} KB`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedFile && (
        <div className="flex-shrink-0 border-t border-gray-200 bg-white p-3">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-medium text-sm">{selectedFile.path}</h3>
            <button
              onClick={closeViewer}
              className="p-1 text-gray-500 hover:text-gray-700 rounded transition-colors"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
                <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854Z" />
              </svg>
            </button>
          </div>

          {/* HDD Lights Panel */}
          <div className="flex gap-6 justify-center py-3 px-4 mb-2 rounded bg-gradient-to-b from-gray-700 to-gray-800 border-b-2 border-gray-900">
            <div className="flex items-center gap-2">
              <div
                className={`w-4 h-4 rounded-full border-2 transition-all ${
                  readLightActive
                    ? 'bg-green-400 border-green-300 shadow-[0_0_8px_#4ade80,0_0_16px_#4ade80,0_0_24px_#22c55e,0_0_32px_#22c55e] animate-flicker'
                    : 'bg-gray-600 border-gray-500'
                }`}
              ></div>
              <span className={`text-[11px] font-bold tracking-wider transition-colors ${readLightActive ? 'text-green-400' : 'text-gray-400'}`}>READ</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className={`w-4 h-4 rounded-full border-2 transition-all ${
                  writeLightActive
                    ? 'bg-orange-400 border-orange-300 shadow-[0_0_8px_#fb923c,0_0_16px_#fb923c,0_0_24px_#f97316,0_0_32px_#f97316] animate-flicker'
                    : 'bg-gray-600 border-gray-500'
                }`}
              ></div>
              <span className={`text-[11px] font-bold tracking-wider transition-colors ${writeLightActive ? 'text-orange-400' : 'text-gray-400'}`}>WRITE</span>
            </div>
          </div>

          {/* Update Notification Banner */}
          {showUpdateBanner && (
            <div className="bg-blue-50 border border-blue-200 text-blue-800 px-3 py-2 mb-2 rounded text-sm">
              File was updated -{' '}
              <button onClick={reloadViewer} className="underline font-medium">
                click to refresh
              </button>
            </div>
          )}

          <pre className="border border-gray-300 rounded p-2 bg-gray-50 text-xs max-h-60 overflow-y-auto font-mono">
            {fileContent}
          </pre>
        </div>
      )}
    </div>
  );
}
