/**
 * 🔑 API KEY MANAGER — ARCHI CAM AI
 * ─────────────────────────────────
 * Gestion des clés d'API publiques pour les clients du Plan Enterprise.
 */

export interface ApiKeyInfo {
  apiKey: string;
  userId: string;
  plan: "enterprise";
  createdAt: string;
}

const API_KEYS_STORE = new Map<string, ApiKeyInfo>([
  ["sk_live_archicam_enterprise_key_2026", {
    apiKey: "sk_live_archicam_enterprise_key_2026",
    userId: "enterprise-partner-01",
    plan: "enterprise",
    createdAt: new Date().toISOString(),
  }],
]);

export function validateApiKey(apiKey: string): ApiKeyInfo | null {
  if (!apiKey || !apiKey.startsWith("sk_live_")) return null;
  return API_KEYS_STORE.get(apiKey) || null;
}

export function generateApiKey(userId: string): ApiKeyInfo {
  const apiKey = `sk_live_${Math.random().toString(36).substring(2)}${Date.now()}`;
  const info: ApiKeyInfo = {
    apiKey,
    userId,
    plan: "enterprise",
    createdAt: new Date().toISOString(),
  };
  API_KEYS_STORE.set(apiKey, info);
  return info;
}
