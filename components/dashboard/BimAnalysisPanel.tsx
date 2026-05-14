"use client";

import { 
  Box, 
  Layers, 
  ShieldCheck, 
  Construction, 
  AlertTriangle,
  Info,
  TrendingUp
} from "lucide-react";

interface BimAnalysisProps {
  data: {
    concreteVolume: number;
    steelWeight: number;
    wallArea: number;
    elementCount: number;
    clashes: number;
    complianceScore: number;
  };
}

export default function BimAnalysisPanel({ data }: BimAnalysisProps) {
  return (
    <div className="card-premium p-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 p-8 opacity-5">
        <Box className="w-48 h-48 text-wood-ocre" />
      </div>

      <div className="flex items-center justify-between mb-8 relative z-10">
        <h3 className="text-white font-bold text-lg flex items-center gap-2">
          <Layers className="w-5 h-5 text-wood-ocre" />
          Analyse de la Maquette Numérique (BIM)
        </h3>
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-wood-ocre/10 border border-wood-ocre/20">
          <span className="text-wood-ocre text-[10px] font-black uppercase tracking-wider">
            IFC 4.0 Standard
          </span>
        </div>
      </div>

      {/* BIM Metrics */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="p-5 rounded-2xl bg-white/5 border border-white/5">
          <p className="text-anthracite-500 text-[10px] font-bold uppercase mb-2 tracking-widest">Béton Total</p>
          <div className="flex items-baseline gap-2">
             <span className="text-white text-3xl font-black">{data.concreteVolume}</span>
             <span className="text-anthracite-500 text-sm font-bold">m³</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white/5 border border-white/5">
          <p className="text-anthracite-500 text-[10px] font-bold uppercase mb-2 tracking-widest">Acier (Ferraillage)</p>
          <div className="flex items-baseline gap-2">
             <span className="text-wood-ocre text-3xl font-black">{data.steelWeight}</span>
             <span className="text-anthracite-500 text-sm font-bold">kg</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white/5 border border-white/5">
          <p className="text-anthracite-500 text-[10px] font-bold uppercase mb-2 tracking-widest">Éléments BIM</p>
          <div className="flex items-baseline gap-2">
             <span className="text-ai-glow text-3xl font-black">{data.elementCount}</span>
             <span className="text-anthracite-500 text-sm font-bold">objets</span>
          </div>
        </div>
      </div>

      {/* Commercial Intelligence Card */}
      <div className="mb-8 p-6 rounded-2xl bg-gradient-to-r from-ai-glow/20 to-transparent border border-ai-glow/30 flex items-center justify-between group hover:border-ai-glow/50 transition-all cursor-default">
         <div className="flex items-center gap-6">
            <div className="w-12 h-12 rounded-full bg-ai-glow/10 flex items-center justify-center border border-ai-glow/20">
               <TrendingUp className="w-6 h-6 text-ai-glow" />
            </div>
            <div>
               <h4 className="text-white font-black text-sm uppercase tracking-widest">Optimisation Économique Détectée</h4>
               <p className="text-anthracite-400 text-xs mt-1">L'analyse BIM révèle une réduction potentielle de 15% sur les pertes de matériaux.</p>
            </div>
         </div>
         <div className="text-right">
            <p className="text-ai-glow text-2xl font-black">~2 450 000 FCFA</p>
            <p className="text-anthracite-500 text-[10px] font-bold uppercase tracking-widest">Gain estimé sur le GO</p>
         </div>
      </div>

      {/* Compliance & Clash Detection */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="p-6 rounded-2xl bg-anthracite-950/50 border border-white/5">
           <div className="flex items-center gap-3 mb-4">
              <ShieldCheck className="w-5 h-5 text-green-400" />
              <h4 className="text-white font-bold text-sm uppercase tracking-wider">Conformité Normative</h4>
           </div>
           <div className="space-y-3">
              <div className="flex justify-between items-center text-xs">
                 <span className="text-anthracite-400">Norme NF P 01-012</span>
                 <span className="text-green-400 font-bold">Validé</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                 <span className="text-anthracite-400">Hauteurs sous plafond</span>
                 <span className="text-green-400 font-bold">✓ 2.85m</span>
              </div>
              <div className="w-full h-1 bg-white/5 rounded-full mt-4">
                 <div className="h-full bg-green-500 rounded-full" style={{ width: `${data.complianceScore}%` }} />
              </div>
           </div>
        </div>

        <div className="p-6 rounded-2xl bg-anthracite-950/50 border border-white/5">
           <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-5 h-5 text-wood-ocre" />
              <h4 className="text-white font-bold text-sm uppercase tracking-wider">Détection de Conflits</h4>
           </div>
           <div className="flex items-center gap-4">
              <div className="text-4xl font-black text-wood-ocre">{data.clashes}</div>
              <div className="text-xs text-anthracite-500 leading-relaxed">
                 {data.clashes === 0 
                  ? "Aucune collision détectée entre les éléments structurels." 
                  : "Conflits mineurs détectés entre la structure et les réseaux."}
              </div>
           </div>
           {data.clashes > 0 && (
             <button className="mt-4 text-[10px] font-black uppercase text-wood-ocre hover:underline flex items-center gap-1">
                Voir le rapport de clash
                <Info className="w-3 h-3" />
             </button>
           )}
        </div>
      </div>

      {/* Technical Tip */}
      <div className="mt-8 p-4 rounded-xl bg-ai-glow/5 border border-ai-glow/20 flex items-start gap-4">
         <Construction className="w-5 h-5 text-ai-glow mt-1" />
         <div>
            <p className="text-white font-bold text-xs">Estimation du ferraillage calculée au ratio local</p>
            <p className="text-anthracite-500 text-[10px] mt-1 italic">
               Basé sur une densité moyenne de 90kg/m³ de béton armé pour les zones sismiques modérées au Cameroun.
            </p>
         </div>
      </div>
    </div>
  );
}
