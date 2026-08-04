import type { Metadata } from "next";
import localFont from "next/font/local";
import { Toaster } from "sonner";
import "./globals.css";

// Configuration des polices locales avec fallback système explicite
// Désactive 100% des appels distants à fonts.googleapis.com
const inter = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-inter",
  display: "swap",
  fallback: ["system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
});

const poppins = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-poppins",
  display: "swap",
  fallback: ["system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
});

export const metadata: Metadata = {
  title:       "Archi-Cameroun AI — Rendus 3D Ultra-Réalistes",
  description:
    "Transformez vos plans architecturaux en rendus 3D ultra-réalistes en 30 secondes. Outil IA dédié aux promoteurs immobiliers camerounais.",
  keywords:    ["architecture", "rendu 3D", "Cameroun", "immobilier", "IA"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={`${inter.variable} ${poppins.variable}`}>
      <body className="bg-anthracite-900 text-white antialiased font-sans">
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}


