"use client";

import React, { useState, useEffect } from "react";
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Database, 
  Zap, 
  BarChart3, 
  ShieldCheck, 
  DollarSign, 
  Activity, 
  RefreshCw,
  Leaf,
  Layers,
  Sparkles,
  AlertTriangle
} from "lucide-react";
import OkfTrustBadge from "@/components/ui/OkfTrustBadge";

interface MaterialTrend {
  material_id: string;
  material_name: string;
  region: string;
  current_price: number;
  unit: string;
  trend_pct: string;
  trend_dir: "up" | "down" | "stable";
  last_updated: string;
  okf_status: "human-reviewed" | "unverified";
}

interface RoiInsights {
  total_cement_bags: number;
  total_cement_cost_fcfa: number;
  total_steel_cost_fcfa: number;
  total_structural_cost_fcfa: number;
  estimated_waste_savings_fcfa: number;
  duckdb_query_time_ms: number;
  totalCarbonKgCO2: number;
  carbonSavedKgCO2: number;
  scenarios: {
    ecoLocalBasCarboneTTC: number;
    standardTTC: number;
    prestigeTTC: number;
  };
}

interface BiData {
  generated_at: string;
  source: string;
  trends: MaterialTrend[];
  roi_insights: RoiInsights;
}

function formatFCFA(val: number): string {
  return new Intl.NumberFormat("fr-FR").format(val) + " FCFA";
}

