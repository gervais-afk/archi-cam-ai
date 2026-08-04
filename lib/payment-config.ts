/**
 * CONFIGURATION PAIMENT MOBILE MONEY & PACKS DE CRÉDITS — ARCHI CAM AI
 * ────────────────────────────────────────────────────────────────────
 */

export interface CreditPack {
  id: string;
  name: string;
  credits: number;
  bonusCredits: number;
  totalCredits: number;
  amountFCFA: number;
  description: string;
  popular?: boolean;
}

export const CREDIT_PACKS: CreditPack[] = [
  {
    id: "pack_decouverte",
    name: "Pack Découverte",
    credits: 50,
    bonusCredits: 0,
    totalCredits: 50,
    amountFCFA: 2500,
    description: "Idéal pour 25 rendus 3D ou 5 survols vidéos drone.",
    popular: false,
  },
  {
    id: "pack_pro",
    name: "Pack Pro Cabinet",
    credits: 250,
    bonusCredits: 20,
    totalCredits: 270,
    amountFCFA: 10000,
    description: "Pour architectes & ingénieurs avec bonus +20 crédits.",
    popular: true,
  },
  {
    id: "pack_enterprise",
    name: "Pack Bureau d'Études",
    credits: 750,
    bonusCredits: 100,
    totalCredits: 850,
    amountFCFA: 25000,
    description: "Offre illimitée grands comptes avec bonus +100 crédits.",
    popular: false,
  },
];

export const CAMPAY_CONFIG = {
  baseUrl: process.env.CAMPAY_BASE_URL || "https://www.campay.net/api",
  appUsername: process.env.CAMPAY_USERNAME || "mock_campay_user",
  appPassword: process.env.CAMPAY_PASSWORD || "mock_campay_pass",
  environment: process.env.CAMPAY_ENV || "sandbox",
};
