'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Session, SessionEvent } from '@/types';
import { formatTimestamp, calculateDuration, generateMermaidLiveEditorUrl } from '@/lib/utils';

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

  const renderEvent = (event: SessionEvent, index: number) => {
    const timestamp = new Date(event.timestamp).toLocaleTimeString();
    const eventDetails = event.details || {};

    const eventIcons: Record<string, string> = {
      user_input: 'person',
      llm_request: 'send',
      llm_response: 'robot',
      tool_call: 'wrench',
      tool_result: 'check-circle',
      token_usage: 'speedometer',
      error: 'exclamation-triangle',
    };

    const eventColors: Record<string, string> = {
      user_input: 'bg-blue-100 text-blue-800',
      llm_request: 'bg-cyan-100 text-cyan-800',
      llm_response: 'bg-green-100 text-green-800',
      tool_call: 'bg-yellow-100 text-yellow-800',
      tool_result: 'bg-green-100 text-green-800',
      token_usage: 'bg-cyan-100 text-cyan-800',
      error: 'bg-red-100 text-red-800',
    };

    let details = '';

    switch (event.event_type) {
      case 'user_input':
        if (eventDetails.message) {
          details = eventDetails.message;
        }
        break;
      case 'llm_response':
        if (eventDetails.response) {
          details = eventDetails.response;
        }
        break;
      case 'tool_result':
        if (eventDetails.result) {
          details = eventDetails.result;
        }
        break;
      case 'error':
        details = `${eventDetails.error_type || 'Error'}: ${eventDetails.message || 'Unknown error'}`;
        break;
    }

    return (
      <div key={index} className="border-b border-gray-200 last:border-0 py-2">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <span
              className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                eventColors[event.event_type] || 'bg-gray-100 text-gray-800'
              }`}
            >
              {event.event_type}
            </span>
            <span className="text-xs text-gray-500 ml-2">{timestamp}</span>
            {details && (
              <div className="mt-1 text-sm text-gray-700">
                <strong>
                  {event.event_type === 'user_input'
                    ? 'Input:'
                    : event.event_type === 'llm_response'
                    ? 'Response:'
                    : ''}
                </strong>{' '}
                {details}
              </div>
            )}
          </div>
        </div>
      </div>
    );
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
      {showDetailModal && selectedSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="border-b px-6 py-4 flex justify-between items-center flex-shrink-0">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M3 0h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2v-1h1v1a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v1H1V2a2 2 0 0 1 2-2z" />
                </svg>
                Session Details
              </h2>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
              >
                &times;
              </button>
            </div>

            <div className="px-6 py-4 overflow-y-auto flex-1">
              <div className="mb-4">
                <h3 className="font-semibold mb-2">Session Information</h3>
                <table className="w-full text-sm">
                  <tbody>
                    <tr className="border-b">
                      <td className="py-2 font-medium">Session ID:</td>
                      <td className="py-2">{selectedSession.session_id || selectedSession.id}</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 font-medium">Model:</td>
                      <td className="py-2">{selectedSession.model}</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 font-medium">Start Time:</td>
                      <td className="py-2">{formatTimestamp(selectedSession.start_time)}</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 font-medium">End Time:</td>
                      <td className="py-2">
                        {selectedSession.end_time
                          ? formatTimestamp(selectedSession.end_time)
                          : 'In progress'}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 font-medium">Events:</td>
                      <td className="py-2">{selectedSession.events?.length || 0}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {selectedSession.system_prompt && (
                <div className="mb-4">
                  <h3 className="font-semibold mb-2">System Prompt</h3>
                  <pre className="border border-gray-300 rounded p-2 bg-gray-50 text-xs max-h-48 overflow-y-auto">
                    {selectedSession.system_prompt}
                  </pre>
                </div>
              )}

              <div>
                <h3 className="font-semibold mb-2">Events Timeline</h3>
                <div className="border border-gray-200 rounded max-h-96 overflow-y-auto">
                  {selectedSession.events?.map((event, idx) => renderEvent(event, idx))}
                </div>
              </div>
            </div>

            <div className="border-t px-6 py-4 flex justify-end flex-shrink-0">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Diagram Modal */}
      {showDiagramModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="border-b px-6 py-4 flex justify-between items-center flex-shrink-0">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 16 16">
                  <path
                    fillRule="evenodd"
                    d="M11 5a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM8 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm.256 7a4.474 4.474 0 0 1-.229-1.004H3c.001-.246.154-.986.832-1.664C4.484 10.68 5.711 10 8 10c.26 0 .507.009.74.025.226-.341.496-.65.804-.918C9.077 9.038 8.564 9 8 9c-5 0-6 3-6 4s1 1 1 1h5.256ZM16 12.5a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Zm-1.993-1.679a.5.5 0 0 0-.686.172l-1.17 1.95-.547-.547a.5.5 0 0 0-.708.708l.774.773a.75.75 0 0 0 1.174-.144l1.335-2.226a.5.5 0 0 0-.172-.686Z"
                  />
                </svg>
                Sequence Diagram
              </h2>
              <button
                onClick={() => setShowDiagramModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
              >
                &times;
              </button>
            </div>

            <div className="px-6 py-4 overflow-y-auto flex-1">
              {isLoadingDiagram ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-3"></div>
                  <p>Generating Mermaid sequence diagram...</p>
                </div>
              ) : (
                <>
                  <div className="bg-blue-50 border border-blue-200 text-blue-800 p-3 rounded mb-3 flex justify-between items-center">
                    <div>
                      <strong>Mermaid Sequence Diagram Generated</strong>
                      <br />
                      <small>
                        Click "View in Live Editor" to see the rendered diagram with full interactive
                        features.
                      </small>
                    </div>
                    <button
                      onClick={openInMermaidLiveEditor}
                      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
                        <path
                          fillRule="evenodd"
                          d="M11 5a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM8 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm.256 7a4.474 4.474 0 0 1-.229-1.004H3c.001-.246.154-.986.832-1.664C4.484 10.68 5.711 10 8 10c.26 0 .507.009.74.025.226-.341.496-.65.804-.918C9.077 9.038 8.564 9 8 9c-5 0-6 3-6 4s1 1 1 1h5.256ZM16 12.5a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Zm-1.993-1.679a.5.5 0 0 0-.686.172l-1.17 1.95-.547-.547a.5.5 0 0 0-.708.708l.774.773a.75.75 0 0 0 1.174-.144l1.335-2.226a.5.5 0 0 0-.172-.686Z"
                        />
                      </svg>
                      View in Live Editor
                    </button>
                  </div>

                  <div className="mb-2 font-semibold">Mermaid Source Code:</div>
                  <pre className="border border-gray-300 rounded p-3 bg-gray-50 text-xs overflow-y-auto max-h-96 font-mono">
                    {diagram}
                  </pre>
                </>
              )}
            </div>

            <div className="border-t px-6 py-4 flex justify-end flex-shrink-0">
              <button
                onClick={() => setShowDiagramModal(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
