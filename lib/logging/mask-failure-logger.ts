/**
 * MASK FAILURE LOGGER — ARCHI CAM AI
 * ════════════════════════════════════════════════════════════════════════════
 * Enregistrement structuré des échecs de traitement de masque OpenCV (RISQUE 4).
 * Permet de diagnostiquer et d'analyser les photos rejetées par les garde-fous.
 * ════════════════════════════════════════════════════════════════════════════
 */

import { prisma } from "@/lib/prisma";
import { FailureReason } from "@prisma/client";

export interface MaskFailureData {
  userId?: string;
  projectId?: string;
  failureReason: FailureReason;
  metrics: {
    blackPixelRatio: number;
    edgeDensity: number;
    blurScore?: number;
  };
  originalImagePath?: string;
  maskImagePath?: string;
}

export class MaskFailureLogger {
  static async log(data: MaskFailureData): Promise<void> {
    try {
      await prisma.maskProcessingFailure.create({
        data: {
          userId: data.userId || null,
          projectId: data.projectId || null,
          failureReason: data.failureReason,
          blackPixelRatio: data.metrics.blackPixelRatio,
          edgeDensity: data.metrics.edgeDensity,
          blurScore: data.metrics.blurScore ?? null,
          originalImagePath: data.originalImagePath || null,
          maskImagePath: data.maskImagePath || null,
        },
      });

      console.warn(
        `[MaskFailureLogger] 🚨 Échec de masque enregistré : ${data.failureReason} (Noir: ${(data.metrics.blackPixelRatio * 100).toFixed(1)}%, Contours: ${(data.metrics.edgeDensity * 100).toFixed(2)}%)`
      );

      // Si l'utilisateur a accumulé > 5 échecs en 24h, déclencher une alerte
      if (data.userId) {
        const recentFailures = await prisma.maskProcessingFailure.count({
          where: {
            userId: data.userId,
            createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          },
        });

        if (recentFailures > 5) {
          console.error(
            `[MaskFailureLogger] 🚨 ALERTE : L'utilisateur ${data.userId} a rencontré ${recentFailures} échecs de traitement de masque en 24h !`
          );
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn("[MaskFailureLogger] Erreur lors de l'enregistrement de l'échec (non-fatale) :", msg);
    }
  }
}
