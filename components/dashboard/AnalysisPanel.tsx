"use client";

import { AIAnalysis } from "@/types";
import { 
  Maximize, 
  Ruler, 
  DoorOpen, 
  ShieldCheck, 
  ShieldAlert, 
  ShieldX,
  Activity
} from "lucide-react";

interface AnalysisPanelProps {
  analysis: AIAnalysis;
}

export default function AnalysisPanel({ analysis }: AnalysisPanelProps) {
  const getStatusIcon = () => {
    switch (analysis.compliance.status) {
      case "safe":    return <ShieldCheck className="w-5 h-5 text-green-400" />;
      case "warning": return <ShieldAlert className="w-5 h-5 text-wood-ocre" />;
      case "error":   return <ShieldX className="w-5 h-5 text-red-500" />;
    }
  };

  const getStatusColor = () => {
    switch (analysis.compliance.status) {
      case "safe":    return "text-green-400";
      case "warning": return "text-wood-ocre";
      case "error":   return "text-red-500";
    }
  };

  return (
    <div className="card-premium p-6 overflow-hidden relative">
      {/* Background Glow */}
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-ai-glow/5 rounded-full blur-2xl" />

      <div className="flex items-center justify-between mb-8">
        <h3 className="text-white font-bold text-lg flex items-center gap-2">
          <Activity className="w-5 h-5 text-ai-glow" />
          Analyse IA Structurelle
        </h3>
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10">
          <div className="w-1.5 h-1.5 rounded-full bg-ai-glow shadow-[0_0_8px_#00F0FF]" />
          <span className="text-white/60 text-[10px] font-bold uppercase tracking-wider">
            Gemini Vision 1.5
          </span>
        </div>
      </div>

      {/* Main Metrics */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="p-4 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors">
          <div className="flex items-center gap-2 text-anthracite-400 mb-2">
            <Maximize className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Surface</span>
          </div>
          <p className="text-white text-2xl font-bold">{analysis.surfaceArea} <span className="text-sm font-normal text-anthracite-500">m²</span></p>
        </div>

        <div className="p-4 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors">
          <div className="flex items-center gap-2 text-anthracite-400 mb-2">
            <Ruler className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Murs</span>
          </div>
          <p className="text-white text-2xl font-bold">{analysis.wallPerimeter} <span className="text-sm font-normal text-anthracite-500">ml</span></p>
        </div>
      </div>

      {/* Openings */}
      <div className="flex items-center gap-8 mb-8 px-2">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-anthracite-700">
            <DoorOpen className="w-4 h-4 text-wood-ocre" />
          </div>
          <div>
            <p className="text-white font-bold">{analysis.openingsCount.doors}</p>
            <p className="text-anthracite-500 text-[10px] uppercase font-bold">Portes</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-anthracite-700">
            <Maximize className="w-4 h-4 text-ai-glow" />
          </div>
          <div>
            <p className="text-white font-bold">{analysis.openingsCount.windows}</p>
            <p className="text-anthracite-500 text-[10px] uppercase font-bold">Fenêtres</p>
          </div>
        </div>
      </div>

      {/* Compliance Box */}
      <div className={`p-4 rounded-xl border ${analysis.compliance.status === 'safe' ? 'border-green-500/20 bg-green-500/5' : 'border-wood-ocre/20 bg-wood-ocre/5'}`}>
        <div className="flex items-start gap-3">
          {getStatusIcon()}
          <div>
            <p className={`font-bold text-sm ${getStatusColor()}`}>
              {analysis.compliance.status === 'safe' ? 'Conforme aux normes' : 'Points de vigilance'}
            </p>
            <p className="text-white/70 text-xs mt-1 leading-relaxed">
              {analysis.compliance.message}
            </p>
            <div className="mt-3 flex items-center gap-2">
              <span className="text-[10px] text-anthracite-500 uppercase font-bold">{analysis.compliance.rulesChecked} règles vérifiées</span>
              <div className="flex-1 h-[2px] bg-anthracite-700 rounded-full overflow-hidden">
                <div className="h-full bg-ai-glow w-full shadow-[0_0_8px_#00F0FF]" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confidence Score */}
      <div className="mt-6 flex items-center justify-between">
        <span className="text-anthracite-500 text-[10px] font-bold uppercase">Indice de confiance IA</span>
        <span className="text-ai-glow text-xs font-bold">{Math.round(analysis.confidence * 100)}%</span>
      </div>
    </div>
  );
}
