import type { RenderResult }   from "@/types";
import { Download, Share2, RotateCcw, FileText, ExternalLink, ZoomIn, Activity, Receipt, CheckCircle2, Sparkles, AlertTriangle, Loader2, Table } from "lucide-react";
import { useState, useEffect } from "react";
import { motion }             from "framer-motion";
import AnalysisPanel from "./AnalysisPanel";
import BimAnalysisPanel from "./BimAnalysisPanel";
import EstimateTable from "./EstimateTable";
import type { UserMode } from "@/types";
import { mapIfcToEstimate } from "@/lib/bim-mapper";
import { generateCctp } from "@/lib/cctp-service";
import MediaViewerPro from "./MediaViewerPro";
import PlanComparisonSlider from "@/components/PlanComparisonSlider";


interface ResultsPanelProps {
  result:   RenderResult;
  mode:     UserMode;
  onReset:  () => void;
}

export default function ResultsPanel({ result, mode, onReset }: ResultsPanelProps) {
  const [currentResult, setCurrentResult] = useState<RenderResult>(result);
  const [activeTab,  setActiveTab]  = useState<"image" | "analysis" | "estimate" | "report">(
    mode === "b2b" ? "analysis" : "image"
  );
  const [isZoomed,   setIsZoomed]   = useState(false);

  const [videoUrl, setVideoUrl] = useState<string | null>(currentResult.videoUrl || null);
  const [videoStatus, setVideoStatus] = useState<string | null>(currentResult.videoStatus || null);
  const [videoLoading, setVideoLoading] = useState<boolean>(currentResult.videoStatus === "processing");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const [currentImageUrl, setCurrentImageUrl] = useState<string>(currentResult.imageUrl);
  const [activeJobId, setActiveJobId] = useState<string | null>(currentResult.videoJobId || null);

  const [cctpContent, setCctpContent] = useState<string>("Génération du CCTP par l'IA en cours...");

  useEffect(() => {
    let isMounted = true;
    generateCctp(currentResult.ifcMetadata, { ville: currentResult.city, standing: currentResult.style })
      .then((text) => { if (isMounted && text) setCctpContent(text); })
      .catch(() => { if (isMounted) setCctpContent("CCTP disponible dans le rapport complet."); });
    return () => { isMounted = false; };
  }, [currentResult]);
  const [overrideVolBeton, setOverrideVolBeton] = useState<number>(
    currentResult.ifcMetadata?.concreteVolume || 5.0
  );
  const [overrideContrainteSol, setOverrideContrainteSol] = useState<number>(0.25);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [lastUpdatedCode, setLastUpdatedCode] = useState<string | null>(null);

  const handleApplyOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    try {
      const res = await fetch("/api/test-orchestrator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: currentResult.id,
          volume_beton_m3: overrideVolBeton,
          contrainteAdmise_MPa: overrideContrainteSol,
        }),
      });

      if (!res.ok) throw new Error("Erreur lors de la mise à jour");
      const data = await res.json();
      
      if (data.success) {
        // Mettre à jour le résultat avec les nouvelles données calculées et approuvées
        const updatedResult: RenderResult = {
          ...currentResult,
          superviseur: data.superviseur,
          ifcMetadata: {
            ...currentResult.ifcMetadata,
            concreteVolume: data.context?.metreur?.volume_beton_m3 || overrideVolBeton,
            complianceScore: data.context?.superviseur?.approvalStatus ? 98 : 40,
          },
          estimate: {
            ...currentResult.estimate,
            totalAmount: data.context?.superviseur?.totalCost_FCFA || 32197500,
            lines: data.context?.economiste?.breakdown && data.context.economiste.breakdown.length > 0
              ? data.context.economiste.breakdown.map((item: any, idx: number) => ({
                  code: `GO-${idx + 1}`,
                  category: "Ouvrage",
                  label: item.description,
                  quantity: item.quantity,
                  unit: item.unit,
                  unitPrice: item.unitPrice_FCFA,
                  totalPrice: item.totalPrice_FCFA,
                }))
              : currentResult.estimate?.lines,
          } as any
        };
        setCurrentResult(updatedResult);
      }
    } catch (err) {
      console.error("Erreur de recalcul :", err);
    } finally {
      setIsUpdating(false);
    }
  };

  useEffect(() => {
    setCurrentResult(result);
  }, [result]);

  useEffect(() => {
    const handleArchiAction = (e: Event) => {
      const customEvent = e as CustomEvent;
      const action = customEvent.detail;
      if (!action || !action.action || !action.params) return;

      console.log("⚡ Received Archi Cam AI Action:", action);

      if (action.action === "update_devis_price" || action.action === "update_devis_quantity") {
        const { item, value } = action.params;
        
        setCurrentResult(prev => {
          if (!prev || !prev.estimate) return prev;
          
          // Find the matching line code for highlight
          const matchedLine = prev.estimate.lines.find(line => 
            line.label.toLowerCase().includes(item.toLowerCase()) || 
            line.code.toLowerCase().includes(item.toLowerCase())
          );
          if (matchedLine) {
            setLastUpdatedCode(matchedLine.code);
            setTimeout(() => setLastUpdatedCode(null), 3000);
          }

          const updatedLines = prev.estimate.lines.map(line => {
            if (
              line.label.toLowerCase().includes(item.toLowerCase()) || 
              line.code.toLowerCase().includes(item.toLowerCase())
            ) {
              if (action.action === "update_devis_price") {
                return {
                  ...line,
                  unitPrice: value,
                  totalPrice: Math.round(line.quantity * value)
                };
              } else {
                return {
                  ...line,
                  quantity: value,
                  totalPrice: Math.round(value * line.unitPrice)
                };
              }
            }
            return line;
          });
          
          const totalHT = updatedLines.reduce((sum, l) => sum + l.totalPrice, 0);
          const margeBET = Math.round(totalHT * ((prev.estimate?.margeBET ?? 5) / 100));
          const margeAleas = Math.round(totalHT * ((prev.estimate?.margeAleas ?? 3) / 100));
          const totalAmount = totalHT + margeBET + margeAleas;
          const tva = Math.round(totalAmount * 0.1925);
          const totalTTC = totalAmount + tva;
          
          return {
            ...prev,
            estimate: {
              ...prev.estimate,
              lines: updatedLines,
              totalHT,
              totalAmount,
              totalTTC,
              tva
            }
          };
        });
      }
    };

    window.addEventListener("archi-cam-action", handleArchiAction);
    return () => window.removeEventListener("archi-cam-action", handleArchiAction);
  }, []);

  useEffect(() => {
    if (!activeJobId || videoStatus !== "processing") return;

    let intervalId: NodeJS.Timeout;

    const checkStatus = async () => {
      try {
        const res = await fetch(`/api/render/video/status?jobId=${activeJobId}`);
        if (!res.ok) throw new Error("Impossible de vérifier le statut de la vidéo.");
        const data = await res.json();
        
        if (data.status === "completed") {
          setVideoUrl(data.mediaUrl);
          setVideoStatus("completed");
          setVideoLoading(false);
          clearInterval(intervalId);
        } else if (data.status === "failed") {
          setVideoStatus("failed");
          setVideoLoading(false);
          setErrorMessage(data.errorMessage || "Le rendu vidéo a échoué.");
          clearInterval(intervalId);
        }
      } catch (err: any) {
        console.error("Erreur de polling du statut de rendu vidéo :", err);
      }
    };

    // Premier check immédiat
    checkStatus();

    // Polling toutes les 5 secondes
    intervalId = setInterval(checkStatus, 5000);

    return () => clearInterval(intervalId);
  }, [activeJobId, videoStatus]);

  const isApproved = currentResult.superviseur?.approvalStatus !== false;

  return (
    <div className="animate-fade-in space-y-8">
      {/* Header Row */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-2xl bg-wood-gradient flex items-center justify-center shadow-lg shadow-wood-ocre/20">
               <CheckCircle2 className="w-6 h-6 text-white" />
             </div>
             <div>
               <h3 className="font-display font-black text-white text-3xl tracking-tight leading-none">
                 Analyse Terminée
               </h3>
               <div className="flex items-center gap-2 mt-2">
                 <span className="px-2 py-0.5 rounded-md bg-ai-glow/10 text-ai-glow text-[9px] font-black uppercase tracking-[0.2em] border border-ai-glow/20">
                   Intelligence BTP Active
                 </span>
                 <span className="text-anthracite-600 text-xs">•</span>
                 <span className="text-anthracite-500 text-[10px] font-bold uppercase tracking-widest">Réf: AC-2026-0042</span>
               </div>
             </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            disabled={!isApproved}
            onClick={async () => {
              if (!isApproved) return;
              try {
                const res = await fetch('/api/generate-pdf', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ projectId: currentResult.id }),
                });
                if (!res.ok) throw new Error('Failed to generate PDF');
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${currentResult.id}_Devis_Officiel.pdf`;
                a.click();
                window.URL.revokeObjectURL(url);
              } catch (e) {
                console.error(e);
              }
            }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              !isApproved
                ? "bg-orange-500/10 text-orange-500 border border-orange-500/20 cursor-not-allowed"
                : "bg-wood-gradient text-white shadow-xl shadow-wood-ocre/20 hover:scale-[1.02] active:scale-[0.98]"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            PDF
          </button>
          <button
            disabled={!isApproved}
            onClick={async () => {
              if (!isApproved) return;
              try {
                const lines = mode === "b2b" && currentResult.ifcMetadata 
                  ? mapIfcToEstimate(currentResult.ifcMetadata) 
                  : currentResult.estimate?.lines;

                const res = await fetch('/api/generate-excel', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ 
                    projectId: currentResult.id,
                    lines 
                  }),
                });
                if (!res.ok) throw new Error('Failed to generate Excel');
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${currentResult.id}_Devis_Modifiable.xlsx`;
                a.click();
                window.URL.revokeObjectURL(url);
              } catch (e) {
                console.error(e);
              }
            }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              !isApproved
                ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 cursor-not-allowed"
                : "bg-emerald-600 text-white shadow-xl shadow-emerald-600/20 hover:scale-[1.02] active:scale-[0.98]"
            }`}
          >
            <Table className="w-3.5 h-3.5" />
            EXCEL
          </button>
          <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/10 text-[10px] font-black uppercase tracking-widest text-anthracite-400 hover:text-white hover:bg-white/5 transition-all">
            <Share2 className="w-3.5 h-3.5" />
            Partager
          </button>
          <button
            onClick={onReset}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-black text-[10px] font-black uppercase tracking-widest shadow-xl shadow-white/5 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Nouveau projet
          </button>
        </div>
      </div>

      {/* Écran d'alerte orange si non approuvé */}
      {!isApproved && (
        <div className="p-6 rounded-3xl bg-gradient-to-r from-orange-600/10 to-amber-600/10 border border-orange-500/30 backdrop-blur-xl animate-fade-in space-y-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-orange-500/20 flex items-center justify-center border border-orange-500/30 text-orange-400 shrink-0 animate-pulse">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="space-y-1.5 w-full">
              <div className="flex items-center justify-between">
                <h4 className="text-orange-400 font-display font-black text-lg uppercase tracking-wider">
                  Alerte de Validation Technique : Anomalie Détectée
                </h4>
                <span className="px-2.5 py-1 rounded-full bg-orange-500/20 text-orange-400 text-[9px] font-black uppercase tracking-widest border border-orange-500/30">
                  Risque {currentResult.superviseur?.riskLevel || "Élevé"}
                </span>
              </div>
              <p className="text-white/80 text-sm leading-relaxed">
                Le superviseur IA a détecté des incohérences ou risques structurels majeurs sur ce projet :
              </p>
              <div className="p-4 rounded-xl bg-orange-950/40 border border-orange-500/20 text-orange-300 text-xs font-mono leading-relaxed">
                {currentResult.superviseur?.comments || "Volume ou paramètres structurels non conformes aux règles de l'art."}
              </div>
            </div>
          </div>

          <div className="border-t border-orange-500/20 pt-6">
            <h5 className="text-white font-bold text-sm mb-4 uppercase tracking-wider">
              🛠️ Mode Override — Ajustement Manuel de l'Architecte
            </h5>
            <form onSubmit={handleApplyOverride} className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-end">
              <div className="space-y-2">
                <label className="text-xs text-anthracite-400 font-bold uppercase tracking-wider">
                  Volume de Béton (m³)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={overrideVolBeton}
                  onChange={(e) => setOverrideVolBeton(Number(e.target.value))}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-semibold focus:outline-none focus:border-orange-500/50 transition-colors"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs text-anthracite-400 font-bold uppercase tracking-wider">
                  Contrainte de Sol (MPa)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={overrideContrainteSol}
                  onChange={(e) => setOverrideContrainteSol(Number(e.target.value))}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-semibold focus:outline-none focus:border-orange-500/50 transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={isUpdating}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-black text-xs uppercase tracking-widest py-3.5 px-6 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20"
              >
                {isUpdating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Recalcul en cours...
                  </>
                ) : (
                  "Soumettre & Recalculer"
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Tab selector - Linear Style */}
      <div className="relative flex items-center gap-1 p-1 bg-white/[0.03] border border-white/5 rounded-2xl w-fit">
        {[
          { id: "image",    label: mode === "b2b" ? "Aperçu 3D" : "Rendu 4K",     icon: ZoomIn },
          { id: "analysis", label: mode === "b2b" ? "Analyse BIM" : "Analyse IA",   icon: Activity },
          { id: "estimate", label: mode === "b2b" ? "DQE (FCFA)" : "Devis (FCFA)", icon: Receipt },
          { id: "report",   label: mode === "b2b" ? "CCTP Technique" : "Note Tech",    icon: FileText },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`relative flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-500 ${
                isActive ? "text-white" : "text-anthracite-500 hover:text-anthracite-300"
              }`}
            >
              {isActive && (
                <motion.div 
                  layoutId="activeTab"
                  className="absolute inset-0 bg-white/10 border border-white/10 rounded-xl"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <tab.icon className={`w-3.5 h-3.5 ${isActive ? "text-ai-glow" : ""}`} />
              <span className="relative z-10">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content area */}
      <div className="grid lg:grid-cols-12 gap-8">
        
        {/* Main Viewport */}
        <div className="lg:col-span-8 space-y-6">
          {activeTab === "image" && (
            <div className="w-full aspect-[16/9]">
              <MediaViewerPro
                mediaUrl={activeJobId || videoStatus ? videoUrl : currentImageUrl}
                mediaType={activeJobId || videoStatus ? "video" : "image"}
                isLoading={activeJobId || videoStatus ? videoLoading : false}
                loadingStatusText={
                  errorMessage 
                    ? `Erreur : ${errorMessage}` 
                    : "Création cinématique Veo 3 en cours (calcul d'éclairage équatorial & volumes)..."
                }
                isPro={mode === "b2b"}
                onUpscaleSuccess={(newImageUrl) => setCurrentImageUrl(newImageUrl)}
                onAnimateInitiated={(jobId) => {
                  setActiveJobId(jobId);
                  setVideoStatus("processing");
                  setVideoLoading(true);
                  setVideoUrl(null);
                  setErrorMessage(null);
                }}
              />
              <PlanComparisonSlider
                originalImageUrl={currentResult.originalPlanUrl || currentResult.previewUrl || currentImageUrl}
                renderedImageUrl={currentResult.renderUrl || currentImageUrl}
              />
            </div>
          )}

          {activeTab === "analysis" && currentResult.analysis && (
            <div className="animate-slide-up">
               {mode === "b2b" ? (
                 <BimAnalysisPanel 
                    data={{
                      concreteVolume: currentResult.ifcMetadata?.concreteVolume || 42.5,
                      steelWeight: currentResult.ifcMetadata?.steelWeight || 3825,
                      wallArea: currentResult.ifcMetadata?.wallArea || 185,
                      elementCount: currentResult.ifcMetadata?.elementCount || 154,
                      clashes: currentResult.ifcMetadata?.clashes || 0,
                      complianceScore: currentResult.ifcMetadata?.complianceScore || 98
                    }} 
                    latitude={currentResult.latitude}
                    longitude={currentResult.longitude}
                    elevation={currentResult.elevation}
                    city={currentResult.city}
                 />
               ) : (
                 <AnalysisPanel analysis={currentResult.analysis} />
               )}
            </div>
          )}

          {activeTab === "estimate" && currentResult.estimate && (
            <div className="animate-slide-up">
               <EstimateTable 
                 estimate={
                   currentResult.estimate && currentResult.estimate.lines && currentResult.estimate.lines.length > 0
                     ? currentResult.estimate
                     : mode === "b2b" && currentResult.ifcMetadata
                     ? { ...currentResult.estimate, lines: mapIfcToEstimate(currentResult.ifcMetadata) } as any
                     : currentResult.estimate
                 } 
                 mode={mode}
                 devisId={currentResult.id}
                 highlightedCode={lastUpdatedCode}
               />
            </div>
          )}

          {activeTab === "report" && (
            <div className="card-premium p-8 animate-slide-up h-[600px] overflow-y-auto">
              <div className="prose prose-invert prose-sm max-w-none">
                 <div className="space-y-4">
                   {(mode === "b2b" ? (cctpContent || "Chargement du CCTP...") : (currentResult.reportText || "Rapport non disponible"))
                      .split('\n').map((line: string, idx: number) => {
                      if (line.startsWith('## ')) return <h2 key={idx} className="text-wood-ocre text-xl font-bold border-b border-white/5 pb-2 mb-4">{line.replace('## ', '')}</h2>
                      if (line.startsWith('### ')) return <h3 key={idx} className="text-white text-lg font-bold mt-6">{line.replace('### ', '')}</h3>
                      if (line.trim() === '---') return <hr key={idx} className="border-white/5 my-6" />
                      if (line.startsWith('- **')) {
                        const parts = line.replace('- **', '').split('** : ');
                        return <li key={idx} className="text-anthracite-400 ml-4"><span className="text-white font-bold">{parts[0]}</span> : {parts[1]}</li>
                      }
                      return <p key={idx} className="text-anthracite-400 leading-relaxed">{line}</p>
                    })}
                 </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar / Quick Actions */}
        <div className="lg:col-span-4 space-y-6">
           {/* Context Card */}
           <div className="card-premium p-6">
              <h4 className="text-white font-bold text-sm mb-4 uppercase tracking-wider">Détails du Projet</h4>
              <div className="space-y-4">
                 <div className="flex justify-between">
                    <span className="text-anthracite-500 text-xs font-medium">Style</span>
                    <span className="text-white text-xs font-bold uppercase">{currentResult.style.replace('-', ' ')}</span>
                 </div>
                 <div className="flex justify-between">
                    <span className="text-anthracite-500 text-xs font-medium">Moteur IA</span>
                    <span className="text-ai-glow text-xs font-bold">
                       {mode === "b2b" ? "GEMINI PRO BIM" : "GEMINI VISION PRO"}
                    </span>
                 </div>
                 <div className="flex justify-between">
                    <span className="text-anthracite-500 text-xs font-medium">Fichier Source</span>
                    <span className="text-white text-xs font-medium">plan_maison_avos.pdf</span>
                 </div>
              </div>
              
              <div className="mt-8 pt-6 border-t border-white/5">
                 <button className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-bold hover:bg-white/10 transition-all">
                    <ExternalLink className="w-4 h-4" />
                    Ouvrir dans Google Drive
                 </button>
              </div>
           </div>

           {/* RAG Recommendations (Simulated) */}
           <div className="p-1 rounded-2xl bg-gradient-to-br from-wood-ocre/20 to-ai-glow/20">
             <div className="bg-anthracite-900 rounded-[14px] p-5">
               <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-4 h-4 text-wood-ocre" />
                  <h4 className="text-white font-bold text-xs uppercase tracking-widest">IA Insight</h4>
               </div>
               <p className="text-wood-light text-xs leading-relaxed italic">
                 &quot;D&apos;après vos projets précédents à Ayos, je suggère d&apos;élargir la véranda de 2m pour capturer les vents dominants.&quot;
               </p>
             </div>
           </div>
        </div>

      </div>
    </div>
  );
}
