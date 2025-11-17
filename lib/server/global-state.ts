/**
 * Global state management for single-user POC
 * Stores the active conversation manager instance
 */

import { ConversationManager } from './conversation-manager';

// Global conversation manager (single-user POC)
let conversationManager: ConversationManager | null = null;

export function getConversationManager(): ConversationManager | null {
  return conversationManager;
}

export function setConversationManager(manager: ConversationManager | null): void {
  conversationManager = manager;
}

export function hasActiveSession(): boolean {
  return conversationManager !== null;
}
