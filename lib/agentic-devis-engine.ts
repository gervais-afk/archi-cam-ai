import { genkit, z } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { createMcpClient } from '@genkit-ai/mcp';
import path from 'path';
import { readFile } from 'fs/promises';

// --- SCHÉMAS ZOD POUR LE DEVIS (Self-Healing) ---

export const EstimateLineSchema = z.object({
  code: z.string().describe("Code de la ligne (ex: GO-CIM)"),
  category: z.string().describe("Catégorie (Gros Œuvre, Second Œuvre)"),
  label: z.string().describe("Description détaillée de la ressource"),
  quantity: z.number().describe("Quantité exacte extraite ou calculée"),
  unit: z.string().describe("Unité de mesure (ex: Sac, m³, kg, m²)"),
  unitPrice: z.number().describe("Prix unitaire en FCFA"),
  totalPrice: z.number().describe("Prix total de la ligne en FCFA"),
  justification: z.string().optional().describe("Règle de calcul utilisée (ex: Volume béton 10m3 * 7 sacs)")
});

export const ProjectEstimateSchema = z.object({
  totalAmount: z.number(),
  currency: z.literal("FCFA"),
  lines: z.array(EstimateLineSchema),
  totalHT: z.number(),
  margeBET: z.number(),
  margeAleas: z.number(),
  tva: z.number(),
  totalTTC: z.number()
});

// --- INITIALISATION GENKIT ET DU CERVEAU ---

// Configuration de l'agent Genkit
export const ai = genkit({
  plugins: [googleAI()],
  model: 'googleai/gemini-2.5-flash', // Meilleur raisonnement, meme cout, API stable (juillet 2026)
});

// --- LE FLUX AGENTIQUE (FLOW) ---

export const generateAgenticEstimate = ai.defineFlow({
  name: "generateAgenticEstimate",
  inputSchema: z.object({
    ifcFilePath: z.string(),
    margeBetPct: z.number().default(5),
    margeAleasPct: z.number().default(3),
    ville: z.string().default("Yaounde"),
    standing: z.string().default("moyen")
  }),
  outputSchema: ProjectEstimateSchema,
}, async (input) => {
  
  // 1. Lire les règles OKF consolidées
  let okfContent = "";
  try {
    const okfPath = path.resolve(process.cwd(), "knowledge_base", "okf_gros_second_oeuvre.md");
    okfContent = await readFile(okfPath, "utf-8");
  } catch (err) {
    console.warn("⚠️ Impossible de lire l'OKF depuis le fichier, utilisation des ratios par défaut :", err);
  }

  // 2. Connexion Dynamique aux Muscles (Serveur Python MCP)
  const ifcMcpClient = await createMcpClient({
    name: "ifc-extractor",
    mcpServer: {
      command: "uv",
      args: ["run", path.resolve(process.cwd(), "fastmcp/main.py")]
    }
  });

  const mcpTools = await ifcMcpClient.getActiveTools(ai);
  
  // 3. Exécution du Prompt demandant à Gemini d'exécuter l'équipe CrewAI
  const response = await ai.generate({
    prompt: `Tu es l'Orchestrateur principal d'Archi Cam AI.
    Appelle obligatoirement l'outil 'run_architectural_crew' avec les arguments suivants :
    - filePath: "${input.ifcFilePath}"
    - promptContext: "Standing: ${input.standing}, Ville: ${input.ville}, Marges: BET ${input.margeBetPct}%, Aléas ${input.margeAleasPct}%"
    
    Une fois le résultat de l'outil reçu (qui est un objet JSON décrivant le devis), affiche-le mot à mot sans rien modifier ni ajouter d'autre texte.`,
    tools: mcpTools
  });
  
  console.log("⚡ [Genkit Orchestrateur] Réponse brute reçue de l'équipe CrewAI :", response.text);

  let parsedEstimate: any = null;
  const jsonRegex = /\{[\s\S]*\}/;
  const match = response.text.match(jsonRegex);
  if (match) {
    try {
      parsedEstimate = JSON.parse(match[0]);
    } catch (e) {
      console.error("❌ Erreur de parsing de la réponse CrewAI :", e);
    }
  }

  if (!parsedEstimate) {
    throw new Error("L'équipe d'agents CrewAI n'a pas pu renvoyer de devis structuré valide.");
  }

  return parsedEstimate;
});
