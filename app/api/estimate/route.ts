import { NextRequest, NextResponse } from "next/server";
import { genkit, z } from "genkit";
import { googleAI } from "@genkit-ai/google-genai";
import { Pool } from "pg";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// ── Pool PostgreSQL partagé ─────────────────────────────────────────────────
const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://postgres:ArchiCamAI_2025_Secure_BIM!@127.0.0.1:5432/fdcdb";
const pool = new Pool({ connectionString: DATABASE_URL });

// ── Initialisation Genkit ───────────────────────────────────────────────────
const ai = genkit({ plugins: [googleAI()] });

// ── Schéma Zod de sortie ────────────────────────────────────────────────────
const EstimateLineSchema = z.object({
  code: z.string(),
  category: z.string(),
  label: z.string(),
  quantity: z.number(),
  unit: z.string(),
  unitPrice: z.number(),
  totalPrice: z.number(),
  justification: z.string().optional(),
});

const EstimateOutputSchema = z.object({
  lines: z.array(EstimateLineSchema),
  totalHT: z.number(),
  margeBET: z.number(),
  margeAleas: z.number(),
  tva: z.number(),
  totalTTC: z.number(),
  currency: z.literal("FCFA"),
  ragSources: z.array(z.string()).optional(),
  
  // ── Foster+Partners Standards : Analyse Carbone & Analyse Cycle de Vie (LCA) ──
  totalCarbonKgCO2: z.number().describe("Émissions totales de gaz à effet de serre en kg CO2eq"),
  carbonSavedKgCO2: z.number().describe("Émissions de CO2 évitées par rapport à une construction 100% béton classique"),
  
  // ── Scénarisation Éco-Bâtiment (B2B Multi-Scenario Optioning) ──
  scenarios: z.object({
    ecoLocalBasCarboneTTC: z.number().describe("Coût total TTC estimé en favorisant la terre stabilisée (BTC) et les matériaux locaux (FCFA)"),
    standardTTC: z.number().describe("Coût total TTC estimé en construction standard béton/agglos (FCFA)"),
    prestigeTTC: z.number().describe("Coût total TTC estimé avec finitions luxe et pierre de taille d'Edéa (FCFA)"),
  }),

  // ── Industrialisation BTP Cameroun : Surcharges & Pertes Réelles ──
  wasteFactorApplied: z.boolean().default(true).describe("Indique si les coefficients de perte et casse (5% à 10%) ont été appliqués aux quantités brutes"),
  logisticsSurchargePct: z.number().describe("Majoration logistique et météo (saison des pluies / terrain difficile) en %"),
  volatilityIndexSteel: z.number().describe("Coefficient d'indexation de la volatilité des aciers (K_volatilité)"),
  visaIngenieur: z.object({
    status: z.enum(["PENDING_ENGINEER_VISA", "CERTIFIED_ONIGC"]),
    certifiedBy: z.string().optional(),
    approvalTimestamp: z.string().optional(),
  }).describe("Statut de validation par un ingénieur agréé du Génie Civil")
});

// ── Helper : lire les prix de la mercuriale depuis PostgreSQL ───────────────
async function fetchMercurialeContext(ville: string): Promise<string> {
  try {
    const result = await pool.query(
      `SELECT designation, unite, prix_unitaire_fcfa, categorie
       FROM mercuriale_minmap
       WHERE LOWER(ville) = LOWER($1) OR ville = 'National'
       ORDER BY categorie, designation
       LIMIT 60`,
      [ville]
    );
    if (result.rows.length === 0) return "Aucun prix de mercuriale disponible.";
    const lines = result.rows
      .map(
        (r: any) =>
          `[${r.categorie}] ${r.designation} : ${r.prix_unitaire_fcfa} FCFA/${r.unite}`
      )
      .join("\n");
    return `### Prix Unitaires Officiels MINMAP 2026 (${ville}) :\n${lines}`;
  } catch {
    return "Base de prix MINMAP non disponible (PostgreSQL hors ligne).";
  }
}

// ── Helper : recherche RAG projets similaires ────────────────────────────────
async function fetchSimilarProjects(description: string): Promise<string> {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return "";

    const embRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "models/gemini-embedding-001",
          content: { parts: [{ text: description }] },
          outputDimensionality: 1536,
        }),
      }
    );
    if (!embRes.ok) return "";
    const embData = await embRes.json();
    const embedding: number[] = embData.embedding.values;
    const vectorStr = `[${embedding.join(",")}]`;

    const result = await pool.query(
      `SELECT project_name, summary, zone_climatique, type_de_sol, accessibilite,
              1 - (embedding <=> $1::vector) AS similarity
       FROM project_memory
       ORDER BY embedding <=> $1::vector
       LIMIT 3`,
      [vectorStr]
    );

    if (result.rows.length === 0) return "";

    const ragText = result.rows
      .map(
        (r: any) =>
          `• **${r.project_name}** (Pertinence: ${(r.similarity * 100).toFixed(1)}%) — Zone: ${r.zone_climatique}, Sol: ${r.type_de_sol}`
      )
      .join("\n");

    return `### Projets Historiques Similaires (RAG) :\n${ragText}`;
  } catch {
    return "";
  }
}

