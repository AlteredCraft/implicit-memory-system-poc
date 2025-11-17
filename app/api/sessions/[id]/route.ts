import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sessionsDir = path.join(process.cwd(), 'sessions');

  // Find session file by ID
  const files = fs.readdirSync(sessionsDir);
  let sessionFile: string | null = null;

  for (const file of files) {
    if (file.startsWith('session_') && file.endsWith('.json')) {
      const filePath = path.join(sessionsDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(content);

      if (data.session_id === id) {
        sessionFile = filePath;
        break;
      }
    }
  }

  if (!sessionFile) {
    return NextResponse.json(
      { detail: 'Session not found' },
      { status: 404 }
    );
  }

  try {
    const content = fs.readFileSync(sessionFile, 'utf-8');
    const data = JSON.parse(content);
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { detail: error.message },
      { status: 500 }
    );
  }
}
