'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { TokenUsage, StreamEvent } from '@/types';
import { useMemoryContext } from '@/lib/contexts/MemoryContext';

interface ChatProps {
  sessionActive: boolean;
  modelName: string;
}

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  toolUses?: string[];
}

export default function Chat({ sessionActive, modelName }: ChatProps) {
  const { triggerMemoryOperation } = useMemoryContext();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [tokens, setTokens] = useState<TokenUsage | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [currentAssistantMessage, setCurrentAssistantMessage] = useState<string>('');
  const [isTyping, setIsTyping] = useState(false);
  const [currentToolUses, setCurrentToolUses] = useState<string[]>([]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, currentAssistantMessage]);

  const addSystemMessage = useCallback((text: string, type: 'info' | 'warning' | 'danger' = 'info') => {
    setMessages((prev) => [...prev, { role: 'system', content: text }]);
  }, []);

  const handleStreamEvent = (event: StreamEvent) => {
    switch (event.type) {
      case 'thinking':
        console.log('Claude is thinking...');
        setIsTyping(true);
        break;

      case 'text':
        setCurrentAssistantMessage((prev) => prev + event.data);
        break;

      case 'memory_operation':
        console.log('[MEMORY_EVENTS] Received SSE event:', event.data);
        const { operation, path, timestamp } = event.data;
        console.log(`[MEMORY_EVENTS] Triggering memory operation via Context: ${operation}, ${path}`);
        triggerMemoryOperation({ operation, path, timestamp });
        break;

      case 'tool_use_start':
        setCurrentToolUses((prev) => [...prev, event.data.tool]);
        break;

      case 'done':
        setIsTyping(false);
        if (event.data.tokens) {
          setTokens(event.data.tokens);
        }
        // Finalize assistant message
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: currentAssistantMessage, toolUses: currentToolUses },
        ]);
        setCurrentAssistantMessage('');
        setCurrentToolUses([]);
        break;

      case 'error':
        setIsTyping(false);
        addSystemMessage(`Error: ${event.data.message}`, 'danger');
        setCurrentAssistantMessage('');
        setCurrentToolUses([]);
        break;

      default:
        console.log('Unknown event type:', event);
    }
  };

  const readStreamingResponse = async (response: Response) => {
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Failed to get response reader');
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let accumulatedText = ''; // Accumulate text locally
    let accumulatedTools: string[] = [];

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data.trim()) {
              try {
                const event = JSON.parse(data);

                // Handle text accumulation locally
                if (event.type === 'text') {
                  accumulatedText += event.data;
                  setCurrentAssistantMessage(accumulatedText);
                } else if (event.type === 'tool_use_start') {
                  accumulatedTools.push(event.data.tool);
                  setCurrentToolUses(accumulatedTools);
                } else if (event.type === 'done') {
                  // Use locally accumulated text for final message
                  setIsTyping(false);
                  if (event.data.tokens) {
                    setTokens(event.data.tokens);
                  }
                  setMessages((prev) => [
                    ...prev,
                    { role: 'assistant', content: accumulatedText, toolUses: accumulatedTools },
                  ]);
                  setCurrentAssistantMessage('');
                  setCurrentToolUses([]);
                } else {
                  // Handle other events normally
                  handleStreamEvent(event);
                }
              } catch (e) {
                console.error('Failed to parse event:', data, e);
              }
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  };

  const sendMessage = async () => {
    if (!sessionActive) {
      addSystemMessage('Session not initialized. Please configure settings first.', 'warning');
      return;
    }

    const message = inputValue.trim();
    if (!message || isStreaming) return;

    setInputValue('');
    setIsStreaming(true);
    setIsTyping(true);

    // Add user message
    setMessages((prev) => [...prev, { role: 'user', content: message }]);

    try {
      const response = await api.sendMessage(message);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      await readStreamingResponse(response);
    } catch (error: any) {
      console.error('Chat error:', error);
      addSystemMessage(`Error: ${error.message}`, 'danger');
      setIsTyping(false);
    } finally {
      setIsStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50 space-y-3">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'user' ? (
              <div className="max-w-[85%] bg-blue-600 text-white rounded-lg px-4 py-2 text-right">
                <div className="whitespace-pre-wrap break-words">{msg.content}</div>
              </div>
            ) : msg.role === 'system' ? (
              <div className="w-full bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg px-4 py-2 text-sm italic">
                {msg.content}
              </div>
            ) : (
              <div className="max-w-[85%] bg-white border border-gray-200 rounded-lg px-4 py-3">
                <div className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M6 12.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5ZM3 8.062C3 6.76 4.235 5.765 5.53 5.886a26.58 26.58 0 0 0 4.94 0C11.765 5.765 13 6.76 13 8.062v1.157a.933.933 0 0 1-.765.935c-.845.147-2.34.346-4.235.346-1.895 0-3.39-.2-4.235-.346A.933.933 0 0 1 3 9.219V8.062Zm4.542-.827a.25.25 0 0 0-.217.068l-.92.9a24.767 24.767 0 0 1-1.871-.183.25.25 0 0 0-.068.495c.55.076 1.232.149 2.02.193a.25.25 0 0 0 .189-.071l.754-.736.847 1.71a.25.25 0 0 0 .404.062l.932-.97a25.286 25.286 0 0 0 1.922-.188.25.25 0 0 0-.068-.495c-.538.074-1.207.145-1.98.189a.25.25 0 0 0-.166.076l-.754.785-.842-1.7a.25.25 0 0 0-.182-.135Z" />
                    <path d="M8.5 1.866a1 1 0 1 0-1 0V3h-2A4.5 4.5 0 0 0 1 7.5V8a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1v1a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-1a1 1 0 0 0 1-1V9a1 1 0 0 0-1-1v-.5A4.5 4.5 0 0 0 10.5 3h-2V1.866ZM14 7.5V13a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V7.5A3.5 3.5 0 0 1 5.5 4h5A3.5 3.5 0 0 1 14 7.5Z" />
                  </svg>
                  {modelName}
                </div>
                <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                {msg.toolUses && msg.toolUses.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {msg.toolUses.map((tool, i) => (
                      <div
                        key={i}
                        className="bg-blue-50 border-l-4 border-blue-500 px-3 py-2 text-sm font-mono"
                      >
                        <svg className="inline w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 16 16">
                          <path d="M1 0 0 1l2.2 3.081a1 1 0 0 0 .815.419h.07a1 1 0 0 1 .708.293l2.675 2.675-2.617 2.654A3.003 3.003 0 0 0 0 13a3 3 0 1 0 5.878-.851l2.654-2.617.968.968-.305.914a1 1 0 0 0 .242 1.023l3.27 3.27a.997.997 0 0 0 1.414 0l1.586-1.586a.997.997 0 0 0 0-1.414l-3.27-3.27a1 1 0 0 0-1.023-.242L10.5 9.5l-.96-.96 2.68-2.643A3.005 3.005 0 0 0 16 3c0-.269-.035-.53-.102-.777l-2.14 2.141L12 4l-.364-1.757L13.777.102a3 3 0 0 0-3.675 3.68L7.462 6.46 4.793 3.793a1 1 0 0 1-.293-.707v-.071a1 1 0 0 0-.419-.814L1 0Zm9.646 10.646a.5.5 0 0 1 .708 0l2.914 2.915a.5.5 0 0 1-.707.707l-2.915-2.914a.5.5 0 0 1 0-.708ZM3 11l.471.242.529.026.287.445.445.287.026.529L5 13l-.242.471-.026.529-.445.287-.287.445-.529.026L3 15l-.471-.242L2 14.732l-.287-.445L1.268 14l-.026-.529L1 13l.242-.471.026-.529.445-.287.287-.445.529-.026L3 11Z" />
                        </svg>
                        Using tool: <strong>{tool}</strong>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {/* Current streaming message */}
        {isTyping && (
          <div className="flex justify-start">
            <div className="max-w-[85%] bg-white border border-gray-200 rounded-lg px-4 py-3">
              <div className="font-semibold text-sm mb-2 flex items-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M6 12.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5ZM3 8.062C3 6.76 4.235 5.765 5.53 5.886a26.58 26.58 0 0 0 4.94 0C11.765 5.765 13 6.76 13 8.062v1.157a.933.933 0 0 1-.765.935c-.845.147-2.34.346-4.235.346-1.895 0-3.39-.2-4.235-.346A.933.933 0 0 1 3 9.219V8.062Zm4.542-.827a.25.25 0 0 0-.217.068l-.92.9a24.767 24.767 0 0 1-1.871-.183.25.25 0 0 0-.068.495c.55.076 1.232.149 2.02.193a.25.25 0 0 0 .189-.071l.754-.736.847 1.71a.25.25 0 0 0 .404.062l.932-.97a25.286 25.286 0 0 0 1.922-.188.25.25 0 0 0-.068-.495c-.538.074-1.207.145-1.98.189a.25.25 0 0 0-.166.076l-.754.785-.842-1.7a.25.25 0 0 0-.182-.135Z" />
                  <path d="M8.5 1.866a1 1 0 1 0-1 0V3h-2A4.5 4.5 0 0 0 1 7.5V8a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1v1a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-1a1 1 0 0 0 1-1V9a1 1 0 0 0-1-1v-.5A4.5 4.5 0 0 0 10.5 3h-2V1.866ZM14 7.5V13a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V7.5A3.5 3.5 0 0 1 5.5 4h5A3.5 3.5 0 0 1 14 7.5Z" />
                </svg>
                {modelName}
              </div>
              <div className="whitespace-pre-wrap break-words">{currentAssistantMessage}</div>
              {currentToolUses.length > 0 && (
                <div className="mt-2 space-y-1">
                  {currentToolUses.map((tool, i) => (
                    <div
                      key={i}
                      className="bg-blue-50 border-l-4 border-blue-500 px-3 py-2 text-sm font-mono"
                    >
                      <svg className="inline w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M1 0 0 1l2.2 3.081a1 1 0 0 0 .815.419h.07a1 1 0 0 1 .708.293l2.675 2.675-2.617 2.654A3.003 3.003 0 0 0 0 13a3 3 0 1 0 5.878-.851l2.654-2.617.968.968-.305.914a1 1 0 0 0 .242 1.023l3.27 3.27a.997.997 0 0 0 1.414 0l1.586-1.586a.997.997 0 0 0 0-1.414l-3.27-3.27a1 1 0 0 0-1.023-.242L10.5 9.5l-.96-.96 2.68-2.643A3.005 3.005 0 0 0 16 3c0-.269-.035-.53-.102-.777l-2.14 2.141L12 4l-.364-1.757L13.777.102a3 3 0 0 0-3.675 3.68L7.462 6.46 4.793 3.793a1 1 0 0 1-.293-.707v-.071a1 1 0 0 0-.419-.814L1 0Zm9.646 10.646a.5.5 0 0 1 .708 0l2.914 2.915a.5.5 0 0 1-.707.707l-2.915-2.914a.5.5 0 0 1 0-.708ZM3 11l.471.242.529.026.287.445.445.287.026.529L5 13l-.242.471-.026.529-.445.287-.287.445-.529.026L3 15l-.471-.242L2 14.732l-.287-.445L1.268 14l-.026-.529L1 13l.242-.471.026-.529.445-.287.287-.445.529-.026L3 11Z" />
                      </svg>
                      Using tool: <strong>{tool}</strong>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-1 mt-2">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></span>
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="border-t bg-white px-4 py-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!sessionActive || isStreaming}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            placeholder="Type your message..."
          />
          <button
            onClick={sendMessage}
            disabled={!sessionActive || isStreaming}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
              <path d="M15.964.686a.5.5 0 0 0-.65-.65L.767 5.855H.766l-.452.18a.5.5 0 0 0-.082.887l.41.26.001.002 4.995 3.178 3.178 4.995.002.002.26.41a.5.5 0 0 0 .886-.083l6-15Zm-1.833 1.89L6.637 10.07l-.215-.338a.5.5 0 0 0-.154-.154l-.338-.215 7.494-7.494 1.178-.471-.47 1.178Z" />
            </svg>
            Send
          </button>
        </div>
        <div className="mt-2">
          <small className="text-gray-500">
            {tokens
              ? `Tokens: ${tokens.total_input.toLocaleString()} in / ${tokens.total_output.toLocaleString()} out${tokens.total_cache_read > 0
                ? ` | Cache: ${tokens.total_cache_read.toLocaleString()} read`
                : ''
              }`
              : 'Tokens: 0 in / 0 out'}
          </small>
        </div>
      </div>
    </div>
  );
}
