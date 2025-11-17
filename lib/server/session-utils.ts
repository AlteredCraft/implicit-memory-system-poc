/**
 * Utility functions for session management
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Find a session file by session ID
 * @param sessionId The session ID to search for
 * @returns The full path to the session file, or null if not found
 */
export function findSessionFileById(sessionId: string): string | null {
  const sessionsDir = path.join(process.cwd(), 'sessions');

  if (!fs.existsSync(sessionsDir)) {
    return null;
  }

  const files = fs.readdirSync(sessionsDir);

  for (const file of files) {
    if (file.startsWith('session_') && file.endsWith('.json')) {
      const filePath = path.join(sessionsDir, file);
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const data = JSON.parse(content);

        if (data.session_id === sessionId) {
          return filePath;
        }
      } catch (error) {
        // Skip malformed JSON files
        console.error(`Error reading session file ${file}:`, error);
        continue;
      }
    }
  }

  return null;
}
