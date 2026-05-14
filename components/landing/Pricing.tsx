"use client";

import Link from "next/link";
import { Check, X, Zap, Building2, Crown } from "lucide-react";

const PLANS = [
  {
    id:          "free",
    icon:        Zap,
    name:        "Essai Gratuit",
    price:       "0",
    unit:        "FCFA",
    period:      "3 rendus offerts",
    description: "Découvrez la puissance de l'IA sans engagement.",
    cta:         "Commencer gratuitement",
    ctaStyle:    "btn-ghost w-full text-center",
    highlight:   false,
    features: [
      { label: "3 rendus extérieurs",            included: true  },
      { label: "Résolution HD (1080p)",          included: true  },
      { label: "Filigrane Archi-Cameroun AI",    included: true  },
      { label: "Styles architecturaux de base",  included: true  },
      { label: "Rendu 4K Ultra HD",              included: false },
      { label: "Logo agence personnalisé",       included: false },
      { label: "Vidéo cinématique",              included: false },
      { label: "Rapport bioclimatique",          included: false },
      { label: "Support prioritaire",            included: false },
    ],
  },
  {
    id:          "pay-per-use",
    icon:        Building2,
    name:        "Paiement à l'acte",
    price:       "15 000",
    unit:        "FCFA",
    period:      "par rendu",
    description:
      "Idéal pour les projets ponctuels. Payez uniquement ce que vous générez.",
    cta:         "Acheter un rendu",
    ctaStyle:    "btn-primary w-full text-center",
    highlight:   true,
    features: [
      { label: "1 rendu par achat",              included: true  },
      { label: "Résolution 4K Ultra HD",         included: true  },
      { label: "Sans filigrane",                 included: true  },
      { label: "Tous les styles architecturaux", included: true  },
      { label: "Rapport technique PDF",          included: true  },
      { label: "Logo agence personnalisé",       included: false },
      { label: "Vidéo cinématique",              included: false },
      { label: "Rapport bioclimatique",          included: false },
      { label: "Support prioritaire",            included: false },
    ],
  },
  {
    id:          "agency-pro",
    icon:        Crown,
    name:        "Pass Agence Pro",
    price:       "100 000",
    unit:        "FCFA",
    period:      "/mois",
    description:
      "L'arsenal complet pour les agences à fort volume. Rendus illimités + options premium.",
    cta:         "Activer le Pass Pro",
    ctaStyle:    "w-full text-center py-3 px-6 rounded-lg font-semibold bg-anthracite-800 border border-wood-ocre text-wood-ocre hover:bg-wood-ocre hover:text-anthracite-900 transition-all duration-300",
    highlight:   false,
    features: [
      { label: "Rendus illimités",               included: true  },
      { label: "Résolution 4K Ultra HD",         included: true  },
      { label: "Logo agence personnalisé",       included: true  },
      { label: "Tous les styles architecturaux", included: true  },
      { label: "Vidéos cinématiques (Veo 3)",    included: true  },
      { label: "Rapport bioclimatique IA",       included: true  },
      { label: "Intégration Google Maps",        included: true  },
      { label: "Support prioritaire 24/7",       included: true  },
      { label: "API dédiée (bientôt)",           included: true  },
    ],
  },
];

export default function Pricing() {
  return (
    <section id="tarifs" className="py-24 bg-anthracite-800/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="text-center mb-16">
          <div className="wood-badge mb-4 mx-auto w-fit">Tarification</div>
          <h2 className="section-title">
            Des offres adaptées à chaque étape
          </h2>
          <p className="section-subtitle mx-auto">
            Commencez gratuitement, évoluez selon vos besoins. Paiement mobile
            (Orange Money, MTN MoMo) et virement acceptés.
          </p>
        </div>

        {/* Plans Grid */}
        <div className="grid md:grid-cols-3 gap-6 items-start">
          {PLANS.map((plan) => {
            const Icon = plan.icon;
            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl border transition-all duration-300 ${
                  plan.highlight
                    ? "bg-wood-gradient border-wood-ocre/60 shadow-2xl shadow-wood-acajou/30 scale-[1.02]"
                    : "card-dark hover:border-wood-ocre/30"
                }`}
              >
                {/* Popular badge */}
                {plan.highlight && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="bg-anthracite-900 border border-wood-ocre text-wood-ocre text-xs font-bold px-4 py-1.5 rounded-full">
                      ⭐ Plus Populaire
                    </span>
                  </div>
                )}

                <div className="p-8">
                  {/* Icon + Name */}
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        plan.highlight
                          ? "bg-white/20"
                          : "bg-wood-ocre/10 border border-wood-ocre/20"
                      }`}
                    >
                      <Icon
                        className={`w-5 h-5 ${
                          plan.highlight ? "text-white" : "text-wood-ocre"
                        }`}
                      />
                    </div>
                    <h3
                      className={`font-display font-bold text-lg ${
                        plan.highlight ? "text-white" : "text-white"
                      }`}
                    >
                      {plan.name}
                    </h3>
                  </div>

                  {/* Price */}
                  <div className="mb-2">
                    <div className="flex items-baseline gap-1">
                      <span
                        className={`font-display font-extrabold text-4xl ${
                          plan.highlight ? "text-white" : "text-white"
                        }`}
                      >
                        {plan.price}
                      </span>
                      <span
                        className={`text-sm font-semibold ${
                          plan.highlight
                            ? "text-white/80"
                            : "text-anthracite-400"
                        }`}
                      >
                        {plan.unit}
                      </span>
                    </div>
                    <p
                      className={`text-sm ${
                        plan.highlight
                          ? "text-white/70"
                          : "text-anthracite-500"
                      }`}
                    >
                      {plan.period}
                    </p>
                  </div>

                  <p
                    className={`text-sm leading-relaxed mb-8 ${
                      plan.highlight
                        ? "text-white/80"
                        : "text-anthracite-400"
                    }`}
                  >
                    {plan.description}
                  </p>

                  {/* CTA */}
                  <Link href="/dashboard" className={plan.ctaStyle}>
                    {plan.cta}
                  </Link>

                  {/* Divider */}
                  <div
                    className={`my-8 border-t ${
                      plan.highlight
                        ? "border-white/20"
                        : "border-anthracite-700"
                    }`}
                  />

                  {/* Features */}
                  <ul className="space-y-3">
                    {plan.features.map((f) => (
                      <li key={f.label} className="flex items-start gap-3">
                        {f.included ? (
                          <Check
                            className={`w-4 h-4 mt-0.5 shrink-0 ${
                              plan.highlight
                                ? "text-white"
                                : "text-wood-ocre"
                            }`}
                          />
                        ) : (
                          <X className="w-4 h-4 mt-0.5 shrink-0 text-anthracite-600" />
                        )}
                        <span
                          className={`text-sm ${
                            f.included
                              ? plan.highlight
                                ? "text-white"
                                : "text-anthracite-200"
                              : "text-anthracite-600"
                          }`}
                        >
                          {f.label}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>

        {/* Payment methods */}
        <div className="mt-12 text-center">
          <p className="text-anthracite-500 text-sm">
            Paiements acceptés :{" "}
            <span className="text-anthracite-300 font-medium">
              Orange Money · MTN Mobile Money · Virement bancaire · Carte Visa
            </span>
          </p>
        </div>
      </div>
    </section>
  );
}
