import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

export const dynamic = "force-dynamic";

function getPythonExecutable(): string {
  const rootDir = process.cwd();
  const venvPython = path.join(rootDir, '.venv', 'Scripts', 'python.exe');
  if (process.platform === 'win32' && fs.existsSync(venvPython)) {
    return venvPython;
  }
  return 'python';
}

export async function POST(request: Request) {
  try {
    const { projectId } = await request.json();
    const safeProjectId = String(projectId || "Duplex_R1_DQE").replace(/[^a-zA-Z0-9_-]/g, "_");

    const rootDir = process.cwd();
    const scriptPath = path.join(rootDir, 'scripts', 'generer_decompte_pdf.py');
    const outDir = path.join(rootDir, 'public', 'out');
    const pdfPath = path.join(outDir, `${safeProjectId}.pdf`);

    await fs.promises.mkdir(outDir, { recursive: true });

    const pythonExe = getPythonExecutable();

    // 1. Appel HTTP vers FastMCP (port 8000) au lieu de child_process
    const fastmcpUrl = process.env.FASTMCP_BASE_URL || "http://127.0.0.1:8000";
    
    try {
      const mcpResponse = await fetch(`${fastmcpUrl}/mcp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json, text/event-stream",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "tools/call",
          params: {
            name: "generate_pdf_decompte",
            arguments: { project_id: safeProjectId },
          },
        }),
      });

      if (!mcpResponse.ok) {
        console.warn(`[PDF Route] FastMCP HTTP ${mcpResponse.status}`);
      }
    } catch (mcpErr) {
      console.warn("[PDF Route] Notice FastMCP non répondeur, fallback lecture fichier direct:", mcpErr);
    }

    if (fs.existsSync(pdfPath)) {
      const pdfBuffer = await fs.promises.readFile(pdfPath);
      return new NextResponse(pdfBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${safeProjectId}_DQE.pdf"`,
        },
      });
    }

    return NextResponse.json({ error: "PDF Non trouvé" }, { status: 404 });

  } catch (error: any) {
    console.error("Erreur Route Generate PDF:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
