import { ExternalLink, Sparkles } from "lucide-react";
import type { UserMode } from "@/types";

interface ProjectDetailsSidebarProps {
  mode: UserMode;
  style: string;
}

export default function ProjectDetailsSidebar({ mode, style }: ProjectDetailsSidebarProps) {
  return (
    <div className="lg:col-span-4 space-y-6">
       <div className="card-premium p-6">
          <h4 className="text-white font-bold text-sm mb-4 uppercase tracking-wider">Détails du Projet</h4>
          <div className="space-y-4">
             <div className="flex justify-between">
                <span className="text-anthracite-500 text-xs font-medium">Style</span>
                <span className="text-white text-xs font-bold uppercase">{style.replace('-', ' ')}</span>
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

        <div className="p-1 rounded-2xl bg-gradient-to-br from-wood-ocre/20 to-ai-glow/20">
          <div className="bg-anthracite-900 rounded-[14px] p-5">
            <div className="flex items-center gap-2 mb-4">
               <Sparkles className="w-4 h-4 text-wood-ocre" />
               <h4 className="text-white font-bold text-xs uppercase tracking-widest">IA Insight Contextuel</h4>
            </div>
            <p className="text-wood-light text-xs leading-relaxed italic">
              {style === "luxe-tropical" && (
                "🌴 Luxe Tropical : En climat équatorial humide (ex: Douala/Kribi), maximisez la ventilation naturelle croisée. Nous suggérons un débord de toiture à 1.5m pour protéger les baies vitrées des fortes pluies et réduire le rayonnement thermique direct."
              )}
              {style === "moderne-minimaliste" && (
                "🏙️ Moderne Minimaliste : Pour ce volume épuré, préconisez un vitrage à contrôle solaire performant (Facteur G ≤ 0.35) sur la façade Ouest. Cela limitera l'effet de serre thermique typique dans les centres urbains comme Yaoundé."
              )}
              {style === "industriel" && (
                "🏗️ Industriel Urbain : L'exposition de la structure béton/métal requiert une protection anti-corrosion renforcée (classe d'exposition marine XS1/XS3). Assurez un enrobage de béton de 35mm minimum selon les calculs Eurocode 2."
              )}
              {style === "africain-contemporain" && (
                "🌍 Africain Contemporain : Valorisez des briques de terre stabilisée (BTC) ou de la pierre de Foumban. Ces matériaux locaux offrent une excellente inertie pour réguler naturellement la température intérieure en journée."
              )}
              {!["luxe-tropical", "moderne-minimaliste", "industriel", "africain-contemporain"].includes(style) && (
                "💡 IA Conseil : Adaptez l'orientation des ouvertures selon les vents dominants locaux pour assurer une ventilation naturelle et un confort thermique optimal sans surcoût de climatisation."
              )}
            </p>
          </div>
        </div>
    </div>
  );
}
