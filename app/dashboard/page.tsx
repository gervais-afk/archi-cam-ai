"use client";

import { useState, useCallback } from "react";
import Navbar          from "@/components/layout/Navbar";
import DropZone        from "@/components/dashboard/DropZone";
import StyleSelector   from "@/components/dashboard/StyleSelector";
import LoadingOverlay  from "@/components/dashboard/LoadingOverlay";
import ResultsPanel    from "@/components/dashboard/ResultsPanel";
import {
  Sparkles,
  Coins,
  Settings,
  ChevronRight,
} from "lucide-react";
import ProjectHistory from "@/components/dashboard/ProjectHistory";
import CreditsModal from "@/components/dashboard/CreditsModal";
import type { GenerationOptions, RenderResult, UserMode } from "@/types";
import { MOCK_RENDER_RESULT, MOCK_USER }         from "@/lib/mock-data";
import Link from "next/link";
import { User, Briefcase } from "lucide-react";

type DashboardState = "idle" | "file-ready" | "generating" | "result";

const DEFAULT_OPTIONS: GenerationOptions = {
  style:                  "luxe-tropical",
  cinematicVideo:         false,
  bioclimaticAudit:       false,
  googleMapsIntegration:  false,
};

export default function DashboardPage() {
  const [mode,     setMode]     = useState<UserMode>("b2c");
  const [state,    setState]    = useState<DashboardState>("idle");
  const [file,     setFile]     = useState<File | null>(null);
  const [options,  setOptions]  = useState<GenerationOptions>(DEFAULT_OPTIONS);
  const [result,   setResult]   = useState<RenderResult | null>(null);
  const [showCredits, setShowCredits] = useState(false);

  const handleFileAccepted = useCallback((f: File) => {
    setFile(f);
    setState("file-ready");
  }, []);

  const handleGenerate = () => {
    if (!file) return;
    setState("generating");
  };

  const handleGenerationComplete = () => {
    setResult(MOCK_RENDER_RESULT);
    setState("result");
  };

  const handleReset = () => {
    setFile(null);
    setResult(null);
    setOptions(DEFAULT_OPTIONS);
    setState("idle");
  };

  // Simulation rapide — déclenche le BIM Scan sans avoir besoin d'un vrai fichier
  const handleDemoScan = () => {
    setState("generating");
  };

  return (
    <div className="min-h-screen bg-anthracite-950">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-wood-ocre/5 blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-1/3 h-1/3 bg-ai-glow/5 blur-[100px]" />
      </div>

      {/* Loading overlay */}
      {state === "generating" && (
        <LoadingOverlay mode={mode} onComplete={handleGenerationComplete} />
      )}

      {/* Credits Modal */}
      <CreditsModal 
        isOpen={showCredits} 
        onClose={() => setShowCredits(false)} 
        currentCredits={MOCK_USER.credits} 
      />

      <Navbar />

      <div className="relative pt-16">
        {/* Top bar - Floating Glassmorphism */}
        <div className="sticky top-16 z-30 px-4 sm:px-6 lg:px-8 py-4">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm">
              <span className="text-anthracite-500 font-medium">Workspace</span>
              <ChevronRight className="w-4 h-4 text-anthracite-700" />
              <span className="text-white font-bold tracking-wide">Studio Archi IA</span>
            </div>

            {/* Mode Selector */}
            <div className="hidden sm:flex items-center p-1 bg-white/5 rounded-xl border border-white/10">
              <button
                onClick={() => setMode("b2c")}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
                  mode === "b2c" ? "bg-wood-gradient text-white shadow-lg" : "text-anthracite-500 hover:text-white"
                }`}
              >
                <User className="w-3.5 h-3.5" />
                Particulier
              </button>
              <button
                onClick={() => setMode("b2b")}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
                  mode === "b2b" ? "bg-wood-gradient text-white shadow-lg" : "text-anthracite-500 hover:text-white"
                }`}
              >
                <Briefcase className="w-3.5 h-3.5" />
                Professionnel
              </button>
            </div>

            {/* Right: credits + settings */}
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setShowCredits(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/5 group hover:border-wood-ocre/30 transition-all"
              >
                <Coins className="w-4 h-4 text-wood-ocre" />
                <span className="text-white text-sm font-black">
                  {MOCK_USER.credits}
                </span>
                <span className="text-anthracite-500 text-[10px] font-bold uppercase tracking-widest">Crédits</span>
              </button>
              <Link
                href="/settings"
                className="p-2.5 rounded-xl text-anthracite-500 hover:text-white hover:bg-white/5 transition-all border border-transparent hover:border-white/10"
              >
                <Settings className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>

        {/* Main content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          {/* Result view */}
          {state === "result" && result ? (
            <div className="animate-fade-in">
               <ResultsPanel result={result} mode={mode} onReset={handleReset} />
            </div>
          ) : (
            <div className="grid lg:grid-cols-12 gap-8">

              {/* Left: Upload + Options */}
              <div className="lg:col-span-8 space-y-8">
                {/* Section header */}
                <div className="animate-fade-in flex items-end justify-between">
                  <div>
                    <h1 className="font-display font-black text-white text-3xl tracking-tight">
                      Nouveau Projet{" "}
                      <span className="text-transparent bg-clip-text bg-wood-gradient">
                        Architectural
                      </span>
                    </h1>
                    <p className="text-anthracite-500 text-sm mt-1 font-medium">
                      Intelligence Artificielle de précision pour le BTP camerounais.
                    </p>
                  </div>
                  {/* Bouton de démo — déclenche le BIM Scan sans fichier */}
                  <button
                    onClick={handleDemoScan}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                    style={{
                      background: "rgba(0,240,255,0.06)",
                      border: "1px solid rgba(0,240,255,0.15)",
                      color: "#00F0FF",
                    }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00F0FF] animate-pulse" />
                    Démo BIM Scan
                  </button>
                </div>

                {/* Drop Zone */}
                <div className="card-premium p-8 animate-slide-up">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 rounded-lg bg-wood-gradient flex items-center justify-center text-white font-black text-sm shadow-lg shadow-wood-ocre/20">
                      1
                    </div>
                    <h2 className="text-white font-bold text-lg tracking-tight">
                      {mode === "b2c" ? "Plan de Masse ou Croquis" : "Maquette BIM (IFC)"}
                    </h2>
                  </div>
                  <DropZone onFileAccepted={handleFileAccepted} mode={mode} />
                </div>

                {/* Style Selector */}
                {(state === "file-ready") && (
                  <div className="card-premium p-8 animate-slide-up">
                    <div className="flex items-center gap-3 mb-8">
                      <div className="w-8 h-8 rounded-lg bg-wood-gradient flex items-center justify-center text-white font-black text-sm shadow-lg shadow-wood-ocre/20">
                        2
                      </div>
                      <h2 className="text-white font-bold text-lg tracking-tight">
                        Style & Configuration
                      </h2>
                    </div>
                    <StyleSelector options={options} onChange={setOptions} />
                  </div>
                )}
              </div>

              {/* Right: Summary + Generate CTA */}
              <div className="lg:col-span-4">
                <div className="card-premium p-8 sticky top-40 border-wood-ocre/10">
                  <h2 className="font-display font-black text-white text-xl mb-8 tracking-tight border-b border-white/5 pb-4">
                    Résumé Studio
                  </h2>

                  {/* File info */}
                  <div className="space-y-6 mb-8">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-anthracite-500 font-bold uppercase tracking-widest text-[10px]">Source</span>
                      <span className={file ? "text-wood-ocre font-bold" : "text-anthracite-700"}>
                        {file ? file.name.slice(0, 15) + "..." : "Attente..."}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-anthracite-500 font-bold uppercase tracking-widest text-[10px]">Style</span>
                      <span className="text-white font-bold uppercase text-[10px] tracking-widest">
                        {options.style.replace('-', ' ')}
                      </span>
                    </div>
                    
                    <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-3">
                       <div className="flex justify-between text-[10px] font-black uppercase tracking-[0.15em]">
                          <span className="text-anthracite-500">Métré Auto</span>
                          <span className="text-ai-glow">Inclus</span>
                       </div>
                       <div className="flex justify-between text-[10px] font-black uppercase tracking-[0.15em]">
                          <span className="text-anthracite-500">Devis FCFA</span>
                          <span className="text-ai-glow">Inclus</span>
                       </div>
                    </div>

                    <div className="flex justify-between items-center pt-4 border-t border-white/5">
                      <span className="text-anthracite-500 text-[10px] font-black uppercase tracking-widest">Coût Studio</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-white font-black text-2xl">1</span>
                        <span className="text-anthracite-600 text-xs font-bold uppercase">Crédit</span>
                      </div>
                    </div>
                  </div>

                  {/* Generate button */}
                  <button
                    onClick={handleGenerate}
                    disabled={state !== "file-ready"}
                    className={`
                      w-full relative group flex items-center justify-center gap-3 py-5 px-6 rounded-2xl
                      font-black text-sm uppercase tracking-[0.2em] transition-all duration-500
                      ${state === "file-ready"
                        ? "bg-wood-gradient text-white shadow-[0_15px_30px_-10px_rgba(197,160,89,0.5)] hover:shadow-[0_20px_40px_-10px_rgba(197,160,89,0.6)] hover:-translate-y-1"
                        : "bg-white/5 text-anthracite-700 cursor-not-allowed border border-white/5"
                      }
                    `}
                  >
                    <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                    <Sparkles
                      className={`w-5 h-5 ${state === "file-ready" ? "text-white animate-pulse" : ""}`}
                    />
                    Lancer l&apos;IA
                  </button>

                  {state === "file-ready" && (
                    <div className="mt-6 p-3 rounded-xl bg-ai-glow/5 border border-ai-glow/20 flex items-center gap-3 animate-fade-in">
                       <div className="w-2 h-2 rounded-full bg-ai-glow animate-ping" />
                       <p className="text-ai-glow text-[10px] font-bold uppercase tracking-wider">
                         Prêt pour analyse vision 1.5
                       </p>
                    </div>
                  )}
                </div>
                
                <ProjectHistory />
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
