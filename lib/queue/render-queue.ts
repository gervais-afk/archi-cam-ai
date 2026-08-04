/**
 * 🚦 RENDER JOB QUEUE — ARCHI CAM AI
 * ───────────────────────────────────
 * Gestionnaire de file d'attente asynchrone avec priorité par plan tarifaire.
 * Concurrence maximale = 3 rendus cloud simultanés (évite la saturation des GPU/API).
 */

export interface RenderJob {
  id: string;
  userId: string;
  plan: "free" | "pro" | "enterprise";
  payload: Record<string, unknown>;
  status: "queued" | "processing" | "completed" | "failed";
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  result?: unknown;
  error?: string;
}

const MAX_CONCURRENT_JOBS = 3;
const JOB_QUEUE: RenderJob[] = [];
const ACTIVE_JOBS = new Map<string, RenderJob>();

export function enqueueRenderJob(
  userId: string,
  plan: "free" | "pro" | "enterprise",
  payload: Record<string, unknown>
): RenderJob {
  const job: RenderJob = {
    id: `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    userId,
    plan,
    payload,
    status: "queued",
    createdAt: Date.now(),
  };

  JOB_QUEUE.push(job);
  // Tri par priorité : Enterprise (3) > Pro (2) > Free (1), puis par date d'arrivée
  JOB_QUEUE.sort((a, b) => {
    const pMap = { enterprise: 3, pro: 2, free: 1 };
    const diff = pMap[b.plan] - pMap[a.plan];
    if (diff !== 0) return diff;
    return a.createdAt - b.createdAt;
  });

  console.log(`[Render Queue] 📥 Job ${job.id} ajouté en file d'attente (Priorité: ${plan.toUpperCase()}, Total en attente: ${JOB_QUEUE.length})`);
  processNextQueueItem();
  return job;
}

export function getQueueStatus(): {
  pendingCount: number;
  activeCount: number;
  activeJobs: RenderJob[];
} {
  return {
    pendingCount: JOB_QUEUE.length,
    activeCount: ACTIVE_JOBS.size,
    activeJobs: Array.from(ACTIVE_JOBS.values()),
  };
}

async function processNextQueueItem() {
  if (ACTIVE_JOBS.size >= MAX_CONCURRENT_JOBS || JOB_QUEUE.length === 0) {
    return;
  }

  const nextJob = JOB_QUEUE.shift();
  if (!nextJob) return;

  nextJob.status = "processing";
  nextJob.startedAt = Date.now();
  ACTIVE_JOBS.set(nextJob.id, nextJob);

  console.log(`[Render Queue] ⚙️ Traitement du job ${nextJob.id} (User: ${nextJob.userId}, En cours: ${ACTIVE_JOBS.size}/${MAX_CONCURRENT_JOBS})`);

  // Simulation / Exécution asynchrone du traitement
  setTimeout(() => {
    nextJob.status = "completed";
    nextJob.completedAt = Date.now();
    ACTIVE_JOBS.delete(nextJob.id);
    console.log(`[Render Queue] ✅ Job ${nextJob.id} terminé avec succès.`);
    processNextQueueItem();
  }, 1200);
}
