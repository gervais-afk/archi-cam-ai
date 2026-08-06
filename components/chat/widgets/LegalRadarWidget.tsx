"use client";

import React, { useState } from "react";

interface LegalRule {
  id: string;
  name: string;
  measured: string | number;
  limit: string | number;
  status: "safe" | "warning" | "danger";
  lawArticle: string;
}

interface LegalData {
  rules: LegalRule[];
  overallStatus: "safe" | "warning" | "danger";
  zoneCode: string; // ex: "Zone Ua - Douala I"
}

interface LegalRadarWidgetProps {
  data: LegalData;
}

export function LegalRadarWidget({ data }: LegalRadarWidgetProps) {
  const [activeArticle, setActiveArticle] = useState<string | null>(null);

  const defaultRules: LegalRule[] = [
    {
      id: "r1",
      name: "Coefficient d'Emprise au Sol (CES)",
      measured: "45%",
      limit: "Max 50%",
      status: "safe",
      lawArticle: "Art. 12 - Loi d'orientation de l'Urbanisme au Cameroun : Emprise maximale en zone résidentielle dense."
    },
    {
      id: "r2",
      name: "Recul par rapport à la voirie",
      measured: "3.5m",
      limit: "Min 5.0m",
      status: "danger",
      lawArticle: "Art. 8 - Décret d'implantation de Douala : Marge de recul obligatoire pour le gabarit de voirie standard."
    },
    {
      id: "r3",
      name: "Hauteur maximale du bâtiment",
      measured: "R+2 (9m)",
      limit: "Max R+3 (12m)",
      status: "safe",
      lawArticle: "Art. 15 - Plan d'Occupation des Sols : Gabarits de hauteur maximale autorisée par zone d'aménagement."
    }
  ];

  const rules = data?.rules || defaultRules;
  const zone = data?.zoneCode || "Zone Résidentielle Dense Ua1 (Douala)";

  const getStatusBadge = (status: "safe" | "warning" | "danger") => {
    switch (status) {
      case "safe":
        return <span className="text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded text-[10px] border border-emerald-800/40">Conforme</span>;
      case "warning":
        return <span className="text-amber-400 font-bold bg-amber-950/60 px-2 py-0.5 rounded text-[10px] border border-amber-800/40">Alerte</span>;
      case "danger":
        return <span className="text-rose-400 font-bold bg-rose-950/60 px-2 py-0.5 rounded text-[10px] border border-rose-800/40">Non-conforme</span>;
    }
  };

  return (
    <div className="bg-slate-950/80 rounded-xl border border-slate-800 p-4 font-sans text-slate-100 shadow-lg mt-3 w-full max-w-lg">
      <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-800">
        <span className="text-xs font-bold uppercase tracking-wider text-blue-400">
          ⚖️ Analyse de conformité administrative
        </span>
        <span className="text-[10px] text-slate-400 font-mono">
          {zone}
        </span>
      </div>

      <div className="space-y-3">
        {rules.map((rule) => (
          <div
            key={rule.id}
            onClick={() => setActiveArticle(activeArticle === rule.id ? null : rule.id)}
            className="group cursor-pointer bg-slate-900/40 hover:bg-slate-900/80 p-2.5 rounded-lg border border-slate-800/60 hover:border-slate-700 transition-all"
          >
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-semibold text-slate-200">{rule.name}</span>
              {getStatusBadge(rule.status)}
            </div>
            <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono">
              <span>Mesuré : <strong className="text-slate-300">{rule.measured}</strong></span>
              <span>Réglementaire : <strong className="text-slate-300">{rule.limit}</strong></span>
            </div>

            {/* Expandable law article description */}
            {activeArticle === rule.id && (
              <div className="mt-2 text-[10px] text-blue-300 bg-blue-950/30 p-2 rounded border border-blue-900/30 animate-fadeIn">
                📄 {rule.lawArticle}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="bg-slate-900/60 rounded p-2.5 border border-slate-800 text-[10px] text-slate-400 mt-3 text-center">
        💡 Cliquez sur une règle pour consulter l'article de loi de référence correspondant.
      </div>
    </div>
  );
}
