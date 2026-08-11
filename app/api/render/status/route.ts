/**
 * 📡 PIPELINE SSE STATUS STREAM — ARCHI CAM AI
 * ─────────────────────────────────────────────
 * Server-Sent Events (SSE) pour le suivi temps réel du pipeline 10 étapes.
 */

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const PIPELINE_STEPS = [
  { step: 1, label: "Réception et déduplication DuckDB...", icon: "database" },
  { step: 2, label: "Détection du type de plan (PDF / Scan)...", icon: "file-search" },
  { step: 3, label: "Géolocalisation & altitude Cesium Ion...", icon: "globe" },
  { step: 4, label: "Analyse sémantique (YOLO / LM Studio / Gemini)...", icon: "brain" },
  { step: 5, label: "Prétraitement OpenCV 2.5D...", icon: "image" },
  { step: 6, label: "Enrichissement contextuel Neo4j (POS / BAEL 91)...", icon: "building" },
  { step: 7, label: "Génération de l'image IA HD...", icon: "sparkles" },
  { step: 8, label: "Calcul du devis DQE FCFA (Mercuriale MINMAP)...", icon: "calculator" },
  { step: 9, label: "Compilation du dossier OKF v0.2...", icon: "folder-archive" },
  { step: 10, label: "Rendu et persistance terminés !", icon: "check-circle" },
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId") || `proj-${Date.now()}`;

  const encoder = new TextEncoder();

  const customStream = new ReadableStream({
    async start(controller) {
      const sendEvent = (data: Record<string, unknown>) => {
        const payload = `data: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(payload));
      };

      try {
        for (const stepInfo of PIPELINE_STEPS) {
          sendEvent({
            projectId,
            step: stepInfo.step,
            totalSteps: 10,
            progressPct: Math.round((stepInfo.step / 10) * 100),
            label: stepInfo.label,
            icon: stepInfo.icon,
            timestamp: new Date().toISOString(),
          });

          // Simulation des délais réseau réalistes pour la démo SSE
          await new Promise((r) => setTimeout(r, 400));
        }
      } catch (e) {
        sendEvent({ projectId, error: "Erreur flux SSE status", done: true });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(customStream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
    },
  });
}
