'use client';

import { useState, useEffect } from 'react';
import Chat from '@/components/Chat';
import MemoryBrowser from '@/components/MemoryBrowser';
import Sessions from '@/components/Sessions';
import SettingsModal from '@/components/SettingsModal';
import { api } from '@/lib/api';
import { storage } from '@/lib/utils';
import { SystemPrompt } from '@/types';
import { MemoryProvider } from '@/lib/contexts/MemoryContext';

export default function Home() {
  const [sessionActive, setSessionActive] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('claude-sonnet-4-5-20250929');
  const [systemPromptFile, setSystemPromptFile] = useState('');
  const [availablePrompts, setAvailablePrompts] = useState<SystemPrompt[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'not-initialized' | 'initializing' | 'connected' | 'error'>('not-initialized');
  const [activeTab, setActiveTab] = useState<'chat' | 'sessions'>('chat');
  const [envApiKeyAvailable, setEnvApiKeyAvailable] = useState(false);
  const [envApiKeyMasked, setEnvApiKeyMasked] = useState<string | null>(null);

  useEffect(() => {
    // Load settings from localStorage
    const savedApiKey = storage.get('anthropic_api_key', '');
    const savedModel = storage.get('anthropic_model', 'claude-sonnet-4-5-20250929');
    const savedPromptFile = storage.get('system_prompt_file', '');

    setApiKey(savedApiKey);
    setModel(savedModel);
    setSystemPromptFile(savedPromptFile);

    // Load available prompts and config
    loadAvailablePrompts();
    loadConfig();

    // Auto-initialize if settings are saved
    if (savedApiKey && savedPromptFile) {
      initializeSession(savedApiKey, savedModel, savedPromptFile);
    } else {
      // Will show settings after config is loaded (to know if env key exists)
      loadConfig().then((config) => {
        // If we have an env API key and a prompt file, we can auto-initialize
        if (config?.api_key_set && savedPromptFile) {
          initializeSession('', savedModel, savedPromptFile);
        } else {
          setShowSettings(true);
        }
      });
    }
  }, []);

  const loadAvailablePrompts = async () => {
    try {
      const data = await api.getPrompts();
      setAvailablePrompts(data.prompts || []);

      // Auto-select first prompt if none selected
      const savedPromptFile = storage.get('system_prompt_file', '');
      if (!savedPromptFile && data.prompts.length > 0) {
        setSystemPromptFile(data.prompts[0].path);
        storage.set('system_prompt_file', data.prompts[0].path);
      }
    } catch (error: any) {
      console.error('Failed to load prompts:', error);
    }
  };

  const loadConfig = async () => {
    try {
      const config = await api.getConfig();
      setEnvApiKeyAvailable(config.api_key_set || false);
      setEnvApiKeyMasked(config.env_api_key_masked || null);
      return config;
    } catch (error: any) {
      console.error('Failed to load config:', error);
      return null;
    }
  };

  const initializeSession = async (key: string, mdl: string, promptFile: string) => {
    setConnectionStatus('initializing');

    try {
      await api.initializeSession(key, mdl, promptFile);
      setSessionActive(true);
      setConnectionStatus('connected');
      console.log('Session initialized successfully');
    } catch (error: any) {
      console.error('Failed to initialize session:', error);
      setConnectionStatus('error');
      alert(`Failed to initialize: ${error.message}`);
    }
  };

  const handleSaveSettings = (key: string, mdl: string, promptFile: string) => {
    setApiKey(key);
    setModel(mdl);
    setSystemPromptFile(promptFile);

    storage.set('anthropic_api_key', key);
    storage.set('anthropic_model', mdl);
    storage.set('system_prompt_file', promptFile);

    initializeSession(key, mdl, promptFile);
    setShowSettings(false);
  };

  const getStatusBadge = () => {
    switch (connectionStatus) {
      case 'not-initialized':
        return (
          <span className="px-3 py-1 bg-gray-500 text-white text-sm rounded-full flex items-center gap-1">
            <span className="w-2 h-2 bg-white rounded-full"></span>
            Not Initialized
          </span>
        );
      case 'initializing':
        return (
          <span className="px-3 py-1 bg-yellow-500 text-white text-sm rounded-full flex items-center gap-1">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
            Initializing...
          </span>
        );
      case 'connected':
        return (
          <span className="px-3 py-1 bg-green-500 text-white text-sm rounded-full flex items-center gap-1">
            <span className="w-2 h-2 bg-white rounded-full"></span>
            Connected
          </span>
        );
      case 'error':
        return (
          <span className="px-3 py-1 bg-red-500 text-white text-sm rounded-full flex items-center gap-1">
            <span className="w-2 h-2 bg-white rounded-full"></span>
            Error
          </span>
        );
    }
  };

  return (
    <MemoryProvider>
      <div className="flex flex-col h-screen">
        {/* Top Navigation Bar */}
        <nav className="bg-gray-900 text-white shadow-lg flex-shrink-0">
        <div className="px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 16 16">
              <path d="M6.5 1A1.5 1.5 0 0 0 5 2.5V3H1.5A1.5 1.5 0 0 0 0 4.5v1.384l7.614 2.03a1.5 1.5 0 0 0 .772 0L16 5.884V4.5A1.5 1.5 0 0 0 14.5 3H11v-.5A1.5 1.5 0 0 0 9.5 1h-3zm0 1h3a.5.5 0 0 1 .5.5V3H6v-.5a.5.5 0 0 1 .5-.5z" />
              <path d="M0 12.5A1.5 1.5 0 0 0 1.5 14h13a1.5 1.5 0 0 0 1.5-1.5V6.85L8.129 8.947a.5.5 0 0 1-.258 0L0 6.85v5.65z" />
            </svg>
            <span className="text-xl font-semibold">Memory System v2</span>
          </div>
          <div className="flex items-center gap-3">
            {getStatusBadge()}
            <button
              onClick={() => setShowSettings(true)}
              className="px-3 py-1 border border-white hover:bg-white hover:text-gray-900 rounded transition-colors flex items-center gap-2 text-sm"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
                <path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492zM5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0z" />
                <path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52l-.094-.319z" />
              </svg>
              Settings
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel: Chat/Sessions */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Tabs */}
          <div className="border-b border-gray-200 bg-white flex-shrink-0">
            <div className="flex">
              <button
                onClick={() => setActiveTab('chat')}
                className={`px-6 py-3 font-medium border-b-2 transition-colors ${
                  activeTab === 'chat'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                <svg className="inline w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M2.678 11.894a1 1 0 0 1 .287.801 10.97 10.97 0 0 1-.398 2c1.395-.323 2.247-.697 2.634-.893a1 1 0 0 1 .71-.074A8.06 8.06 0 0 0 8 14c3.996 0 7-2.807 7-6 0-3.192-3.004-6-7-6S1 4.808 1 8c0 1.468.617 2.83 1.678 3.894zm-.493 3.905a21.682 21.682 0 0 1-.713.129c-.2.032-.352-.176-.273-.362a9.68 9.68 0 0 0 .244-.637l.003-.01c.248-.72.45-1.548.524-2.319C.743 11.37 0 9.76 0 8c0-3.866 3.582-7 8-7s8 3.134 8 7-3.582 7-8 7a9.06 9.06 0 0 1-2.347-.306c-.52.263-1.639.742-3.468 1.105z" />
                </svg>
                Chat
              </button>
              <button
                onClick={() => setActiveTab('sessions')}
                className={`px-6 py-3 font-medium border-b-2 transition-colors ${
                  activeTab === 'sessions'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                <svg className="inline w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M3 0h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2v-1h1v1a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v1H1V2a2 2 0 0 1 2-2z" />
                </svg>
                Sessions
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-hidden">
            {activeTab === 'chat' ? (
              <Chat sessionActive={sessionActive} />
            ) : (
              <Sessions />
            )}
          </div>
        </div>

        {/* Right Panel: Memory Browser */}
        <div className="w-96 flex-shrink-0">
          <MemoryBrowser />
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-3 shadow-lg flex-shrink-0 border-t border-gray-700">
        <div className="px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <img
                  src="/img/AC-logo.svg"
                  alt="AlteredCraft Logo"
                  className="h-9 bg-white p-0.5 rounded"
                />
                <span className="font-semibold">AlteredCraft</span>
              </div>
              <span className="text-gray-400 hidden md:inline">|</span>
              <small className="text-gray-400 hidden md:inline">
                Research app for{' '}
                <a
                  href="https://alteredcraft.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white hover:underline"
                >
                  AlteredCraft Substack
                </a>
              </small>
            </div>
            <a
              href="https://alteredcraft.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1 bg-white text-gray-900 rounded hover:bg-gray-100 transition-colors text-sm flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
                <path d="M0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V4Zm2-1a1 1 0 0 0-1 1v.217l7 4.2 7-4.2V4a1 1 0 0 0-1-1H2Zm13 2.383-4.708 2.825L15 11.105V5.383Zm-.034 6.876-5.64-3.471L8 9.583l-1.326-.795-5.64 3.47A1 1 0 0 0 2 13h12a1 1 0 0 0 .966-.741ZM1 11.105l4.708-2.897L1 5.383v5.722Z" />
              </svg>
              Subscribe
            </a>
          </div>
        </div>
      </footer>

        {/* Settings Modal */}
        <SettingsModal
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          onSave={handleSaveSettings}
          availablePrompts={availablePrompts}
          currentApiKey={apiKey}
          currentModel={model}
          currentPromptFile={systemPromptFile}
          envApiKeyAvailable={envApiKeyAvailable}
          envApiKeyMasked={envApiKeyMasked}
        />
      </div>
    </MemoryProvider>
  );
}
