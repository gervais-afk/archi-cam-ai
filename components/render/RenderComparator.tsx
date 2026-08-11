"use client";

import React, { useState } from "react";
import { Layers, Sparkles, ZoomIn, RefreshCw, Wand2, Sun, Moon, Loader2 } from "lucide-react";

interface RenderComparatorProps {
  originalPlanUrl: string;
  renderedImageUrl: string;
  vectorPlanUrl?: string;
  engineUsed?: string;
  styleLabel?: string;
  onRegenerateWithEngine?: (engine: string) => void;
  onImageUpdated?: (newImageUrl: string) => void;
}

export function RenderComparator({
  originalPlanUrl,
  renderedImageUrl,
  vectorPlanUrl,
  engineUsed = "Nano Banana Pro (Gemini 3 Pro)",
  styleLabel = "Top-Down 3D Photoréaliste",
  onRegenerateWithEngine,
  onImageUpdated,
}: RenderComparatorProps) {
  const [sliderPos, setSliderPos] = useState<number>(50);
  const [viewMode, setViewMode] = useState<"slider" | "side-by-side">("slider");
  const [activeVisualMode, setActiveVisualMode] = useState<"3d_photoreal" | "2d_cad">("3d_photoreal");
  const [zoom, setZoom] = useState<boolean>(false);
  const [showEditPanel, setShowEditPanel] = useState<boolean>(false);
  const [editInstruction, setEditInstruction] = useState<string>("");
  const [lighting, setLighting] = useState<"daylight" | "tropical_dusk" | "golden_hour">("daylight");
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [currentRender, setCurrentRender] = useState<string>(renderedImageUrl);

  const displayImage = (activeVisualMode === "2d_cad" && vectorPlanUrl) ? vectorPlanUrl : currentRender;

  const handleApplyLocalEdit = async () => {
    if (!editInstruction.trim()) return;
    setIsEditing(true);

    try {
      const res = await fetch("/api/render/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: currentRender,
          editInstruction,
          lightingCondition: lighting,
          preset: "pro_hd",
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.editedImageUrl) {
          setCurrentRender(data.editedImageUrl);
          if (onImageUpdated) onImageUpdated(data.editedImageUrl);
        }
      }
    } catch (err) {
      console.error("Erreur retouche :", err);
    } finally {
      setIsEditing(false);
      setShowEditPanel(false);
      setEditInstruction("");
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-2xl text-slate-100 space-y-4">
      {/* Barre d'outils du comparateur */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center space-x-2">
            <Layers className="w-5 h-5 text-emerald-400" />
            <span className="font-semibold text-sm tracking-wide">
              {styleLabel}
            </span>
          </div>

          {/* Sélecteur de mode visuel 3D Photoréaliste vs 2D CAO */}
          <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setActiveVisualMode("3d_photoreal")}
              className={`px-2.5 py-1 rounded-md transition font-medium flex items-center gap-1.5 ${
                activeVisualMode === "3d_photoreal"
                  ? "bg-amber-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              ✨ Rendu 3D Photoréaliste (Nano Banana Pro)
            </button>
            <button
              onClick={() => setActiveVisualMode("2d_cad")}
              className={`px-2.5 py-1 rounded-md transition font-medium ${
                activeVisualMode === "2d_cad"
                  ? "bg-slate-800 text-emerald-300 border border-emerald-600/50"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              📐 Plan 2D Vectoriel CAO
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowEditPanel(!showEditPanel)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border transition ${
              showEditPanel
                ? "bg-amber-600 border-amber-500 text-white"
                : "bg-slate-800 hover:bg-slate-700 border-slate-700 text-amber-300"
            }`}
          >
            <Wand2 className="w-3.5 h-3.5" />
            Retouche Ciblée
          </button>
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

      {/* Panneau de retouche localisée */}
      {showEditPanel && (
        <div className="bg-slate-950/80 border border-amber-500/30 rounded-lg p-3 space-y-3">
          <div className="flex items-center justify-between text-xs text-amber-400 font-medium">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Édition Localisée Haute Précision (Gemini 3 Pro / Nano Banana Pro)
            </span>
          </div>
          <div className="flex flex-col md:flex-row gap-2">
            <input
              type="text"
              placeholder="Ex: Remplacer le parement par de la pierre d'Edéa et ajouter des persiennes en bois Iroko..."
              value={editInstruction}
              onChange={(e) => setEditInstruction(e.target.value)}
              className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-md text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
            <select
              value={lighting}
              onChange={(e) => setLighting(e.target.value as any)}
              className="px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-md text-xs text-slate-300 focus:outline-none"
            >
              <option value="daylight">☀️ Plein Jour Tropical</option>
              <option value="tropical_dusk">🌙 Crépuscule Équatorial</option>
              <option value="golden_hour">🌅 Golden Hour Douala</option>
            </select>
            <button
              onClick={handleApplyLocalEdit}
              disabled={isEditing || !editInstruction.trim()}
              className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-medium text-xs rounded-md transition flex items-center justify-center gap-1.5"
            >
              {isEditing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Application...
                </>
              ) : (
                "Appliquer la Retouche"
              )}
            </button>
          </div>
        </div>
      )}

      {/* Surface d'affichage */}
      {viewMode === "slider" ? (
        <div
          className={`relative w-full aspect-video rounded-lg overflow-hidden bg-black select-none border border-slate-800 ${
            zoom ? "scale-125 transition-transform duration-300 z-10" : ""
          }`}
        >
          {/* Image de fond (Rendu final ou Vectoriel selon l'onglet actif) */}
          <img
            src={displayImage}
            alt="Rendu Final"
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
              Plan Original (2D CAO)
            </span>
          </div>

          <span className="absolute top-2 right-2 bg-black/70 text-emerald-400 text-xs px-2 py-1 rounded backdrop-blur">
            {activeVisualMode === "3d_photoreal" ? "✨ Rendu 3D Photoréaliste (Nano Banana Pro)" : "📐 Plan 2D Vectoriel CAO"}
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
              Plan Original (2D CAO)
            </span>
          </div>
          <div className="relative aspect-video bg-black rounded-lg overflow-hidden border border-slate-800">
            <img src={displayImage} alt="Rendu Actif" className="w-full h-full object-contain" />
            <span className="absolute top-2 left-2 bg-black/70 text-emerald-400 text-xs px-2 py-1 rounded">
              {activeVisualMode === "3d_photoreal" ? "✨ Rendu 3D Photoréaliste (Nano Banana Pro)" : "📐 Plan 2D Vectoriel CAO"}
            </span>
          </div>
        </div>
      )}

      {/* Choix du moteur de régénération */}
      {onRegenerateWithEngine && (
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80 text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Moteurs de génération disponibles :
          </span>
          <div className="flex flex-wrap gap-2">
            {[
              { id: "nano_banana_lite", label: "⚡ Nano Banana 2 Lite (~4s)" },
              { id: "nano_banana_pro", label: "🏆 Nano Banana Pro (4K)" },
              { id: "gemini_2_5", label: "Gemini 2.5 Flash" },
              { id: "opencv_local", label: "Souverain Local" },
            ].map((eng) => (
              <button
                key={eng.id}
                onClick={() => onRegenerateWithEngine(eng.id)}
                className="px-2.5 py-1 bg-slate-800 hover:bg-emerald-900/60 hover:text-emerald-300 rounded border border-slate-700 transition text-[11px]"
              >
                {eng.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
