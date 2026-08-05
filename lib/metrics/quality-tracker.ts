/**
 * QUALITY METRICS TRACKER — ARCHI CAM AI
 * ════════════════════════════════════════════════════════════════════════════
 * Enregistrement & calcul des taux de succès temps réel par étape (RISQUE 5).
 * Permet le suivi en direct sur le dashboard admin.
 * ════════════════════════════════════════════════════════════════════════════
 */

import { prisma } from "@/lib/prisma";
import { ProcessingStage } from "@prisma/client";

export interface QualityTrackData {
  projectId?: string;
  userId?: string;
  stage: ProcessingStage;
  success: boolean;
  durationMs: number;
  confidence?: number;
  fallbackUsed?: boolean;
  metadata?: Record<string, unknown>;
}

export interface QualitySuccessRates {
  maskGeneration: number;
  ruledLinesRemoval: number;
  renderGeneration: number;
  metadataExtraction: number;
  overall: number;
  totalExecutions: number;
}

export class QualityMetricsTracker {
  static async track(data: QualityTrackData): Promise<void> {
    try {
      await prisma.qualityMetric.create({
        data: {
          projectId: data.projectId || null,
          userId: data.userId || null,
          stage: data.stage,
          success: data.success,
          durationMs: data.durationMs,
          confidence: data.confidence ?? null,
          fallbackUsed: data.fallbackUsed ?? false,
          metadata: data.metadata ? (data.metadata as any) : undefined,
        },
      });

      console.log(
        `[QualityMetricsTracker] 📊 ${data.stage} : ${data.success ? "SUCCÈS" : "ÉCHEC"} en ${data.durationMs}ms (Fallback: ${data.fallbackUsed ? "OUI" : "NON"})`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn("[QualityMetricsTracker] Erreur lors de l'enregistrement de la métrique (non-fatale) :", msg);
    }
  }

  static async getSuccessRate(hours: number = 24): Promise<QualitySuccessRates> {
    try {
      const since = new Date(Date.now() - hours * 60 * 60 * 1000);

      const metrics = await prisma.qualityMetric.findMany({
        where: { createdAt: { gte: since } },
        select: { stage: true, success: true },
      });

      if (metrics.length === 0) {
        return {
          maskGeneration: 100,
          ruledLinesRemoval: 100,
          renderGeneration: 100,
          metadataExtraction: 100,
          overall: 100,
          totalExecutions: 0,
        };
      }

      const counts: Record<string, { total: number; success: number }> = {
        MASK_GENERATION: { total: 0, success: 0 },
        RULED_LINES_REMOVAL: { total: 0, success: 0 },
        RENDER_GENERATION: { total: 0, success: 0 },
        METADATA_EXTRACTION: { total: 0, success: 0 },
      };

      for (const m of metrics) {
        if (!counts[m.stage]) {
          counts[m.stage] = { total: 0, success: 0 };
        }
        counts[m.stage].total++;
        if (m.success) counts[m.stage].success++;
      }

      const calcRate = (key: string) => {
        const c = counts[key];
        return c && c.total > 0 ? (c.success / c.total) * 100 : 100;
      };

      const maskGen = calcRate("MASK_GENERATION");
      const ruledLines = calcRate("RULED_LINES_REMOVAL");
      const renderGen = calcRate("RENDER_GENERATION");
      const metaExtract = calcRate("METADATA_EXTRACTION");

      const overall = (maskGen + ruledLines + renderGen + metaExtract) / 4;

      return {
        maskGeneration: Math.round(maskGen * 10) / 10,
        ruledLinesRemoval: Math.round(ruledLines * 10) / 10,
        renderGeneration: Math.round(renderGen * 10) / 10,
        metadataExtraction: Math.round(metaExtract * 10) / 10,
        overall: Math.round(overall * 10) / 10,
        totalExecutions: metrics.length,
      };
    } catch (err: unknown) {
      console.warn("[QualityMetricsTracker] Erreur lecture métriques :", err);
      return {
        maskGeneration: 100,
        ruledLinesRemoval: 100,
        renderGeneration: 100,
        metadataExtraction: 100,
        overall: 100,
        totalExecutions: 0,
      };
    }
  }
}
