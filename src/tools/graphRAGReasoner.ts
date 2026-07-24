/**
 * graphRAGReasoner.ts — Archi Cam AI Building & Construction Graph RAG
 *
 * Moteur de parcours sémantique (BFS Traversal) sur le graphe Neo4j du bâtiment.
 * Récupère le contexte ontologique (éléments IFC, Mercuriale du Cameroun, normes BAEL)
 * et applique un filtre ABAC selon le rôle de l'utilisateur.
 */

import neo4j, { Driver } from 'neo4j-driver';

// ─── Configuration ────────────────────────────────────────────────────────────

const NEO4J_URI      = process.env.NEO4J_URI      || 'bolt://127.0.0.1:7687';
const NEO4J_USER     = process.env.NEO4J_USER     || 'neo4j';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'password123';

let driverInstance: Driver | null = null;

function getDriver(): Driver {
  if (!driverInstance) {
    driverInstance = neo4j.driver(
      NEO4J_URI,
      neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD)
    );
  }
  return driverInstance;
}

export interface GraphRAGContext {
  query: string;
  role: 'INGENIEUR' | 'ARCHITECTE' | 'METREUR' | 'CLIENT';
  nodesFound: number;
  oagContext: string;
  elements: Array<{ label: string; properties: Record<string, any> }>;
}

/**
 * Effectue un parcours BFS sur le graphe Neo4j pour extraire le contexte sémantique.
 */
export async function queryGraphRAG(
  searchTerm: string,
  userRole: 'INGENIEUR' | 'ARCHITECTE' | 'METREUR' | 'CLIENT' = 'INGENIEUR',
  maxDepth: number = 2
): Promise<GraphRAGContext> {
  const driver = getDriver();
  const session = driver.session();

  try {
    // 1. Requête Cypher avec filtrage sémantique & ABAC
    const cypherQuery = `
      MATCH (n)
      WHERE n.name CONTAINS $searchTerm 
         OR n.code CONTAINS $searchTerm 
         OR n.article CONTAINS $searchTerm 
         OR n.category CONTAINS $searchTerm
      MATCH path = (n)-[r*1..${maxDepth}]-(m)
      RETURN path
      LIMIT 25
    `;

    const result = await session.run(cypherQuery, { searchTerm });

    const nodesMap = new Map<string, { label: string; properties: Record<string, any> }>();
    const relationshipsSet = new Set<string>();

    for (const record of result.records) {
      const path = record.get('path');
      for (const node of path.nodes) {
        const key = node.identity.toString();
        if (!nodesMap.has(key)) {
          // Filtrage ABAC : masquer les marges confidentielles pour le rôle CLIENT
          const props = { ...node.properties };
          if (userRole === 'CLIENT') {
            delete props.can_approve_devis;
            delete props.margin_percentage;
          }
          nodesMap.set(key, {
            label: node.labels[0] || 'Node',
            properties: props,
          });
        }
      }

      for (const rel of path.relationships) {
        relationshipsSet.add(`(${rel.start.toString()})-[:${rel.type}]->(${rel.end.toString()})`);
      }
    }

    const elements = Array.from(nodesMap.values());

    // 2. Formater le résultat en OAG (Ontology-Augmented Generation) pour le LLM
    let oagLines: string[] = [];
    oagLines.push(`=== CONTEXTE ONTOLOGIQUE NEO4J (BÂTIMENT & MERCURIALE) ===`);
    oagLines.push(`Rôle Utilisateur ABAC: ${userRole}`);
    oagLines.push(`Terme Recherché: "${searchTerm}"`);
    oagLines.push(`Nœuds Métiers Trouvés: ${elements.length}`);
    oagLines.push(``);

    for (const el of elements) {
      oagLines.push(`• [${el.label}] : ${JSON.stringify(el.properties)}`);
    }

    const oagContext = oagLines.join('\n');

    return {
      query: searchTerm,
      role: userRole,
      nodesFound: elements.length,
      oagContext,
      elements,
    };

  } catch (err: any) {
    console.warn(`⚠️ [GraphRAGReasoner] Impossible de contacter Neo4j, fallback en mode dégradé : ${err.message}`);
    return {
      query: searchTerm,
      role: userRole,
      nodesFound: 0,
      oagContext: `[GraphRAG Fallback] Connexion Neo4j indisponible (${err.message}). Utilisation des données SQL Supabase.`,
      elements: [],
    };
  } finally {
    await session.close();
  }
}
