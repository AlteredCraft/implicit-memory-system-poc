import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import { findSessionFileById } from '@/lib/server/session-utils';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Find session file by ID
  const sessionFile = findSessionFileById(id);

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
