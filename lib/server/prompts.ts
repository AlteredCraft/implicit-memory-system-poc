/**
 * Prompt loading utilities
 * Handles loading system prompts from files with comment stripping and date appending
 */

import * as fs from 'fs';
import * as path from 'path';

export function loadSystemPrompt(promptFile: string): string {
  /**
   * Load system prompt from file, stripping comment lines and appending current date.
   */
  try {
    const content = fs.readFileSync(promptFile, 'utf-8');
    const lines: string[] = [];

    for (const line of content.split('\n')) {
      const stripped = line.trim();
      if (stripped && !stripped.startsWith('#')) {
        lines.push(line.trimEnd());
      } else if (!stripped) {
        lines.push('');
      }
    }

    let prompt = lines.join('\n').trim();

    // Append current date/time
    const currentDate = new Date().toISOString().replace('T', ' ').substring(0, 19);
    prompt += `\n\nToday's date is: ${currentDate}`;

    return prompt;
  } catch (error: any) {
    console.error(`System prompt file not found: ${promptFile}`);
    throw error;
  }
}

export interface PromptInfo {
  name: string;
  path: string;
  filename: string;
}

export function getAvailablePrompts(promptsDir: string = 'prompts'): PromptInfo[] {
  /**
   * Get list of available system prompts.
   */
  if (!fs.existsSync(promptsDir)) {
    return [];
  }

  const files = fs.readdirSync(promptsDir);
  const promptFiles = files
    .filter(f => f.endsWith('.txt'))
    .sort()
    .map(f => ({
      name: path.basename(f, '.txt'),
      path: path.join(promptsDir, f),
      filename: f
    }));

  return promptFiles;
}
