import { NextRequest } from 'next/server';
import { onSessionChange } from '@/lib/server/global-state';

/**
 * SSE endpoint that streams session change events
 * Clients can connect to this endpoint to receive real-time notifications
 * when the session ID changes (on init or memory clear)
 */
export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();

  // Create a ReadableStream for SSE
  const stream = new ReadableStream({
    start(controller) {
      console.log('[SESSION_EVENTS] Client connected');
      let keepAliveInterval: NodeJS.Timeout | null = null;

      // Helper to safely enqueue data
      const safeEnqueue = (data: string) => {
        try {
          controller.enqueue(encoder.encode(data));
        } catch (error) {
          console.error('[SESSION_EVENTS] Failed to enqueue data:', error);
        }
      };

      // Register session change listener
      const unsubscribe = onSessionChange((sessionId) => {
        console.log(`[SESSION_EVENTS] Emitting session change: ${sessionId}`);

        // Format as SSE event
        const event = {
          type: 'session_change',
          data: { session_id: sessionId }
        };

        const sseData = `data: ${JSON.stringify(event)}\n\n`;
        safeEnqueue(sseData);
      });

      // Send keepalive comments every 30 seconds to prevent connection timeout
      keepAliveInterval = setInterval(() => {
        safeEnqueue(': keepalive\n\n');
      }, 30000);

      // Handle client disconnect
      request.signal.addEventListener('abort', () => {
        console.log('[SESSION_EVENTS] Client disconnected');
        if (keepAliveInterval) {
          clearInterval(keepAliveInterval);
        }
        unsubscribe();
        try {
          controller.close();
        } catch (error) {
          // Controller may already be closed
        }
      });
    }
  });

  // Return SSE response
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
