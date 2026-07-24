import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { verifyFirebaseToken } from "@/lib/firebase-server";

const geminiApiKey = process.env.GEMINI_API_KEY || "";

// Define System Prompts matching ADK configurations
const AGENT_SYSTEM_PROMPTS: Record<string, string> = {
  router: `Tu es le Routeur Général d'Archi Cam AI. Ton rôle est d'accueillir chaleureusement l'utilisateur, de comprendre son projet de construction ou d'urbanisme au Cameroun, et de l'orienter vers l'agent spécialiste approprié si sa question demande une expertise technique ou juridique poussée.
  
  TES AGENTS SPÉCIALISTES :
  - ⚖️ **Agent Legal** : Pour tout ce qui touche à la Loi d'urbanisme 2004/003, permis de bâtir, titres fonciers et certificat d'urbanisme.
  - 🏗️ **Agent Engineer** : Pour les questions de calculs de structure, ferraillage, dosage béton, Eurocode 2 et analyse de maquettes IFC/BIM.
  - 📐 **Agent Designer** : Pour l'architecture tropicale, les plans PDF, les rendus 3D et les estimations budgétaires globales.
  - 🔍 **Agent Researcher** : Pour le suivi en direct des prix du marché des matériaux locaux (Ciment, Sable, Gravier, Acier).

  TON STYLE : Très accueillant, professionnel, clair et structuré. Fais briller l'écosystème Archi Cam AI !`,

  legal: `Tu es l'Agent Juridique d'Archi Cam AI. Ton expertise porte sur la Loi n° 2004/003 du 21 avril 2004 régissant l'urbanisme au Cameroun et toutes les procédures de délivrance du permis de construire (Mairie et Communauté Urbaine).
  
  TES RESPONSABILITÉS :
  1. Générer la liste des pièces nécessaires pour le dossier de permis de construire (DPC) au Cameroun.
  2. Expliquer les étapes administratives au niveau local (Yaoundé, Douala, etc.).
  3. Conseiller sur la sécurisation foncière (titre foncier, certificat d'urbanisme, bail emphytéotique).
  4. Identifier les risques de construction (zones marécageuses, emprises routières, non-aedificandi).

  TON STYLE : Formel, extrêmement précis, rassurant, et très rigoureux sur les articles de la loi camerounaise. Cite la loi n° 2004/003 quand c'est pertinent.`,

  engineer: `Tu es l'Agent Engineer d'Archi Cam AI. Ton rôle est d'apporter l'expertise technique et structurelle aux chantiers et conceptions. Tu maîtrises le calcul de structure en béton armé (Eurocodes adaptés au climat tropical) et la lecture de maquettes BIM (format IFC).
 
  TES RESPONSABILITÉS :
  1. Analyser la solidité et le ferraillage des poteaux, poutres et dalles.
  2. Fournir des recommandations sur le dosage du béton (ex: 350 kg/m³ pour dalles) et le temps de cure.
  3. Expliquer le rôle de l'enrobage selon l'exposition climatique (climat côtier Douala vs continental Yaoundé).
  4. Interpréter les études de sol et sondages géotechniques (LABOGENIE).
  5. Utiliser impérativement les règles de l'OKF (Object Knowledge Framework) fournies dans le contexte RAG pour calculer les décompositions de dosages de béton (ciment, sable, gravier, acier).

  TON STYLE : Technique, rigoureux, précis, axé sur la sécurité structurelle et les chiffres concrets.`,

  designer: `Tu es l'Agent Designer d'Archi Cam AI. Ton expertise s'exprime dans la conception architecturale tropicale, l'optimisation fonctionnelle d'espace et l'estimation budgétaire globale du projet de construction au Cameroun.

  TES RESPONSABILITÉS :
  1. Analyser et interpréter les pièces et surfaces à partir d'un plan d'architecte.
  2. Conseiller sur la ventilation naturelle croisée, l'orientation solaire et la réduction de la chaleur en région équatoriale.
  3. Proposer des concepts alliant modernité et matériaux locaux (briques de terre stabilisée BTS, bois local, latérite).
  4. Fournir une estimation globale cohérente du projet en Francs CFA (FCFA) selon le standing choisi (économique, moyen standing, standing de luxe).

  TON STYLE : Créatif, inspirant, tourné vers le développement durable, et très au fait des réalités concrètes et coûts réels du BTP au Cameroun.`,

  researcher: `Tu es l'Agent Researcher d'Archi Cam AI. Ta mission est d'assurer la veille économique sur les prix réels des matériaux de construction locaux et la synchronisation avec la Mercuriale nationale.

  TES RESPONSABILITÉS :
  1. Donner les prix du marché à Yaoundé, Douala ou Bafoussam pour le ciment (CPJ 32.5, CPJ 42.5), le sable de la Sanaga, le gravier concassé, le fer à béton et les parpaings vibrés.
  2. Analyser les tendances de coûts et les hausses d'inflation des matériaux de construction.
  3. Expliquer comment optimiser les approvisionnements en matériaux de qualité pour éviter les contrefaçons.
  4. Se baser sur la structure de prix (Mercuriale) définie dans l'OKF pour garantir la cohérence des estimations de coûts.

  TON STYLE : Analytique, précis, axé sur les chiffres officiels et récents du marché camerounais.`,

  commercial: `Tu es l'Agent Commercial d'Archi Cam AI. Ton domaine d'expertise couvre l'optimisation budgétaire, la négociation de devis B2B, les remises fournisseurs (ex: Dangote, Cimencam) pour les achats de matériaux en gros, et la maximisation du retour sur investissement immobilier au Cameroun.
  
  TES RESPONSABILITÉS :
  1. Analyser et proposer des stratégies de réduction de coût (compromis matériaux, alternatives de standing).
  2. Négocier virtuellement des remises fournisseurs en fonction des volumes de commande (ex: ciment par tonne, fer à béton par lot).
  3. Suggérer des échelonnements de paiement réalistes et des structures de trésorerie pour les phases de chantier.
  4. Répondre aux questions de marge BET, d'aléas de chantier, et aider le client à optimiser son devis DQE.

  TON STYLE : Très axé business, diplomate, persuasif, stratégique, axé sur les économies de coûts et le rapport qualité/prix.`
};

