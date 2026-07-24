import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';

if (typeof window === 'undefined') {
  process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
  process.env.FIREBASE_STORAGE_EMULATOR_HOST = '127.0.0.1:9199';
}

import { mainOrchestrationFlow } from '@/src/genkit/flows/orchestrate';
export const dynamic = 'force-dynamic';

import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore/lite';


export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const projectId = searchParams.get('projectId') || randomUUID();
    const filePath = searchParams.get('filePath') || 'Projet_duplex _R+1_v28.ifc';
    const prompt = searchParams.get('prompt') || 'Calculer les métrés et planifier le chantier pour une villa R+1';

    if (action === 'populate' || action === 'populate-aberrant') {
      const isAberrant = action === 'populate-aberrant';
      const mockContext = {
        metadata: {
          projectName: isAberrant ? 'Projet Duplex R+1 (Volume aberrant)' : 'Projet Duplex R+1 (Valide)',
          sourceId: projectId,
          schemaVersion: '2.0',
        },
        metreur: {
          schemaVersion: '2.0',
          sourceId: projectId,
          volume_beton_m3: isAberrant ? 5.0 : 120.5,
          surface_coffrage_m2: 85.0,
          ratio_parois: 1.45,
          isUnreliable: isAberrant ? true : false,
        },
        structure: {
          schemaVersion: '2.0',
          sourceId: projectId,
          typeSol: 'Argileux',
          contrainteAdmise_MPa: 0.25,
          typeFondation: 'Semelles filantes',
          ancrageMinimal_cm: 150,
          enrobageMinimal_mm: 40,
          coefficientsSecurite: { gamma_b: 1.5, gamma_s: 1.15 },
          steelRequired_kg_per_m3: 75.0,
          steelRequired_kg: 9037.5,
          concreteRequired_m3: 132.55,
        },
        economiste: {
          schemaVersion: '2.0',
          sourceId: projectId,
          debourse_sec_FCFA: 20000000,
          temps_unitaire_heures: 200,
          creditHeuresTotal: 200,
          cout_materiaux_FCFA: 15000000,
          pv_ht_FCFA: 27000000,
          pv_ttc_FCFA: 32197500,
          breakdown: [],
        },
        conducteur: {
          schemaVersion: '2.0',
          sourceId: projectId,
          effectifMoyen_ouvriers: 5,
          dureeChantier_jours: 15,
          ganttTaches: [],
        },
        superviseur: {
          schemaVersion: '2.0',
          sourceId: projectId,
          totalCost_FCFA: 32197500,
          overallDuration_days: 15,
          riskLevel: isAberrant ? 'HIGH' : 'LOW',
          approvalStatus: isAberrant ? false : true,
          comments: isAberrant
            ? 'PROJET REJETÉ : Volume de béton aberrant (5.0 m3 < seuil minimal de 10 m3) et flag isUnreliable activé.'
            : 'Projet validé automatiquement via cache pré-calculé conforme.',
        },
      };

      const docRef = doc(db, 'projects', projectId);
      await setDoc(docRef, mockContext);
      return NextResponse.json({ success: true, message: `Mock context (${action}) populated in Firestore for ${projectId}`, context: mockContext });
    }

    const result = await mainOrchestrationFlow({
      projectId,
      prompt,
      filePath,
    });
    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    console.error('[Test Route] Erreur dans le flow d\'orchestration:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { projectId, volume_beton_m3, contrainteAdmise_MPa } = body;

    if (!projectId) {
      return NextResponse.json({ success: false, error: "Missing projectId" }, { status: 400 });
    }

    const docRef = doc(db, 'projects', projectId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      return NextResponse.json({ success: false, error: `Project context not found for ID: ${projectId}` }, { status: 404 });
    }

    const context = docSnap.data() as any;

    // Apply overrides
    if (context.metreur && volume_beton_m3 !== undefined) {
      context.metreur.volume_beton_m3 = Number(volume_beton_m3);
      context.metreur.isUnreliable = false;
    }
    if (context.structure && contrainteAdmise_MPa !== undefined) {
      context.structure.contrainteAdmise_MPa = Number(contrainteAdmise_MPa);
    }

    // Save updated context back to Firestore
    await setDoc(docRef, context);
    console.log(`[POST Test Route] Firestore updated with overrides for project ${projectId}. Resuming orchestrator...`);

    // Relaunch the orchestrator starting from the Economiste stage
    const superviseurResult = await mainOrchestrationFlow({
      projectId,
      prompt: 'Reprise du chiffrage après correction manuelle',
      resumeFromEconomiste: true,
    });

    // Fetch the final context after orchestration to return it
    const finalDocSnap = await getDoc(docRef);
    const finalContext = finalDocSnap.data();

    return NextResponse.json({
      success: true,
      superviseur: superviseurResult,
      context: finalContext
    });
  } catch (error: any) {
    console.error('[POST Route] Erreur lors de la mise à jour et reprise du flow:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}


