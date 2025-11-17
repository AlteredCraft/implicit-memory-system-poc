import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import { generateMermaidDiagram } from '@/lib/server/sequence-diagram';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sessionsDir = path.join(process.cwd(), '..', 'sessions');

  // Find session file by ID
  const files = fs.readdirSync(sessionsDir);
  let sessionFile: string | null = null;

  for (const file of files) {
    if (file.startsWith('session_') && file.endsWith('.json')) {
      const filePath = path.join(sessionsDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(content);

      if (data.session_id === id) {
        sessionFile = filePath;
        break;
      }
    }
  }

  if (!sessionFile) {
    return NextResponse.json(
      { detail: 'Session not found' },
      { status: 404 }
    );
  }

  try {
    const content = fs.readFileSync(sessionFile, 'utf-8');
    const traceData = JSON.parse(content);

    // Generate diagram
    const diagram = generateMermaidDiagram(traceData);

    // Save diagram file
    const diagramFile = path.join(sessionsDir, `diagram_${id}.md`);
    fs.writeFileSync(diagramFile, diagram, 'utf-8');

    return NextResponse.json({
      session_id: id,
      diagram,
      diagram_file: diagramFile
    });
  } catch (error: any) {
    console.error('Error generating diagram:', error);
    return NextResponse.json(
      { detail: error.message },
      { status: 500 }
    );
  }
}
