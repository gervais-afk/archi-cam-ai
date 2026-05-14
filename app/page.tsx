import Navbar   from "@/components/layout/Navbar";
import Hero     from "@/components/landing/Hero";
import Features from "@/components/landing/Features";
import Pricing  from "@/components/landing/Pricing";
import Link     from "next/link";
import { Building2, Mail, Phone, MapPin } from "lucide-react";

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <Navbar />
      <Hero />
      <Features />
      <Pricing />

      {/* Footer */}
      <footer
        id="contact"
        className="bg-anthracite-900 border-t border-anthracite-800 py-16"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            {/* Brand */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-lg bg-wood-gradient flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-white" />
                </div>
                <span className="font-display font-bold text-white text-lg">
                  Archi-Cameroun AI
                </span>
              </div>
              <p className="text-anthracite-400 text-sm leading-relaxed max-w-xs">
                L&apos;outil de rendus architecturaux par IA, conçu pour les
                professionnels de l&apos;immobilier au Cameroun et en Afrique
                centrale.
              </p>
            </div>

            {/* Contact */}
            <div>
              <h4 className="text-white font-semibold text-sm mb-4">Contact</h4>
              <ul className="space-y-3">
                {[
                  { icon: Mail,    text: "contact@archi-cameroun.ai"  },
                  { icon: Phone,   text: "+237 6 XX XX XX XX"          },
                  { icon: MapPin,  text: "Yaoundé, Cameroun"           },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <li
                      key={item.text}
                      className="flex items-center gap-2 text-anthracite-400 text-sm"
                    >
                      <Icon className="w-4 h-4 text-wood-ocre" />
                      {item.text}
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Links */}
            <div>
              <h4 className="text-white font-semibold text-sm mb-4">Produit</h4>
              <ul className="space-y-3">
                {[
                  { href: "#fonctionnalites", label: "Fonctionnalités" },
                  { href: "#tarifs",          label: "Tarifs"          },
                  { href: "/dashboard",       label: "Tableau de bord" },
                  { href: "/login",           label: "Connexion"       },
                ].map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-anthracite-400 text-sm hover:text-wood-ocre transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="border-t border-anthracite-800 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-anthracite-600 text-xs">
              © 2025 Archi-Cameroun AI. Tous droits réservés.
            </p>
            <p className="text-anthracite-600 text-xs">
              Conçu avec ❤ au Cameroun
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
