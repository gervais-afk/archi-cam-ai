"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Mail, Lock, Eye, EyeOff, ArrowRight, Zap } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleDemoAccess = async () => {
    setLoading(true);
    try {
      // Pour le mode démo, on génère un token de session simulé
      await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: "mock-demo-token-123" }),
      });
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const prefillDemo = () => {
    setEmail("demo@archicam.cm");
    setPassword("demo1234");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    try {
      const { signInWithEmailAndPassword } = await import("firebase/auth");
      const { auth } = await import("@/lib/firebase");
      
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const token = await userCredential.user.getIdToken();
      
      const sessionRes = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      if (!sessionRes.ok) {
        throw new Error("Impossible de créer la session de connexion.");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || "Une erreur inattendue est survenue.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const { signInWithPopup } = await import("firebase/auth");
      const { auth, googleProvider } = await import("@/lib/firebase");
      
      const userCredential = await signInWithPopup(auth, googleProvider);
      const token = await userCredential.user.getIdToken();
      
      const sessionRes = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      if (!sessionRes.ok) {
        throw new Error("Impossible de créer la session de connexion.");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || "Connexion Google annulée ou échouée.");
    } finally {
      setLoading(false);
    }
  };

  const handleMicrosoftSignIn = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const { signInWithPopup } = await import("firebase/auth");
      const { auth, microsoftProvider } = await import("@/lib/firebase");
      
      const userCredential = await signInWithPopup(auth, microsoftProvider);
      const token = await userCredential.user.getIdToken();
      
      const sessionRes = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      if (!sessionRes.ok) {
        throw new Error("Impossible de créer la session de connexion.");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || "Connexion Windows/Microsoft annulée ou échouée.");
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

        {/* Demo Access Banner */}
        <div className="mb-4 p-4 rounded-2xl bg-ai-glow/5 border border-ai-glow/20 flex items-center justify-between gap-4">
          <div>
            <p className="text-ai-glow text-xs font-black uppercase tracking-wider">Mode Développement</p>
            <p className="text-anthracite-400 text-[10px] mt-0.5">Accédez au dashboard sans compte</p>
          </div>
          <button
            onClick={handleDemoAccess}
            className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-ai-glow/10 hover:bg-ai-glow/20 border border-ai-glow/30 text-ai-glow text-[10px] font-black uppercase tracking-wider transition-all"
          >
            <Zap className="w-3.5 h-3.5" />
            Accès Démo
          </button>
        </div>

        {/* Card */}
        <div className="card-dark rounded-2xl p-8 space-y-6">
          <h1 className="font-display font-bold text-white text-2xl">
            Connexion
          </h1>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center font-bold animate-fade-in space-y-2">
              <p>{errorMsg}</p>
              <button
                onClick={handleDemoAccess}
                className="text-ai-glow underline text-[10px] font-bold"
              >
                → Continuer sans compte (Mode Démo)
              </button>
            </div>
          )}

          {/* Social Sign In Options */}
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path fill="#EA4335" d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114A5.99 5.99 0 0 1 8 12.5a5.99 5.99 0 0 1 5.99-6.014c1.55 0 2.902.585 3.927 1.536l3.228-3.229C19.16 2.87 16.78 1.986 13.99 1.986 8.473 1.986 4 6.46 4 11.977A7.98 7.98 0 0 0 12 20c4.41 0 7.76-2.91 7.76-7.89 0-.47-.04-.92-.12-1.365z"/>
              </svg>
              Google
            </button>
            
            <button
              type="button"
              onClick={handleMicrosoftSignIn}
              disabled={loading}
              className="flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 23 23">
                <path fill="#F25022" d="M0 0h11v11H0z"/>
                <path fill="#7FBA00" d="M12 0h11v11H12z"/>
                <path fill="#00A4EF" d="M0 12h11v11H0z"/>
                <path fill="#FFB900" d="M12 12h11v11H12z"/>
              </svg>
              Windows
            </button>
          </div>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-anthracite-800"></div>
            <span className="flex-shrink mx-4 text-anthracite-600 text-[10px] font-black uppercase tracking-[0.2em]">Ou par email</span>
            <div className="flex-grow border-t border-anthracite-800"></div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-anthracite-300 text-sm font-medium">
                  Email professionnel
                </label>
                <button
                  type="button"
                  onClick={prefillDemo}
                  className="text-[9px] text-ai-glow/70 hover:text-ai-glow font-bold uppercase tracking-wider transition-colors"
                >
                  ← Remplir Démo
                </button>
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
