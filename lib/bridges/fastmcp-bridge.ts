/**
 * FastMCP Bridge — Pont d'interconnexion Next.js vers FastMCP Workers Python (Port 8001/8000)
 * Gère les appels JSON-RPC 2.0 vers le serveur FastMCP avec les en-têtes SSE/JSON conformes HTTP 406.
 */

const FASTMCP_BASE_URL = process.env.FASTMCP_BASE_URL || "http://127.0.0.1:8001";

export interface FastMCPRequestParams {
  toolName: string;
  params: Record<string, unknown>;
  timeoutMs?: number;
}

export interface FastMCPResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function callFastMCPTool<T = unknown>(
  toolName: string,
  params: Record<string, unknown>,
  timeoutMs: number = 60000
): Promise<FastMCPResponse<T>> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(`${FASTMCP_BASE_URL}/mcp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json, text/event-stream",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: { name: toolName, arguments: params },
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!response.ok) {
      return {
        success: false,
        error: `FastMCP HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const json = await response.json();
    if (json.error) {
      return {
        success: false,
        error: typeof json.error === "object" ? JSON.stringify(json.error) : String(json.error),
      };
    }

    const content = json.result?.content;
    let data: T;
    if (Array.isArray(content) && content[0]?.text) {
      try {
        data = JSON.parse(content[0].text) as T;
      } catch {
        data = content[0].text as unknown as T;
      }
    } else {
      data = json.result as T;
    }

    return { success: true, data };
  } catch (error: any) {
    return {
      success: false,
      error: error?.name === "AbortError" ? `FastMCP Timeout après ${timeoutMs}ms` : error?.message || String(error),
    };
  }
}
