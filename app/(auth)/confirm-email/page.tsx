"use client";

import Link from "next/link";
import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Building2, Mail, ArrowRight, RefreshCw, CheckCircle2 } from "lucide-react";

export default function ConfirmEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-hero-gradient flex items-center justify-center">
        <div className="text-white text-sm font-bold uppercase tracking-widest animate-pulse">Chargement...</div>
      </div>
    }>
      <ConfirmEmailContent />
    </Suspense>
  );
}

function ConfirmEmailContent() {
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode") || "particulier";
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  const handleResend = async () => {
    setResending(true);
    await new Promise((r) => setTimeout(r, 1200));
    setResending(false);
    setResent(true);
    setTimeout(() => setResent(false), 3000);
  };

  return (
    <div className="min-h-screen bg-hero-gradient flex items-center justify-center px-4">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-40 w-96 h-96 bg-wood-ocre/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-40 w-96 h-96 bg-wood-acajou/8 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-wood-gradient flex items-center justify-center shadow-lg shadow-wood-acajou/30">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <span className="font-display font-bold text-white text-xl">
              Archi<span className="text-wood-ocre">-Cameroun</span> AI
            </span>
          </Link>
        </div>

        {/* Card */}
        <div className="card-dark rounded-2xl p-8 text-center relative overflow-hidden">
          {/* Decorative halo */}
          <div className="absolute -top-10 -left-10 w-32 h-32 bg-ai-glow/10 rounded-full blur-2xl" />

          {/* Envelope Icon with Glow */}
          <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-white/5">
            <Mail className="w-8 h-8 text-wood-ocre animate-bounce" />
          </div>

          <h1 className="font-display font-bold text-white text-2xl mb-3">
            Confirmez votre e-mail
          </h1>
          
          <p className="text-anthracite-300 text-sm leading-relaxed mb-6">
            Nous avons envoyé un lien de confirmation à votre adresse de connexion Google. Veuillez valider votre adresse pour activer pleinement votre espace.
          </p>

          {/* Info Mode Box */}
          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 mb-6 text-left">
            <span className="text-[10px] font-bold uppercase tracking-widest text-anthracite-500 block mb-1">
              Espace Ciblé
            </span>
            <span className="text-sm font-semibold text-white">
              {mode === "professionnel" 
                ? "Espace Professionnel (BIM / CAO)" 
                : "Espace Particulier"
              }
            </span>
          </div>

          {/* Verification Status */}
          <div className="space-y-4 mb-8">
            <Link href={`/dashboard?mode=${mode}`} className="block">
              <button className="btn-primary w-full flex items-center justify-center gap-2 py-3.5">
                Continuer vers le Tableau de Bord
                <ArrowRight className="w-4 h-4" />
              </button>
            </Link>

            <button
              onClick={handleResend}
              disabled={resending}
              className="text-xs text-anthracite-400 hover:text-white transition-colors flex items-center justify-center gap-2 mx-auto mt-2"
            >
              {resending ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : resent ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
              {resending ? "Renvoi en cours..." : resent ? "E-mail renvoyé !" : "Renvoyer l'e-mail de confirmation"}
            </button>
          </div>

          <p className="text-xs text-anthracite-500">
            Une question ? Contactez notre support technique à <span className="text-wood-ocre hover:underline cursor-pointer">support@archi-cameroun.ai</span>
          </p>
        </div>
      </div>
    </div>
  );
}
