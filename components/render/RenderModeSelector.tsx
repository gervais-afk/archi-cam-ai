"use client";

import React, { useState } from "react";

export type RenderMode =
  | "RENDER_2D_PHOTOSHOP"
  | "RENDER_3D_FURNISHED_LUXE_TROPICAL"
  | "RENDER_3D_INTERIOR_PERSPECTIVE"
  | "RENDER_3D_EXTERIOR_PERSPECTIVE"
  | "RENDER_2D_FACADE";

interface RenderModeOption {
  id: RenderMode;
  name: string;
  emoji: string;
  description: string;
  useCase: string;
  processingTime: string;
  cost: number;
  features: string[];
}

const RENDER_MODES: RenderModeOption[] = [
  {
    id: "RENDER_2D_PHOTOSHOP",
    name: "Plan 2D Technique",
    emoji: "📐",
    description: "Plan d'architecte propre et vectoriel (murs nets, sans perspective).",
    useCase: "Idéal pour travailler sur AutoCAD/Photoshop ou présenter au maçon.",
    processingTime: "5-10 secondes",
    cost: 1,
    features: [
      "Murs géométriques précis (noyau adaptatif)",
      "Textures pastel plates différenciées",
      "Calques de construction (Canny, Depth, Text)",
      "Zéro mobilier 3D perturbateur"
    ]
  },
  {
    id: "RENDER_3D_FURNISHED_LUXE_TROPICAL",
    name: "Vue 3D du Dessus Meublée",
    emoji: "🏡",
    description: "Plan de masse 3D à 90° avec mobilier photoréaliste et ombres.",
    useCase: "Idéal pour visualiser l'agencement complet et présenter au client.",
    processingTime: "20-30 secondes",
    cost: 3,
    features: [
      "Cloisons extrudées avec ombres portées",
      "Mobilier design meublé par IA",
      "Jardin tropical paysager extérieur",
      "Matières réelles (bois, marbre, verre)"
    ]
  },
  {
    id: "RENDER_3D_INTERIOR_PERSPECTIVE",
    name: "Perspective Intérieure",
    emoji: "🛋️",
    description: "Vue immersive réaliste d'une pièce à hauteur d'yeux.",
    useCase: "Idéal pour montrer l'ambiance intérieure (salon, cuisine).",
    processingTime: "25-35 secondes",
    cost: 4,
    features: [
      "Perspective photo à 3/4",
      "Éclairage et ombres réalistes",
      "Décoration complète moderne",
      "Idéal pour brochures ou réseaux sociaux"
    ]
  },
  {
    id: "RENDER_3D_EXTERIOR_PERSPECTIVE",
    name: "Perspective Extérieure",
    emoji: "🌳",
    description: "Rendu architectural de la villa complète depuis le jardin.",
    useCase: "Idéal pour visualiser la façade finale et l'intégration paysagère.",
    processingTime: "30-45 secondes",
    cost: 5,
    features: [
      "Façade complète avec volumes et toits",
      "Rendu ciel (journée/coucher de soleil)",
      "Végétation tropicale luxuriante",
      "Projection de la villa terminée"
    ]
  },
  {
    id: "RENDER_2D_FACADE",
    name: "Élévation Façade 2D",
    emoji: "📏",
    description: "Plan de façade technique plat (sans perspective ni déformations).",
    useCase: "Idéal pour les dossiers officiels de permis de construire.",
    processingTime: "10-15 secondes",
    cost: 2,
    features: [
      "Vue orthographique avant stricte",
      "Rendu des hauteurs et ouvertures",
      "Matériaux de parement visibles",
      "Conforme aux normes d'urbanisme"
    ]
  }
];

interface RenderModeSelectorProps {
  onSelect: (mode: RenderMode) => void;
}

export function RenderModeSelector({ onSelect }: RenderModeSelectorProps) {
  const [selectedMode, setSelectedMode] = useState<RenderMode>("RENDER_3D_FURNISHED_LUXE_TROPICAL");

  const handleSelect = (mode: RenderMode) => {
    setSelectedMode(mode);
    onSelect(mode);
  };

  return (
    <div className="space-y-6 bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-800 p-6 text-slate-100 shadow-xl">
      <div>
        <h3 className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
          ⚙️ Type de Rendu Souhaité
        </h3>
        <p className="text-slate-400 text-xs mt-1">
          Sélectionnez le mode le plus adapté pour optimiser votre rendu et le coût en crédits.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {RENDER_MODES.map((mode) => {
          const isSelected = selectedMode === mode.id;
          return (
            <button
              key={mode.id}
              onClick={() => handleSelect(mode.id)}
              className={`flex flex-col items-start p-5 rounded-xl border text-left transition-all duration-300 ${
                isSelected
                  ? "bg-emerald-950/30 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.15)]"
                  : "bg-slate-850/40 border-slate-800/80 hover:border-slate-700"
              }`}
            >
              <div className="flex w-full justify-between items-center">
                <div className="flex items-center space-x-2.5">
                  <span className="text-2xl">{mode.emoji}</span>
                  <span className={`font-bold text-sm ${isSelected ? "text-emerald-400" : "text-slate-200"}`}>
                    {mode.name}
                  </span>
                </div>
                <span className={`text-xs font-mono px-2 py-0.5 rounded ${
                  isSelected ? "bg-emerald-900/80 text-emerald-300" : "bg-slate-800 text-slate-400"
                }`}>
                  {mode.cost} {mode.cost > 1 ? "crédits" : "crédit"}
                </span>
              </div>

              <p className="text-xs text-slate-400 mt-2 line-clamp-2">
                {mode.description}
              </p>

              {/* Usecase bubble */}
              <div className="mt-3 w-full bg-slate-950/50 rounded-lg p-2.5 border border-slate-800/50">
                <span className="text-[10px] text-amber-400/90 font-medium">
                  💡 Idéal pour : {mode.useCase}
                </span>
              </div>

              {/* Features list */}
              <ul className="mt-3 space-y-1 w-full border-t border-slate-800/40 pt-2.5">
                {mode.features.map((feature, index) => (
                  <li key={index} className="text-[10px] text-slate-400 flex items-center space-x-1.5">
                    <span className="text-emerald-500 font-bold">✓</span>
                    <span className="truncate">{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-3.5 flex items-center space-x-1.5 text-[10px] text-slate-500 w-full pt-2 border-t border-slate-800/40">
                <span>⏱️ {mode.processingTime}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Mode Summary */}
      <div className="flex justify-between items-center bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 mt-4">
        <div>
          <span className="text-xs text-slate-400 block">Mode sélectionné</span>
          <span className="text-sm font-bold text-emerald-400">
            {RENDER_MODES.find((m) => m.id === selectedMode)?.name}
          </span>
        </div>
        <div className="text-right">
          <span className="text-xs text-slate-400 block">Coût total</span>
          <span className="text-lg font-extrabold text-emerald-400">
            {RENDER_MODES.find((m) => m.id === selectedMode)?.cost} {RENDER_MODES.find((m) => m.id === selectedMode)!.cost > 1 ? "crédits" : "crédit"}
          </span>
        </div>
      </div>
    </div>
  );
}
