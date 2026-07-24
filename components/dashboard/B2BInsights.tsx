"use client";

import { Gavel, Zap, Calendar, AlertTriangle, CheckCircle2, CloudRain, Clock, HardHat } from "lucide-react";

export default function B2BInsights() {
  return (
    <div className="space-y-6 animate-slide-up">
      <div className="grid md:grid-cols-3 gap-6">
        
        {/* Pillar 1: Legal & Compliance */}
        <div className="card-premium p-6 border-wood-ocre/10 bg-gradient-to-br from-anthracite-900 to-anthracite-950">
          <div className="flex items-center justify-between mb-6">
            <div className="p-3 rounded-xl bg-wood-ocre/10 border border-wood-ocre/20">
              <Gavel className="w-5 h-5 text-wood-ocre" />
            </div>
            <span className="px-2 py-1 rounded-md bg-red-500/10 text-red-500 text-[9px] font-black uppercase tracking-widest border border-red-500/20">
              2 Alertes
            </span>
          </div>
          <h3 className="text-white font-bold text-sm mb-2 uppercase tracking-wide">Audit Réglementaire</h3>
          <p className="text-anthracite-500 text-xs mb-4">Conformité Loi 2004 & Décret 2008</p>
          
          <div className="space-y-3">
            <div className="flex items-start gap-2 p-2 rounded-lg bg-red-500/5 border border-red-500/10">
              <AlertTriangle className="w-3.5 h-3.5 text-red-500 mt-0.5 shrink-0" />
              <p className="text-[10px] text-red-200 leading-relaxed">
                <span className="font-bold">Hygiène :</span> Hauteur sous plafond de 2.60m détectée. Minimum de 2.80m requis.
              </p>
            </div>
            <div className="flex items-start gap-2 p-2 rounded-lg bg-red-500/5 border border-red-500/10">
              <AlertTriangle className="w-3.5 h-3.5 text-red-500 mt-0.5 shrink-0" />
              <p className="text-[10px] text-red-200 leading-relaxed">
                <span className="font-bold">Alignement :</span> Recul de 3m insuffisant. 5m exigés par le POS local.
              </p>
            </div>
          </div>
        </div>

        {/* Pillar 2: Engineering & Eurocode 2 */}
        <div className="card-premium p-6 border-ai-glow/10 bg-gradient-to-br from-anthracite-900 to-anthracite-950">
          <div className="flex items-center justify-between mb-6">
            <div className="p-3 rounded-xl bg-ai-glow/10 border border-ai-glow/20">
              <Zap className="w-5 h-5 text-ai-glow" />
            </div>
            <span className="px-2 py-1 rounded-md bg-green-500/10 text-green-500 text-[9px] font-black uppercase tracking-widest border border-green-500/20">
              Sécurisé
            </span>
          </div>
          <h3 className="text-white font-bold text-sm mb-2 uppercase tracking-wide">Diagnostic Structure</h3>
          <p className="text-anthracite-500 text-xs mb-4">Calcul Eurocode 2 - Zone Littorale</p>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between p-2 rounded-lg bg-white/5">
              <span className="text-[10px] text-anthracite-400 font-bold uppercase tracking-wider">Exposition</span>
              <span className="text-[10px] text-white font-black">XS1 (Marin)</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-white/5">
              <span className="text-[10px] text-anthracite-400 font-bold uppercase tracking-wider">Enrobage Min.</span>
              <span className="text-[10px] text-white font-black">35 mm</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-green-500/5 border border-green-500/10">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
              <p className="text-[10px] text-green-200">Quantité d&apos;acier optimisée (-12%)</p>
            </div>
          </div>
        </div>

        {/* Pillar 3: Planning & Logistics */}
        <div className="card-premium p-6 border-purple-500/10 bg-gradient-to-br from-anthracite-900 to-anthracite-950">
          <div className="flex items-center justify-between mb-6">
            <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
              <Calendar className="w-5 h-5 text-purple-500" />
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-purple-500/10 border border-purple-500/20">
              <CloudRain className="w-3 h-3 text-purple-400" />
              <span className="text-purple-400 text-[9px] font-black uppercase tracking-widest">Alerte Météo</span>
            </div>
          </div>
          <h3 className="text-white font-bold text-sm mb-2 uppercase tracking-wide">Planning Prévisionnel</h3>
          <p className="text-anthracite-500 text-xs mb-4">Cycle de vie : 11 mois estimés</p>
          
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-2 rounded-lg bg-purple-500/5 border border-purple-500/10">
              <Clock className="w-3.5 h-3.5 text-purple-400" />
              <p className="text-[10px] text-purple-200">
                <span className="font-bold">Fondations :</span> 14 jours (Août - Saison Pluies)
              </p>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-white/5 border border-white/10 opacity-70">
              <HardHat className="w-3.5 h-3.5 text-anthracite-500" />
              <p className="text-[10px] text-anthracite-300">Démarrage Gros Œuvre : Septembre</p>
            </div>
            <div className="mt-4 pt-4 border-t border-white/5 flex justify-between">
               <span className="text-[9px] text-anthracite-500 font-black uppercase tracking-widest">Prochain Jalon</span>
               <span className="text-[9px] text-purple-400 font-black uppercase tracking-widest">25% (Fondations)</span>
            </div>
          </div>
        </div>

      </div>

      {/* Large Gantt / Timeline Preview */}
      <div className="card-premium p-8">
        <h3 className="text-white font-bold text-sm mb-6 uppercase tracking-widest flex items-center gap-2">
          <Calendar className="w-4 h-4 text-wood-ocre" />
          Chronogramme de Construction
        </h3>
        <div className="space-y-4">
          {[
            { label: "Fondations", start: "0%", width: "20%", color: "bg-wood-ocre", status: "Critique (Pluie)" },
            { label: "Gros Œuvre", start: "20%", width: "40%", color: "bg-ai-glow", status: "Optimal" },
            { label: "Second Œuvre", start: "60%", width: "30%", color: "bg-purple-500", status: "En attente" },
          ].map((task, i) => (
            <div key={i} className="space-y-1.5">
              <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider">
                <span className="text-white">{task.label}</span>
                <span className={task.status.includes('Critique') ? "text-red-500" : "text-anthracite-500"}>{task.status}</span>
              </div>
              <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${task.color} rounded-full opacity-80`} 
                  style={{ marginLeft: task.start, width: task.width }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
