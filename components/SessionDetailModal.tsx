'use client';

import { Session, SessionEvent } from '@/types';
import { formatTimestamp, calculateDuration } from '@/lib/utils';

interface SessionDetailModalProps {
  isOpen: boolean;
  session: Session | null;
  onClose: () => void;
}

export default function SessionDetailModal({ isOpen, session, onClose }: SessionDetailModalProps) {
  if (!isOpen || !session) return null;

  const renderEvent = (event: SessionEvent, index: number) => {
    const timestamp = new Date(event.timestamp).toLocaleTimeString();
    const eventDetails = event.details || {};

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
            onClick={onClose}
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
                  <td className="py-2">{session.session_id || session.id}</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 font-medium">Model:</td>
                  <td className="py-2">{session.model}</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 font-medium">Start Time:</td>
                  <td className="py-2">{formatTimestamp(session.start_time)}</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 font-medium">End Time:</td>
                  <td className="py-2">
                    {session.end_time
                      ? formatTimestamp(session.end_time)
                      : 'In progress'}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 font-medium">Events:</td>
                  <td className="py-2">{session.events?.length || 0}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {session.system_prompt && (
            <div className="mb-4">
              <h3 className="font-semibold mb-2">System Prompt</h3>
              <pre className="border border-gray-300 rounded p-2 bg-gray-50 text-xs max-h-48 overflow-y-auto">
                {session.system_prompt}
              </pre>
            </div>
          )}

          <div>
            <h3 className="font-semibold mb-2">Events Timeline</h3>
            <div className="border border-gray-200 rounded max-h-96 overflow-y-auto">
              {session.events?.map((event, idx) => renderEvent(event, idx))}
            </div>
          </div>
        </div>

        <div className="border-t px-6 py-4 flex justify-end flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
