"use client";

import React, { useState } from "react";
import { Layers, Sparkles, ZoomIn, RefreshCw } from "lucide-react";

interface RenderComparatorProps {
  originalPlanUrl: string;
  renderedImageUrl: string;
  engineUsed?: string;
  styleLabel?: string;
  onRegenerateWithEngine?: (engine: string) => void;
}

export function RenderComparator({
  originalPlanUrl,
  renderedImageUrl,
  engineUsed = "Gemini / OpenCV",
  styleLabel = "Luxe Tropical",
  onRegenerateWithEngine,
}: RenderComparatorProps) {
  const [sliderPos, setSliderPos] = useState<number>(50);
  const [viewMode, setViewMode] = useState<"slider" | "side-by-side">("slider");
  const [zoom, setZoom] = useState<boolean>(false);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-2xl text-slate-100 space-y-4">
      {/* Barre d'outils du comparateur */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-2">
          <Layers className="w-5 h-5 text-emerald-400" />
          <span className="font-semibold text-sm tracking-wide">
            Comparateur Architectural — {styleLabel}
          </span>
          <span className="bg-emerald-900/60 text-emerald-300 text-xs px-2 py-0.5 rounded-full border border-emerald-700/50">
            Moteur: {engineUsed}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setViewMode(viewMode === "slider" ? "side-by-side" : "slider")}
            className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 rounded-md border border-slate-700 transition"
          >
            {viewMode === "slider" ? "Vue Côte à Côte" : "Vue Glissière"}
          </button>
          <button
            onClick={() => setZoom(!zoom)}
            className={`p-1.5 text-xs rounded-md border transition ${
              zoom ? "bg-emerald-600 border-emerald-500 text-white" : "bg-slate-800 border-slate-700 hover:bg-slate-700"
            }`}

          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Surface d'affichage */}
      {viewMode === "slider" ? (
        <div
          className={`relative w-full aspect-video rounded-lg overflow-hidden bg-black select-none border border-slate-800 ${
            zoom ? "scale-125 transition-transform duration-300 z-10" : ""
          }`}
        >
          {/* Image de fond (Rendu final) */}
          <img
            src={renderedImageUrl}
            alt="Rendu 3D Final"
            className="absolute inset-0 w-full h-full object-contain"
          />

          {/* Image superposée découpée (Plan original) */}
          <div
            className="absolute inset-y-0 left-0 overflow-hidden border-r-2 border-emerald-400 shadow-xl"
            style={{ width: `${sliderPos}%` }}
          >
            <img
              src={originalPlanUrl}
              alt="Plan Original"
              className="absolute top-0 left-0 w-full h-full object-contain max-w-none"
              style={{ width: "100%", height: "100%" }}
            />
            <span className="absolute top-2 left-2 bg-black/70 text-emerald-400 text-xs px-2 py-1 rounded backdrop-blur">
              Plan Original
            </span>
          </div>

          <span className="absolute top-2 right-2 bg-black/70 text-emerald-400 text-xs px-2 py-1 rounded backdrop-blur">
            Rendu 3D HD
          </span>

          {/* Glissière tactile / interactive */}
          <input
            type="range"
            min="0"
            max="100"
            value={sliderPos}
            onChange={(e) => setSliderPos(Number(e.target.value))}
            className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-20"
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative aspect-video bg-black rounded-lg overflow-hidden border border-slate-800">
            <img src={originalPlanUrl} alt="Plan Original" className="w-full h-full object-contain" />
            <span className="absolute top-2 left-2 bg-black/70 text-slate-300 text-xs px-2 py-1 rounded">
              Plan Original (2D)
            </span>
          </div>
          <div className="relative aspect-video bg-black rounded-lg overflow-hidden border border-slate-800">
            <img src={renderedImageUrl} alt="Rendu 3D" className="w-full h-full object-contain" />
            <span className="absolute top-2 left-2 bg-black/70 text-emerald-400 text-xs px-2 py-1 rounded">
              Rendu 3D ({engineUsed})
            </span>
          </div>
        </div>
      )}

      {/* Choix du moteur de régénération */}
      {onRegenerateWithEngine && (
        <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Régénérer avec un autre moteur :
          </span>
          <div className="flex gap-2">
            {["gemini", "replicate", "openai", "opencv_local"].map((eng) => (
              <button
                key={eng}
                onClick={() => onRegenerateWithEngine(eng)}
                className="px-2 py-1 bg-slate-800 hover:bg-emerald-900/60 hover:text-emerald-300 rounded border border-slate-700 transition capitalize text-[11px]"
              >
                {eng}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
