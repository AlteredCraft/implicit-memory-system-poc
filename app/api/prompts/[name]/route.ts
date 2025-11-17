import { NextRequest, NextResponse } from 'next/server';
import { loadSystemPrompt } from '@/lib/server/prompts';
import * as path from 'path';
import * as fs from 'fs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;
  const promptFile = path.join(process.cwd(), 'prompts', `${name}.txt`);

  if (!fs.existsSync(promptFile)) {
    return NextResponse.json(
      { detail: 'Prompt not found' },
      { status: 404 }
    );
  }

  try {
    const content = loadSystemPrompt(promptFile);
    return NextResponse.json({
      name,
      content
    });
  } catch (error: any) {
    return NextResponse.json(
      { detail: error.message },
      { status: 500 }
    );
  }
}
