import { NextResponse } from 'next/server';
import { getAvailablePrompts } from '@/lib/server/prompts';
import * as path from 'path';

export async function GET() {
  const promptsDir = path.join(process.cwd(), 'prompts');
  const prompts = getAvailablePrompts(promptsDir);

  return NextResponse.json({ prompts });
}
