"use me";
import React from "react";

export interface FidelityBadgeProps {
  engineUsed: string;
  halluScore?: number;
  warnings?: string[];
}

export function FidelityBadge({ engineUsed, halluScore, warnings = [] }: FidelityBadgeProps) {
  const isOpencv = engineUsed.toLowerCase().includes("opencv");

  if (isOpencv) {
    return (
      <div className="flex flex-col gap-1 rounded-xl bg-emerald-950/40 border border-emerald-500/30 p-3.5 text-xs text-emerald-300 shadow-md">
        <div className="flex items-center gap-2 font-semibold text-emerald-400">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          🔒 Fidélité Géométrique 100% (Plan 2D OpenCV)
        </div>
        <p className="text-emerald-200/80 leading-relaxed">
          Rendu mathématique déterministe — aucun réseau de neurones génératif. Vos murs et cotations sont reproduits sans aucune altération.
        </p>
      </div>
    );
  }

  if (halluScore !== undefined && halluScore < 0.25) {
    return (
      <div className="flex flex-col gap-1 rounded-xl bg-blue-950/40 border border-blue-500/30 p-3.5 text-xs text-blue-300 shadow-md">
        <div className="flex items-center gap-2 font-semibold text-blue-400">
          <span className="inline-block h-2 w-2 rounded-full bg-blue-400" />
          ✅ Rendu 3D IA Conforme (Structure Vérifiée)
        </div>
        <p className="text-blue-200/80 leading-relaxed">
          Structure validée par détection Canny (score d&apos;alignement: {halluScore.toFixed(2)}). Le rendu 3D respecte la disposition d&apos;origine.
        </p>
      </div>
    );
  }

  if (halluScore !== undefined && halluScore < 0.35) {
    return (
      <div className="flex flex-col gap-1 rounded-xl bg-amber-950/40 border border-amber-500/30 p-3.5 text-xs text-amber-300 shadow-md">
        <div className="flex items-center gap-2 font-semibold text-amber-400">
          <span className="inline-block h-2 w-2 rounded-full bg-amber-400" />
          ⚠️ Rendu 3D IA — Fidélité Partielle
        </div>
        <p className="text-amber-200/80 leading-relaxed">
          Certains détails décoratifs ont été interprétés par l&apos;IA. Veuillez vérifier que votre plan est fidèle ou utiliser le plan 2D certifié.
        </p>
        {warnings.length > 0 && (
          <ul className="mt-1 list-disc list-inside text-amber-200/70">
            {warnings.map((w, idx) => (
              <li key={idx}>{w}</li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 rounded-xl bg-slate-900/60 border border-slate-700/50 p-3.5 text-xs text-slate-300">
      <div className="flex items-center gap-2 font-semibold text-slate-200">
        ℹ️ Rendu Estimatif
      </div>
      <p className="text-slate-400 leading-relaxed">
        Généré par {engineUsed}. Pour des documents de chantier ou permis de construire, référez-vous toujours au plan 2D Photoshop certifié.
      </p>
    </div>
  );
}
