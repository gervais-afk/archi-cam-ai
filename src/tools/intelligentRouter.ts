/**
 * intelligentRouter.ts — Archi Cam AI Agent Selection Matrix & Intelligent Router
 *
 * Analyse automatiquement l'intention et la complexité des requêtes utilisateurs
 * et sélectionne le ou les agents spécialistes appropriés sans commande manuelle.
 */

export interface AgentRoutingResult {
  selectedAgents: string[];
  primaryDomain: string;
  complexity: 'SIMPLE' | 'MODERATE' | 'COMPLEX';
  reasoning: string;
}

const DOMAIN_PATTERNS: Array<{
  domain: string;
  agent: string;
  keywords: string[];
}> = [
  {
    domain: 'METRE_ET_SURFACE',
    agent: 'agent-metreur',
    keywords: ['métré', 'metre', 'surface', 'volume', 'm²', 'm3', 'quantité', 'dqe', 'soubassement', 'dalle', 'surface hab']
  },
  {
    domain: 'DEVIS_ET_MERCURIALE',
    agent: 'agent-devis',
    keywords: ['devis', 'prix', 'coût', 'cout', 'budget', 'mercuriale', 'xaf', 'fcfa', 'argent', 'estimatif', 'décompte']
  },
  {
    domain: 'STRUCTURE_ET_BAEL',
    agent: 'agent-structure',
    keywords: ['bael', 'armature', 'poteau', 'poutre', 'semelle', 'acier', 'béton armé', 'kg/m3', 'compression', 'eurocode']
  },
  {
    domain: 'MAQUETTE_BIM_IFC',
    agent: 'agent-bim',
    keywords: ['ifc', 'bim', 'modèle 3d', 'maquette', 'threejs', 'storey', 'wall', 'slab', 'column', 'ifcelement']
  }
];

/**
 * Analyse le message de l'utilisateur et route automatiquement vers le bon agent.
 */
export function routeUserRequest(userMessage: string): AgentRoutingResult {
  const normalizedMsg = userMessage.toLowerCase();
  const matchedAgents = new Set<string>();
  const matchedDomains = new Set<string>();

  for (const item of DOMAIN_PATTERNS) {
    if (item.keywords.some(kw => normalizedMsg.includes(kw))) {
      matchedAgents.add(item.agent);
      matchedDomains.add(item.domain);
    }
  }

  const agentsList = Array.from(matchedAgents);
  const domainsList = Array.from(matchedDomains);

  if (agentsList.length === 0) {
    return {
      selectedAgents: ['agent-devis'],
      primaryDomain: 'GENERAL',
      complexity: 'SIMPLE',
      reasoning: 'Aucun mot-clé spécifique détecté, routage par défaut vers l\'agent Devis & Conseils.',
    };
  }

  if (agentsList.length === 1) {
    return {
      selectedAgents: agentsList,
      primaryDomain: domainsList[0],
      complexity: 'SIMPLE',
      reasoning: `Intention claire détectée pour le domaine ${domainsList[0]} → Routage vers @${agentsList[0]}.`,
    };
  }

  if (agentsList.length === 2) {
    return {
      selectedAgents: agentsList,
      primaryDomain: domainsList.join(' + '),
      complexity: 'MODERATE',
      reasoning: `Requête multi-domaine (${domainsList.join(', ')}) → Exécution combinée de @${agentsList.join(' et @')}.`,
    };
  }

  return {
    selectedAgents: ['orchestrator', ...agentsList],
    primaryDomain: 'COMPLEX_ENGINEERING',
    complexity: 'COMPLEX',
    reasoning: `Projet d'ingénierie complexe touchant plusieurs domaines → Orchestration globale par @orchestrator.`,
  };
}
