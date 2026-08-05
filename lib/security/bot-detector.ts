/**
 * DÉTECTEUR DE BOTS ET SHIELD DE SÉCURITÉ REQUÊTES — ARCHI CAM AI
 * ════════════════════════════════════════════════════════════════════════════
 * Analyse l'empreinte navigateur et le rythme des requêtes pour bloquer les
 * robots malveillants, crawlers et tentatives d'épuisement de crédits.
 * ════════════════════════════════════════════════════════════════════════════
 */

import { createHash } from "crypto";

const ipRequestTimestamps = new Map<string, number[]>();

export class BotDetector {
  public isLikelyBot(userAgent: string = "", ipAddress: string = "127.0.0.1"): boolean {
    const ua = userAgent.toLowerCase();

    // 1. Détection par User-Agent crawler/bot
    if (
      !ua ||
      ua.includes("bot") ||
      ua.includes("crawler") ||
      ua.includes("spider") ||
      ua.includes("python-requests") ||
      ua.includes("curl")
    ) {
      return true;
    }

    // 2. Détection de fréquence abusive (> 10 requêtes / 10 secondes)
    const now = Date.now();
    const timestamps = ipRequestTimestamps.get(ipAddress) || [];
    const recent = timestamps.filter((t) => now - t < 10000);

    recent.push(now);
    ipRequestTimestamps.set(ipAddress, recent);

    if (recent.length > 10) {
      console.warn(`🚨 [Bot Detector] Trafic suspect à fréquence élevée détecté depuis l'IP ${ipAddress} (${recent.length} req/10s).`);
      return true;
    }

    return false;
  }

  public generateDeviceFingerprint(userAgent: string, acceptLanguage: string): string {
    return createHash("md5")
      .update(`${userAgent}|${acceptLanguage}`)
      .digest("hex");
  }
}
