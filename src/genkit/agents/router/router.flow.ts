import { z } from 'genkit';
import { ai } from '../../ai';

export const RouterInputSchema = z.object({
  projectId: z.string().uuid(),
  prompt: z.string(),
  filePath: z.string().optional(),
  resumeFromEconomiste: z.boolean().optional(),
});

export const RouterOutputSchema = z.object({
  schemaVersion: z.literal('1.0'),
  projectId: z.string().uuid(),
  sourceType: z.enum(['IFC', 'PLAN_2D', 'TEXT_ONLY']),
  filePath: z.string(),
  promptContext: z.string(),
});

export type RouterInput = z.infer<typeof RouterInputSchema>;
export type RouterOutput = z.infer<typeof RouterOutputSchema>;

export const routerFlow = ai.defineFlow(
  {
    name: 'routerFlow',
    inputSchema: RouterInputSchema,
    outputSchema: RouterOutputSchema,
  },
  async (input) => {
    console.log(`[Router Flow] Intention de routage pour le projet: ${input.projectId}`);
    
    // Détection basique du type de fichier
    let sourceType: 'IFC' | 'PLAN_2D' | 'TEXT_ONLY' = 'TEXT_ONLY';
    let path = input.filePath || '';

    if (path.toLowerCase().endsWith('.ifc')) {
      sourceType = 'IFC';
    } else if (path.toLowerCase().endsWith('.png') || path.toLowerCase().endsWith('.jpg') || path.toLowerCase().endsWith('.pdf')) {
      sourceType = 'PLAN_2D';
    }

    // Appel optionnel au LLM pour valider le type de prompt / contexte
    const response = await ai.generate({
      model: 'googleai/gemini-2.5-flash',
      prompt: `Analyse la requête de l'utilisateur : "${input.prompt}". Le type de fichier proposé est ${sourceType} (${path}).
      Rédige une synthèse concise (moins de 200 mots) sur les besoins du projet (ex. villa R+1, type de sol, fondations, etc.) qui sera partagée avec les autres agents.`,
    });

    return {
      schemaVersion: '1.0' as const,
      projectId: input.projectId,
      sourceType,
      filePath: path,
      promptContext: response.text,
    };
  }
);
export default routerFlow;