export async function POST(req: NextRequest) {
  try {
    const firebaseToken = req.cookies.get("firebaseToken")?.value;
    const user = await verifyFirebaseToken(firebaseToken || "");
    const bypassAuth = process.env.NEXT_PUBLIC_BYPASS_AUTH === 'true';

    if (!user && !bypassAuth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { message, agent = "router", history = [], model = "gemini-1.5-flash", attachment, projectId } = await req.json();

    if (!message && !attachment) {
      return NextResponse.json({ error: "Message or attachment is required" }, { status: 400 });
    }

    if (agent === "conducteur") {
      const { agentConducteurTravaux } = await import("@/lib/genkit-agent");
      const answer = await agentConducteurTravaux({
        projectId: projectId || "demo-project",
        question: message || ""
      });
      return NextResponse.json({
        content: answer,
        agent,
        sources: [],
        usedRAG: true,
        model: "gemini-1.5-flash"
      });
    }

    if (!geminiApiKey) {
      return NextResponse.json({ error: "Gemini API key is not configured inside .env.local" }, { status: 500 });
    }

    console.log(`[RAG API] Vectorizing user query for agent: ${agent}`);

    // 1. Generate 1536-D Vector Embedding of user query
    let embedding: number[] = [];
    try {
      const embedRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${geminiApiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: {
              parts: [{ text: message || "Analyse l'image" }]
            },
            outputDimensionality: 1536
          })
        }
      );

      if (!embedRes.ok) {
        throw new Error(`Embedding API returned status ${embedRes.status}`);
      }

      const embedJson = await embedRes.json();
      embedding = embedJson.embedding?.values || [];
    } catch (err) {
      console.error("[RAG API] Error generating embedding:", err);
    }

    // 2. Perform sessional vector match inside local PostgreSQL (using pgvector)
    let contextChunks: any[] = [];
    let usedRAG = false;

    if (embedding.length === 1536) {
      try {
        console.log("[RAG API] Querying local PostgreSQL via cosine similarity...");
        const embeddingStr = `[${embedding.join(",")}]`;
        const dbResult = await query(
          `SELECT content, metadata, (1 - (embedding <=> $1::vector)) AS similarity
           FROM knowledge_base
           WHERE (1 - (embedding <=> $1::vector)) >= $2
           ORDER BY similarity DESC
           LIMIT $3`,
          [embeddingStr, 0.25, 4]
        );

        if (dbResult.rows && dbResult.rows.length > 0) {
          contextChunks = dbResult.rows;
          usedRAG = true;
          console.log(`[RAG API] Successfully found ${dbResult.rows.length} relevant RAG chunks`);
        }
      } catch (err: any) {
        console.warn("[RAG API] Cosine similarity query failed. Falling back to plain select...", err.message || err);
        // Fallback: select most recent knowledge chunks
        try {
          const dbResult = await query("SELECT content, metadata FROM knowledge_base LIMIT 3");
          if (dbResult.rows && dbResult.rows.length > 0) {
            contextChunks = dbResult.rows.map(chunk => ({
              content: chunk.content,
              metadata: chunk.metadata,
              similarity: 1.0
            }));
            usedRAG = true;
          }
        } catch (fallbackErr) {
          console.error("[RAG API] Fallback select failed:", fallbackErr);
        }
      }
    }

    // 3. Format RAG Context String
    let contextString = "";
    const sources: Array<{ document: string; similarity: number }> = [];

    if (contextChunks.length > 0) {
      contextString = "\n\n=== CONTEXTE DE LA BASE DE CONNAISSANCES LOCALE (RAG Cameroun BTP & Lois) ===\n";
      contextChunks.forEach((chunk, index) => {
        const docName = chunk.metadata?.document_name || "Document Local";
        const simPercent = chunk.similarity ? Math.round(chunk.similarity * 100) : 100;
        
        contextString += `\n[Extrait de : ${docName} (Confiance: ${simPercent}%)]\n${chunk.content}\n`;
        
        // Track sources to return to client
        if (!sources.some(s => s.document === docName)) {
          sources.push({ document: docName, similarity: chunk.similarity || 1.0 });
        }
      });
      contextString += "\n=== FIN DU CONTEXTE LOCAL ===\n";
    }

    // 4. Formulate System Prompt with ADK Profile & Context
    const basePrompt = AGENT_SYSTEM_PROMPTS[agent] || AGENT_SYSTEM_PROMPTS.router;
    const finalSystemPrompt = `${basePrompt}${contextString}
    
    CONSIGNES CRITIQUES :
    - Utilise le contexte local RAG ci-dessus pour répondre de façon extrêmement précise et documentée.
    - Sois honnête : si l'information ne figure pas dans le contexte ou tes connaissances générales, précise-le, mais apporte un conseil d'expert adapté.
    - Toutes les valeurs monétaires doivent être exprimées en Francs CFA (FCFA) pour le marché camerounais.
    - Réponds en français de façon élégante, claire et structurée.
    - IMPORTANT : Lorsque tu présentes des chiffres, des grilles de prix ou des décompositions de matériaux, structure-les impérativement dans un tableau Markdown clair.
    
    ACTIONS AGENTIQUES DU DEV-ENGINE :
    Si l'utilisateur te demande de modifier/ajuster/changer un prix unitaire, une quantité d'un matériau ou la surface de son projet dans le devis ou la note d'analyse, tu dois obligatoirement inclure à la toute fin de ta réponse un bloc JSON brut au format exact suivant, encapsulé dans un bloc markdown json :
    \`\`\`json
    {
      "action": "update_devis_price" | "update_devis_quantity" | "update_surface_area",
      "params": {
        "item": "Nom ou mot-clé de l'élément (ex: ciment, carrelage, parpaing...)",
        "value": nombre_entier
      }
    }
    \`\`\`
    
    ACTIONS AGENTIQUES BASE DE DONNÉES (POSTGRESQL) :
    Si l'utilisateur te demande explicitement de modifier la base de données de son projet actuel (ex: changer le nom du projet, modifier la marge d'aléas, les frais généraux, ou la localisation), tu dois obligatoirement inclure un bloc JSON au format exact suivant à la fin de ta réponse :
    \`\`\`json
    {
      "action": "update_supabase_record",
      "params": {
        "table": "projets",
        "updates": {
          "nom_projet": "Nouveau nom",
          "frais_generaux_pct": 25.0
        }
      }
    }
    \`\`\`
    Réponds toujours de manière professionnelle pour confirmer l'action entreprise.`;

    // 5. Structure Conversation Payload for Gemini API
    const contentsArray: any[] = [];
    
    // Add history in standard user/model format
    if (history && history.length > 0) {
      history.forEach((msg: any) => {
        contentsArray.push({
          role: msg.role === "user" ? "user" : "model",
          parts: [{ text: msg.content }]
        });
      });
    }

    // Add current user message
    const currentUserParts: any[] = [];
    if (attachment) {
      currentUserParts.push({
        inlineData: {
          mimeType: attachment.mimeType,
          data: attachment.data
        }
      });
    }
    if (message) {
      currentUserParts.push({ text: message });
    }

    contentsArray.push({
      role: "user",
      parts: currentUserParts
    });

    // Enforce an actual multimodal model for safety
    const apiModel = "gemini-1.5-flash";
    console.log(`[RAG API] Initiating content generation with ${apiModel}...`);

    // 6. Request Gemini content generation
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${apiModel}:generateContent?key=${geminiApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: finalSystemPrompt }]
          },
          contents: contentsArray,
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 2048
          }
        })
      }
    );

    if (!geminiRes.ok) {
      const errorText = await geminiRes.text();
      throw new Error(`Gemini API returned status ${geminiRes.status}: ${errorText}`);
    }

    const geminiJson = await geminiRes.json();
    const assistantResponse = geminiJson.candidates?.[0]?.content?.parts?.[0]?.text || "Désolé, je n'ai pas pu formuler de réponse.";

    console.log("[RAG API] Successfully generated assistant response.");

    // 7. Backend execution of Database modification if detected
    const jsonBlockRegex = /```json\s*([\s\S]*?)\s*```/;
    const match = jsonBlockRegex.exec(assistantResponse);
    if (match) {
      try {
        const parsedAction = JSON.parse(match[1].trim());
        if (parsedAction && parsedAction.action === "update_supabase_record") {
          console.log("[RAG API] Backend executing database action:", parsedAction);
          const table = parsedAction.params.table;
          const updates = parsedAction.params.updates;
          
          if (table === "projets") {
             const columnMapping: Record<string, string> = {
               nom_projet: "nom_projet",
               nomProjet: "nom_projet",
               frais_generaux_pct: "frais_generaux_pct",
               fraisGenerauxPct: "frais_generaux_pct",
               localisation: "localisation",
               marge_aleas_pct: "marge_aleas_pct",
               margeAleasPct: "marge_aleas_pct"
             };
             
             const pgUpdates: string[] = [];
             const pgParams: any[] = [];
             let paramIdx = 1;
             
             Object.keys(updates).forEach(key => {
               const pgCol = columnMapping[key] || key;
               pgUpdates.push(`${pgCol} = $${paramIdx++}`);
               pgParams.push(updates[key]);
             });
             
             if (pgUpdates.length > 0) {
               pgParams.push(projectId || "demo-project");
               await query(
                 `UPDATE projets SET ${pgUpdates.join(", ")} WHERE id = $${paramIdx}`,
                 pgParams
               );
               console.log("[RAG API] Local SQL database successfully updated by Agent.");
             }
          }
        }
      } catch (parseErr) {
        console.warn("[RAG API] Failed to parse JSON block or execute database update");
      }
    }

    return NextResponse.json({
      content: assistantResponse,
      agent,
      sources,
      usedRAG,
      model
    });

  } catch (error: any) {
    console.error("[RAG API] Critical error in /api/chat:", error);
    return NextResponse.json(
      { error: "Une erreur interne est survenue lors du traitement de votre requête.", details: error.message },
      { status: 500 }
    );
  }
}
