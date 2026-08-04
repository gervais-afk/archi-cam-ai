"use client";

import { useState, useEffect } from "react";
import { Loader2, Sparkles, Cpu, Layers } from "lucide-react";
import { motion } from "framer-motion";

interface RenderProgressIndicatorProps {
  isLoading: boolean;
}

export default function RenderProgressIndicator({ isLoading }: RenderProgressIndicatorProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (!isLoading) {
      setElapsedSeconds(0);
      return;
    }
    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isLoading]);

  if (!isLoading) return null;

  let statusMessage = "Analyse et vectorisation du plan d'architecte...";
  let icon = <Cpu className="w-5 h-5 text-cyan-400 animate-pulse" />;
  let progressPercent = Math.min(25, Math.round((elapsedSeconds / 5) * 25));

  if (elapsedSeconds >= 15) {
    statusMessage = "Finalisation du compositing et des calques vectoriels...";
    icon = <Layers className="w-5 h-5 text-emerald-400 animate-bounce" />;
    progressPercent = Math.min(98, 80 + Math.round((elapsedSeconds - 15) * 2));
  } else if (elapsedSeconds >= 5) {
    statusMessage = "Génération du rendu HD par le moteur IA...";
    icon = <Sparkles className="w-5 h-5 text-amber-400 animate-spin" />;
    progressPercent = Math.min(80, 25 + Math.round((elapsedSeconds - 5) * 5.5));
  }

  return (
    <div className="w-full bg-slate-900/90 border border-cyan-500/30 rounded-xl p-4 shadow-xl backdrop-blur-md my-3">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-800/80 rounded-lg border border-slate-700">
            {icon}
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-100">{statusMessage}</p>
            <p className="text-xs text-slate-400 font-mono">Pipeline IA Multimodal SCoT OKF</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
          <span className="text-xs font-mono text-cyan-400 font-bold">{elapsedSeconds}s ({progressPercent}%)</span>
        </div>
      </div>
      
      {/* Dynamic Animated Progress Bar */}
      <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700/50">
        <motion.div
          className="h-full bg-gradient-to-r from-cyan-500 via-amber-400 to-emerald-400"
          initial={{ width: "5%" }}
          animate={{ width: `${progressPercent}%` }}
          transition={{ ease: "easeInOut", duration: 0.5 }}
        />
      </div>
    </div>
  );
}
