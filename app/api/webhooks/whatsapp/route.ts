import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || "archicam_secret_token";

  if (mode === "subscribe" && token === verifyToken) {
    console.log("[WhatsApp Webhook] Verification réussie !");
    return new Response(challenge, { status: 200 });
  }

  return new Response("Forbidden", { status: 403 });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("[WhatsApp Webhook Event Received]:", JSON.stringify(body, null, 2));

    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0]?.value;
    const message = changes?.messages?.[0];

    if (message) {
      const from = message.from;
      console.log(`[WhatsApp Webhook] Photo/Message reçu de ${from}.`);
      // Le traitement asynchrone invoquera /api/inspection/chantier
    }

    return NextResponse.json({ status: "EVENT_RECEIVED" });
  } catch (err: any) {
    console.error("Erreur Webhook WhatsApp :", err);
    return NextResponse.json({ error: "Erreur serveur Webhook." }, { status: 500 });
  }
}
