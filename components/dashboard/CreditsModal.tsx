"use client";

/**
 * PREMIUM BILLING WIDGET — ARCHI CAM AI
 * ──────────────────────────────────────────
 * Un module de monétisation ultra-premium localisé pour le marché Africain.
 * 
 * Caractéristiques :
 * 1. Jauge de Crédits : Radix Progress dynamique avec changement de couleur (Rouge/Jaune/Cyan).
 * 2. Cartes de Prix : Effet "Featured" avec glow cyan pour le pack Entreprise.
 * 3. Paiements Locaux : Intégration visuelle Orange Money / MTN MoMo / Visa.
 * 4. Micro-interactions : Simulation de chargement API au clic.
 */

import React, { useState } from "react";
import * as Progress from "@radix-ui/react-progress";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, 
  Coins, 
  ShieldCheck, 
  Zap, 
  Briefcase, 
  Building2,
  Loader2,
  ChevronRight
} from "lucide-react";
import { OrangeMoneyIcon, MtnMoMoIcon, CreditCardIcon } from "@/components/ui/PaymentIcons";

interface CreditsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCredits: number;
}

const PRICING_PLANS = [
  {
    id: "freelance",
    name: "Pack Freelance",
    credits: 20,
    price: "15 000 FCFA",
    icon: <Briefcase className="w-5 h-5" />,
    popular: false,
    description: "Parfait pour les projets isolés."
  },
  {
    id: "agency",
    name: "Bureau d'Études",
    credits: 100,
    price: "50 000 FCFA",
    icon: <Building2 className="w-5 h-5" />,
    popular: true,
    description: "Pour les cabinets d'architecture."
  }
];

