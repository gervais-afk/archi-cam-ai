"use client";

import React, { useState } from "react";
import * as Progress from "@radix-ui/react-progress";
import { motion } from "framer-motion";
import { 
  X, 
  Coins, 
  ShieldCheck, 
  Zap, 
  Briefcase, 
  Building2,
  Loader2,
  ChevronRight,
  CheckCircle2,
  Smartphone
} from "lucide-react";
import { OrangeMoneyIcon, MtnMoMoIcon } from "@/components/ui/PaymentIcons";
import { CREDIT_PACKS, CreditPack } from "@/lib/payment-config";

interface CreditsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCredits: number;
}

export default function CreditsModal({ isOpen, onClose, currentCredits }: CreditsModalProps) {
  const [selectedPack, setSelectedPack] = useState<CreditPack>(CREDIT_PACKS[1]); // Pack Pro par défaut
  const [operator, setOperator] = useState<"MTN" | "ORANGE">("MTN");
  const [phone, setPhone] = useState<string>("677123456");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [paymentMessage, setPaymentMessage] = useState<string | null>(null);
  const [ussdInstruction, setUssdInstruction] = useState<string | null>(null);

  const maxCredits = 100;
  const progressValue = Math.min((currentCredits / maxCredits) * 100, 100);

  const getProgressColor = () => {
    if (progressValue < 20) return "#f87171";
    if (progressValue < 50) return "#fbbf24";
    return "#00f0ff";
  };

  const handleInitiatePayment = async () => {
    if (!phone || phone.length < 8) {
      setPaymentMessage("⚠️ Veuillez saisir un numéro de téléphone valide.");
      return;
    }

    setIsLoading(true);
    setPaymentMessage(null);
    setUssdInstruction(null);

    try {
      const res = await fetch("/api/payments/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packId: selectedPack.id,
          phoneNumber: phone,
          operator,
          userId: "usr_guest",
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setPaymentMessage(`📱 ${data.message}`);
        setUssdInstruction(data.ussdPrompt || "Validez la demande de paiement envoyée sur votre téléphone.");
      } else {
        setPaymentMessage(`❌ ${data.error || "Échec de l'initialisation du paiement."}`);
      }
    } catch (err: any) {
      setPaymentMessage("❌ Une erreur réseau est survenue.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-md" 
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-2xl bg-[#0D0D10] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.8)]"
      >
        <div className="p-8 border-b border-white/5 flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Coins className="w-5 h-5 text-wood-ocre" />
              <h2 className="text-white font-black text-2xl tracking-tight uppercase">Recharger vos Crédits</h2>
            </div>
            <p className="text-anthracite-500 text-xs font-medium">Rechargez vos crédits via MTN Mobile Money ou Orange Money.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-anthracite-500 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-8 space-y-8 max-h-[80vh] overflow-y-auto">
          {/* Jauge de solde */}
          <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6">
            <div className="flex justify-between items-end mb-4">
              <div>
                <span className="text-[10px] font-black text-anthracite-500 uppercase tracking-widest block mb-1">Solde Actuel</span>
                <span className="text-3xl font-black text-white tabular-nums">{currentCredits} <span className="text-sm text-anthracite-500">crédits</span></span>
              </div>
              <p className="text-[10px] text-right font-bold text-anthracite-400 italic max-w-[200px]">
                1 Plan 2D = 1 crédit | 1 Rendu 3D = 2 crédits | 1 Vidéo Drone = 10 crédits
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

          {/* Choix des packs */}
          <div>
            <h4 className="text-xs font-black text-anthracite-400 uppercase tracking-widest mb-4">1. Choisissez votre Pack FCFA</h4>
            <div className="grid sm:grid-cols-3 gap-4">
              {CREDIT_PACKS.map((pack) => (
                <div
                  key={pack.id}
                  onClick={() => setSelectedPack(pack)}
                  className={`relative p-5 rounded-2xl border cursor-pointer transition-all ${
                    selectedPack.id === pack.id
                      ? "bg-ai-glow/10 border-ai-glow shadow-[0_0_30px_rgba(0,240,255,0.15)]"
                      : "bg-white/[0.02] border-white/10 hover:border-white/20"
                  }`}
                >
                  {pack.popular && (
                    <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-ai-glow text-black text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full">
                      Populaire
                    </span>
                  )}
                  <h5 className="text-white font-bold text-xs uppercase mb-1">{pack.name}</h5>
                  <div className="text-xl font-black text-ai-glow mb-1">{pack.amountFCFA.toLocaleString("fr-FR")} FCFA</div>
                  <div className="text-xs font-bold text-white mb-2">{pack.totalCredits} Crédits {pack.bonusCredits > 0 && <span className="text-emerald-400">(+{pack.bonusCredits})</span>}</div>
                  <p className="text-[9px] text-anthracite-400 leading-tight">{pack.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Choix Operateur & Téléphone */}
          <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 space-y-5">
            <h4 className="text-xs font-black text-anthracite-400 uppercase tracking-widest">2. Choisissez l&apos;Opérateur & Numéro</h4>
            
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setOperator("MTN")}
                className={`p-4 rounded-2xl border flex items-center justify-center gap-3 transition-all ${
                  operator === "MTN" ? "border-[#FFCC00] bg-[#FFCC00]/10 text-white" : "border-white/5 bg-white/[0.02] text-anthracite-400"
                }`}
              >
                <MtnMoMoIcon className="w-8 h-8" />
                <span className="text-xs font-black uppercase">MTN Mobile Money</span>
              </button>

              <button
                type="button"
                onClick={() => setOperator("ORANGE")}
                className={`p-4 rounded-2xl border flex items-center justify-center gap-3 transition-all ${
                  operator === "ORANGE" ? "border-[#FF6600] bg-[#FF6600]/10 text-white" : "border-white/5 bg-white/[0.02] text-anthracite-400"
                }`}
              >
                <OrangeMoneyIcon className="w-8 h-8" />
                <span className="text-xs font-black uppercase">Orange Money</span>
              </button>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-anthracite-400 uppercase mb-2">Numéro de Téléphone (Cameroun)</label>
              <div className="relative">
                <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-anthracite-500" />
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="ex: 677123456 ou 699123456"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-ai-glow"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleInitiatePayment}
              disabled={isLoading}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-ai-glow to-blue-500 text-black font-black uppercase tracking-wider text-xs flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Initialisation du Paiement...
                </>
              ) : (
                <>
                  Payer {selectedPack.amountFCFA.toLocaleString("fr-FR")} FCFA par {operator} MoMo
                  <ChevronRight size={16} />
                </>
              )}
            </button>

            {paymentMessage && (
              <div className="p-4 rounded-2xl bg-ai-glow/10 border border-ai-glow/30 text-xs font-medium text-white space-y-1">
                <p>{paymentMessage}</p>
                {ussdInstruction && <p className="text-[11px] text-ai-glow font-mono mt-1">{ussdInstruction}</p>}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white/[0.01] p-6 flex items-center justify-center gap-2 border-t border-white/5">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <p className="text-[9px] font-bold text-anthracite-600 uppercase tracking-widest">Paiement sécurisé par Campay Mobile Money Gateway Cameroun</p>
        </div>
      </motion.div>
    </div>
  );
}
