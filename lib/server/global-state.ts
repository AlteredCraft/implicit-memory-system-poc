/**
 * Global state management for single-user POC
 * Stores the active conversation manager instance and notifies listeners of session changes
 */

import { ConversationManager } from './conversation-manager';

// Global conversation manager (single-user POC)
let conversationManager: ConversationManager | null = null;

// Session change listeners (for real-time UI updates)
export type SessionChangeListener = (sessionId: string | null) => void;
const sessionChangeListeners = new Set<SessionChangeListener>();

// Track last notified session ID to avoid redundant notifications
let lastNotifiedSessionId: string | null = null;

export function getConversationManager(): ConversationManager | null {
  return conversationManager;
}

export function setConversationManager(manager: ConversationManager | null): void {
  conversationManager = manager;

  // Notify all listeners of the session change
  const sessionId = manager ? manager.getSessionId() : null;
  notifySessionChange(sessionId);
}

export function hasActiveSession(): boolean {
  return conversationManager !== null;
}

/**
 * Register a listener for session changes
 * Returns an unsubscribe function
 */
export function onSessionChange(listener: SessionChangeListener): () => void {
  sessionChangeListeners.add(listener);

  // Immediately notify with current session ID
  const currentSessionId = conversationManager ? conversationManager.getSessionId() : null;
  listener(currentSessionId);

  // Return unsubscribe function
  return () => {
    sessionChangeListeners.delete(listener);
  };
}

/**
 * Notify all listeners of a session change
 * Optimized to skip notification if session ID hasn't changed
 */
function notifySessionChange(sessionId: string | null): void {
  // Skip notification if session ID hasn't changed
  if (sessionId === lastNotifiedSessionId) {
    return;
  }

  lastNotifiedSessionId = sessionId;
  console.log(`[GLOBAL_STATE] Session changed: ${sessionId}`);

  sessionChangeListeners.forEach(listener => {
    try {
      listener(sessionId);
    } catch (error) {
      console.error('[GLOBAL_STATE] Error in session change listener:', error);
    }
  });
}

/**
 * Manually trigger session change notification without re-setting the manager
 * Used when session ID changes but the manager instance stays the same
 */
export function triggerSessionChange(sessionId: string): void {
  notifySessionChange(sessionId);
}
