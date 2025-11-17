import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: pathSegments } = await params;
  const filePath = pathSegments.join('/');
  const fullPath = path.join(process.cwd(), 'memory', 'memories', filePath);

  if (!fs.existsSync(fullPath)) {
    return NextResponse.json(
      { detail: 'File not found' },
      { status: 404 }
    );
  }

  try {
    const content = fs.readFileSync(fullPath, 'utf-8');
    const stat = fs.statSync(fullPath);

    return NextResponse.json({
      path: filePath,
      content,
      size: stat.size
    });
  } catch (error: any) {
    return NextResponse.json(
      { detail: error.message },
      { status: 500 }
    );
  }
}
