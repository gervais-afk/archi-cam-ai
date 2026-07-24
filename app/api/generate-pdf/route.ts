import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

/**
 * POST /api/generate-pdf
 * Body: { projectId: string }
 *
 * Executes the Python PDF generation script locally and streams the
 * resulting PDF back to the client.
 */
export async function POST(request: Request) {
  const { projectId } = await request.json();
  if (!projectId) {
    return new NextResponse('projectId is required', { status: 400 });
  }

  const scriptPath = path.resolve(process.cwd(), 'scripts', 'generer_decompte_pdf.py');
  const outDir = path.resolve(process.cwd(), 'out');
  const pdfPath = path.join(outDir, `${projectId}.pdf`);

  // Ensure output directory exists
  await fs.promises.mkdir(outDir, { recursive: true });

  // Run the Python script
  return new Promise<NextResponse>((resolve) => {
    const child = spawn('python', [scriptPath, projectId], {
      cwd: process.cwd(),
      stdio: ['ignore', 'ignore', 'pipe'],
    });

    let stderr = '';
    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', async (code) => {
      if (code !== 0) {
        resolve(
          new NextResponse(`PDF generation failed (code ${code}): ${stderr}`, { status: 500 })
        );
        return;
      }

      try {
        const pdfBuffer = await fs.promises.readFile(pdfPath);
        const response = new NextResponse(pdfBuffer, {
          status: 200,
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${projectId}_DQE.pdf"`,
          },
        });
        resolve(response);
      } catch (err) {
        resolve(new NextResponse('Failed to read generated PDF', { status: 500 }));
      }
    });
  });
}
