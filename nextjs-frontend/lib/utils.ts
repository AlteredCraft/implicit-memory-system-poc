// Utility functions for Memory System v2

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// LocalStorage utilities
export const storage = {
  get(key: string, defaultValue: any = null) {
    if (typeof window === 'undefined') return defaultValue;
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return localStorage.getItem(key) || defaultValue;
    }
  },

  set(key: string, value: any) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
    }
  },

  remove(key: string) {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(key);
  },
};

// Time formatting utilities
export function formatTimestamp(timestamp: string | undefined): string {
  if (!timestamp) return 'Unknown';
  const date = new Date(timestamp);
  return date.toLocaleString();
}

export function formatRelativeTime(timestamp: string): string {
  const now = new Date();
  const time = new Date(timestamp);
  const diffMs = now.getTime() - time.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 10) return 'just now';
  if (diffSec < 60) return `${diffSec} seconds ago`;
  if (diffMin < 60) return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
  if (diffHour < 24) return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
  return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
}

export function calculateDuration(startTime: string | undefined, endTime: string | undefined): string {
  if (!startTime) return 'Unknown';
  if (!endTime) return 'In progress';

  const start = new Date(startTime);
  const end = new Date(endTime);
  const durationMs = end.getTime() - start.getTime();

  const minutes = Math.floor(durationMs / 60000);
  const seconds = Math.floor((durationMs % 60000) / 1000);

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

// HTML escaping
export function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Mermaid Live Editor URL generation
export function generateMermaidLiveEditorUrl(mermaidCode: string): string {
  const state = {
    code: mermaidCode,
    mermaid: {
      theme: 'default',
    },
    updateEditor: false,
    autoSync: true,
    updateDiagram: true,
  };

  try {
    const jsonString = JSON.stringify(state);
    const base64 = btoa(
      encodeURIComponent(jsonString).replace(/%([0-9A-F]{2})/g, function toSolidBytes(match, p1) {
        return String.fromCharCode(parseInt('0x' + p1, 16));
      })
    );
    return `https://mermaid.live/edit#base64:${base64}`;
  } catch (e) {
    console.warn('Base64 encoding failed, diagram may be too large for URL');
    return 'https://mermaid.live/edit';
  }
}
