if (typeof window === 'undefined') {
  process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
  process.env.FIREBASE_STORAGE_EMULATOR_HOST = '127.0.0.1:9199';
}

import { ai } from '../ai';
import { routerFlow, RouterInputSchema } from '../agents/router/router.flow';
import { metreurFlow } from '../agents/metreur/metreur.flow';
import { structureFlow } from '../agents/structure/structure.flow';
import { economisteFlow } from '../agents/economiste/economiste.flow';
import { conducteurFlow } from '../agents/conducteur/conducteur.flow';
import { superviseurFlow } from '../agents/superviseur/superviseur.flow';
import { SuperviseurDataSchema, PipelineContext, SuperviseurData } from '../types/zodSchemas';

// Firestore imports
import { db } from '../../../lib/firebase';

import { doc, getDoc, setDoc } from 'firebase/firestore/lite';

export const mainOrchestrationFlow = ai.defineFlow(
  {
    name: 'mainOrchestrationFlow',
    inputSchema: RouterInputSchema,
    outputSchema: SuperviseurDataSchema,
  },
  async (input) => {
    console.log(`[Orchestrate] Démarrage du pipeline de flows (State Accumulator V2) pour le projet: ${input.projectId}`);

    // 1. Vérification du cache Firestore local (sauf si reprise demandée)
    if (!input.resumeFromEconomiste) {
      try {
        const docRef = doc(db, 'projects', input.projectId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const cachedContext = docSnap.data() as PipelineContext;
          if (cachedContext.superviseur) {
            console.log(`[Orchestrate] 🎉 CACHE HIT : Projet trouvé dans Firestore local. Renvoi du résultat en cache.`);
            return SuperviseurDataSchema.parse(cachedContext.superviseur);
          }
        }
      } catch (cacheError) {
        console.warn(`[Orchestrate] Échec de la lecture du cache Firestore (émulateur peut-être non démarré) :`, cacheError);
      }
    }

    if (input.resumeFromEconomiste) {
      console.log(`[Orchestrate] ⚡ REPRISE DEPUIS L'ÉCONOMISTE pour le projet: ${input.projectId}`);
      const docRef = doc(db, 'projects', input.projectId);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        throw new Error(`Project context not found in Firestore for project: ${input.projectId}`);
      }

      let context = docSnap.data() as PipelineContext;

      // 4. Économiste
      console.log('[Orchestrate] Exécution Économiste (Reprise)...');
      const ecoResult = await economisteFlow(context);
      context.economiste = ecoResult;

      // 5. Conducteur
      console.log('[Orchestrate] Exécution Conducteur (Reprise)...');
      context = await conducteurFlow(context);

      // 6. Superviseur
      console.log('[Orchestrate] Exécution Superviseur (Reprise)...');
      const superviseurResult = await superviseurFlow(context);
      context.superviseur = superviseurResult;

      // Sauvegarde
      try {
        console.log(`[Orchestrate] Sauvegarde du PipelineContext final après reprise dans Firestore local pour: ${input.projectId}`);
        await setDoc(docRef, context);
      } catch (saveError) {
        console.error(`[Orchestrate] Échec de sauvegarde Firestore :`, saveError);
      }

      console.log('[Orchestrate] Pipeline State Accumulator V2 (Reprise) terminé avec succès.');
      return superviseurResult;
    }

    // Cache Miss -> Lancement du pipeline d'agents
    console.log('[Orchestrate] ❌ CACHE MISS : Lancement de l\'orchestration multi-agents...');

    // 1. Routeur (décide de la source / plans)
    const route = await routerFlow(input);

    // Initialisation de l'accumulateur d'état (PipelineContext V2)
    let context: PipelineContext = {
      metadata: {
        projectName: 'Projet Duplex R+1',
        sourceId: route.projectId,
        schemaVersion: '2.0',
      },
      titreFoncierValide: false,
      permisConstruireObtenu: false,
      typeMarche: 'PRIVE',
      saison: 'saison_seche',
    };

    // 2. Métreur (calcul des métrés)
    console.log('[Orchestrate] Exécution Métreur...');
    const metreResult = await metreurFlow(route);
    context.metreur = metreResult;

    // 3. Structure (BAEL & géotechnique, consomme context.metreur)
    console.log('[Orchestrate] Exécution Structure...');
    context = await structureFlow(context);

    // 4. Économiste (Coûts & prix unitaires, consomme context.metreur et context.structure)
    console.log('[Orchestrate] Exécution Économiste...');
    const ecoResult = await economisteFlow(context);
    context.economiste = ecoResult;

    // 5. Conducteur (Planning Gantt, consomme context.economiste)
    console.log('[Orchestrate] Exécution Conducteur...');
    context = await conducteurFlow(context);

    // 6. Superviseur (Validation finale, consomme tout le contexte accumulé)
    console.log('[Orchestrate] Exécution Superviseur...');
    const superviseurResult = await superviseurFlow(context);
    context.superviseur = superviseurResult;

    // Sauvegarde de l'état final dans le cache Firestore
    try {
      console.log(`[Orchestrate] Sauvegarde du PipelineContext final dans Firestore local pour: ${input.projectId}`);
      const docRef = doc(db, 'projects', input.projectId);
      await setDoc(docRef, context);
      console.log(`[Orchestrate] Sauvegarde Firestore terminée.`);
    } catch (saveError) {
      console.error(`[Orchestrate] Échec de sauvegarde Firestore :`, saveError);
    }

    console.log('[Orchestrate] Pipeline State Accumulator V2 terminé avec succès.');
    return superviseurResult;
  }
);
export default mainOrchestrationFlow;
