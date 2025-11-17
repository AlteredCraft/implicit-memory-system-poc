import { NextResponse } from 'next/server';
import { getConversationManager } from '@/lib/server/global-state';

export async function GET() {
  const conversationManager = getConversationManager();

  if (!conversationManager) {
    return NextResponse.json({ active: false });
  }

  return NextResponse.json({
    active: true,
    model: conversationManager['model'],
    tokens: conversationManager.getTokenStats(),
    message_count: conversationManager.getMessageCount()
  });
}
