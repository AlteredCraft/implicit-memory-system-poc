import { NextResponse } from 'next/server';
import { hasActiveSession } from '@/lib/server/global-state';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    session_active: hasActiveSession()
  });
}
