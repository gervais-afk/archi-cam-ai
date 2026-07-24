import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { defineMcpClient } from '@genkit-ai/mcp';
import path from 'path';

export const ai = genkit({
  plugins: [googleAI({ apiKey: process.env.GEMINI_API_KEY })],
});

// Configure standard stdio MCP client
export const pythonMcpClient = defineMcpClient(ai, {
  name: 'moteur-python',
  mcpServer: {
    command: process.platform === 'win32' 
      ? path.resolve(process.cwd(), '.venv/Scripts/python.exe')
      : path.resolve(process.cwd(), '.venv/bin/python'),
    args: [path.resolve(process.cwd(), 'fastmcp/main.py')],
  },
});

export default ai;
