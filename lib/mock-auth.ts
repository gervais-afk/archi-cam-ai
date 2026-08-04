/**
 * lib/mock-auth.ts
 * Système d'authentification mock pour le prototypage Archi-Cameroun AI.
 * 2 comptes hardcodés :
 *   - ADMIN  : admin@archicam.cm / admin1234
 *   - VISITEUR : visiteur@archicam.cm / visiteur1234
 *
 * À remplacer par Firebase Auth réel en production.
 */

import type { UserProfile } from "@/types";

export type MockRole = "admin" | "visitor";

export interface MockAccount {
  email:    string;
  password: string;
  role:     MockRole;
  profile:  UserProfile;
  projects: MockProject[];
}

export interface MockProject {
  id:     number;
  name:   string;
  date:   string;
  type:   "BIM" | "Vision";
  status: "Terminé" | "En cours" | "Archive";
}

const ADMIN_PROJECTS: MockProject[] = [
  { id: 1, name: "Résidence Bastos R+2",       date: "Il y a 2h",  type: "BIM",    status: "Terminé"  },
  { id: 2, name: "Villa Kribi Plage",           date: "Hier",       type: "Vision", status: "Terminé"  },
  { id: 3, name: "Immeuble Akwa Nord",          date: "3 mai",      type: "BIM",    status: "Archive"  },
  { id: 4, name: "Complexe Bonanjo R+5",        date: "21 avr.",    type: "BIM",    status: "Terminé"  },
  { id: 5, name: "Villa Ngaoundéré Savane",     date: "10 avr.",    type: "Vision", status: "Archive"  },
];

const VISITOR_PROJECTS: MockProject[] = [
  { id: 1, name: "Essai — Maison R+1 Yaoundé", date: "Il y a 1h",  type: "Vision", status: "Terminé"  },
  { id: 2, name: "Projet Démo Duplex",          date: "Hier",       type: "BIM",    status: "En cours" },
];

export const MOCK_ACCOUNTS: Record<string, MockAccount> = {
  "admin@archicam.cm": {
    email:    "admin@archicam.cm",
    password: "admin1234",
    role:     "admin",
    profile: {
      uid:        "admin-uid-001",
      email:      "admin@archicam.cm",
      agencyName: "Archi-Cameroun HQ",
      logoUrl:    undefined,
      credits:    250,
      tier:       "agency-pro",
      createdAt:  new Date("2024-01-01"),
    },
    projects: ADMIN_PROJECTS,
  },
  "visiteur@archicam.cm": {
    email:    "visiteur@archicam.cm",
    password: "visiteur1234",
    role:     "visitor",
    profile: {
      uid:        "visitor-uid-001",
      email:      "visiteur@archicam.cm",
      agencyName: "Compte Visiteur",
      logoUrl:    undefined,
      credits:    5,
      tier:       "pay-per-use",
      createdAt:  new Date("2026-07-28"),
    },
    projects: VISITOR_PROJECTS,
  },
};

// Cookie name for mock session
export const MOCK_SESSION_COOKIE = "mockSession";

/** Vérifie les credentials et retourne le compte si valide. */
export function authenticateMock(email: string, password: string): MockAccount | null {
  const account = MOCK_ACCOUNTS[email.toLowerCase().trim()];
  if (!account) return null;
  if (account.password !== password) return null;
  return account;
}

/** Retourne le compte actif depuis le cookie de session. */
export function getSessionAccount(cookieValue: string | undefined): MockAccount | null {
  if (!cookieValue) return null;
  try {
    const { email } = JSON.parse(atob(cookieValue));
    return MOCK_ACCOUNTS[email] ?? null;
  } catch {
    return null;
  }
}

/** Génère un token de session pour un email. */
export function createMockSessionToken(email: string): string {
  return btoa(JSON.stringify({ email, ts: Date.now() }));
}
