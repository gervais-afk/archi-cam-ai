/**
 * VARIANTES DE BADGES & WATERMARKS ARCHITECTURAUX — ARCHI CAM AI
 * ════════════════════════════════════════════════════════════════════════════
 * Génère des watermarks vectoriels haute résolution personnalisés selon le type de plan
 * (2D, 3D, FAÇADE, COUPE, MASSE) et le niveau de licence (FREE, PRO, ENTERPRISE).
 * ════════════════════════════════════════════════════════════════════════════
 */

export type PlanType = "2D" | "3D" | "FACADE" | "COUPE" | "MASSE";

export interface WatermarkStyle {
  icon: string;
  gradient: string;
  label: string;
  color: string;
}

export function getWatermarkStyle(planType: PlanType): WatermarkStyle {
  const styles: Record<PlanType, WatermarkStyle> = {
    "2D": {
      icon: "📐",
      gradient: "linear-gradient(135deg, rgba(197,160,89,0.95) 0%, rgba(150,120,70,0.95) 100%)",
      label: "PLAN 2D COTÉ",
      color: "#C5A059",
    },
    "3D": {
      icon: "🏗️",
      gradient: "linear-gradient(135deg, rgba(66,133,244,0.95) 0%, rgba(52,108,211,0.95) 100%)",
      label: "VUE 3D PHOTORÉALISTE",
      color: "#4285F4",
    },
    FACADE: {
      icon: "🏛️",
      gradient: "linear-gradient(135deg, rgba(234,67,53,0.95) 0%, rgba(201,52,42,0.95) 100%)",
      label: "FAÇADE ARCHITECTURALE",
      color: "#EA4335",
    },
    COUPE: {
      icon: "✂️",
      gradient: "linear-gradient(135deg, rgba(251,188,5,0.95) 0%, rgba(220,160,0,0.95) 100%)",
      label: "COUPE TECHNIQUE",
      color: "#FBBC05",
    },
    MASSE: {
      icon: "🗺️",
      gradient: "linear-gradient(135deg, rgba(52,168,83,0.95) 0%, rgba(40,140,65,0.95) 100%)",
      label: "PLAN DE MASSE",
      color: "#34A853",
    },
  };

  return styles[planType] || styles["2D"];
}

export function generateStyledWatermarkSvg(
  planType: PlanType,
  licenseType: "FREE" | "PRO" | "ENTERPRISE",
  fingerprint: string,
  width: number = 1024,
  height: number = 1024
): string {
  const style = getWatermarkStyle(planType);
  const badgeWidth = Math.round(width * 0.36);
  const badgeHeight = Math.round(height * 0.085);
  const posX = Math.round(width * 0.03);
  const posY = Math.round(height * 0.88);

  const licenseLabel =
    licenseType === "ENTERPRISE"
      ? "LICENCE ENTERPRISE CERTIFIÉE"
      : licenseType === "PRO"
      ? "LICENCE PROFESSIONNELLE"
      : "⚠️ VERSION DÉMO GRATUITE";

  return `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="badgeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0F172A" stop-opacity="0.85" />
          <stop offset="100%" stop-color="#1E293B" stop-opacity="0.92" />
        </linearGradient>
        <filter id="shadow">
          <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#000000" flood-opacity="0.4"/>
        </filter>
      </defs>
      <g transform="translate(${posX}, ${posY})" filter="url(#shadow)">
        <rect x="0" y="0" width="${badgeWidth}" height="${badgeHeight}" rx="10" fill="url(#badgeGrad)" stroke="${style.color}" stroke-width="1.5" />
        <rect x="0" y="0" width="8" height="${badgeHeight}" rx="10 0 0 10" fill="${style.color}" />
        <text x="22" y="${Math.round(badgeHeight * 0.42)}" font-family="sans-serif" font-size="${Math.round(width * 0.016)}px" font-weight="800" fill="#FFFFFF" letter-spacing="1px">
          ${style.icon} ARCHI CAM AI
        </text>
        <text x="22" y="${Math.round(badgeHeight * 0.68)}" font-family="sans-serif" font-size="${Math.round(width * 0.011)}px" font-weight="600" fill="${style.color}">
          ${style.label} • ${licenseLabel}
        </text>
        <text x="22" y="${Math.round(badgeHeight * 0.88)}" font-family="monospace" font-size="${Math.round(width * 0.009)}px" fill="#94A3B8">
          ID: ${fingerprint} • ${new Date().toLocaleDateString("fr-FR")}
        </text>
      </g>
    </svg>
  `;
}
