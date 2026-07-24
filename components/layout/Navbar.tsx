"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Menu, X, Building2, LogOut, Settings, LayoutDashboard } from "lucide-react";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter, usePathname } from "next/navigation";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      await fetch("/api/auth/session", { method: "DELETE" });
      router.push("/");
      router.refresh();
    } catch (error) {
      console.error("Erreur lors de la déconnexion :", error);
    }
  };

  const isDashboardOrSettings = pathname?.startsWith("/dashboard") || pathname?.startsWith("/settings");

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-anthracite-900/90 backdrop-blur-md border-b border-anthracite-700/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link href={user ? "/dashboard" : "/"} className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-lg bg-wood-gradient flex items-center justify-center shadow-lg shadow-wood-acajou/30 group-hover:scale-105 transition-transform">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <span className="font-display font-bold text-white text-lg tracking-tight">
              Archi<span className="text-wood-ocre">-Cameroun</span>{" "}
              <span className="text-anthracite-400 font-normal text-sm">AI</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            {!isDashboardOrSettings ? (
              <>
                <a href="#fonctionnalites" className="text-anthracite-300 hover:text-wood-ocre text-sm font-medium transition-colors duration-200">
                  Fonctionnalités
                </a>
                <a href="#tarifs" className="text-anthracite-300 hover:text-wood-ocre text-sm font-medium transition-colors duration-200">
                  Tarifs
                </a>
                <a href="#contact" className="text-anthracite-300 hover:text-wood-ocre text-sm font-medium transition-colors duration-200">
                  Contact
                </a>
              </>
            ) : (
              <>
                <Link href="/dashboard" className={`text-sm font-medium transition-colors duration-200 flex items-center gap-1.5 ${pathname === '/dashboard' ? 'text-wood-ocre font-semibold' : 'text-anthracite-300 hover:text-white'}`}>
                  <LayoutDashboard className="w-4 h-4" />
                  Studio IA
                </Link>
                <Link href="/settings" className={`text-sm font-medium transition-colors duration-200 flex items-center gap-1.5 ${pathname === '/settings' ? 'text-wood-ocre font-semibold' : 'text-anthracite-300 hover:text-white'}`}>
                  <Settings className="w-4 h-4" />
                  Paramètres
                </Link>
              </>
            )}
          </div>

          {/* CTA / Auth Actions */}
          <div className="hidden md:flex items-center gap-3">
            {loading ? (
              <div className="w-20 h-8 rounded-lg bg-white/5 animate-pulse" />
            ) : user ? (
              <div className="flex items-center gap-4">
                {!isDashboardOrSettings && (
                  <Link href="/dashboard" className="btn-primary text-sm py-2">
                    Studio IA
                  </Link>
                )}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-anthracite-400 max-w-[150px] truncate hidden lg:inline-block font-medium">
                    {user.displayName || user.email}
                  </span>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider text-red-400 hover:text-white hover:bg-red-900/20 border border-red-900/30 transition-all duration-300"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Déconnexion
                  </button>
                </div>
              </div>
            ) : (
              <>
                <Link href="/login" className="btn-ghost text-sm py-2">
                  Connexion
                </Link>
                <Link href="/register" className="btn-primary text-sm py-2">
                  Démarrer Gratuitement
                </Link>
              </>
            )}
          </div>

          {/* Mobile toggle */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 text-anthracite-300 hover:text-white"
          >
            {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="md:hidden py-4 border-t border-anthracite-700/50 animate-fade-in">
            <div className="flex flex-col gap-4">
              {!isDashboardOrSettings ? (
                <>
                  <a href="#fonctionnalites" className="text-anthracite-300 hover:text-wood-ocre text-sm font-medium" onClick={() => setIsOpen(false)}>
                    Fonctionnalités
                  </a>
                  <a href="#tarifs" className="text-anthracite-300 hover:text-wood-ocre text-sm font-medium" onClick={() => setIsOpen(false)}>
                    Tarifs
                  </a>
                  <a href="#contact" className="text-anthracite-300 hover:text-wood-ocre text-sm font-medium" onClick={() => setIsOpen(false)}>
                    Contact
                  </a>
                </>
              ) : (
                <>
                  <Link href="/dashboard" className="text-anthracite-300 hover:text-white text-sm font-medium flex items-center gap-2" onClick={() => setIsOpen(false)}>
                    <LayoutDashboard className="w-4 h-4" />
                    Studio IA
                  </Link>
                  <Link href="/settings" className="text-anthracite-300 hover:text-white text-sm font-medium flex items-center gap-2" onClick={() => setIsOpen(false)}>
                    <Settings className="w-4 h-4" />
                    Paramètres
                  </Link>
                </>
              )}
              {loading ? (
                <div className="h-10 rounded-lg bg-white/5 animate-pulse" />
              ) : user ? (
                <div className="flex flex-col gap-2 pt-2 border-t border-anthracite-800">
                  <span className="text-xs text-anthracite-400 px-1 truncate font-medium">
                    {user.email}
                  </span>
                  <button
                    onClick={() => {
                      handleLogout();
                      setIsOpen(false);
                    }}
                    className="flex items-center justify-center gap-2 w-full btn-ghost text-red-400 hover:text-red-300 text-sm py-2 text-center"
                  >
                    <LogOut className="w-4 h-4" />
                    Déconnexion
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2 pt-2 border-t border-anthracite-800">
                  <Link href="/login" className="btn-ghost text-sm text-center py-2" onClick={() => setIsOpen(false)}>
                    Connexion
                  </Link>
                  <Link href="/register" className="btn-primary text-sm text-center py-2" onClick={() => setIsOpen(false)}>
                    Démarrer Gratuitement
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
