import { MOCK_USER }  from "@/lib/mock-data";
import { Coins, TrendingUp, Calendar, Zap } from "lucide-react";

export default function CreditsCard() {
  const user = MOCK_USER;
  const creditPercent = Math.min((user.credits / 50) * 100, 100);

  return (
    <div className="card-dark rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-wood-ocre/10 border border-wood-ocre/20 flex items-center justify-center">
          <Coins className="w-5 h-5 text-wood-ocre" />
        </div>
        <div>
          <h3 className="text-white font-semibold">Crédits & Abonnement</h3>
          <p className="text-anthracite-400 text-xs">
            Gérez votre consommation
          </p>
        </div>
      </div>

      {/* Plan badge */}
      <div className="flex items-center justify-between mb-6 p-4 rounded-xl bg-anthracite-800 border border-anthracite-700">
        <div>
          <p className="text-xs text-anthracite-400 mb-1">Plan actif</p>
          <p className="text-white font-bold">Pass Agence Pro</p>
        </div>
        <div className="wood-badge">
          <Zap className="w-3 h-3" />
          Pro
        </div>
      </div>

      {/* Credits count */}
      <div className="mb-4">
        <div className="flex justify-between items-end mb-2">
          <div>
            <p className="text-anthracite-400 text-xs mb-1">Crédits restants</p>
            <p className="font-display font-extrabold text-4xl text-transparent bg-clip-text bg-wood-gradient">
              {user.credits}
            </p>
          </div>
          <p className="text-anthracite-500 text-xs">sur 50 / mois</p>
        </div>
        <div className="h-2 bg-anthracite-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-wood-gradient rounded-full transition-all duration-700"
            style={{ width: `${creditPercent}%` }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mt-6">
        <div className="bg-anthracite-800 rounded-xl p-4 border border-anthracite-700">
          <TrendingUp className="w-4 h-4 text-wood-ocre mb-2" />
          <p className="text-white font-bold text-lg">38</p>
          <p className="text-anthracite-500 text-xs">Rendus générés (mois)</p>
        </div>
        <div className="bg-anthracite-800 rounded-xl p-4 border border-anthracite-700">
          <Calendar className="w-4 h-4 text-wood-ocre mb-2" />
          <p className="text-white font-bold text-lg">14j</p>
          <p className="text-anthracite-500 text-xs">Avant renouvellement</p>
        </div>
      </div>

      {/* Upgrade CTA */}
      <button className="w-full mt-6 py-3 rounded-xl border border-wood-ocre/30 text-wood-ocre text-sm font-medium hover:bg-wood-ocre/10 transition-all duration-200">
        Gérer l&apos;abonnement
      </button>
    </div>
  );
}
