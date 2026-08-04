"use client";

import { useState, useCallback } from "react";
import Navbar          from "@/components/layout/Navbar";
import DropZone        from "@/components/dashboard/DropZone";
import StyleSelector   from "@/components/dashboard/StyleSelector";
import LoadingOverlay  from "@/components/dashboard/LoadingOverlay";
import ResultsPanel    from "@/components/dashboard/ResultsPanel";
import ChatBot         from "@/components/dashboard/ChatBot";
import {
  Sparkles,
  Coins,
  Settings,
  ChevronRight,
} from "lucide-react";
import ProjectHistory from "@/components/dashboard/ProjectHistory";
import CreditsModal from "@/components/dashboard/CreditsModal";
import type { GenerationOptions, RenderResult, UserMode } from "@/types";
import { MOCK_RENDER_RESULT }         from "@/lib/mock-data";
import Link from "next/link";
import { User, Briefcase } from "lucide-react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { mapVilleToZone } from "@/hooks/useGeolocation";

type DashboardState = "idle" | "file-ready" | "generating" | "result";

const DEFAULT_OPTIONS: GenerationOptions = {
  style:                  "luxe-tropical",
  renderMode:             "3D_PHOTOREALISTE",
  cinematicVideo:         false,
  bioclimaticAudit:       false,
  googleMapsIntegration:  false,
};

