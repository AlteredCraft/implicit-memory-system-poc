'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { Session } from '@/types';
import SessionDetailModal from './SessionDetailModal';
import SessionDiagramModal from './SessionDiagramModal';
import { generateMermaidLiveEditorUrl } from '@/lib/utils';

export default function CurrentSessionBox() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDiagramModal, setShowDiagramModal] = useState(false);
  const [diagram, setDiagram] = useState<string>('');
  const [isLoadingDiagram, setIsLoadingDiagram] = useState(false);
  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'error'>('connecting');

  // Listen to session change events via SSE
  useEffect(() => {
    console.log('[CurrentSessionBox] Connecting to session events...');
    setConnectionState('connecting');
    const eventSource = new EventSource('/api/session/events');

    eventSource.onopen = () => {
      console.log('[CurrentSessionBox] Connected to session events');
      setConnectionState('connected');
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'session_change') {
          console.log('[CurrentSessionBox] Session changed:', data.data.session_id);
          setSessionId(data.data.session_id);
        }
      } catch (error) {
        console.error('[CurrentSessionBox] Failed to parse session event:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('[CurrentSessionBox] SSE connection error:', error);
      setConnectionState('error');
      // EventSource will automatically try to reconnect
    };

    // Cleanup on unmount
    return () => {
      console.log('[CurrentSessionBox] Disconnecting from session events');
      eventSource.close();
    };
  }, []);

  const viewSessionDetails = useCallback(async () => {
    if (!sessionId) return;

    try {
      const session = await api.getSession(sessionId);
      setSelectedSession(session);
      setShowDetailModal(true);
    } catch (error: any) {
      console.error('Failed to load session:', error);
      alert(`Failed to load session: ${error.message}`);
    }
  }, [sessionId]);

  const generateDiagram = useCallback(async () => {
    if (!sessionId) return;

    setShowDiagramModal(true);
    setIsLoadingDiagram(true);

    try {
      const data = await api.generateDiagram(sessionId);
      setDiagram(data.diagram);
    } catch (error: any) {
      console.error('Failed to generate diagram:', error);
      setDiagram(`Error: ${error.message}`);
    } finally {
      setIsLoadingDiagram(false);
    }
  }, [sessionId]);

  const openInMermaidLiveEditor = useCallback(() => {
    let mermaidCode = diagram;
    const mermaidMatch = diagram.match(/```mermaid\n([\s\S]*?)\n```/);
    if (mermaidMatch) {
      mermaidCode = mermaidMatch[1].trim();
    }

    const url = generateMermaidLiveEditorUrl(mermaidCode);
    window.open(url, '_blank');
  }, [diagram]);

  return (
    <>
      {sessionId && (
        <div className="flex-shrink-0 mx-3 mt-3 rounded-lg overflow-hidden border border-gray-700/50">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-800">
            <span className="font-mono text-xs uppercase tracking-wider text-gray-300 font-medium">
              Session
            </span>
            <button
              onClick={viewSessionDetails}
              className="px-2 py-0.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center gap-1"
            >
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 16 16">
                <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8zM1.173 8a13.133 13.133 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.133 13.133 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5c-2.12 0-3.879-1.168-5.168-2.457A13.134 13.134 0 0 1 1.172 8z" />
              </svg>
              View Details
            </button>
            <button
              onClick={generateDiagram}
              className="px-2 py-0.5 text-xs border border-gray-300 text-gray-300 rounded hover:bg-gray-800 transition-colors flex items-center gap-1"
            >
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 16 16">
                <path
                  fillRule="evenodd"
                  d="M11 5a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM8 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm.256 7a4.474 4.474 0 0 1-.229-1.004H3c.001-.246.154-.986.832-1.664C4.484 10.68 5.711 10 8 10c.26 0 .507.009.74.025.226-.341.496-.65.804-.918C9.077 9.038 8.564 9 8 9c-5 0-6 3-6 4s1 1 1 1h5.256ZM16 12.5a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Zm-1.993-1.679a.5.5 0 0 0-.686.172l-1.17 1.95-.547-.547a.5.5 0 0 0-.708.708l.774.773a.75.75 0 0 0 1.174-.144l1.335-2.226a.5.5 0 0 0-.172-.686Z"
                />
              </svg>
              View Diagram
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      <SessionDetailModal
        isOpen={showDetailModal}
        session={selectedSession}
        onClose={() => setShowDetailModal(false)}
      />

      <SessionDiagramModal
        isOpen={showDiagramModal}
        diagram={diagram}
        isLoading={isLoadingDiagram}
        onClose={() => setShowDiagramModal(false)}
        onOpenInLiveEditor={openInMermaidLiveEditor}
      />
    </>
  );
}
