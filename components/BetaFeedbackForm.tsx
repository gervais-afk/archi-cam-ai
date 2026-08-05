"use client";

import { useState } from "react";
import { Star, MessageSquare, ShieldCheck, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function BetaFeedbackForm() {
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [quotePrecision, setQuotePrecision] = useState<string>("CONFORME");
  const [comment, setComment] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitted, setSubmitted] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    // Simulation d'envoi API
    await new Promise((resolve) => setTimeout(resolve, 1500));

    setSubmitting(false);
    setSubmitted(true);
    toast.success("Feedback envoyé avec succès ! Merci de votre contribution.", {
      description: "Notre équipe technique va analyser vos retours.",
    });
  };

  if (submitted) {
    return (
      <div className="bg-anthracite-800/50 border border-white/10 rounded-2xl p-8 text-center flex flex-col items-center justify-center space-y-4 max-w-xl mx-auto shadow-2xl backdrop-blur-md animate-fade-in">
        <div className="w-16 h-16 rounded-full bg-wood-ocre/10 border border-wood-ocre/30 flex items-center justify-center text-wood-ocre mb-2">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <h3 className="font-display font-bold text-2xl text-white">Merci infiniment !</h3>
        <p className="text-anthracite-400 text-sm max-w-sm">
          Votre retour a bien été enregistré. Vos précieux commentaires nous aident à optimiser Archi-Cameroun AI pour le marché local.
        </p>
        <button
          onClick={() => {
            setSubmitted(false);
            setRating(5);
            setComment("");
          }}
          className="mt-4 px-6 py-2 rounded-lg border border-wood-ocre/30 text-wood-ocre hover:bg-wood-ocre/10 transition-colors text-sm font-medium"
        >
          Envoyer un autre feedback
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-anthracite-800/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6 md:p-8 max-w-2xl mx-auto shadow-2xl space-y-6 animate-fade-in"
    >
      <div className="border-b border-white/5 pb-4 mb-4">
        <h3 className="font-display font-bold text-2xl text-white flex items-center gap-3">
          <MessageSquare className="w-6 h-6 text-wood-ocre" />
          Votre Feedback Bêta
        </h3>
        <p className="text-sm text-anthracite-400 mt-1">
          Aidez-nous à calibrer le moteur souverain et le module d&apos;estimation locale.
        </p>
      </div>

      {/* RATING */}
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-white tracking-wide">
          Qualité du rendu généré
        </label>
        <div className="flex items-center gap-2 mt-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(null)}
              className="p-1 hover:scale-110 transition-transform focus:outline-none"
            >
              <Star
                className={`w-8 h-8 transition-colors ${
                  star <= (hoverRating ?? rating)
                    ? "fill-wood-ocre text-wood-ocre"
                    : "text-anthracite-600"
                }`}
              />
            </button>
          ))}
          <span className="text-sm text-wood-ocre font-bold ml-2">
            {rating === 5 && "⭐ Excellent"}
            {rating === 4 && "⭐ Bon"}
            {rating === 3 && "⭐ Moyen"}
            {rating === 2 && "⭐ Faible"}
            {rating === 1 && "⭐ Très faible"}
          </span>
        </div>
      </div>

      {/* DEVIS PRECISION */}
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-white tracking-wide">
          Précision du devis d&apos;estimation (DQE Mercuriale 2026)
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
          {[
            { value: "CONFORME", label: "✅ Conforme à mes attentes", desc: "Marge d'erreur de ±10%" },
            { value: "SUREVALUE", label: "⚠️ Légèrement surévalué", desc: "Tarifs du marché inférieurs" },
            { value: "SOUSEVALUE", label: "⚠️ Légèrement sous-évalué", desc: "Tarifs réels plus élevés" },
            { value: "INCOHERENT", label: "❌ Très éloigné de la réalité", desc: "Calculs de quantitatifs faussés" },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setQuotePrecision(opt.value)}
              className={`p-3 text-left rounded-xl border text-sm transition-all duration-300 ${
                quotePrecision === opt.value
                  ? "bg-wood-ocre/10 border-wood-ocre text-white shadow-lg shadow-wood-ocre/5"
                  : "bg-anthracite-700/30 border-white/5 text-anthracite-300 hover:border-white/10 hover:bg-anthracite-700/50"
              }`}
            >
              <div className="font-semibold">{opt.label}</div>
              <div className="text-xs text-anthracite-500 mt-0.5">{opt.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* COMMENTS / BUGS */}
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-white tracking-wide">
          Commentaires / Bugs rencontrés
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="w-full bg-anthracite-900 border border-white/10 focus:border-wood-ocre focus:ring-1 focus:ring-wood-ocre rounded-xl p-4 text-white text-sm h-36 placeholder-anthracite-600 focus:outline-none transition-all resize-none"
          placeholder="Décrivez précisément votre expérience, la lisibilité des textes, ou les éventuels artéfacts visuels..."
          required
        />
      </div>

      {/* SUBMIT BUTTON */}
      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-wood-gradient text-white py-3.5 rounded-xl font-display font-semibold transition-all duration-300 hover:opacity-90 hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 shadow-lg shadow-wood-dark/20 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Envoi en cours...
          </>
        ) : (
          <>
            <span>📨 Envoyer mon Feedback</span>
          </>
        )}
      </button>

      <div className="flex items-center justify-center gap-2 text-xs text-anthracite-500 pt-2 border-t border-white/5">
        <ShieldCheck className="w-4 h-4 text-wood-ocre" />
        <span>Vos données de test anonymisées aident à l&apos;amélioration du moteur souverain BTP Cameroun.</span>
      </div>
    </form>
  );
}
