"use client";

import { useState, useEffect } from "react";
import { Loader2, Sparkles, Cpu, Layers, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";

interface RenderProgressProps {
  isProcessing: boolean;
}

export default function RenderProgress({ isProcessing }: RenderProgressProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (!isProcessing) {
      setElapsedSeconds(0);
      return;
    }
    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isProcessing]);

  if (!isProcessing) return null;

  let stepLabel = "Analyse et optimisation vectorielle du plan...";
  let progressPercent = 15;
  let currentIcon = <Cpu className="w-5 h-5 text-cyan-400 animate-pulse" />;

  if (elapsedSeconds >= 22) {
    stepLabel = "Compositing Sharp et finalisation du plan...";
    progressPercent = Math.min(95, 90 + Math.round((elapsedSeconds - 22) * 0.5));
    currentIcon = <Layers className="w-5 h-5 text-emerald-400 animate-bounce" />;
  } else if (elapsedSeconds >= 12) {
    stepLabel = "Calcul de la lumière et ombres 2.5D...";
    progressPercent = 80;
    currentIcon = <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />;
  } else if (elapsedSeconds >= 4) {
    stepLabel = "Synthèse des textures et mobilier par l'IA...";
    progressPercent = 45;
    currentIcon = <Sparkles className="w-5 h-5 text-cyan-400 animate-spin" />;
  }

  return (
    <div className="w-full bg-slate-900/95 border border-cyan-500/40 rounded-2xl p-5 shadow-2xl backdrop-blur-xl my-4">
      {/* Header avec état et spinner */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-slate-800/90 rounded-xl border border-slate-700/80 shadow-inner">
            {currentIcon}
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-100">{stepLabel}</h4>
            <p className="text-xs text-slate-400 font-mono mt-0.5">Pipeline IA Multimodal & Motorisation Sharp SCoT OKF</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
          <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
          <span className="text-xs font-mono text-cyan-400 font-bold">{elapsedSeconds}s</span>
          <span className="text-xs font-mono text-emerald-400 font-extrabold ml-1">({progressPercent}%)</span>
        </div>
      </div>

      {/* Barre de progression avec dégradé fluide */}
      <div className="w-full h-3 bg-slate-800/90 rounded-full overflow-hidden border border-slate-700/60 p-0.5 shadow-inner">
        <motion.div
          className="h-full bg-gradient-to-r from-cyan-500 via-amber-400 to-emerald-400 rounded-full shadow-lg shadow-cyan-500/20"
          initial={{ width: "5%" }}
          animate={{ width: `${progressPercent}%` }}
          transition={{ ease: "easeInOut", duration: 0.6 }}
        />
      </div>

      {/* Étapes de validation visuelle */}
      <div className="grid grid-cols-4 gap-2 mt-4 pt-3 border-t border-slate-800/80 text-[11px]">
        <div className={`flex items-center gap-1.5 ${elapsedSeconds >= 0 ? "text-cyan-400 font-medium" : "text-slate-500"}`}>
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Vectorisation</span>
        </div>
        <div className={`flex items-center gap-1.5 ${elapsedSeconds >= 4 ? "text-cyan-400 font-medium" : "text-slate-500"}`}>
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Synthèse IA</span>
        </div>
        <div className={`flex items-center gap-1.5 ${elapsedSeconds >= 12 ? "text-amber-400 font-medium" : "text-slate-500"}`}>
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Ombres 2.5D</span>
        </div>
        <div className={`flex items-center gap-1.5 ${elapsedSeconds >= 22 ? "text-emerald-400 font-medium" : "text-slate-500"}`}>
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Calque Cotes</span>
        </div>
      </div>
    </div>
  );
}
