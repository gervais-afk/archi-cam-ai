"use client";

import { TrendingUp, MapPin, Calendar, ArrowUpRight, ArrowDownRight } from "lucide-react";

const MOCK_MARKET_DATA = [
  { item: "Ciment CPJ 35", price: 4900, unit: "Sac 50kg", trend: "+2%", status: "up", city: "Douala" },
  { item: "Fer à béton 10mm", price: 5800, unit: "Barre", trend: "-1%", status: "down", city: "Yaoundé" },
  { item: "Sable Sanaga", price: 120000, unit: "Camion 20m3", trend: "0%", status: "stable", city: "Douala" },
];

export default function MarketIntelligence() {
  return (
    <div className="card-premium p-8 animate-slide-up mt-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-ai-glow/10 flex items-center justify-center text-ai-glow border border-ai-glow/20 shadow-lg">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-white font-bold text-lg tracking-tight">Intelligence Marché</h2>
            <p className="text-anthracite-500 text-[10px] font-bold uppercase tracking-widest mt-0.5">
              Prix actualisés par l&apos;Agent Designer
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
          <Calendar className="w-3.5 h-3.5 text-anthracite-500" />
          <span className="text-white text-[10px] font-black uppercase tracking-wider">Mai 2026</span>
        </div>
      </div>

      <div className="grid gap-4">
        {MOCK_MARKET_DATA.map((data, index) => (
          <div 
            key={index}
            className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] hover:border-white/10 transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-anthracite-900 border border-white/5 flex items-center justify-center text-white font-bold text-xs">
                {data.item.charAt(0)}
              </div>
              <div>
                <h3 className="text-white font-bold text-sm">{data.item}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-anthracite-500 text-[10px] font-medium flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {data.city}
                  </span>
                  <span className="w-1 h-1 rounded-full bg-anthracite-800" />
                  <span className="text-anthracite-500 text-[10px] font-medium">{data.unit}</span>
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="text-white font-black text-sm tracking-tight">
                {data.price.toLocaleString()} <span className="text-[10px] text-anthracite-500 ml-0.5">FCFA</span>
              </div>
              <div className={`flex items-center justify-end gap-1 mt-1 text-[10px] font-black uppercase ${
                data.status === "up" ? "text-red-400" : data.status === "down" ? "text-emerald-400" : "text-anthracite-500"
              }`}>
                {data.status === "up" ? <ArrowUpRight className="w-3 h-3" /> : data.status === "down" ? <ArrowDownRight className="w-3 h-3" /> : null}
                {data.trend}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Premium Material Alternative Box */}
      <div className="mt-6 p-5 rounded-2xl bg-gradient-to-br from-red-500/10 to-amber-500/10 border border-red-500/25">
        <div className="flex items-center gap-2 mb-2 text-[10px] font-black uppercase text-red-400 tracking-wider">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-ping mr-1" />
          <span>Alerte Inflation Ciment CPJ 35</span>
        </div>
        <p className="text-[11px] text-wood-light/90 leading-relaxed">
          Le prix du ciment subit des tensions logistiques à Douala (+2%). Pour économiser jusqu&apos;à 25% sur les coûts de maçonnerie tout en améliorant l&apos;inertie thermique de votre bâtiment, l&apos;Agent Designer recommande l&apos;usage de <strong>Briques de Terre Stabilisée (BTC)</strong> ou de blocs de latérite locaux.
        </p>
      </div>

      <button className="w-full mt-6 py-3 rounded-xl border border-white/5 text-anthracite-500 text-[10px] font-black uppercase tracking-[0.2em] hover:text-white hover:bg-white/5 transition-all">
        Voir tous les prix (Cameroun 2026)
      </button>
    </div>
  );
}
