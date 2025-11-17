import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

export async function GET() {
  const memoryDir = path.join(process.cwd(), 'memory', 'memories');

  if (!fs.existsSync(memoryDir)) {
    return NextResponse.json({ files: [] });
  }

  const files: any[] = [];

  // Recursively get all files
  function walkDir(dir: string, relativeTo: string) {
    const entries = fs.readdirSync(dir);

    for (const entry of entries) {
      const fullPath = path.join(dir, entry);
      const stat = fs.statSync(fullPath);

      if (stat.isFile()) {
        const relativePath = path.relative(relativeTo, fullPath);
        files.push({
          path: relativePath,
          name: entry,
          size: stat.size,
          created: new Date(stat.ctime).toISOString(),
          modified: new Date(stat.mtime).toISOString(),
          accessed: new Date(stat.atime).toISOString()
        });
      } else if (stat.isDirectory()) {
        walkDir(fullPath, relativeTo);
      }
    }
  }

  walkDir(memoryDir, memoryDir);

  return NextResponse.json({ files });
}
