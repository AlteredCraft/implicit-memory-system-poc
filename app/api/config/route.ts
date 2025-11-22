import { NextResponse } from 'next/server';

export async function GET() {
  const envApiKey = process.env.ANTHROPIC_API_KEY || '';

  return NextResponse.json({
    api_key_set: !!envApiKey,
    // Return masked version of env API key for display (first 7 chars + last 4 chars)
    env_api_key_masked: envApiKey
      ? `${envApiKey.slice(0, 7)}...${envApiKey.slice(-4)}`
      : null,
    model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5-20250929',
    app_log_level: process.env.APP_LOG_LEVEL || 'INFO'
  });
}
