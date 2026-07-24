import { ai } from '../../ai';
import { PipelineContextSchema, EconomisteDataSchema, EconomisteData } from '../../types/zodSchemas';
import { callMcpTool } from '../../utils/mcpClient';

export const economisteFlow = ai.defineFlow(
  {
    name: 'economisteFlow',
    inputSchema: PipelineContextSchema,
    outputSchema: EconomisteDataSchema,
  },
  async (input) => {
    console.log(`[Economiste Flow] Estimation de coûts via MCP pour: ${input.metadata.sourceId}`);

    const response = await callMcpTool<{ context: typeof input }, EconomisteData>('run_economiste', { context: input });
    return EconomisteDataSchema.parse(response);
  }
);
export default economisteFlow;
