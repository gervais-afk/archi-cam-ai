import { ai } from '../../ai';
import { PipelineContextSchema } from '../../types/zodSchemas';
import { loadKnowledgeBase } from '../../utils/rag';
import { callMcpTool } from '../../utils/mcpClient';
import { z } from 'genkit';

export const conducteurFlow = ai.defineFlow(
  {
    name: 'conducteurFlow',
    inputSchema: PipelineContextSchema,
    outputSchema: PipelineContextSchema,
  },
  async (currentContext) => {
    // 1. RAG Local : Règles d'enclenchement et enchaînements logiques
    const reglesSequencage = loadKnowledgeBase('rendements_main_doeuvre.md');

    // 2. Appel au LLM pour la structuration logique des tâches (WBS)
    const llmResponse = await ai.generate({
      model: 'googleai/gemini-2.5-flash',
      prompt: `Tu es le Conducteur de Travaux principal de la plateforme. Ton rôle est de définir l'enchaînement logique des tâches du chantier (WBS) et de fixer l'effectif requis.

CONTEXTE DU PROJET ACCUMULÉ :
${JSON.stringify(currentContext)}

RÈGLES DE SÉQUENÇAGE LOGIQUE ET ENCLENCHEMENTS (RAG) :
${reglesSequencage}

INSTRUCTIONS COERCITIVES :
- Génère la liste des tâches à réaliser dans l'ordre chronologique strict (Terrassement -> Propreté -> Fondations -> Soubassement etc.).
- Pour chaque tâche, fournis son identifiant unique et le tableau des dépendances (predecesseurs).
- IMPORTANT : Selon les temps de séchage incompressibles (voir règles RAG), tu DOIS ajouter un 'delaiAttente_jours' dans chaque dépendance. Ex: Pour élever les murs après une dalle, delaiAttente_jours = 14.
- Fixe un effectif moyen d'ouvriers réaliste pour le gros œuvre.
- Ne calcule AUCUNE durée ni aucune marge. Le moteur de calcul s'en charge.`,
      output: {
        schema: z.object({
          effectifMoyen_ouvriers: z.number().int().positive(),
          tachesLogiques: z.array(z.object({
            tacheId: z.string(),
            nomTache: z.string(),
            predecesseurs: z.array(z.object({
              tacheId: z.string(),
              delaiAttente_jours: z.number().default(0)
            })),
          })),
        }),
      },
    });

    const wbsLogique = llmResponse.output;

    if (!wbsLogique) {
      throw new Error("L'agent Conducteur n'a pas pu ordonnancer le chantier.");
    }

    // 3. Sauvegarde intermédiaire du WBS structuré par le LLM dans l'état global
    currentContext.conducteur = {
      schemaVersion: '2.0',
      sourceId: currentContext.metadata.sourceId,
      effectifMoyen_ouvriers: wbsLogique.effectifMoyen_ouvriers,
      dureeChantier_jours: 0, // Sera écrasé et calculé mathématiquement par Python
      ganttTaches: wbsLogique.tachesLogiques.map(t => {
        let maxDelai = 0;
        if (t.predecesseurs && t.predecesseurs.length > 0) {
          maxDelai = Math.max(...t.predecesseurs.map(p => p.delaiAttente_jours || 0));
        }
        return {
          tacheId: t.tacheId,
          debutPlusTot: 0,
          finPlusTot: 0,
          margeTotale: 0,
          delaiAttente_jours: maxDelai
        };
      })
    };

    // 4. Transition vers Python pour appliquer les formules déterministes de jalonnement via MCP
    const completedContext = await callMcpTool<{ context: typeof currentContext }, typeof currentContext>('run_conducteur', { context: currentContext });

    return completedContext;
  }
);
export default conducteurFlow;
