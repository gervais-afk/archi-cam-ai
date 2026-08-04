/**
 * ⚡ PLAN RATE LIMITER — ARCHI CAM AI
 * ───────────────────────────────────
 * Contrôle les quotas de génération de rendus et d'analyse selon le plan tarifaire.
 * Log des tentatives et blocage gracieux avec message clair en français.
 */

import { UserSession } from "@/lib/auth/verify-firebase-token";

export interface PlanLimits {
  renders_per_day: number;
  renders_per_month: number;
  max_file_size_mb: number;
  max_resolution_px: number;
  cloud_engines: boolean;
  watermark: boolean;
  priority_queue?: boolean;
}

export const PLAN_LIMITS: Record<"free" | "pro" | "enterprise", PlanLimits> = {
  free: {
    renders_per_day: 3,
    renders_per_month: 20,
    max_file_size_mb: 10,
    max_resolution_px: 2048,
    cloud_engines: false,
    watermark: true,
  },
  pro: {
    renders_per_day: 20,
    renders_per_month: 200,
    max_file_size_mb: 50,
    max_resolution_px: 4096,
    cloud_engines: true,
    watermark: false,
  },
  enterprise: {
    renders_per_day: 999,
    renders_per_month: 9999,
    max_file_size_mb: 200,
    max_resolution_px: 8192,
    cloud_engines: true,
    watermark: false,
    priority_queue: true,
  },
};

// Registre de mémoire volatile pour le comptage journalier par userId
const DAILY_USAGE_MAP = new Map<string, { count: number; date: string }>();

export function checkPlanRateLimit(session: UserSession): {
  allowed: boolean;
  limits: PlanLimits;
  currentDailyCount: number;
  errorReason?: string;
} {
  const plan = session.plan || "free";
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;

  const todayStr = new Date().toISOString().substring(0, 10);
  const usageKey = `${session.userId}_${todayStr}`;
  const usage = DAILY_USAGE_MAP.get(usageKey) || { count: 0, date: todayStr };

  if (usage.count >= limits.renders_per_day) {
    return {
      allowed: false,
      limits,
      currentDailyCount: usage.count,
      errorReason: `Quota journalier atteint pour le plan ${plan.toUpperCase()} (${limits.renders_per_day} rendus/jour). Passez au plan supérieur pour continuer.`,
    };
  }

  return {
    allowed: true,
    limits,
    currentDailyCount: usage.count,
  };
}

export function incrementPlanUsage(userId: string) {
  const todayStr = new Date().toISOString().substring(0, 10);
  const usageKey = `${userId}_${todayStr}`;
  const usage = DAILY_USAGE_MAP.get(usageKey) || { count: 0, date: todayStr };
  usage.count += 1;
  DAILY_USAGE_MAP.set(usageKey, usage);
}
