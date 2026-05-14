"use client";

import Link           from "next/link";
import { useState }   from "react";
import {
  Building2, Mail, Lock, User, ArrowRight, Check,
} from "lucide-react";

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // TODO: Firebase Auth createUserWithEmailAndPassword
    await new Promise((r) => setTimeout(r, 1500));
    setLoading(false);
    window.location.href = "/dashboard";
  };

  return (
    <div className="min-h-screen bg-hero-gradient flex items-center justify-center px-4 py-12">
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
          <p className="text-anthracite-400 text-sm mt-4">
            3 rendus gratuits offerts à l&apos;inscription
          </p>
        </div>

        <div className="card-dark rounded-2xl p-8">
          <h1 className="font-display font-bold text-white text-2xl mb-6">
            Créer un compte
          </h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-anthracite-300 text-sm font-medium mb-2">
                Nom de l&apos;agence
              </label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-anthracite-500" />
                <input
                  type="text"
                  placeholder="Agence Bâtir Yaoundé"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-anthracite-800 border border-anthracite-700 rounded-xl text-white text-sm placeholder-anthracite-600 focus:border-wood-ocre/50 focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-anthracite-300 text-sm font-medium mb-2">
                Prénom & Nom
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-anthracite-500" />
                <input
                  type="text"
                  placeholder="Jean-Pierre Mbarga"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-anthracite-800 border border-anthracite-700 rounded-xl text-white text-sm placeholder-anthracite-600 focus:border-wood-ocre/50 focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-anthracite-300 text-sm font-medium mb-2">
                Email professionnel
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-anthracite-500" />
                <input
                  type="email"
                  placeholder="contact@agence.cm"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-anthracite-800 border border-anthracite-700 rounded-xl text-white text-sm placeholder-anthracite-600 focus:border-wood-ocre/50 focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-anthracite-300 text-sm font-medium mb-2">
                Mot de passe
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-anthracite-500" />
                <input
                  type="password"
                  placeholder="8 caractères minimum"
                  minLength={8}
                  required
                  className="w-full pl-10 pr-4 py-3 bg-anthracite-800 border border-anthracite-700 rounded-xl text-white text-sm placeholder-anthracite-600 focus:border-wood-ocre/50 focus:outline-none transition-colors"
                />
              </div>
            </div>

            {/* Perks */}
            <div className="bg-anthracite-800 rounded-xl p-4 border border-anthracite-700 space-y-2">
              {[
                "3 rendus 4K offerts sans carte bancaire",
                "Accès immédiat au tableau de bord",
                "Support par email inclus",
              ].map((perk) => (
                <div key={perk} className="flex items-center gap-2 text-xs text-anthracite-300">
                  <Check className="w-3.5 h-3.5 text-wood-ocre shrink-0" />
                  {perk}
                </div>
              ))}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 py-3.5"
            >
              {loading ? (
                <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              ) : (
                <>
                  Créer mon compte gratuitement
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <p className="text-anthracite-600 text-xs text-center">
              En créant un compte, vous acceptez nos{" "}
              <a href="#" className="text-wood-ocre hover:underline">
                CGU
              </a>{" "}
              et notre{" "}
              <a href="#" className="text-wood-ocre hover:underline">
                Politique de confidentialité
              </a>
            </p>
          </form>

          <p className="text-center text-anthracite-500 text-sm mt-6">
            Déjà un compte ?{" "}
            <Link
              href="/login"
              className="text-wood-ocre hover:text-wood-light transition-colors font-medium"
            >
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