export default function DashboardParticulierPage() {
  const mode: UserMode = "b2c";
  const [state,    setState]    = useState<DashboardState>("idle");
  const [file,     setFile]     = useState<File | null>(null);
  const [options,  setOptions]  = useState<GenerationOptions>(DEFAULT_OPTIONS);
  const [result,   setResult]   = useState<RenderResult | null>(null);
  const [showCredits, setShowCredits] = useState(false);

  // ── Utilisateur courant (mock auth prototype) ──
  const { user, projects } = useCurrentUser();

  const handleFileAccepted = useCallback((f: File) => {
    setFile(f);
    setState("file-ready");
  }, []);

  const triggerGeneration = async () => {
    setState("generating");
    
    let planUrl: string | undefined = undefined;
    if (file) {
      try {
        const buffer = await file.arrayBuffer();
        const base64 = Buffer.from(buffer).toString("base64");
        planUrl = `data:${file.type || "application/pdf"};base64,${base64}`;
      } catch (e) {
        console.warn("Could not encode file to base64", e);
      }
    }

    const prompt = `Villa contemporaine de style ${options.style} avec bois Iroko et pierre d'Edéa. Mode de rendu : ${options.renderMode}`;
    
    // Détermination de la géolocalisation (priorité au choix de l'utilisateur sur la carte)
    const chosenCity = options.city || "Yaoundé";
    const chosenLat = options.latitude !== undefined ? options.latitude : 3.8480;
    const chosenLng = options.longitude !== undefined ? options.longitude : 11.5021;
    const chosenElev = options.elevation !== undefined ? options.elevation : 730;

    const mapped = mapVilleToZone(chosenCity);
    const chosenRegion = mapped.region !== "INCONNUE" ? mapped.region : "CENTRE";
    const chosenZone = mapped.zone !== "INCONNUE" ? mapped.zone : "EQUATORIAL_INTERIEUR";

    try {
      if (options.cinematicVideo) {
        const res = await fetch("/api/render/video", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId: "demo-project-123",
            prompt,
            style: options.style,
            ville: chosenCity,
            region: chosenRegion,
            zoneClimatique: chosenZone,
            latitude: chosenLat,
            longitude: chosenLng,
            elevation: chosenElev,
          }),
        });
        
        if (!res.ok) throw new Error("Erreur lors de l'initiation du rendu vidéo.");
        
        const data = await res.json();
        
        const newResult: RenderResult = {
          ...MOCK_RENDER_RESULT,
          style: options.style,
          videoJobId: data.jobId,
          videoStatus: "processing",
          videoUrl: null,
        };
        setResult(newResult);
      } else {
        const res = await fetch("/api/render/image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt,
            style: options.style,
            renderMode: options.renderMode,
            planUrl,
            pdfFileName: file?.name,
            ville: chosenCity,
            region: chosenRegion,
            zoneClimatique: chosenZone,
            latitude: chosenLat,
            longitude: chosenLng,
            elevation: chosenElev,
          }),
        });
        
        if (!res.ok) throw new Error("Erreur lors de la génération de l'image.");
        
        const data = await res.json();
        
        const newResult: RenderResult = {
          ...MOCK_RENDER_RESULT,
          style: options.style,
          imageUrl: data.imageUrl,
          renderUrl: data.renderUrl || data.imageUrl,
          originalPlanUrl: data.originalPlanUrl || planUrl,
          ...(data.analysis ? { analysis: data.analysis } : {}),
          ...(data.estimate ? { estimate: data.estimate } : {}),
          ...(data.reportText ? { reportText: data.reportText } : {}),
        };
        setResult(newResult);
        setState("result");
      }
    } catch (err) {
      console.error("Erreur de génération :", err);
      setResult({
        ...MOCK_RENDER_RESULT,
        style: options.style,
      });
      setState("result");
    }
  };

  const handleGenerate = () => {
    if (!file) return;
    triggerGeneration();
  };

  const handleDemoScan = () => {
    triggerGeneration();
  };

  const handleGenerationComplete = () => {
    if (result) {
      setState("result");
    }
  };

  const handleReset = useCallback(() => {
    setFile(null);
    setResult(null);
    setOptions(DEFAULT_OPTIONS);
    setState("idle");
  }, []);

  return (
    <div className="min-h-screen bg-anthracite-950">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-wood-ocre/5 blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-1/3 h-1/3 bg-ai-glow/5 blur-[100px]" />
      </div>

      {state === "generating" && (
        <LoadingOverlay mode={mode} onComplete={handleGenerationComplete} />
      )}

      <CreditsModal 
        isOpen={showCredits} 
        onClose={() => setShowCredits(false)} 
        currentCredits={user?.credits ?? 0} 
      />

      <Navbar />

      <div className="relative pt-16">
        <div className="sticky top-16 z-30 px-4 sm:px-6 lg:px-8 py-3">
          <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between bg-anthracite-900/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-xl">
            <div className="flex items-center gap-2 text-sm">
              <Link href="/" className="text-anthracite-400 hover:text-white font-semibold transition-colors flex items-center gap-1.5 cursor-pointer">
                Workspace
              </Link>
              <ChevronRight className="w-4 h-4 text-anthracite-700" />
              <span className="text-white font-bold tracking-wide">Studio Archi IA</span>
            </div>

            <div className="hidden sm:flex items-center gap-0 p-1 bg-black/30 rounded-xl border border-white/10">
              <div
                className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all duration-300 bg-gradient-to-r from-wood-acajou to-wood-dark text-white shadow-lg shadow-wood-ocre/20"
              >
                <User className="w-3.5 h-3.5" />
                Particulier
              </div>
              <div className="w-px h-5 bg-white/10" />
              <Link
                href="/dashboard/pro"
                className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all duration-300 bg-transparent text-anthracite-500 hover:text-anthracite-300"
              >
                <Briefcase className="w-3.5 h-3.5" />
                Professionnel
              </Link>
            </div>

            <div className="flex items-center gap-4">
              <button 
                onClick={() => setShowCredits(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/5 group hover:border-wood-ocre/30 transition-all"
              >
                <Coins className="w-4 h-4 text-wood-ocre" />
                <span className="text-white text-sm font-black">
                  {user?.credits ?? 0}
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

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          {state === "result" && result ? (
            <div className="animate-fade-in">
               <ResultsPanel result={result} mode={mode} onReset={handleReset} />
            </div>
          ) : (
            <div className="grid lg:grid-cols-12 gap-8">

              <div className="lg:col-span-8 space-y-8">
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
                    Démo Génération
                  </button>
                </div>

                <div className="card-premium p-8 animate-slide-up">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 rounded-lg bg-wood-gradient flex items-center justify-center text-white font-black text-sm shadow-lg shadow-wood-ocre/20">
                      1
                    </div>
                    <h2 className="text-white font-bold text-lg tracking-tight">
                      Plan de Masse ou Croquis
                    </h2>
                  </div>
                  <DropZone file={file} onFileAccepted={handleFileAccepted} onFileRemoved={handleReset} mode={mode} />
                </div>

                {state === "file-ready" && (
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

              <div className="lg:col-span-4">
                <div className="card-premium p-8 sticky top-40 border-wood-ocre/10">
                  <h2 className="font-display font-black text-white text-xl mb-8 tracking-tight border-b border-white/5 pb-4">
                    Résumé Studio
                  </h2>

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

                    <div className="flex justify-between items-center pt-4 border-t border-white/5">
                      <span className="text-anthracite-500 text-[10px] font-black uppercase tracking-widest">Coût Studio</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-white font-black text-2xl">1</span>
                        <span className="text-anthracite-600 text-xs font-bold uppercase">Crédit</span>
                      </div>
                    </div>
                  </div>

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
                
                <ProjectHistory projects={projects} />
              </div>
            </div>
          )}
        </main>
      </div>
      <ChatBot projectId="demo-project" />
    </div>
  );
}
