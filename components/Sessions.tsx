'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Session, SessionEvent } from '@/types';
import { formatTimestamp, calculateDuration, generateMermaidLiveEditorUrl } from '@/lib/utils';
import SessionDetailModal from './SessionDetailModal';
import SessionDiagramModal from './SessionDiagramModal';

export default function Sessions() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDiagramModal, setShowDiagramModal] = useState(false);
  const [diagram, setDiagram] = useState<string>('');
  const [isLoadingDiagram, setIsLoadingDiagram] = useState(false);

  const refreshSessions = async () => {
    try {
      const [sessionsData, currentData] = await Promise.all([
        api.getSessions(),
        api.getCurrentSession(),
      ]);
      setSessions(sessionsData.sessions || []);
      setCurrentSessionId(currentData.session_id);
    } catch (error: any) {
      console.error('Failed to load sessions:', error);
    }
  };

  useEffect(() => {
    refreshSessions();
  }, []);

  const viewSessionDetails = async (sessionId: string) => {
    try {
      const session = await api.getSession(sessionId);
      setSelectedSession(session);
      setShowDetailModal(true);
    } catch (error: any) {
      console.error('Failed to load session:', error);
      alert(`Failed to load session: ${error.message}`);
    }
  };

  const generateDiagram = async (sessionId: string) => {
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
  };

  const openInMermaidLiveEditor = () => {
    let mermaidCode = diagram;
    const mermaidMatch = diagram.match(/```mermaid\n([\s\S]*?)\n```/);
    if (mermaidMatch) {
      mermaidCode = mermaidMatch[1].trim();
    }

    const url = generateMermaidLiveEditorUrl(mermaidCode);
    window.open(url, '_blank');
  };

  return (
    <div className="p-4 h-full flex flex-col overflow-hidden">
      <div className="flex justify-between items-center mb-4 flex-shrink-0">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 16 16">
            <path d="M3 0h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2v-1h1v1a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v1H1V2a2 2 0 0 1 2-2z" />
            <path d="M1 5v-.5a.5.5 0 0 1 1 0V5h.5a.5.5 0 0 1 0 1h-2a.5.5 0 0 1 0-1H1zm0 3v-.5a.5.5 0 0 1 1 0V8h.5a.5.5 0 0 1 0 1h-2a.5.5 0 0 1 0-1H1zm0 3v-.5a.5.5 0 0 1 1 0v.5h.5a.5.5 0 0 1 0 1h-2a.5.5 0 0 1 0-1H1z" />
          </svg>
          Session History
        </h2>
        <button
          onClick={refreshSessions}
          className="px-3 py-1 text-sm border border-blue-600 text-blue-600 hover:bg-blue-50 rounded transition-colors flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
            <path
              fillRule="evenodd"
              d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"
            />
            <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z" />
          </svg>
          Refresh
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 min-h-0">
        {sessions.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <svg className="w-16 h-16 mx-auto mb-2 text-gray-300" fill="currentColor" viewBox="0 0 16 16">
              <path d="M3 0h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2v-1h1v1a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v1H1V2a2 2 0 0 1 2-2z" />
            </svg>
            <p className="font-medium">No sessions recorded yet</p>
            <p className="text-sm mt-1">Session traces are automatically saved when you chat</p>
          </div>
        ) : (
          sessions.map((session) => {
            const isActive = session.id === currentSessionId;

            return (
              <div
                key={session.id}
                className={`border rounded-lg p-3 ${
                  isActive ? 'border-green-500 border-2 bg-green-50' : 'border-gray-200'
                } hover:shadow-md transition-shadow`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="font-medium mb-1 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M3 0h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2v-1h1v1a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v1H1V2a2 2 0 0 1 2-2z" />
                      </svg>
                      {session.id}
                      {isActive && (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
                          Active
                        </span>
                      )}
                    </div>

                    <div className="text-sm text-gray-600 space-y-0.5">
                      <div>
                        <svg className="inline w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 16 16">
                          <path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5z" />
                        </svg>
                        {formatTimestamp(session.start_time)}
                      </div>
                      <div>
                        <svg className="inline w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 16 16">
                          <path d="M8.5 5.5a.5.5 0 0 0-1 0v3.362l-1.429 2.38a.5.5 0 1 0 .858.515l1.5-2.5A.5.5 0 0 0 8.5 9V5.5z" />
                          <path d="M6.5 0a.5.5 0 0 0 0 1H7v1.07a7.001 7.001 0 0 0-3.273 12.474l-.602.602a.5.5 0 0 0 .707.708l.746-.746A6.97 6.97 0 0 0 8 16a6.97 6.97 0 0 0 3.422-.892l.746.746a.5.5 0 0 0 .707-.708l-.601-.602A7.001 7.001 0 0 0 9 2.07V1h.5a.5.5 0 0 0 0-1h-3zm1.038 3.018a6.093 6.093 0 0 1 .924 0 6 6 0 1 1-.924 0zM0 3.5c0 .753.333 1.429.86 1.887A8.035 8.035 0 0 1 4.387 1.86 2.5 2.5 0 0 0 0 3.5zM13.5 1c-.753 0-1.429.333-1.887.86a8.035 8.035 0 0 1 3.527 3.527A2.5 2.5 0 0 0 13.5 1z" />
                        </svg>
                        Duration: {calculateDuration(session.start_time, session.end_time)}
                      </div>
                      <div>
                        <svg className="inline w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 16 16">
                          <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z" />
                          <path d="M5 6.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm.093 3.5H3.5a.5.5 0 0 1 0-1h1.586a1.5 1.5 0 0 0 1.06-.44l1.5-1.5a.5.5 0 0 1 .708 0l1.5 1.5a1.5 1.5 0 0 0 1.06.44H13.5a.5.5 0 0 1 0 1h-1.586a2.5 2.5 0 0 1-1.768-.732L9 8.232l-1.146 1.146a2.5 2.5 0 0 1-1.768.732h-.093a1.5 1.5 0 1 1 0-3h.093A1.5 1.5 0 0 0 7.354 6.5L8.5 5.354a.5.5 0 0 1 .708 0l1.5 1.5a1.5 1.5 0 0 0 1.06.44h1.732a.5.5 0 0 1 0 1h-1.732a2.5 2.5 0 0 1-1.768-.732L9 6.232 7.854 7.378a2.5 2.5 0 0 1-1.768.732h-.093z" />
                        </svg>
                        Model: {session.model}
                      </div>
                      <div>
                        <svg className="inline w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 16 16">
                          <path d="M2.5 1A1.5 1.5 0 0 0 1 2.5v11A1.5 1.5 0 0 0 2.5 15h6.086a1.5 1.5 0 0 0 1.06-.44l4.915-4.914A1.5 1.5 0 0 0 15 8.586V2.5A1.5 1.5 0 0 0 13.5 1h-11zM2 2.5a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 .5.5V8H9.5A1.5 1.5 0 0 0 8 9.5V14H2.5a.5.5 0 0 1-.5-.5v-11zm7 11.293V9.5a.5.5 0 0 1 .5-.5h4.293L9 13.793z" />
                        </svg>
                        {session.event_count} events | {session.total_tokens.toLocaleString()} tokens
                      </div>
                    </div>

                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={() => viewSessionDetails(session.id)}
                        className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center gap-1"
                      >
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 16 16">
                          <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8zM1.173 8a13.133 13.133 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.133 13.133 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5c-2.12 0-3.879-1.168-5.168-2.457A13.134 13.134 0 0 1 1.172 8z" />
                        </svg>
                        View Details
                      </button>
                      <button
                        onClick={() => generateDiagram(session.id)}
                        className="px-3 py-1 text-xs border border-gray-300 text-gray-700 rounded hover:bg-gray-100 transition-colors flex items-center gap-1"
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
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Session Detail Modal */}
      <SessionDetailModal
        isOpen={showDetailModal}
        session={selectedSession}
        onClose={() => setShowDetailModal(false)}
      />

      {/* Diagram Modal */}
      <SessionDiagramModal
        isOpen={showDiagramModal}
        diagram={diagram}
        isLoading={isLoadingDiagram}
        onClose={() => setShowDiagramModal(false)}
        onOpenInLiveEditor={openInMermaidLiveEditor}
      />
    </div>
  );
}