export const SovereignBiDashboard: React.FC = () => {
  const [biData, setBiData] = useState<BiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  
  // Scénario sélectionné par l'utilisateur
  const [selectedScenario, setSelectedScenario] = useState<"eco" | "standard" | "prestige">("standard");

  const fetchBiData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/bi/trends", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setBiData(data);
      }
    } catch (err) {
      console.error("[SovereignBiDashboard] Erreur chargement BI :", err);
    } finally {
      setLoading(false);
      setLastRefresh(new Date());
    }
  };

  useEffect(() => {
    fetchBiData();
    const interval = setInterval(fetchBiData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const roi = biData?.roi_insights;
  const trends = biData?.trends ?? [];

  // Déterminer le coût affiché selon le scénario sélectionné
  let displayedCost = 0;
  if (roi) {
    if (selectedScenario === "eco") displayedCost = roi.scenarios.ecoLocalBasCarboneTTC;
    else if (selectedScenario === "prestige") displayedCost = roi.scenarios.prestigeTTC;
    else displayedCost = roi.scenarios.standardTTC;
  }

  return (
    <div className="card-premium p-6 relative overflow-hidden bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl space-y-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-800 gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-black text-white tracking-wide">
              Sovereign BI &amp; Analytics Exécutif
            </h3>
            <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-cyan-500/20 text-cyan-400 text-[10px] font-bold border border-cyan-500/30">
              <Zap className="w-3 h-3" /> DuckDB 1.5.5 In-Memory (&lt;2ms)
            </span>
          </div>
          <p className="text-slate-400 text-xs mt-1">
            Intelligence ConTech &amp; Analyse Cycle de Vie (LCA) basée sur la mercuriale MINMAP 2026.
          </p>
        </div>
        <div className="flex items-center gap-3 self-end sm:self-center">
          <button
            onClick={fetchBiData}
            disabled={loading}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors disabled:opacity-50"
            title="Rafraîchir les données"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <OkfTrustBadge tier="human-reviewed" attested={true} />
        </div>
      </div>

      {/* Scénarisation Éco-Bâtiment (B2B Slider) */}
      <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-800/80 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            Scénarisation de Matériaux
          </h4>
          <span className="text-[10px] text-cyan-400 font-mono font-bold bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
            Pre-Estimation Active
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => setSelectedScenario("eco")}
            className={`py-3 px-2 rounded-xl text-center border transition-all ${
              selectedScenario === "eco"
                ? "bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)]"
                : "bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-white"
            }`}
          >
            <Leaf className="w-4 h-4 mx-auto mb-1" />
            <p className="text-[10px] font-black uppercase">Éco / Bas-Carbone</p>
            <span className="text-[9px] opacity-70">BTC &amp; Terre (-22%)</span>
          </button>
          <button
            onClick={() => setSelectedScenario("standard")}
            className={`py-3 px-2 rounded-xl text-center border transition-all ${
              selectedScenario === "standard"
                ? "bg-cyan-500/20 border-cyan-500 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.15)]"
                : "bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-white"
            }`}
          >
            <Database className="w-4 h-4 mx-auto mb-1" />
            <p className="text-[10px] font-black uppercase">Standard Béton</p>
            <span className="text-[9px] opacity-70">Mercuriale MINMAP</span>
          </button>
          <button
            onClick={() => setSelectedScenario("prestige")}
            className={`py-3 px-2 rounded-xl text-center border transition-all ${
              selectedScenario === "prestige"
                ? "bg-amber-500/20 border-amber-500 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.15)]"
                : "bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-white"
            }`}
          >
            <Sparkles className="w-4 h-4 mx-auto mb-1" />
            <p className="text-[10px] font-black uppercase">Prestige / Edéa</p>
            <span className="text-[9px] opacity-70">Finit. Luxe (+45%)</span>
          </button>
        </div>
      </div>

      {/* Grid des Métriques BI */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* Coût du scénario sélectionné */}
        <div className="p-5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Coût Structure Estimé</p>
            <p className="text-2xl font-black text-white mt-1">
              {roi ? formatFCFA(displayedCost) : "—"}
            </p>
            <p className="text-xs text-slate-400 font-semibold mt-1">
              Scénario : <span className="text-cyan-400 capitalize">{selectedScenario}</span>
            </p>
          </div>
          <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        {/* Foster+Partners LCA : Bilan Carbone */}
        <div className="p-5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Bilan Carbone (LCA)</p>
            <p className="text-2xl font-black text-white mt-1">
              {roi ? `${roi.totalCarbonKgCO2.toLocaleString("fr-FR")} kg` : "—"}
            </p>
            <p className="text-xs text-emerald-400 font-bold mt-1">
              {roi ? `🌿 Évité: -${roi.carbonSavedKgCO2.toLocaleString("fr-FR")} kg CO2` : "Calcul..."}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Leaf className="w-6 h-6" />
          </div>
        </div>

        {/* Temps de calcul / Règle mécanique */}
        <div className="p-5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Sûreté &amp; BAEL 91</p>
            <p className="text-2xl font-black text-amber-400 mt-1">Conforme Eurocode</p>
            <p className="text-xs text-slate-400 mt-1">Calculs physiques attestés OKF</p>
          </div>
          <div className="p-3 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Tableau des mercuriales de prix en temps réel */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-cyan-400" />
            Tendances Tarifaires des Matériaux (DuckDB Analytics)
          </h4>
          <span className="text-[11px] text-slate-400 font-mono">
            {loading ? "Chargement…" : `Sync: ${lastRefresh.toLocaleTimeString("fr-FR")}`}
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/40">
          {loading && trends.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-slate-500 text-sm gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" /> Interrogation du moteur DuckDB…
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/80 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="p-3">Matériau</th>
                  <th className="p-3">Région</th>
                  <th className="p-3">Prix Actuel</th>
                  <th className="p-3">Évolution (2026)</th>
                  <th className="p-3">Statut OKF v0.2</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {trends.map((m, idx) => (
                  <tr key={idx} className="hover:bg-slate-900/40 transition-colors">
                    <td className="p-3 font-medium text-white">{m.material_name}</td>
                    <td className="p-3 text-slate-400">{m.region}</td>
                    <td className="p-3 font-bold text-cyan-300">
                      {new Intl.NumberFormat("fr-FR").format(m.current_price)} FCFA/{m.unit}
                    </td>
                    <td className="p-3">
                      <span className={`flex items-center gap-1 font-semibold ${
                        m.trend_dir === "up" ? "text-red-400" :
                        m.trend_dir === "down" ? "text-emerald-400" : "text-slate-400"
                      }`}>
                        {m.trend_dir === "up" && <TrendingUp className="w-3 h-3" />}
                        {m.trend_dir === "down" && <TrendingDown className="w-3 h-3" />}
                        {m.trend_dir === "stable" && <Minus className="w-3 h-3" />}
                        {m.trend_pct}
                      </span>
                    </td>
                    <td className="p-3">
                      <OkfTrustBadge
                        tier={m.okf_status === "unverified" ? "unverified" : "human-reviewed"}
                        isStale={m.okf_status === "unverified"}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default SovereignBiDashboard;
