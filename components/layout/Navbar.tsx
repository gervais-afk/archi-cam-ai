"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X, Building2 } from "lucide-react";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-anthracite-900/90 backdrop-blur-md border-b border-anthracite-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
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
            {[
              { href: "#fonctionnalites", label: "Fonctionnalités" },
              { href: "#tarifs",          label: "Tarifs"          },
              { href: "#contact",         label: "Contact"         },
            ].map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-anthracite-300 hover:text-wood-ocre text-sm font-medium transition-colors duration-200"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* CTA */}
          <div className="hidden md:flex items-center gap-3">
            <Link href="/login" className="btn-ghost text-sm py-2">
              Connexion
            </Link>
            <Link href="/dashboard" className="btn-primary text-sm py-2">
              Démarrer Gratuitement
            </Link>
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
          <div className="md:hidden py-4 border-t border-anthracite-700 animate-fade-in">
            <div className="flex flex-col gap-4">
              {[
                { href: "#fonctionnalites", label: "Fonctionnalités" },
                { href: "#tarifs",          label: "Tarifs"          },
              ].map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-anthracite-300 hover:text-wood-ocre text-sm font-medium"
                  onClick={() => setIsOpen(false)}
                >
                  {link.label}
                </a>
              ))}
              <Link href="/dashboard" className="btn-primary text-sm text-center">
                Démarrer Gratuitement
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
