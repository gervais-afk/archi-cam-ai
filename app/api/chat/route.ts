import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { projectId, message } = await req.json();

    if (!projectId || !message) {
      return Response.json({ error: "Missing projectId or message" }, { status: 400 });
    }

    // 1. Enregistrer le message de l'utilisateur en base de données
    const userMsgId = randomUUID();
    await prisma.$executeRawUnsafe(
      `INSERT INTO "chat_messages" ("id", "project_id", "sender", "text", "widget_type", "widget_data", "created_at")
       VALUES ($1, $2, $3, $4, NULL, NULL, NOW())`,
      userMsgId,
      projectId,
      "User",
      message
    );

    // 2. Logique de routage d'intention simplifiée (Multi-Agent Router)
    const lowerMsg = message.toLowerCase();
    let sender: "Router" | "Designer" | "Engineer" | "Metreur" | "Legal" = "Router";
    let text = "";
    let widgetType: string | null = null;
    let widgetData: any = null;

    if (
      lowerMsg.includes("devis") ||
      lowerMsg.includes("estimation") ||
      lowerMsg.includes("prix") ||
      lowerMsg.includes("budget") ||
      lowerMsg.includes("plomberie") ||
      lowerMsg.includes("sanitaire") ||
      lowerMsg.includes("coute") ||
      lowerMsg.includes("coût")
    ) {
      sender = "Metreur";
      text = "L'estimation du lot Plomberie-Sanitaire et Gros Œuvre a été mise à jour en appliquant la mercuriale officielle du MINMAP Cameroun. Les prix sont ajustables en temps réel ci-dessous :";
      widgetType = "DEVIS_TABLE";
      widgetData = {
        items: [
          { id: "p1", label: "Tuyaux PVC pression Ø32/40", costXAF: 420000 },
          { id: "p2", label: "Suppresseur + Cuve 500L", costXAF: 680000 },
          { id: "p3", label: "Main d'œuvre qualifiée", costXAF: 350000 }
        ],
        totalCostXAF: 1450000,
        currency: "FCFA"
      };
    } else if (
      lowerMsg.includes("ferraillage") ||
      lowerMsg.includes("poteau") ||
      lowerMsg.includes("semelle") ||
      lowerMsg.includes("armature") ||
      lowerMsg.includes("acier") ||
      lowerMsg.includes("béton") ||
      lowerMsg.includes("structure")
    ) {
      sender = "Engineer";
      text = "Le ferraillage longitudinal et transversal de l'élément structurel Poteau P1 a été dimensionné conformément aux directives BAEL 91 (Béton Armé aux États Limites). Vous pouvez visualiser et survoler les armatures :";
      widgetType = "STRUCTURAL_SCHEMA";
      widgetData = {
        elementName: "Poteau Principal P1",
        concreteVolumeM3: 0.36,
        steelWeightKg: 42.5,
        rebars: "4 HA 12 (longitudinal)",
        cadres: "HA 6 esp. 15cm (transversal)"
      };
    } else if (
      lowerMsg.includes("loi") ||
      lowerMsg.includes("réglement") ||
      lowerMsg.includes("scot") ||
      lowerMsg.includes("recul") ||
      lowerMsg.includes("cos") ||
      lowerMsg.includes("ces") ||
      lowerMsg.includes("urbanisme") ||
      lowerMsg.includes("hauteur") ||
      lowerMsg.includes("permis")
    ) {
      sender = "Legal";
      text = "L'analyse de conformité d'implantation du plan au sol a été confrontée aux arrêtés d'urbanisme locaux de la zone d'aménagement. Un problème d'alignement a été détecté :";
      widgetType = "LEGAL_RADAR";
      widgetData = {
        rules: [
          { id: "r1", name: "Emprise au Sol (CES)", measured: "45%", limit: "Max 50%", status: "safe", lawArticle: "Art. 12 - Loi d'orientation de l'Urbanisme au Cameroun." },
          { id: "r2", name: "Recul de voirie", measured: "3.5m", limit: "Min 5.0m", status: "danger", lawArticle: "Art. 8 - Décret d'implantation de Douala." },
          { id: "r3", name: "Hauteur maximale R+2", measured: "9m", limit: "Max 12m", status: "safe", lawArticle: "Art. 15 - Plan d'Occupation des Sols." }
        ],
        overallStatus: "danger",
        zoneCode: "Zone Résidentielle Dense Ua1 (Douala)"
      };
    } else {
      sender = "Router";
      text = "Bienvenue dans l'espace conseil collaboratif d'Archi Cam AI. Je peux vous orienter vers l'Ingénieur (pour le ferraillage/béton), le Métreur (devis/plomberie) ou le Juriste (règles de recul et d'urbanisme). Quelle est votre question ?";
    }

    // 3. Enregistrer le message de réponse de l'agent en base
    const agentMsgId = randomUUID();
    await prisma.$executeRawUnsafe(
      `INSERT INTO "chat_messages" ("id", "project_id", "sender", "text", "widget_type", "widget_data", "created_at")
       VALUES ($1, $2, $3, $4, $5, CAST($6 AS jsonb), NOW())`,
      agentMsgId,
      projectId,
      sender,
      text,
      widgetType,
      widgetData ? JSON.stringify(widgetData) : null
    );

    return Response.json({
      userMessage: { id: userMsgId, sender: "User", text: message, createdAt: new Date() },
      agentMessage: { id: agentMsgId, sender, text, widgetType, widgetData, createdAt: new Date() }
    });
  } catch (err: any) {
    console.error("[API Chat] Error:", err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
