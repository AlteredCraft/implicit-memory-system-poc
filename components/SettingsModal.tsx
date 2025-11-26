'use client';

import { useState, useEffect } from 'react';
import { SystemPrompt } from '@/types';
import { api } from '@/lib/api';

interface Model {
  id: string;
  name: string;
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (apiKey: string, model: string, promptFile: string) => void;
  availablePrompts: SystemPrompt[];
  currentApiKey: string;
  currentModel: string;
  currentPromptFile: string;
  envApiKeyAvailable: boolean;
  envApiKeyMasked: string | null;
}

export default function SettingsModal({
  isOpen,
  onClose,
  onSave,
  availablePrompts,
  currentApiKey,
  currentModel,
  currentPromptFile,
  envApiKeyAvailable,
  envApiKeyMasked,
}: SettingsModalProps) {
  const [apiKey, setApiKey] = useState(currentApiKey);
  const [model, setModel] = useState(currentModel);
  const [promptFile, setPromptFile] = useState(currentPromptFile);
  const [error, setError] = useState('');
  const [models, setModels] = useState<Model[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setApiKey(currentApiKey);
    setModel(currentModel);
    setPromptFile(currentPromptFile);
  }, [currentApiKey, currentModel, currentPromptFile, isOpen]);

  useEffect(() => {
    const fetchModels = async () => {
      try {
        const data = await api.getModels();
        setModels(data.models || []);

        // If current model is not in the list, add it
        if (data.models && !data.models.some((m: Model) => m.id === model)) {
          setModels((prev) => [
            ...prev,
            { id: model, name: model.split('/').pop()?.replace(/-/g, ' ') || model },
          ]);
        }
      } catch (err) {
        console.error('Failed to load models:', err);
        // Fallback to default models if API fails
        setModels([
          { id: 'claude-sonnet-4-5-20250929', name: 'Claude Sonnet 4.5' },
          { id: 'claude-opus-4-5-20250514', name: 'Claude Opus 4.5' },
          { id: 'claude-haiku-3-5-20241022', name: 'Claude Haiku 3.5' },
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchModels();
  }, [model]);

  const handleSave = () => {
    if (!apiKey.trim() && !envApiKeyAvailable) {
      setError('API key is required');
      setTimeout(() => setError(''), 5000);
      return;
    }

    if (!promptFile) {
      setError('System prompt is required');
      setTimeout(() => setError(''), 5000);
      return;
    }

    onSave(apiKey.trim(), model, promptFile);
    setError('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 16 16">
              <path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492zM5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0z" />
              <path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52l-.094-.319z" />
            </svg>
            Settings
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
          >
            &times;
          </button>
        </div>

        <div className="px-6 py-4 space-y-4">
          <div>
            <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 mb-1">
              Anthropic API Key
            </label>
            <input
              id="apiKey"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="sk-ant-..."
            />
            {/* API Key Status Indicator */}
            <div className="mt-2 space-y-1">
              {apiKey ? (
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1.5 text-xs">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    <span className="text-green-700 font-medium">User-supplied key configured</span>
                  </span>
                </div>
              ) : envApiKeyAvailable ? (
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1.5 text-xs">
                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                    <span className="text-blue-700 font-medium">
                      Environment key available: <code className="bg-blue-50 px-1 rounded">{envApiKeyMasked}</code>
                    </span>
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1.5 text-xs">
                    <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                    <span className="text-red-700 font-medium">No API key configured</span>
                  </span>
                </div>
              )}
              <p className="text-xs text-gray-500">
                {apiKey
                  ? 'Stored locally in browser'
                  : envApiKeyAvailable
                    ? 'Enter a key above to override the environment variable'
                    : 'Enter your API key to get started'}
              </p>
            </div>
          </div>

          <div>
            <label htmlFor="model" className="block text-sm font-medium text-gray-700 mb-1">
              Model
            </label>
            <select
              id="model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={isLoading}
            >
              {isLoading ? (
                <option>Loading models...</option>
              ) : models.length > 0 ? (
                models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))
              ) : (
                <option value="">No models available</option>
              )}
            </select>
          </div>

          <div>
            <label htmlFor="promptFile" className="block text-sm font-medium text-gray-700 mb-1">
              System Prompt
            </label>
            <select
              id="promptFile"
              value={promptFile}
              onChange={(e) => setPromptFile(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {availablePrompts.length === 0 ? (
                <option value="">Loading prompts...</option>
              ) : (
                availablePrompts.map((prompt) => (
                  <option key={prompt.path} value={prompt.path}>
                    {prompt.name}
                  </option>
                ))
              )}
            </select>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
              {error}
            </div>
          )}
        </div>

        <div className="border-t px-6 py-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
          >
            Initialize Session
          </button>
        </div>
      </div>
    </div>
  );
}
