import { ai } from '../../ai';
import { PipelineContextSchema } from '../../types/zodSchemas';
import { loadKnowledgeBase } from '../../utils/rag';
import { callMcpTool } from '../../utils/mcpClient';
import { z } from 'genkit';

export const structureFlow = ai.defineFlow(
  {
    name: 'structureFlow',
    inputSchema: PipelineContextSchema,
    outputSchema: PipelineContextSchema,
  },
  async (currentContext) => {
    // 1. RAG Local : Chargement exclusif des données de sol utiles et matériaux locaux
    const reglesSol = loadKnowledgeBase('regles_fondations.md');
    const materiauxLocaux = loadKnowledgeBase('materiaux_locaux.md');

    // 2. Appel au LLM (Gemma Local / Gemini) avec la syntaxe de schéma corrigée
    const llmResponse = await ai.generate({
      model: 'googleai/gemini-2.5-flash',
      prompt: `Tu es l'ingénieur géotechnicien et structure de l'application. Ton rôle est de QUALIFIER la situation du sol, sans faire de calcul mathématique.

CONTEXTE ACTUEL DU PROJET :
${JSON.stringify(currentContext)}

RÉFÉRENTIEL MÉTIER DE PORTANCE (RAG) :
${reglesSol}

DIRECTIVES MATÉRIAUX LOCAUX (RAG) :
${materiauxLocaux}

INSTRUCTIONS STRICTES :
- Identifie le type de sol et détermine la contrainte admissible en MPa d'après le référentiel.
- Détermine le type de fondation adéquat et l'ancrage minimal en cm requis (prends en compte l'altitude et la zone de gel si spécifiées).
- Tu dois impérativement répondre en respectant le schéma JSON demandé. Ne crée aucun texte en dehors du format d'output.`,
      output: {
        schema: z.object({
          typeSol: z.string(),
          contrainteAdmise_MPa: z.number(),
          typeFondation: z.string(),
          ancrageMinimal_cm: z.number(),
          enrobageMinimal_mm: z.number(),
        }),
      },
    });

    const qualificationStructure = llmResponse.output;

    if (!qualificationStructure) {
      throw new Error("L'agent Structure n'a pas pu qualifier la situation.");
    }

    // 3. Enrichissement de l'état (Accumulateur)
    currentContext.structure = {
      schemaVersion: '2.0',
      sourceId: currentContext.metadata.sourceId,
      typeSol: qualificationStructure.typeSol,
      contrainteAdmise_MPa: qualificationStructure.contrainteAdmise_MPa,
      typeFondation: qualificationStructure.typeFondation,
      ancrageMinimal_cm: qualificationStructure.ancrageMinimal_cm,
      enrobageMinimal_mm: qualificationStructure.enrobageMinimal_mm,
      coefficientsSecurite: { gamma_b: 1.5, gamma_s: 1.15 } // Valeurs BAEL fondamentales par défaut
    };

    // 4. Envoi de l'état complet au moteur Python pour les vérifications lourdes de structure via MCP
    const updatedContext = await callMcpTool<{ context: typeof currentContext }, typeof currentContext>('run_structure', { context: currentContext });
    
    return updatedContext;
  }
);
export default structureFlow;
