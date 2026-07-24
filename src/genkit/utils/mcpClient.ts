import { ai } from '../ai';
import { pythonMcpClient } from '../ai';

/**
 * Utility to run any python calculation tool exposed via FastMCP.
 */
export async function callMcpTool<TInput, TOutput>(toolName: string, input: TInput): Promise<TOutput> {
  // Await the MCP client connection to be fully established and tools registered
  await pythonMcpClient.ready();
  // Fetch tools from the MCP client
  const tools = await pythonMcpClient.getActiveTools(ai);
  console.log('[MCP Client] Discovered tools names (wrapped):', tools.map(t => t.name));
  console.log('[MCP Client] Discovered tools names (underlying):', tools.map(t => (t as any).__action?.name));
  
  // Find the matching tool by name
  const tool = tools.find(t => {
    const underlyingName = (t as any).__action?.name || '';
    return t.name === toolName || 
           t.name === `moteur-python/${toolName}` || 
           t.name.endsWith(`/${toolName}`) ||
           underlyingName === toolName ||
           underlyingName.endsWith(`/${toolName}`);
  });
  if (!tool) {
    throw new Error(`MCP Tool ${toolName} not found. Available tools: ${tools.map(t => t.name).join(', ')}`);
  }
  
  const result = await tool(input);
  return result as TOutput;
}
