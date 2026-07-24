import { ai } from '../../ai';
import { PipelineContextSchema, SuperviseurDataSchema, SuperviseurData } from '../../types/zodSchemas';
import { callMcpTool } from '../../utils/mcpClient';
import { loadKnowledgeBase } from '../../utils/rag';
import { z } from 'genkit';

export const superviseurFlow = ai.defineFlow(
  {
    name: 'superviseurFlow',
    inputSchema: PipelineContextSchema,
    outputSchema: SuperviseurDataSchema,
  },
  async (currentContext) => {
    console.log(`[Superviseur Flow] Supervision financière et technique pour: ${currentContext.metadata.sourceId}`);

    // 1. RAG Local : Seuils financiers macroéconomiques et Administratif
    const seuilsRentabilite = loadKnowledgeBase('seuils_rentabilite.md');
    const reglesAdministratives = loadKnowledgeBase('regles_administratives.md');

    // 2. Évaluation LLM de la conformité du projet
    const llmResponse = await ai.generate({
      model: 'googleai/gemini-2.5-flash',
      prompt: `Tu es le Directeur Technique (Superviseur) chargé de valider ou rejeter les devis et plannings du projet (Contexte: Cameroun).
      
CONTEXTE DU PROJET ACCUMULÉ :
${JSON.stringify(currentContext)}

RÉFÉRENTIEL FINANCIER & DE STRUCTURE (RAG) :
${seuilsRentabilite}

RÉGLEMENTATION ADMINISTRATIVE (RAG) :
${reglesAdministratives}

INSTRUCTIONS STRICTES :
1. Vérifie si 'titreFoncierValide' est true. Sinon, ajoute une alerte MAJEURE : risque de spoliation (Risk Level: HIGH).
2. Vérifie 'permisConstruireObtenu'. Si false, préviens d'une provision pour amende (30% du coût du permis).
3. Si 'typeMarche' est 'PUBLIC', vérifie si une variante en Blocs de Terre Comprimée (MIPROMALO) a été chiffrée.
4. Examine le coût TTC estimé par l'économiste (${currentContext.economiste?.pv_ttc_FCFA || 0} FCFA). Compare-le aux seuils limites de la grille salariale et CNPS.
5. Examine le ratio d'acier utilisé par la structure (${currentContext.structure?.steelRequired_kg_per_m3 || 0} kg/m³). Vérifie s'il y a un risque structurel ou du gaspillage.
6. Vérifie si l'agent Métreur a signalé une anomalie géométrique. Si "isUnreliable" est vrai, le projet doit être REJETÉ d'office.
7. Renseigne l'état d'approbation (approvalStatus: true/false), le niveau de risque (LOW, MEDIUM ou HIGH) et un commentaire explicatif très professionnel.

Renvoie obligatoirement ta décision en respectant le schéma JSON suivant :
{
  "approvalStatus": true ou false,
  "riskLevel": "LOW" | "MEDIUM" | "HIGH",
  "comments": "Note explicative du rejet ou de la validation."
}`,
      output: {
        schema: z.object({
          approvalStatus: z.boolean(),
          riskLevel: z.enum(['LOW', 'MEDIUM', 'HIGH']),
          comments: z.string(),
        }),
      },
    });

    const superviseurChoice = llmResponse.output;
    if (!superviseurChoice) {
      throw new Error("L'agent Superviseur n'a pas pu évaluer le projet.");
    }

    console.log(`[Superviseur Flow] Décision finale: Approuvé = ${superviseurChoice.approvalStatus}, Risque = ${superviseurChoice.riskLevel}`);

    // 3. Enrichissement de l'état
    currentContext.superviseur = {
      schemaVersion: '2.0',
      sourceId: currentContext.metadata.sourceId,
      totalCost_FCFA: currentContext.economiste?.pv_ttc_FCFA || 0.0,
      overallDuration_days: currentContext.conducteur?.dureeChantier_jours || 0.0,
      riskLevel: superviseurChoice.riskLevel,
      approvalStatus: superviseurChoice.approvalStatus,
      comments: superviseurChoice.comments,
    };

    // 4. Appel final au moteur Python pour archivage/validation finale via MCP
    const response = await callMcpTool<{ context: typeof currentContext }, SuperviseurData>('run_superviseur', { context: currentContext });
    return SuperviseurDataSchema.parse(response);
  }
);
export default superviseurFlow;
