"use client";

import React, { useState } from "react";

interface StructuralData {
  elementName: string; // ex: "Poteau P1"
  concreteVolumeM3: number;
  steelWeightKg: number;
  rebars: string; // ex: "4 HA 12 + 2 HA 10"
  cadres: string; // ex: "HA 6 esp. 15cm"
}

interface StructuralSchemaWidgetProps {
  data: StructuralData;
}

export function StructuralSchemaWidget({ data }: StructuralSchemaWidgetProps) {
  const [activeRebar, setActiveRebar] = useState<string | null>(null);

  const element = data || {
    elementName: "Poteau Principal P1",
    concreteVolumeM3: 0.36,
    steelWeightKg: 42.5,
    rebars: "4 HA 12 (Fér. longitudinal)",
    cadres: "HA 6 esp. 15cm (Fér. transversal)",
  };

  return (
    <div className="bg-slate-950/80 rounded-xl border border-slate-800 p-4 font-sans text-slate-100 shadow-lg mt-3 w-full max-w-lg">
      <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-800">
        <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
          👷 Plan de ferraillage dynamique (BAEL 91)
        </span>
        <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800/40 px-2 py-0.5 rounded font-mono">
          Poteau 20x20
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* SVG Drawing of Pole Section */}
        <div className="flex items-center justify-center bg-slate-900 rounded-lg p-3 border border-slate-800/60">
          <svg width="120" height="120" viewBox="0 0 120 120" className="select-none">
            {/* Concrete boundary */}
            <rect
              x="20"
              y="20"
              width="80"
              height="80"
              fill="none"
              stroke="#64748B"
              strokeWidth="3"
              strokeDasharray="4 2"
            />
            <text x="35" y="15" fill="#64748B" fontSize="8" fontFamily="monospace">
              Section 20x20cm
            </text>

            {/* Transversal Cadre (rebar frame) */}
            <rect
              x="28"
              y="28"
              width="64"
              height="64"
              fill="none"
              stroke="#10B981"
              strokeWidth="2"
              className="cursor-pointer transition-all hover:stroke-emerald-400"
              onMouseEnter={() => setActiveRebar("cadre")}
              onMouseLeave={() => setActiveRebar(null)}
            />

            {/* Longitudinal Rebars (4 corners) */}
            <circle
              cx="31"
              cy="31"
              r="6"
              fill={activeRebar === "corners" ? "#F59E0B" : "#3B82F6"}
              className="cursor-pointer transition-all hover:scale-125"
              onMouseEnter={() => setActiveRebar("corners")}
              onMouseLeave={() => setActiveRebar(null)}
            />
            <circle
              cx="89"
              cy="31"
              r="6"
              fill={activeRebar === "corners" ? "#F59E0B" : "#3B82F6"}
              className="cursor-pointer transition-all hover:scale-125"
              onMouseEnter={() => setActiveRebar("corners")}
              onMouseLeave={() => setActiveRebar(null)}
            />
            <circle
              cx="31"
              cy="89"
              r="6"
              fill={activeRebar === "corners" ? "#F59E0B" : "#3B82F6"}
              className="cursor-pointer transition-all hover:scale-125"
              onMouseEnter={() => setActiveRebar("corners")}
              onMouseLeave={() => setActiveRebar(null)}
            />
            <circle
              cx="89"
              cy="89"
              r="6"
              fill={activeRebar === "corners" ? "#F59E0B" : "#3B82F6"}
              className="cursor-pointer transition-all hover:scale-125"
              onMouseEnter={() => setActiveRebar("corners")}
              onMouseLeave={() => setActiveRebar(null)}
            />
          </svg>
        </div>

        {/* Text Details */}
        <div className="flex flex-col justify-between space-y-2 text-xs">
          <div>
            <span className="text-slate-400 block text-[10px]">Béton Armé :</span>
            <span className="font-mono text-slate-200 block">
              {element.concreteVolumeM3} m³ (Dosage 350kg/m³)
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px]">Aciers :</span>
            <span className="font-mono text-slate-200 block">
              {element.steelWeightKg} kg (FeE500)
            </span>
          </div>
          <div className="border-t border-slate-800 pt-1">
            <span className={`transition-all ${activeRebar === "corners" ? "text-amber-400 font-bold" : "text-slate-300"}`}>
              • {element.rebars}
            </span>
            <span className={`block mt-1 transition-all ${activeRebar === "cadre" ? "text-emerald-400 font-bold" : "text-slate-300"}`}>
              • {element.cadres}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-slate-900/60 rounded p-2 border border-slate-800 text-[10px] text-slate-400 mt-3 text-center">
        💡 Survolez les aciers du schéma pour mettre en valeur les éléments dans la nomenclature.
      </div>
    </div>
  );
}
