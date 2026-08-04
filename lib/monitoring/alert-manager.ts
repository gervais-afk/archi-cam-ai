/**
 * 🚨 ALERT MANAGER & TELEGRAM MONITORING — ARCHI CAM AI
 * ──────────────────────────────────────────────────────
 * Envoie des alertes instantanées (Telegram / Console) en cas d'erreur de rendu ou de fallback.
 */

export interface Alert {
  level: "info" | "warning" | "critical";
  service: string;
  message: string;
  context?: Record<string, unknown>;
}

export async function sendAlert(alert: Alert): Promise<void> {
  const emoji = {
    info: "ℹ️",
    warning: "⚠️",
    critical: "🚨",
  }[alert.level];

  const timestamp = new Date().toLocaleString("fr-FR", { timeZone: "Africa/Douala" });
  const message = `${emoji} *Archi Cam AI Production Alert*\n`
    + `*Service*: \`${alert.service}\`\n`
    + `*Message*: ${alert.message}\n`
    + `*Niveau*: \`${alert.level.toUpperCase()}\`\n`
    + `*Heure (Cameroun)*: ${timestamp}\n`
    + (alert.context ? `\`\`\`json\n${JSON.stringify(alert.context, null, 2)}\n\`\`\`` : "");

  console.log(`[Alert Manager] ${emoji} [${alert.level.toUpperCase()}] ${alert.service} - ${alert.message}`);

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (botToken && chatId) {
    try {
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: "Markdown",
        }),
      });
    } catch (err: any) {
      console.warn("[Alert Manager Error] Échec d'envoi de l'alerte Telegram:", err.message);
    }
  }
}
