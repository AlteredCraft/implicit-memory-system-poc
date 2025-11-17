import { NextRequest, NextResponse } from 'next/server';
import { ConversationManager } from '@/lib/server/conversation-manager';
import { getConversationManager, setConversationManager } from '@/lib/server/global-state';
import { loadSystemPrompt } from '@/lib/server/prompts';
import * as path from 'path';

interface SessionInitializeRequest {
  api_key: string;
  model: string;
  system_prompt_file: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: SessionInitializeRequest = await request.json();

    // Finalize existing session if any
    const existingManager = getConversationManager();
    if (existingManager) {
      existingManager.finalize();
    }

    // Validate API key
    if (!body.api_key) {
      return NextResponse.json(
        { detail: 'API key required' },
        { status: 400 }
      );
    }

    // Load system prompt
    let systemPrompt: string;
    try {
      const promptPath = path.join(process.cwd(), body.system_prompt_file);
      systemPrompt = loadSystemPrompt(promptPath);
    } catch (error: any) {
      return NextResponse.json(
        { detail: `Failed to load prompt: ${error.message}` },
        { status: 400 }
      );
    }

    // Create new conversation manager
    const conversationManager = new ConversationManager(
      body.api_key,
      body.model,
      systemPrompt
    );

    setConversationManager(conversationManager);

    return NextResponse.json({
      status: 'initialized',
      model: body.model,
      prompt_file: body.system_prompt_file
    });
  } catch (error: any) {
    console.error('Error initializing session:', error);
    return NextResponse.json(
      { detail: error.message },
      { status: 500 }
    );
  }
}
