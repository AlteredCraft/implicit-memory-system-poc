import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

export async function GET() {
  const sessionsDir = path.join(process.cwd(), '..', 'sessions');

  if (!fs.existsSync(sessionsDir)) {
    return NextResponse.json({ sessions: [] });
  }

  const sessions: any[] = [];
  const files = fs.readdirSync(sessionsDir)
    .filter(f => f.startsWith('session_') && f.endsWith('.json'))
    .sort()
    .reverse();

  for (const file of files) {
    try {
      const filePath = path.join(sessionsDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(content);

      // Get total tokens from last token_usage event
      let totalTokens = 0;
      const tokenEvents = data.events?.filter((e: any) => e.event_type === 'token_usage') || [];

      if (tokenEvents.length > 0) {
        const lastEvent = tokenEvents[tokenEvents.length - 1];
        const cumulative = lastEvent.cumulative || {};
        totalTokens = (cumulative.total_input_tokens || 0) + (cumulative.total_output_tokens || 0);
      }

      sessions.push({
        id: data.session_id || file.replace('.json', '').replace('session_', ''),
        filename: file,
        start_time: data.start_time,
        end_time: data.end_time,
        model: data.model,
        event_count: data.events?.length || 0,
        total_tokens: totalTokens
      });
    } catch (error) {
      console.error(`Error reading session ${file}:`, error);
    }
  }

  return NextResponse.json({ sessions });
}
