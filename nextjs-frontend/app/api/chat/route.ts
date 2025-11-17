import { NextRequest } from 'next/server';
import { getConversationManager } from '@/lib/server/global-state';

interface ChatRequest {
  message: string;
}

export async function POST(request: NextRequest) {
  const conversationManager = getConversationManager();

  if (!conversationManager) {
    return new Response(
      JSON.stringify({ detail: 'Session not initialized. Call /api/session/initialize first.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body: ChatRequest = await request.json();

    // Create a readable stream for SSE
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of conversationManager.sendMessageStreaming(body.message)) {
            // Format as SSE
            const eventData = JSON.stringify(event);
            const sseData = `data: ${eventData}\n\n`;
            controller.enqueue(encoder.encode(sseData));
          }
          controller.close();
        } catch (error: any) {
          console.error('Error in chat stream:', error);
          const errorEvent = JSON.stringify({
            type: 'error',
            data: { message: error.message }
          });
          controller.enqueue(encoder.encode(`data: ${errorEvent}\n\n`));
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      }
    });
  } catch (error: any) {
    console.error('Error in chat endpoint:', error);
    return new Response(
      JSON.stringify({ detail: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
