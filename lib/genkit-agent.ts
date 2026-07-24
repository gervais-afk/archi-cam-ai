import { genkit, z } from "genkit";
import { googleAI } from "@genkit-ai/google-genai";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getDataConnect, connectDataConnectEmulator } from "firebase/data-connect";
import { getProjetDqe, connectorConfig } from "@/src/dataconnect-generated";
import { Pool } from "pg";
import { logEvent } from "./logger";

// Configuration du pool PostgreSQL pour le RAG (vector search local sur FDC)
const DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres:ArchiCamAI_2025_Secure_BIM!@127.0.0.1:5433/fdcdb";
const pool = new Pool({ connectionString: DATABASE_URL });

async function getGeminiEmbedding(text: string): Promise<number[]> {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY manquante");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${GEMINI_API_KEY}`;
  const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
          model: "models/gemini-embedding-001",
          content: { parts: [{ text }] },
          outputDimensionality: 1536
      })
  });
  if (!response.ok) throw new Error(`Gemini API error: ${response.statusText}`);
  const data = await response.json();
  return data.embedding.values;
}

// 1. Initialisation de Genkit avec le plugin Google Gen AI (Gemini)
const ai = genkit({
  plugins: [googleAI()],
});

// 2. Initialisation de Firebase & Data Connect côté serveur
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Singleton pour l'application Firebase
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const dcInstance = getDataConnect(app, connectorConfig);

// Connexion automatique à l'émulateur Data Connect (port 9399) si en développement
if (
  process.env.NODE_ENV === "development" ||
  process.env.FUNCTIONS_EMULATOR === "true" ||
  !process.env.VERCEL
) {
  try {
    connectDataConnectEmulator(dcInstance, "localhost", 9399);
    console.log("[Genkit Agent] Connecté à l'émulateur Data Connect sur le port 9399");
  } catch (err) {
    // Intercepte les erreurs de connexions multiples lors du rechargement à chaud
    console.debug("[Genkit Agent] Émulateur Data Connect déjà connecté ou erreur d'init.");
  }
}

// 3. Définition du Tool Genkit : consulter_dqe_tool
export const consulterDqeTool = ai.defineTool(
  {
    name: "consulter_dqe_tool",
    description:
      "Récupère et résume les lignes de Devis Quantitatif Estimatif (DQE) d'un projet de construction (BIM) via PostgreSQL. Renvoie les matériaux, quantités, prix unitaires, prix totaux HT et statuts (VALIDÉ, À CHIFFRER).",
    inputSchema: z.object({
      projectId: z.string().describe("L'UUID unique du projet à consulter"),
    }),
    outputSchema: z.string(),
  },
  async ({ projectId }) => {
    try {
      console.log(`[Genkit Tool] Requête DQE pour le projet ID: ${projectId}`);
      
      // Récupération des données via le SDK Data Connect généré
      const response = await getProjetDqe(dcInstance, { id: projectId });
      const projet = response.data?.projet;

      if (!projet) {
        return `Aucun projet trouvé avec l'identifiant unique (UUID) : ${projectId}`;
      }

      const devisDqes = projet.devisDqes_on_projet || [];
      if (devisDqes.length === 0) {
        return `Le projet "${projet.nomProjet}" existe mais ne contient aucune ligne de devis DQE.`;
      }

      // Calcul des totaux et synthèse
      const totalHT = devisDqes.reduce((acc, curr) => acc + (curr.prixTotalHt || 0), 0);
      const aChiffrerCount = devisDqes.filter((l) => l.statutPrix === "À CHIFFRER").length;

      let summary = `### Résumé du DQE pour le projet : ${projet.nomProjet}\n`;
      summary += `* Localisation : ${projet.localisation || "Non précisée"}\n`;
      summary += `* Budget Total Estimé HT : ${totalHT.toLocaleString("fr-FR")} FCFA\n`;
      summary += `* Lignes de devis nécessitant une saisie manuelle ('À CHIFFRER') : ${aChiffrerCount}\n\n`;
      summary += `#### Détail des Lignes de Devis (BIM/IFC):\n`;

      devisDqes.forEach((line) => {
        const nomMat = line.mercurialePrix?.nomMateriau || "Non associé (Inconnu)";
        const codeArt = line.mercurialePrix?.codeArticle || "N/A";
        const qty = line.quantiteFacturable?.toFixed(4) || "0.0000";
        const unit = line.mercurialePrix?.unite || "m3";
        const unitPrice = line.mercurialePrix?.prixTotalUnitaire || 0;
        const lineTotal = line.prixTotalHt || 0;
        const status = line.statutPrix || "À CHIFFRER";

        if (status === "À CHIFFRER") {
          summary += `- [⚠️ À CHIFFRER] Matériau (BIM): ${nomMat} | Quantité: ${qty} ${unit} | Prix U: À saisir | Total HT: À saisir (GUID IFC: ${line.ifcGuid})\n`;
        } else {
          summary += `- [✅ VALIDÉ] Matériau: ${nomMat} (Code: ${codeArt}) | Quantité: ${qty} ${unit} | Prix U: ${unitPrice.toLocaleString("fr-FR")} FCFA | Total HT: ${lineTotal.toLocaleString("fr-FR")} FCFA (GUID IFC: ${line.ifcGuid})\n`;
        }
      });

      return summary;
    } catch (error: any) {
      console.error("[Genkit Tool] Erreur critique lors de la consultation du DQE:", error);
      await logEvent({ level: 'error', event: 'system_error', message: 'Erreur consulter_dqe_tool', details: error.message });
      return `Une erreur technique est survenue lors de la récupération des données du devis : ${error.message}`;
    }
  }
);

