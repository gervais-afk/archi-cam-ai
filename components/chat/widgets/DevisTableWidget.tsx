"use client";

import React, { useState } from "react";

interface DevisItem {
  id: string;
  label: string;
  costXAF: number;
}

interface DevisTableData {
  items: DevisItem[];
  totalCostXAF: number;
  currency: string;
}

interface DevisTableWidgetProps {
  data: DevisTableData;
}

export function DevisTableWidget({ data }: DevisTableWidgetProps) {
  const [items, setItems] = useState<DevisItem[]>(data?.items || []);
  const [multiplier, setMultiplier] = useState<number>(1.0);

  const handleAdjustPrice = (factor: number) => {
    setMultiplier(factor);
    const updated = (data?.items || []).map((item) => ({
      ...item,
      costXAF: Math.round(item.costXAF * factor),
    }));
    setItems(updated);
  };

  const total = items.reduce((sum, item) => sum + item.costXAF, 0);

  return (
    <div className="bg-slate-950/80 rounded-xl border border-slate-800 p-4 font-sans text-slate-100 shadow-lg mt-3 w-full max-w-lg">
      <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-800">
        <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
          📊 Lot estimation plomberie & gros œuvre
        </span>
        <span className="text-xs font-mono text-slate-400">
          Devis révisable
        </span>
      </div>

      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className="flex justify-between items-center text-xs">
            <span className="text-slate-300">├─ {item.label}</span>
            <span className="font-mono text-slate-200">
              {item.costXAF.toLocaleString("fr-FR")} FCFA
            </span>
          </div>
        ))}
      </div>

      <div className="flex justify-between items-center mt-3 pt-2 border-t border-slate-800 text-xs font-bold">
        <span className="text-slate-100">Total estimé :</span>
        <span className="text-emerald-400 font-mono text-sm">
          {total.toLocaleString("fr-FR")} FCFA
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-800/60">
        <button
          onClick={() => handleAdjustPrice(0.9)}
          className={`text-[10px] py-1.5 px-2 rounded border border-slate-800 hover:border-slate-700 transition-all ${
            multiplier === 0.9 ? "bg-amber-950/40 text-amber-400 border-amber-800" : "bg-slate-900 text-slate-300"
          }`}
        >
          🏷️ Réduc. -10%
        </button>
        <button
          onClick={() => handleAdjustPrice(1.0)}
          className={`text-[10px] py-1.5 px-2 rounded border border-slate-800 hover:border-slate-700 transition-all ${
            multiplier === 1.0 ? "bg-amber-950/40 text-amber-400 border-amber-800" : "bg-slate-900 text-slate-300"
          }`}
        >
          Standard
        </button>
        <button
          onClick={() => handleAdjustPrice(1.15)}
          className={`text-[10px] py-1.5 px-2 rounded border border-slate-800 hover:border-slate-700 transition-all ${
            multiplier === 1.15 ? "bg-amber-950/40 text-amber-400 border-amber-800" : "bg-slate-900 text-slate-300"
          }`}
        >
          📈 Kribi x1.15
        </button>
      </div>

      <button className="w-full mt-3 bg-amber-600 hover:bg-amber-700 text-white font-bold py-2 rounded text-xs transition-all tracking-wide">
        📥 Exporter la Plomberie (PDF)
      </button>
    </div>
  );
}
