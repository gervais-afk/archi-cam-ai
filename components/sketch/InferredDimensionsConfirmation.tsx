"use client";

import React, { useState } from "react";
import { CheckCircle2, AlertTriangle, Sliders, Home, Building2, Crown } from "lucide-react";

export interface InferredRoom {
  id: string;
  name: string;
  inferredArea: number; // m²
  confidence: number;   // 0 - 1
  category: "COMPACT" | "STANDARD" | "SPACIEUX";
}

interface Props {
  initialRooms?: InferredRoom[];
  onConfirm?: (rooms: InferredRoom[]) => void;
}

const DEFAULT_ROOMS: InferredRoom[] = [
  { id: "1", name: "Salon / Séjour Principal", inferredArea: 32, confidence: 0.92, category: "STANDARD" },
  { id: "2", name: "Chambre Parentale", inferredArea: 18, confidence: 0.88, category: "STANDARD" },
  { id: "3", name: "Chambre 2", inferredArea: 14, confidence: 0.65, category: "COMPACT" },
  { id: "4", name: "Cuisine Équipée", inferredArea: 13, confidence: 0.95, category: "STANDARD" },
  { id: "5", name: "Salle de Bain / W.C.", inferredArea: 6, confidence: 0.78, category: "STANDARD" },
];

export function InferredDimensionsConfirmation({
  initialRooms = DEFAULT_ROOMS,
  onConfirm,
}: Props) {
  const [rooms, setRooms] = useState<InferredRoom[]>(initialRooms);
  const [confirmed, setConfirmed] = useState(false);

  const handleAreaChange = (id: string, newArea: number) => {
    setRooms((prev) =>
      prev.map((r) => (r.id === id ? { ...r, inferredArea: newArea } : r))
    );
  };

  const applyPreset = (id: string, area: number, category: "COMPACT" | "STANDARD" | "SPACIEUX") => {
    setRooms((prev) =>
      prev.map((r) => (r.id === id ? { ...r, inferredArea: area, category } : r))
    );
  };

  const totalArea = rooms.reduce((sum, r) => sum + r.inferredArea, 0);

  const handleFinalSubmit = () => {
    setConfirmed(true);
    if (onConfirm) onConfirm(rooms);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white shadow-2xl space-y-6 max-w-2xl mx-auto">
      {/* Title Header */}
      <div className="flex items-start gap-3 border-b border-slate-800 pb-4">
        <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400 mt-1">
          <Sliders className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-lg font-extrabold text-slate-100 flex items-center gap-2">
            Confirmation des Surfaces Déduites
            <span className="text-[10px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full font-mono">
              IA Croquis VLM
            </span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            L&apos;IA a analysé votre croquis au stylo. Ajustez les superficies ($m^2$) ci-dessous avant de générer le plan 2D/3D et le devis final.
          </p>
        </div>
      </div>

      {/* Room list adjustment sliders */}
      <div className="space-y-4 max-h-[380px] overflow-y-auto pr-2">
        {rooms.map((room) => (
          <div
            key={room.id}
            className="bg-slate-950 border border-slate-800 rounded-xl p-4 transition hover:border-slate-700"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-slate-200">{room.name}</span>
                {room.confidence < 0.75 && (
                  <span className="text-[10px] bg-orange-500/20 text-orange-400 border border-orange-500/30 px-2 py-0.5 rounded flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Confiance faible ({Math.round(room.confidence * 100)}%)
                  </span>
                )}
              </div>
              <div className="text-right">
                <span className="text-xl font-extrabold text-amber-400 font-mono">
                  {room.inferredArea} m²
                </span>
              </div>
            </div>

            {/* Slider */}
            <div className="space-y-1 my-3">
              <input
                type="range"
                min={3}
                max={80}
                value={room.inferredArea}
                onChange={(e) => handleAreaChange(room.id, Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>3 m²</span>
                <span>80 m²</span>
              </div>
            </div>

            {/* Preset Buttons */}
            <div className="flex items-center gap-2 pt-1 border-t border-slate-900">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Gabarit :</span>
              <button
                onClick={() => applyPreset(room.id, 12, "COMPACT")}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-[10px] text-slate-300 flex items-center gap-1 transition"
              >
                <Home className="w-3 h-3 text-cyan-400" /> Compact (12m²)
              </button>
              <button
                onClick={() => applyPreset(room.id, 24, "STANDARD")}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-[10px] text-slate-300 flex items-center gap-1 transition"
              >
                <Building2 className="w-3 h-3 text-amber-400" /> Standard (24m²)
              </button>
              <button
                onClick={() => applyPreset(room.id, 45, "SPACIEUX")}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-[10px] text-slate-300 flex items-center gap-1 transition"
              >
                <Crown className="w-3 h-3 text-purple-400" /> Spacieux (45m²)
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Total & Confirmation Button */}
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-center justify-between">
        <div>
          <span className="text-xs text-slate-400 uppercase font-semibold block">Surface Totale Habitable</span>
          <span className="text-2xl font-black text-amber-400 font-mono">{totalArea} m²</span>
        </div>
        <button
          onClick={handleFinalSubmit}
          disabled={confirmed}
          className={`px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition flex items-center gap-2 ${
            confirmed
              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
              : "bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/20"
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          {confirmed ? "Surfaces Validées ✓" : "Confirmer & Lancer le Rendu"}
        </button>
      </div>
    </div>
  );
}
