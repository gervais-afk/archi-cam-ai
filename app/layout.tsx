import type { Metadata } from "next";
import { Inter, Poppins } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets:  ["latin"],
  variable: "--font-inter",
  display:  "swap",
});

const poppins = Poppins({
  subsets:  ["latin"],
  weight:   ["400", "500", "600", "700", "800"],
  variable: "--font-poppins",
  display:  "swap",
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
      </body>
    </html>
  );
}
