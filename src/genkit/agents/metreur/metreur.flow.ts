import { ai } from '../../ai';
import { RouterOutputSchema } from '../router/router.flow';
import { MetreurDataSchema, MetreurData } from '../../types/zodSchemas';
import { callMcpTool } from '../../utils/mcpClient';

export const metreurFlow = ai.defineFlow(
  {
    name: 'metreurFlow',
    inputSchema: RouterOutputSchema,
    outputSchema: MetreurDataSchema,
  },
  async (input) => {
    console.log(`[Metreur Flow] Calcul des métrés via MCP pour le fichier: ${input.filePath}`);

    const response = await callMcpTool<any, MetreurData>('run_metreur', {
      sourceId: input.projectId,
      filePath: input.filePath,
      sourceType: input.sourceType,
      promptContext: input.promptContext,
    });

    return MetreurDataSchema.parse(response);
  }
);
export default metreurFlow;
