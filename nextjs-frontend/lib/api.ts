// API utility functions for Memory System v2

const API_BASE = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8888';

export const api = {
  // Session endpoints
  async initializeSession(apiKey: string, model: string, systemPromptFile: string) {
    const response = await fetch(`${API_BASE}/api/session/initialize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        model: model,
        system_prompt_file: systemPromptFile,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to initialize session');
    }

    return response.json();
  },

  async getSessionStatus() {
    const response = await fetch(`${API_BASE}/api/session/status`);
    return response.json();
  },

  async getCurrentSession() {
    const response = await fetch(`${API_BASE}/api/session/current`);
    return response.json();
  },

  // Memory endpoints
  async getMemoryFiles() {
    const response = await fetch(`${API_BASE}/api/memory/files`);
    return response.json();
  },

  async getMemoryFile(path: string) {
    const response = await fetch(`${API_BASE}/api/memory/files/${encodeURIComponent(path)}`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return response.json();
  },

  async clearMemory() {
    const response = await fetch(`${API_BASE}/api/memory/clear`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Failed to clear memories');
    }

    return response.json();
  },

  // Sessions endpoints
  async getSessions() {
    const response = await fetch(`${API_BASE}/api/sessions`);
    return response.json();
  },

  async getSession(sessionId: string) {
    const response = await fetch(`${API_BASE}/api/sessions/${encodeURIComponent(sessionId)}`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return response.json();
  },

  async generateDiagram(sessionId: string) {
    const response = await fetch(
      `${API_BASE}/api/sessions/${encodeURIComponent(sessionId)}/diagram`,
      {
        method: 'POST',
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return response.json();
  },

  // Prompts endpoints
  async getPrompts() {
    const response = await fetch(`${API_BASE}/api/prompts`);
    return response.json();
  },

  async getPrompt(name: string) {
    const response = await fetch(`${API_BASE}/api/prompts/${encodeURIComponent(name)}`);
    return response.json();
  },

  // Config endpoints
  async getConfig() {
    const response = await fetch(`${API_BASE}/api/config`);
    return response.json();
  },

  // Health endpoint
  async getHealth() {
    const response = await fetch(`${API_BASE}/api/health`);
    return response.json();
  },

  // Chat streaming endpoint
  async sendMessage(message: string) {
    return fetch(`${API_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    });
  },
};