// 3.5 Définition du Tool Genkit : search_similar_projects_tool (RAG)
export const searchSimilarProjectsTool = ai.defineTool(
  {
    name: "search_similar_projects_tool",
    description:
      "Recherche des projets de construction similaires dans la base de connaissances (RAG) en fonction d'une description. Renvoie l'historique des projets, le type de sol, la zone climatique et des informations pour fiabiliser le devis.",
    inputSchema: z.object({
      query: z.string().describe("Description du projet à chercher (ex: villa R+1 sur sol marécageux)"),
    }),
    outputSchema: z.string(),
  },
  async ({ query }) => {
    try {
      console.log(`[Genkit Tool] Recherche RAG pour: "${query}"`);
      const embedding = await getGeminiEmbedding(query);
      const vectorStr = `[${embedding.join(',')}]`;

      // Recherche cosine similarity en SQL via pgvector
      const result = await pool.query(`
        SELECT project_name, summary, zone_climatique, type_de_sol, accessibilite, 
               1 - (embedding <=> $1::vector) AS similarity
        FROM project_memory
        ORDER BY embedding <=> $1::vector
        LIMIT 3
      `, [vectorStr]);

      if (result.rows.length === 0) {
        return "Aucun projet historique similaire trouvé.";
      }

      let responseText = `### Projets Historiques Similaires Trouvés :\n\n`;
      result.rows.forEach(row => {
        const score = (row.similarity * 100).toFixed(1);
        responseText += `**${row.project_name}** (Pertinence: ${score}%)\n`;
        responseText += `- Zone: ${row.zone_climatique} | Sol: ${row.type_de_sol} | Accès: ${row.accessibilite}\n`;
        responseText += `- Détails: ${row.summary}\n\n`;
      });

      return responseText;
    } catch (error: any) {
      console.error("[Genkit Tool] Erreur lors de la recherche RAG:", error);
      await logEvent({ level: 'error', event: 'system_error', message: 'Erreur search_similar_projects_tool', details: error.message });
      return `Impossible d'effectuer la recherche historique pour le moment. Erreur technique.`;
    }
  }
);

// 4. Définition du Flow Genkit : agentConducteurTravaux
export const agentConducteurTravaux = ai.defineFlow(
  {
    name: "agentConducteurTravaux",
    inputSchema: z.object({
      projectId: z.string().describe("L'UUID unique du projet"),
      question: z.string().describe("La question posée par l'utilisateur au sujet du projet ou du devis"),
    }),
    outputSchema: z.string(),
  },
  async ({ projectId, question }) => {
    try {
      console.log(`[Genkit Agent] Appel de l'agent Conducteur de Travaux. Question: "${question}"`);

      // Lancement de la génération de texte avec Gemini et attribution du Tool
      const response = await ai.generate({
        model: "googleai/gemini-1.5-flash",
        prompt: `Tu es l'Agent Conducteur de Travaux de l'application Archi Cam AI. Ton rôle est de conseiller l'utilisateur sur la gestion de son chantier et de répondre précisément à ses questions sur le Devis Quantitatif Estimatif (DQE) du projet.
        
        Consignes :
        1. Utilise 'search_similar_projects_tool' pour trouver des projets similaires si la question porte sur une estimation ou des recommandations générales (ex: "villa R+1 sur sol marécageux").
        2. Utilise systématiquement ton outil 'consulter_dqe_tool' pour lire les lignes réelles du devis en base de données si l'utilisateur demande des infos sur son devis actuel.
        3. Analyse en détail les matériaux, les quantités, les prix unitaires et le statut de chiffrage.
        4. Identifie et alerte l'utilisateur sur les matériaux au statut 'À CHIFFRER' (fond jaune/rouge sur le frontend) car ils nécessitent une intervention manuelle (confiance de matching < 85%).
        5. Exprime toutes les valeurs financières en Francs CFA (FCFA) pour correspondre au marché camerounais.
        6. Sois très précis, structuré, et adopte un ton professionnel de conducteur de travaux/métreur expérimenté.

        ID du projet actuel : ${projectId}
        Question de l'utilisateur : ${question}`,
        tools: [consulterDqeTool, searchSimilarProjectsTool],
      });

      await logEvent({ level: 'info', event: 'agent_activity', message: 'L\'Agent a répondu à une question', details: { projectId, question } });

      return response.text;
    } catch (error: any) {
      console.error("[Genkit Agent] Erreur lors de la génération de la réponse:", error);
      await logEvent({ level: 'error', event: 'system_error', message: 'Erreur Agent Conducteur', details: error.message });
      return `Désolé, je rencontre une erreur lors de l'analyse de votre demande : ${error.message}`;
    }
  }
);
