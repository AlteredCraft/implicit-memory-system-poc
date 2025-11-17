import { NextResponse } from 'next/server';
import { getConversationManager } from '@/lib/server/global-state';

export async function DELETE() {
  const conversationManager = getConversationManager();

  if (!conversationManager) {
    return NextResponse.json(
      { detail: 'Session not initialized' },
      { status: 400 }
    );
  }

  const result = conversationManager.clearMemories();

  return NextResponse.json({ message: result });
}
