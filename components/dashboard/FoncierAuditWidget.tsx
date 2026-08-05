"use client";

import React, { useState } from "react";
import { ShieldCheck, AlertTriangle, FileText, MapPin, CheckCircle, RefreshCw } from "lucide-react";

export function FoncierAuditWidget() {
  const [landTitle, setLandTitle] = useState("");
  const [city, setCity] = useState("Yaoundé");
  const [quarter, setQuarter] = useState("Bastos");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleAudit = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/audit/foncier", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          landTitleNumber: landTitle || "TF-8849/MFOUNDI",
          city,
          quarter,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setResult(data);
      }
    } catch (e) {
      console.error("Erreur Audit Foncier:", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-white shadow-xl">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-semibold text-base text-slate-100">Audit de Sécurité Foncière IA</h3>
          <p className="text-xs text-slate-400">Vérification Titre Foncier, POS & Risques de Déconstitution</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <div>
          <label className="text-xs text-slate-400 mb-1 block">N° Titre Foncier</label>
          <input
            type="text"
            placeholder="Ex: TF-8849/MFOUNDI"
            value={landTitle}
            onChange={(e) => setLandTitle(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500/50"
          />
        </div>
        <div>
          <label className="text-xs text-slate-400 mb-1 block">Ville</label>
          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500/50"
          >
            <option value="Yaoundé">Yaoundé</option>
            <option value="Douala">Douala</option>
            <option value="Kribi">Kribi</option>
            <option value="Bafoussam">Bafoussam</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-400 mb-1 block">Quartier</label>
          <input
            type="text"
            placeholder="Ex: Bastos / Akwa"
            value={quarter}
            onChange={(e) => setQuarter(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500/50"
          />
        </div>
      </div>

      <button
        onClick={handleAudit}
        disabled={loading}
        className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-semibold py-2.5 rounded-lg flex items-center justify-center gap-2 transition text-sm disabled:opacity-50"
      >
        {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
        {loading ? "Audit en cours par l'IA..." : "Lancer l'Audit Foncier IA (2 Crédits)"}
      </button>

      {result && (
        <div className="mt-5 p-4 bg-slate-950 border border-slate-800 rounded-lg">
          <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
            <span className="text-xs text-slate-400">Score de Conformité Foncière</span>
            <span className={`text-sm font-bold ${result.conformity_score > 80 ? "text-emerald-400" : "text-amber-400"}`}>
              {result.conformity_score} / 100
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <MapPin className="w-3.5 h-3.5 text-amber-400" />
              <span>Zone POS : <strong>{result.zone_pos}</strong></span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <FileText className="w-3.5 h-3.5 text-amber-400" />
              <span>Estimation Terrain : <strong>{(result.estimated_value_per_m2_xaf || 75000).toLocaleString()} FCFA / m²</strong></span>
            </div>

            {result.risks && result.risks.length > 0 && (
              <div className="mt-3">
                <span className="text-amber-400 font-semibold flex items-center gap-1 mb-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> Points d'Attention & Risques :
                </span>
                <ul className="list-disc pl-4 space-y-1 text-slate-400">
                  {result.risks.map((r: string, idx: number) => (
                    <li key={idx}>{r}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
