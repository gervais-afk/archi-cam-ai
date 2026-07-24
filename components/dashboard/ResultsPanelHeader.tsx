import { CheckCircle2, Share2, RotateCcw } from "lucide-react";

interface ResultsPanelHeaderProps {
  onReset: () => void;
}

export default function ResultsPanelHeader({ onReset }: ResultsPanelHeaderProps) {
  return (
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
  );
}
