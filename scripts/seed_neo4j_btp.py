"""
🌱 Script de Peuplement Neo4j — BTP & Urbanisme Cameroun (Archi Cam AI)
=======================================================================
Lit le fichier neo4j_btp_schema.cypher et l'exécute dans Neo4j pour
initialiser le graphe de connaissances ontologique BTP.

Usage :
    cd archi-cameroun-ai
    python scripts/seed_neo4j_btp.py

Prérequis : Neo4j doit être démarré (Docker ou local, port 7687)
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(".env.local")

NEO4J_URI = os.environ.get("NEO4J_URI", "bolt://127.0.0.1:7687")
NEO4J_USER = os.environ.get("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.environ.get("NEO4J_PASSWORD", "password123")  # Valeur docker-compose.yml

SCHEMA_FILE = Path(__file__).parent.parent / "knowledge_base" / "neo4j_btp_schema.cypher"


def parse_cypher_statements(content: str) -> list[str]:
    """
    Découpe le fichier .cypher en instructions individuelles séparées par ';'.
    Ignore les commentaires Cypher (lignes commençant par //).
    """
    statements = []
    current = []

    for line in content.splitlines():
        stripped = line.strip()
        # Ignorer les commentaires
        if stripped.startswith("//") or stripped.startswith("/*") or stripped == "":
            continue
        current.append(line)
        if ";" in line:
            stmt = "\n".join(current).strip()
            # Nettoyer le ';' final pour l'exécution
            stmt = stmt.rstrip(";").strip()
            if stmt:
                statements.append(stmt)
            current = []

    return statements


def seed_neo4j():
    """
    Exécute les instructions Cypher du schéma BTP dans Neo4j.
    """
    print("=" * 60)
    print("🌱 SEED NEO4J — Graphe BTP Cameroun (Archi Cam AI)")
    print("=" * 60)
    print(f"📡 Connexion : {NEO4J_URI} (user: {NEO4J_USER})")
    print(f"📄 Schéma    : {SCHEMA_FILE}\n")

    if not SCHEMA_FILE.exists():
        print(f"❌ Fichier de schéma introuvable : {SCHEMA_FILE}")
        sys.exit(1)

    # Importer le driver Neo4j
    try:
        from neo4j import GraphDatabase
    except ImportError:
        print("❌ Le driver 'neo4j' n'est pas installé.")
        print("   Installation : pip install neo4j")
        sys.exit(1)

    # Charger et parser le fichier Cypher
    schema_content = SCHEMA_FILE.read_text(encoding="utf-8")
    statements = parse_cypher_statements(schema_content)
    print(f"📊 {len(statements)} instructions Cypher à exécuter...\n")

    # Connexion Neo4j
    try:
        driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
        driver.verify_connectivity()
        print("✅ Connexion Neo4j établie.\n")
    except Exception as e:
        print(f"❌ Impossible de se connecter à Neo4j : {e}")
        print("\n💡 Vérifiez que Neo4j est démarré :")
        print("   docker run -d --name neo4j-archi -p 7474:7474 -p 7687:7687 \\")
        print("     -e NEO4J_AUTH=neo4j/archi-cam-ai-neo4j neo4j:latest")
        sys.exit(1)

    # Exécution des instructions
    success_count = 0
    error_count = 0

    with driver.session() as session:
        for i, stmt in enumerate(statements, 1):
            try:
                result = session.run(stmt)
                result.consume()  # S'assurer que l'instruction est bien exécutée
                success_count += 1
                # Afficher la progression pour les grosses instructions
                if i % 10 == 0 or i <= 5:
                    first_line = stmt.split("\n")[0][:80]
                    print(f"  [{i:3d}/{len(statements)}] ✅ {first_line}...")
            except Exception as e:
                error_str = str(e)
                # Ignorer les erreurs de contraintes déjà existantes (idempotence)
                if "already exists" in error_str or "An equivalent constraint already exists" in error_str:
                    success_count += 1
                else:
                    error_count += 1
                    print(f"  [{i:3d}/{len(statements)}] ⚠️ Erreur : {error_str[:120]}")

    driver.close()

    # Résumé final
    print(f"\n{'='*60}")
    print(f"🎉 Seed Neo4j terminé !")
    print(f"   ✅ Succès : {success_count} instructions")
    print(f"   ❌ Erreurs : {error_count} instructions")
    print(f"{'='*60}")

    if error_count == 0:
        print("\n🕸️ Le graphe BTP Cameroun est prêt !")
        print(f"   → Ouvrir le navigateur : http://localhost:7474")
        print(f"   → Connexion : {NEO4J_USER} / {NEO4J_PASSWORD}")
        print(f"\n   Requêtes de vérification :")
        print(f"   MATCH (v:Ville) RETURN v.nom, v.zone_climatique;")
        print(f"   MATCH (z:ZoneUrbanistique)-[:APPLIQUE]->(r:ReglePOS) RETURN z.code, r.parametre, r.valeur LIMIT 10;")
        print(f"   MATCH (m:Materiau)-[:A_PRIX]->(p:PrixMercuriale) RETURN m.libelle, p.prix_FCFA, p.unite;")
    else:
        print(f"\n⚠️ {error_count} erreur(s) détectée(s). Vérifiez les logs ci-dessus.")


if __name__ == "__main__":
    seed_neo4j()
