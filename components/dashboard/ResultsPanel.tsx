import type { RenderResult }   from "@/types";
import { Download, Share2, RotateCcw, FileText, ExternalLink, ZoomIn, Activity, Receipt } from "lucide-react";
import { useState }           from "react";
import AnalysisPanel from "./AnalysisPanel";
import BimAnalysisPanel from "./BimAnalysisPanel";
import EstimateTable from "./EstimateTable";
import type { UserMode } from "@/types";
import { mapIfcToEstimate } from "@/lib/bim-mapper";
import { generateCctpMock } from "@/lib/cctp-service";

interface ResultsPanelProps {
  result:   RenderResult;
  mode:     UserMode;
  onReset:  () => void;
}

export default function ResultsPanel({ result, mode, onReset }: ResultsPanelProps) {
  const [activeTab,  setActiveTab]  = useState<"image" | "analysis" | "estimate" | "report">(
    mode === "b2b" ? "analysis" : "image"
  );
  const [isZoomed,   setIsZoomed]   = useState(false);

  return (
    <div className="animate-fade-in space-y-8">
      {/* Header Row */}
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
            <div className="card-premium p-2 group relative overflow-hidden">
               <div className="relative aspect-[16/9] rounded-xl overflow-hidden cursor-zoom-in" onClick={() => setIsZoomed(!isZoomed)}>
                  <img
                    src={result.imageUrl}
                    alt="Rendu architectural généré"
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <ZoomIn className="w-10 h-10 text-white drop-shadow-2xl" />
                  </div>
               </div>
               
               {/* Image Actions */}
               <div className="flex items-center gap-4 p-4">
                  <button className="flex-1 btn-primary py-3">
                    <Download className="w-4 h-4 mr-2" />
                    Télécharger HD
                  </button>
                  <button className="px-5 py-3 rounded-xl border border-white/10 text-white hover:bg-white/5 transition-all">
                    <Share2 className="w-4 h-4" />
                  </button>
               </div>
            </div>
          )}

          {activeTab === "analysis" && result.analysis && (
            <div className="animate-slide-up">
               {mode === "b2b" ? (
                 <BimAnalysisPanel data={{
                    concreteVolume: 42.5,
                    steelWeight: 3825,
                    wallArea: 185,
                    elementCount: 154,
                    clashes: 0,
                    complianceScore: 98
                 }} />
               ) : (
                 <AnalysisPanel analysis={result.analysis} />
               )}
            </div>
          )}

          {activeTab === "estimate" && result.estimate && (
            <div className="animate-slide-up">
               <EstimateTable 
                 estimate={mode === "b2b" && result.ifcMetadata 
                  ? { ...result.estimate, lines: mapIfcToEstimate(result.ifcMetadata) }
                  : result.estimate
                 } 
                 mode={mode}
               />
            </div>
          )}

          {activeTab === "report" && (
            <div className="card-premium p-8 animate-slide-up h-[600px] overflow-y-auto">
              <div className="prose prose-invert prose-sm max-w-none">
                 <div className="space-y-4">
                   {(mode === "b2b" ? generateCctpMock(result.ifcMetadata) : result.reportText)
                     .split('\n').map((line, idx) => {
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
                    <span className="text-white text-xs font-bold uppercase">{result.style.replace('-', ' ')}</span>
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