// ── Handler principal ────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      description,
      ville = "Yaounde",
      standing = "moyen",
      surface_m2,
    } = body;

    if (!description || description.trim().length < 10) {
      return NextResponse.json(
        {
          error:
            "La description du projet est trop courte (minimum 10 caractères).",
        },
        { status: 400 }
      );
    }

    // 1. Charger les contextes enrichissants en parallèle
    const [mercurialeCtx, ragCtx] = await Promise.all([
      fetchMercurialeContext(ville),
      fetchSimilarProjects(description),
    ]);

    const surfaceCtx = surface_m2
      ? `Surface habitable estimée par l'utilisateur : ${surface_m2} m²`
      : "Surface non précisée — estimer à partir de la description.";

    // 2. Appel Gemini avec sortie JSON structurée via schema Zod
    const { output } = await ai.generate({
      model: "googleai/gemini-2.5-flash",
      prompt: `Tu es un métreur-estimateur expert du BTP camerounais (Archi Cam AI).

Un client demande une estimation de construction. Génère un devis quantitatif estimatif (DQE) complet et structuré.

## Description du projet :
${description}

## Contexte :
- Ville : ${ville}
- Standing : ${standing}
- ${surfaceCtx}

## Base de Prix Officielle (utilise ces prix unitaires réels) :
${mercurialeCtx}

${ragCtx ? `## Référence Projets Similaires (pour calibrer les quantités) :\n${ragCtx}` : ""}

## Instructions de calcul :
1. Décompose le projet en lignes de métré réalistes (Gros Œuvre, Second Œuvre, Finitions, MEP).
2. Utilise OBLIGATOIREMENT les prix unitaires de la mercuriale MINMAP fournis ci-dessus quand ils sont disponibles.
3. Calcule les quantités de façon cohérente avec la surface et le type de projet.
4. Calcule margeBET = totalHT * 0.05, margeAleas = totalHT * 0.03, tva = (totalHT + margeBET + margeAleas) * 0.1925.
5. totalTTC = totalHT + margeBET + margeAleas + tva.
6. Exprime tous les montants en FCFA (nombres entiers).
7. Calcule l'empreinte carbone (LCA) :
   - Estime l'empreinte carbone classique (totalCarbonKgCO2) à environ 380 kg CO2eq par m² de surface pour une structure en béton classique.
   - Calcule les émissions évitées (carbonSavedKgCO2) en simulant l'utilisation de matériaux bas-carbone (BTC MIPROMALO, bois locaux) sur 40% du gros œuvre (ce qui évite environ 120 kg CO2eq par m²).
8. Calcule les trois scénarios budgétaires :
   - standardTTC doit être égal au totalTTC calculé.
   - ecoLocalBasCarboneTTC doit représenter une réduction de 20% à 25% du coût gros œuvre (utilisation de terre stabilisée et matériaux camerounais locaux).
   - prestigeTTC doit représenter une hausse de 35% à 50% du coût total en simulant des finitions de luxe (pierres d'Edéa polies, marbres et équipements haut de gamme).
9. Intègre les facteurs réels d'industrialisation BTP :
   - wasteFactorApplied = true (Application systématique de 8% de casse parpaings, 5% ciment, 10% chutes aciers).
   - logisticsSurchargePct = 5.0 (Majoration météo et accès).
   - volatilityIndexSteel = 1.04 (Indexation de la volatilité des marchés aciers).
   - visaIngenieur = { status: "PENDING_ENGINEER_VISA" }.`,
      output: { schema: EstimateOutputSchema },
    });

    if (!output) {
      return NextResponse.json(
        { error: "L'IA n'a pas pu produire une estimation structurée." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      estimate: output,
      meta: {
        ville,
        standing,
        surface_m2: surface_m2 || null,
        generatedAt: new Date().toISOString(),
        ragUsed: ragCtx.length > 0,
        mercurialeUsed: !mercurialeCtx.includes("non disponible"),
      },
    });
  } catch (error: any) {
    console.error("[/api/estimate] Erreur :", error);
    return NextResponse.json(
      { error: error.message || "Erreur interne lors de l'estimation." },
      { status: 500 }
    );
  }
}
