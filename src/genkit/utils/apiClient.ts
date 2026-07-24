/**
 * Client HTTP pour communiquer avec le moteur de calcul Python.
 */
export async function callPythonEngine<T>(endpoint: string, payload: unknown): Promise<T> {
  const host = process.env.FAST_MCP_URL || 'http://localhost:8000';
  const url = `${host}/${endpoint.replace(/^\//, '')}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    let errorDetail = '';
    try {
      errorDetail = await res.text();
    } catch {
      // Ignored
    }
    throw new Error(`Python Engine error ${res.status}: ${errorDetail || res.statusText}`);
  }

  return (await res.json()) as T;
}
