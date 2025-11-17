/**
 * Next.js API Route Proxy
 *
 * This catch-all route proxies all /api/* requests to the FastAPI backend.
 * This avoids CORS issues and keeps the backend URL server-side.
 */

import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8888';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const apiPath = path.join('/');
  const url = `${BACKEND_URL}/api/${apiPath}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error(`Proxy error for GET /api/${apiPath}:`, error);
    return NextResponse.json(
      { error: 'Backend connection failed. Is the FastAPI server running on port 8888?' },
      { status: 503 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const apiPath = path.join('/');
  const url = `${BACKEND_URL}/api/${apiPath}`;

  try {
    const body = await request.text();

    // Check if this is a streaming endpoint (chat)
    if (apiPath === 'chat') {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body,
      });

      // Stream the response back
      return new NextResponse(response.body, {
        status: response.status,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // Non-streaming POST request
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body,
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error(`Proxy error for POST /api/${apiPath}:`, error);
    return NextResponse.json(
      { error: 'Backend connection failed. Is the FastAPI server running on port 8888?' },
      { status: 503 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const apiPath = path.join('/');
  const url = `${BACKEND_URL}/api/${apiPath}`;

  try {
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error(`Proxy error for DELETE /api/${apiPath}:`, error);
    return NextResponse.json(
      { error: 'Backend connection failed. Is the FastAPI server running on port 8888?' },
      { status: 503 }
    );
  }
}