export default function CreditsModal({ isOpen, onClose, currentCredits }: CreditsModalProps) {
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  
  const maxCredits = 50;
  const progressValue = (currentCredits / maxCredits) * 100;

  // Détermination de la couleur de la jauge
  const getProgressColor = () => {
    if (progressValue < 20) return "#f87171"; // Rouge
    if (progressValue < 50) return "#fbbf24"; // Jaune
    return "#00f0ff"; // Cyan
  };

  const handlePayment = (provider: string) => {
    setLoadingProvider(provider);
    // Simulation d'appel API (Campay / Flutterwave)
    setTimeout(() => {
      setLoadingProvider(null);
      // Optionnel: callback de succès
    }, 2500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      {/* Background Overlay */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-md" 
      />

      {/* Modal Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-2xl bg-[#0D0D10] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.8)]"
      >
        
        {/* Header Section */}
        <div className="p-8 border-b border-white/5 flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Coins className="w-5 h-5 text-wood-ocre" />
              <h2 className="text-white font-black text-2xl tracking-tight uppercase">Recharger vos Crédits</h2>
            </div>
            <p className="text-anthracite-500 text-xs font-medium">Accédez à la puissance de l&apos;IA pour vos calculs de structure.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-anthracite-500 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-8 space-y-10">
          
          {/* ── JAUGE DE CRÉDITS PREMIUM ────────────────────────────────── */}
          <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6">
            <div className="flex justify-between items-end mb-4">
              <div>
                <span className="text-[10px] font-black text-anthracite-500 uppercase tracking-widest block mb-1">Solde Actuel</span>
                <span className="text-3xl font-black text-white tabular-nums">{currentCredits} <span className="text-sm text-anthracite-500">/ {maxCredits}</span></span>
              </div>
              <p className="text-[10px] text-right font-bold text-anthracite-400 italic max-w-[150px]">
                1 crédit = 1 génération DQE/CCTP complet.
              </p>
            </div>

            <Progress.Root className="relative overflow-hidden bg-white/5 rounded-full h-3">
              <Progress.Indicator 
                className="h-full transition-all duration-1000 ease-in-out"
                style={{ 
                  width: `${progressValue}%`,
                  backgroundColor: getProgressColor(),
                  boxShadow: `0 0 15px ${getProgressColor()}`
                }}
              />
            </Progress.Root>
          </div>

          {/* ── PLANS TARIFAIRES ─────────────────────────────────────────── */}
          <div className="grid sm:grid-cols-2 gap-6">
            {PRICING_PLANS.map((plan) => (
              <motion.div
                key={plan.id}
                whileHover={{ translateY: -5 }}
                className={`relative group p-6 rounded-3xl border transition-all duration-500 cursor-pointer ${
                  plan.popular 
                    ? "bg-ai-glow/5 border-ai-glow/30 shadow-[0_20px_40px_-20px_rgba(0,240,255,0.2)]" 
                    : "bg-white/[0.02] border-white/10 hover:border-white/20"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-ai-glow text-black text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-lg shadow-ai-glow/20">
                    Plus Populaire
                  </div>
                )}
                
                <div className="flex items-center justify-between mb-6">
                  <div className={`p-3 rounded-2xl ${plan.popular ? "bg-ai-glow/10 text-ai-glow" : "bg-white/5 text-anthracite-400"}`}>
                    {plan.icon}
                  </div>
                  <div className="text-right">
                    <span className="block text-2xl font-black text-white tabular-nums">{plan.credits}</span>
                    <span className="text-[9px] font-bold text-anthracite-500 uppercase tracking-widest">Crédits</span>
                  </div>
                </div>

                <div className="mb-6">
                  <h4 className="text-white font-black text-sm uppercase tracking-tight">{plan.name}</h4>
                  <p className="text-anthracite-500 text-[10px] font-medium mt-1">{plan.description}</p>
                </div>

                <div className="flex items-center justify-between">
                  <span className={`text-lg font-black ${plan.popular ? "text-ai-glow" : "text-white"}`}>
                    {plan.price}
                  </span>
                  <div className={`w-8 h-8 rounded-full border flex items-center justify-center transition-colors ${plan.popular ? "border-ai-glow/30 text-ai-glow" : "border-white/10 text-anthracite-500"}`}>
                    <ChevronRight size={16} />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* ── MODULE DE PAIEMENT LOCAL ─────────────────────────────────── */}
          <div className="pt-6 border-t border-white/5">
            <h4 className="text-center text-anthracite-500 text-[10px] font-black uppercase tracking-[0.3em] mb-6">Moyens de Paiement Acceptés</h4>
            
            <div className="grid grid-cols-3 gap-4">
              {/* Orange Money */}
              <button 
                onClick={() => handlePayment('orange')}
                disabled={!!loadingProvider}
                className="relative group p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-[#FF6600]/40 transition-all flex flex-col items-center gap-3 overflow-hidden"
              >
                {loadingProvider === 'orange' ? <Loader2 className="w-8 h-8 text-[#FF6600] animate-spin" /> : <OrangeMoneyIcon className="w-10 h-10 grayscale group-hover:grayscale-0 transition-all" />}
                <span className="text-[8px] font-black text-anthracite-500 group-hover:text-white uppercase tracking-widest">Orange Money</span>
                {loadingProvider === 'orange' && <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" />}
              </button>

              {/* MTN MoMo */}
              <button 
                onClick={() => handlePayment('mtn')}
                disabled={!!loadingProvider}
                className="relative group p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-[#FFCC00]/40 transition-all flex flex-col items-center gap-3 overflow-hidden"
              >
                {loadingProvider === 'mtn' ? <Loader2 className="w-8 h-8 text-[#FFCC00] animate-spin" /> : <MtnMoMoIcon className="w-10 h-10 grayscale group-hover:grayscale-0 transition-all" />}
                <span className="text-[8px] font-black text-anthracite-500 group-hover:text-white uppercase tracking-widest">MTN MoMo</span>
                {loadingProvider === 'mtn' && <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" />}
              </button>

              {/* Visa / Card */}
              <button 
                onClick={() => handlePayment('card')}
                disabled={!!loadingProvider}
                className="relative group p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-blue-500/40 transition-all flex flex-col items-center gap-3 overflow-hidden"
              >
                {loadingProvider === 'card' ? <Loader2 className="w-8 h-8 text-blue-500 animate-spin" /> : <CreditCardIcon className="w-10 h-10 grayscale group-hover:grayscale-0 transition-all" />}
                <span className="text-[8px] font-black text-anthracite-500 group-hover:text-white uppercase tracking-widest">Carte Bancaire</span>
                {loadingProvider === 'card' && <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" />}
              </button>
            </div>
          </div>
        </div>

        {/* Footer Security */}
        <div className="bg-white/[0.01] p-6 flex items-center justify-center gap-2 border-t border-white/5">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <p className="text-[9px] font-bold text-anthracite-600 uppercase tracking-widest">Paiement sécurisé par Archi-Cam Secure Gateway</p>
        </div>

      </motion.div>
    </div>
  );
}
