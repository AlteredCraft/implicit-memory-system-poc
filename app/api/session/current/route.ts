import { NextResponse } from 'next/server';
import { getConversationManager } from '@/lib/server/global-state';

export async function GET() {
  const conversationManager = getConversationManager();

  if (!conversationManager) {
    return NextResponse.json({ session_id: null });
  }

  return NextResponse.json({
    session_id: conversationManager.getSessionId()
  });
}
