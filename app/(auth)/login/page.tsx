"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Mail, Lock, Eye, EyeOff, ArrowRight, Shield, User } from "lucide-react";
import { authenticateMock, createMockSessionToken } from "@/lib/mock-auth";

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const startSession = async (email: string) => {
    const token = createMockSessionToken(email);
    // Store mock session in a cookie via the session API
    await fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, mockEmail: email }),
    });
    router.push("/dashboard");
    router.refresh();
  };

  const prefillAdmin = () => {
    setEmail("admin@archicam.cm");
    setPassword("admin1234");
  };

  const prefillVisitor = () => {
    setEmail("visiteur@archicam.cm");
    setPassword("visiteur1234");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    try {
      // 1. Try mock accounts first (prototype mode)
      const account = authenticateMock(email, password);
      if (account) {
        await startSession(account.email);
        return;
      }

      // 2. Fallback: try real Firebase auth
      try {
        const { signInWithEmailAndPassword } = await import("firebase/auth");
        const { auth } = await import("@/lib/firebase");
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const fbToken = await userCredential.user.getIdToken();
        await fetch("/api/auth/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: fbToken }),
        });
        router.push("/dashboard");
        router.refresh();
      } catch {
        throw new Error("Email ou mot de passe incorrect.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Une erreur inattendue est survenue.");
    } finally {
      setLoading(false);
    }
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

        {/* Prototype Accounts Banner */}
        <div className="mb-4 space-y-2">
          <p className="text-anthracite-500 text-[9px] font-black uppercase tracking-widest text-center">Comptes de Test (Prototypage)</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={prefillAdmin}
              className="flex items-center gap-2 p-3 rounded-xl bg-wood-ocre/5 border border-wood-ocre/20 hover:border-wood-ocre/50 transition-all text-left"
            >
              <Shield className="w-4 h-4 text-wood-ocre shrink-0" />
              <div>
                <p className="text-wood-ocre text-[9px] font-black uppercase">Admin</p>
                <p className="text-anthracite-500 text-[8px]">admin@archicam.cm</p>
              </div>
            </button>
            <button
              onClick={prefillVisitor}
              className="flex items-center gap-2 p-3 rounded-xl bg-ai-glow/5 border border-ai-glow/20 hover:border-ai-glow/50 transition-all text-left"
            >
              <User className="w-4 h-4 text-ai-glow shrink-0" />
              <div>
                <p className="text-ai-glow text-[9px] font-black uppercase">Visiteur</p>
                <p className="text-anthracite-500 text-[8px]">visiteur@archicam.cm</p>
              </div>
            </button>
          </div>
        </div>

        {/* Card */}
        <div className="card-dark rounded-2xl p-8 space-y-6">
          <h1 className="font-display font-bold text-white text-2xl">
            Connexion
          </h1>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center font-bold animate-fade-in space-y-2">
              <p>{errorMsg}</p>
            </div>
          )}

          {/* Social Sign-In — disponible en production Firebase */}
          {/* Social sign-in kept for future Firebase production use
          <div className="grid grid-cols-2 gap-4">
            ... Google / Microsoft buttons ...
          </div>
          */}

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-anthracite-800"></div>
            <span className="flex-shrink mx-4 text-anthracite-600 text-[10px] font-black uppercase tracking-[0.2em]">Connexion email</span>
            <div className="flex-grow border-t border-anthracite-800"></div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-anthracite-300 text-sm font-medium">
                  Email
                </label>
              </div>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-anthracite-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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

          <p className="text-center text-anthracite-500 text-sm">
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
