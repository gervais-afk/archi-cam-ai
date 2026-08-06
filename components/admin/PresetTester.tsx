"use client";

import React, { useState } from "react";

export function PresetTester() {
  const [preset, setPreset] = useState<"luxe_tropical" | "architect_pro">("luxe_tropical");
  const [positivePrompt, setPositivePrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedPositive, setCopiedPositive] = useState(false);
  const [copiedNegative, setCopiedNegative] = useState(false);

  const testPreset = async (selectedPreset: typeof preset) => {
    setPreset(selectedPreset);
    setLoading(true);
    try {
      const res = await fetch(`/api/test-presets?preset=${selectedPreset}`);
      const data = await res.json();
      setPositivePrompt(data.positive || "");
      setNegativePrompt(data.negative || "");
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, isPositive: boolean) => {
    navigator.clipboard.writeText(text);
    if (isPositive) {
      setCopiedPositive(true);
      setTimeout(() => setCopiedPositive(false), 2000);
    } else {
      setCopiedNegative(true);
      setTimeout(() => setCopiedNegative(false), 2000);
    }
  };

  return (
    <div className="max-w-4xl mx-auto my-8 p-6 bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800 text-slate-100 shadow-2xl">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
            🎨 Prévisualiseur de Presets de Rendu
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Testez et examinez les prompts positifs &amp; négatifs structurés d'Archi Cam AI.
          </p>
        </div>
        <div className="text-xs bg-slate-800 px-3 py-1.5 rounded-full border border-slate-700 font-mono text-emerald-400">
          v0.2.1
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <button
          onClick={() => testPreset("luxe_tropical")}
          className={`flex flex-col items-start p-5 rounded-xl border text-left transition-all duration-300 ${
            preset === "luxe_tropical"
              ? "bg-emerald-950/40 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.15)]"
              : "bg-slate-800/40 border-slate-800 hover:border-slate-700"
          }`}
        >
          <div className="flex items-center space-x-2">
            <span className="text-xl">🌴</span>
            <span className={`font-bold ${preset === "luxe_tropical" ? "text-emerald-400" : "text-slate-200"}`}>
              Luxe Tropical Paysager
            </span>
          </div>
          <span className="text-xs text-slate-400 mt-2">
            Végétation luxuriante, allées de pierre, drop shadows réalistes.
          </span>
        </button>

        <button
          onClick={() => testPreset("architect_pro")}
          className={`flex flex-col items-start p-5 rounded-xl border text-left transition-all duration-300 ${
            preset === "architect_pro"
              ? "bg-blue-950/40 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.15)]"
              : "bg-slate-800/40 border-slate-800 hover:border-slate-700"
          }`}
        >
          <div className="flex items-center space-x-2">
            <span className="text-xl">📐</span>
            <span className={`font-bold ${preset === "architect_pro" ? "text-blue-400" : "text-slate-200"}`}>
              Board Architecte Pro
            </span>
          </div>
          <span className="text-xs text-slate-400 mt-2">
            Rendu minimaliste, cloisons fines charcoal, fond blanc cassé.
          </span>
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
          <span className="ml-3 text-slate-400 font-medium">Génération des structures de prompt...</span>
        </div>
      )}

      {!loading && positivePrompt && (
        <div className="space-y-6 animate-fadeIn">
          {/* Positive Prompt Box */}
          <div className="relative group bg-slate-950/60 rounded-xl border border-slate-800 p-5">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-md border border-emerald-800/40">
                PROMPT POSITIF
              </span>
              <button
                onClick={() => copyToClipboard(positivePrompt, true)}
                className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-md border border-slate-700 transition-all active:scale-95"
              >
                {copiedPositive ? "Copie effectuée !" : "Copier le prompt"}
              </button>
            </div>
            <pre className="text-xs font-mono text-slate-300 whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
              {positivePrompt}
            </pre>
          </div>

          {/* Negative Prompt Box */}
          <div className="relative group bg-slate-950/60 rounded-xl border border-slate-800 p-5">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-400 bg-rose-950/60 px-2.5 py-1 rounded-md border border-rose-800/40">
                PROMPT NÉGATIF (MASTER EXCLUSION)
              </span>
              <button
                onClick={() => copyToClipboard(negativePrompt, false)}
                className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-md border border-slate-700 transition-all active:scale-95"
              >
                {copiedNegative ? "Copie effectuée !" : "Copier le prompt"}
              </button>
            </div>
            <pre className="text-xs font-mono text-slate-300 whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto">
              {negativePrompt}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
