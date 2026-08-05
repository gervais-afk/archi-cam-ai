/**
 * MONITEUR FINOPS & SUIVI EN TEMPS RÉEL DES COÛTS IA — ARCHI CAM AI
 * ════════════════════════════════════════════════════════════════════════════
 * Maintient le registre des dépenses en temps réel, émet des alertes si les seuils
 * ($5/heure ou $50/jour) sont franchis et fournit les métriques du dashboard FinOps.
 * ════════════════════════════════════════════════════════════════════════════
 */

export interface AICallMetric {
  userId: string;
  model: string;
  tokensInput: number;
  tokensOutput: number;
  costUSD: number;
  durationMs: number;
  success: boolean;
}

const memoryLogs: AICallMetric[] = [];
let hourlyCostAccUSD = 0;
let dailyCostAccUSD = 0;

export class FinOpsTracker {
  public async trackAICall(metric: AICallMetric): Promise<void> {
    memoryLogs.push(metric);
    if (memoryLogs.length > 500) memoryLogs.shift();

    hourlyCostAccUSD += metric.costUSD;
    dailyCostAccUSD += metric.costUSD;

    if (hourlyCostAccUSD > 5.0) {
      console.error(`🚨 [FinOps Critical Alert] Seuil horaire de 5.00$ dépassé : ${hourlyCostAccUSD.toFixed(4)}$ enregistrés !`);
    }

    if (dailyCostAccUSD > 50.0) {
      console.warn(`⚠️ [FinOps Warning] Budget quotidien de 50.00$ atteint : ${dailyCostAccUSD.toFixed(2)}$ accumulés.`);
    }
  }

  public getLiveMetrics() {
    const totalCalls = memoryLogs.length;
    const successfulCalls = memoryLogs.filter((m) => m.success).length;
    const averageDurationMs = totalCalls > 0
      ? memoryLogs.reduce((sum, m) => sum + m.durationMs, 0) / totalCalls
      : 0;

    return {
      hourlyCostUSD: Math.round(hourlyCostAccUSD * 10000) / 10000,
      dailyCostUSD: Math.round(dailyCostAccUSD * 100) / 100,
      totalCallsCount: totalCalls,
      successRatePct: totalCalls > 0 ? Math.round((successfulCalls / totalCalls) * 100) : 100,
      averageDurationMs: Math.round(averageDurationMs),
    };
  }
}
