"use client";

import { useEffect, useState } from "react";

interface QualityData {
  maskGeneration: number;
  ruledLinesRemoval: number;
  renderGeneration: number;
  metadataExtraction: number;
  overall: number;
  totalExecutions: number;
}

export function QualityMetricsWidget() {
  const [metrics, setMetrics] = useState<QualityData | null>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const res = await fetch("/api/admin/metrics/quality");
        if (res.ok) {
          const json = await res.json();
          if (json.success) {
            setMetrics(json.metrics);
          }
        }
      } catch (e) {
        console.warn("QualityMetricsWidget fetch notice:", e);
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000); // Rafraîchissement 30s

    return () => clearInterval(interval);
  }, []);

  if (!metrics) {
    return (
      <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl text-slate-400 text-sm animate-pulse">
        Chargement des métriques de qualité...
      </div>
    );
  }

  const getStatus = (val: number): "good" | "warning" | "critical" => {
    if (val >= 90) return "good";
    if (val >= 80) return "warning";
    return "critical";
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 my-4">
      <MetricCard
        title="Génération Masque"
        value={`${metrics.maskGeneration.toFixed(1)}%`}
        status={getStatus(metrics.maskGeneration)}
      />
      <MetricCard
        title="Suppression Lignes"
        value={`${metrics.ruledLinesRemoval.toFixed(1)}%`}
        status={getStatus(metrics.ruledLinesRemoval)}
      />
      <MetricCard
        title="Rendu Final"
        value={`${metrics.renderGeneration.toFixed(1)}%`}
        status={getStatus(metrics.renderGeneration)}
      />
      <MetricCard
        title="Taux Global (24h)"
        value={`${metrics.overall.toFixed(1)}%`}
        status={getStatus(metrics.overall)}
      />
    </div>
  );
}

function MetricCard({
  title,
  value,
  status,
}: {
  title: string;
  value: string;
  status: "good" | "warning" | "critical";
}) {
  const styles = {
    good: "bg-emerald-950/40 border-emerald-500/40 text-emerald-300",
    warning: "bg-amber-950/40 border-amber-500/40 text-amber-300",
    critical: "bg-rose-950/40 border-rose-500/40 text-rose-300",
  };

  return (
    <div className={`p-4 rounded-xl border ${styles[status]} transition-all backdrop-blur-sm`}>
      <p className="text-xs uppercase tracking-wider opacity-75 font-semibold">{title}</p>
      <p className="text-3xl font-extrabold mt-1">{value}</p>
    </div>
  );
}
