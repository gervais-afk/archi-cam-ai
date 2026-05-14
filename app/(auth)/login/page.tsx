"use client";

import Link from "next/link";
import { useState }   from "react";
import { Building2, Mail, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading,      setLoading]      = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // TODO: Firebase Auth signInWithEmailAndPassword
    await new Promise((r) => setTimeout(r, 1500));
    setLoading(false);
    window.location.href = "/dashboard";
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
          <Link href="/" className="inline-flex items-center gap-3 group">
            <div className="w-11 h-11 rounded-xl bg-wood-gradient flex items-center justify-center shadow-lg shadow-wood-acajou/30">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <span className="font-display font-bold text-white text-xl">
              Archi<span className="text-wood-ocre">-Cameroun</span> AI
            </span>
          </Link>
          <p className="text-anthracite-400 text-sm mt-4">
            Connectez-vous à votre espace professionnel
          </p>
        </div>

        {/* Card */}
        <div className="card-dark rounded-2xl p-8">
          <h1 className="font-display font-bold text-white text-2xl mb-6">
            Connexion
          </h1>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
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

            {/* Password */}
            <div>
              <label className="block text-anthracite-300 text-sm font-medium mb-2">
                Mot de passe
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-anthracite-500" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  required
                  className="w-full pl-10 pr-10 py-3 bg-anthracite-800 border border-anthracite-700 rounded-xl text-white text-sm placeholder-anthracite-600 focus:border-wood-ocre/50 focus:outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-anthracite-500 hover:text-anthracite-300"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Forgot password */}
            <div className="text-right">
              <a href="#" className="text-wood-ocre text-xs hover:text-wood-light transition-colors">
                Mot de passe oublié ?
              </a>
            </div>

            {/* Submit */}
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
                  Se connecter
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-anthracite-500 text-sm mt-6">
            Pas encore de compte ?{" "}
            <Link
              href="/register"
              className="text-wood-ocre hover:text-wood-light transition-colors font-medium"
            >
              Créer un compte gratuitement
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
