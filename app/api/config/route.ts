import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    api_key_set: !!process.env.ANTHROPIC_API_KEY,
    model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5-20250929',
    app_log_level: process.env.APP_LOG_LEVEL || 'INFO'
  });
}
