#!/usr/bin/env python3
"""
init_building_ontology.py — Archi Cam AI Building & Construction Ontology
Initialise le graphe d'ontologie Neo4j pour la modélisation sémantique des bâtiments,
de la Mercuriale des Prix du Cameroun et des règles de sécurité BAEL.
"""

import os
import sys
import json
import logging
from pathlib import Path

try:
    from neo4j import GraphDatabase
except ImportError:
    print("⚠️ Module 'neo4j' non trouvé. Veuillez installer avec: pip install neo4j")
    sys.exit(1)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

# ─── Variables de Connexion ───────────────────────────────────────────────────
NEO4J_URI      = os.getenv("NEO4J_URI",      "bolt://127.0.0.1:7687")
NEO4J_USER     = os.getenv("NEO4J_USER",     "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "password123")

def get_driver():
    return GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))

# ─── Requetes Cypher Schema & Constraints ─────────────────────────────────────
CONSTRAINTS = [
    "CREATE CONSTRAINT IF NOT EXISTS FOR (e:Entity) REQUIRE e.id IS UNIQUE",
    "CREATE CONSTRAINT IF NOT EXISTS FOR (s:Storey) REQUIRE s.id IS UNIQUE",
    "CREATE CONSTRAINT IF NOT EXISTS FOR (m:Material) REQUIRE m.code IS UNIQUE",
    "CREATE CONSTRAINT IF NOT EXISTS FOR (p:PrixMercuriale) REQUIRE p.code IS UNIQUE",
    "CREATE CONSTRAINT IF NOT EXISTS FOR (n:NormeBAEL) REQUIRE n.article IS UNIQUE",
    "CREATE CONSTRAINT IF NOT EXISTS FOR (r:Role) REQUIRE r.name IS UNIQUE",
]

# ─── Requetes Cypher Ingestion Seed ───────────────────────────────────────────
SEED_CYPHER = """
// 1. Définition des Rôles ABAC
MERGE (r1:Role {name: 'INGENIEUR', level: 3, can_approve_devis: true})
MERGE (r2:Role {name: 'ARCHITECTE', level: 2, can_approve_devis: false})
MERGE (r3:Role {name: 'METREUR', level: 2, can_approve_devis: false})
MERGE (r4:Role {name: 'CLIENT', level: 1, can_approve_devis: false})

// 2. Définition des Matériaux & Prix Mercuriale du Cameroun (2026)
MERGE (m1:Material {code: 'MAT_BETON_350', name: 'Béton Armé dosé à 350 kg/m3', category: 'GROS_OEUVRE'})
  MERGE (p1:PrixMercuriale {code: 'MERC_BTP_001', region: 'CENTRE', unit: 'm3', price_xaf: 95000})
  MERGE (m1)-[:A_POUR_PRIX]->(p1)

MERGE (m2:Material {code: 'MAT_ACIER_HA', name: 'Acier Haute Adhérence FeE500', category: 'ARMATURES'})
  MERGE (p2:PrixMercuriale {code: 'MERC_BTP_002', region: 'CENTRE', unit: 'kg', price_xaf: 850})
  MERGE (m2)-[:A_POUR_PRIX]->(p2)

MERGE (m3:Material {code: 'MAT_MACONNERIE_15', name: 'Agglomérés creux de 15x20x40', category: 'MACONNERIE'})
  MERGE (p3:PrixMercuriale {code: 'MERC_BTP_003', region: 'CENTRE', unit: 'm2', price_xaf: 12500})
  MERGE (m3)-[:A_POUR_PRIX]->(p3)

MERGE (m4:Material {code: 'MAT_COFFRAGE', name: 'Coffrage en bois ordinaire', category: 'COFFRAGE'})
  MERGE (p4:PrixMercuriale {code: 'MERC_BTP_004', region: 'CENTRE', unit: 'm2', price_xaf: 7500})
  MERGE (m4)-[:A_POUR_PRIX]->(p4)

// 3. Normes BAEL 91 / Eurocode 2
MERGE (n1:NormeBAEL {
  article: 'BAEL_B.6.2',
  title: 'Ratio minimal d armatures longitudinales dans les poteaux',
  min_ratio_kg_m3: 80.0,
  max_ratio_kg_m3: 140.0,
  description: 'Le pourcentage minimal d armatures longitudinales dans les poteaux est de 0.8% de la section du béton.'
})

MERGE (n2:NormeBAEL {
  article: 'BAEL_A.4.3',
  title: 'Enrobage minimal des armatures en atmosphère agressive',
  min_enrobage_cm: 3.0,
  description: 'L enrobage minimal de toute armature doit être au moins égal à 3 cm pour les éléments exposés aux intempéries au Cameroun.'
})

// 4. Modèle d Ontologie Générique d un Bâtiment (Jumeau Numérique Type)
MERGE (b:Entity {id: 'BAT_MODEL_01', name: 'Projet Résidentiel Type Yaoundé', type: 'BUILDING'})
MERGE (s0:Storey {id: 'STOR_FOND', name: 'Fondations & Soubassement', level: -1})
MERGE (s1:Storey {id: 'STOR_RDC', name: 'Rez-de-Chaussée (RDC)', level: 0})
MERGE (s2:Storey {id: 'STOR_R1',  name: 'Premier Étage (R+1)', level: 1})

MERGE (b)-[:CONTIENT_NIVEAU]->(s0)
MERGE (b)-[:CONTIENT_NIVEAU]->(s1)
MERGE (b)-[:CONTIENT_NIVEAU]->(s2)

MERGE (s1)-[:EXIGE_MATERIAU]->(m1)
MERGE (s1)-[:EXIGE_MATERIAU]->(m2)
MERGE (s1)-[:SOUMIS_A]->(n1)
"""

def init_ontology():
    logging.info(f"🔗 Connexion au serveur Neo4j sur {NEO4J_URI}...")
    driver = get_driver()
    
    try:
        with driver.session() as session:
            # 1. Créer les contraintes
            logging.info("🔒 Création des contraintes d'unicité et d'index...")
            for query in CONSTRAINTS:
                try:
                    session.run(query)
                except Exception as e:
                    logging.warning(f"Note contrainte: {e}")
            
            # 2. Ingestion du schéma et des données de référence
            logging.info("🌱 Injection du graphe ontologique (Rôles, Matériaux, Mercuriale 2026, BAEL)...")
            session.run(SEED_CYPHER)
            logging.info("✅ Graphe d'ontologie initialisé avec succès dans Neo4j !")
            
    except Exception as err:
        logging.error(f"❌ Erreur d'initialisation Neo4j : {err}")
    finally:
        driver.close()

if __name__ == "__main__":
    init_ontology()
