import sys
import json

class IFCToNeo4jLoader:
    """
    Charge la structure porteuse IFC dans la base orientée graphes Neo4j
    """
    
    def __init__(self, neo4j_uri: str, user: str, password: str):
        self.uri = neo4j_uri
        self.user = user
        self.password = password
        self.connected = False
        
        # Tentative de chargement du driver neo4j
        try:
            from neo4j import GraphDatabase
            self.driver = GraphDatabase.driver(self.uri, auth=(self.user, self.password))
            # Test simple de connexion
            self.driver.verify_connectivity()
            self.connected = True
            print("🚀 Connexion réussie à la base orientée graphes Neo4j")
        except Exception as e:
            print(f"⚠️ Connexion Neo4j non disponible ({str(e)}). Utilisation du mode simulation.")
            
    def load_ifc_structure(self, quantities: dict):
        """
        Crée les nœuds et les relations structurelles (supports) dans Neo4j
        """
        if not self.connected:
            print("🎮 [Simulation] Création des nœuds Mur, Dalle et Poteau dans le graphe Neo4j...")
            for wall in quantities.get('walls', []):
                print(f"  ├─ Nœud Mur créé : id={wall['id']}, name={wall['name']}, volume={wall['volume']}m³")
            for column in quantities.get('columns', []):
                print(f"  ├─ Nœud Poteau créé : id={column['id']}, name={column['name']}, hauteur={column['height']}m")
            for slab in quantities.get('slabs', []):
                print(f"  ├─ Nœud Dalle créé : id={slab['id']}, name={slab['name']}, type={slab['type']}")
                
            print("  └─ Relation (:Wall)-[:SUPPORTS]->(:Slab) créée pour wall_01 -> slab_01")
            print("✅ Structure IFC chargée avec succès (simulation)")
            return
            
        try:
            with self.driver.session() as session:
                # 1. Créer les nœuds de murs
                for wall in quantities.get('walls', []):
                    session.run("""
                        MERGE (w:Wall {id: $id})
                        SET w.name = $name,
                            w.thickness = $thickness,
                            w.is_load_bearing = $is_load_bearing,
                            w.volume = $volume
                    """, wall)
                
                # 2. Créer les nœuds de poteaux (columns)
                for column in quantities.get('columns', []):
                    session.run("""
                        MERGE (c:Column {id: $id})
                        SET c.name = $name,
                            c.height = $height,
                            c.section_width = $section_width
                    """, column)
                    
                # 3. Créer les nœuds de dalles (slabs)
                for slab in quantities.get('slabs', []):
                    session.run("""
                        MERGE (s:Slab {id: $id})
                        SET s.name = $name,
                            s.type = $type
                    """, slab)
                
                # 4. Créer les relations de supportage (Wall supports Slab)
                for wall in quantities.get('walls', []):
                    if wall.get('supports_slab_id'):
                        session.run("""
                            MATCH (w:Wall {id: $wall_id})
                            MATCH (s:Slab {id: $slab_id})
                            MERGE (w)-[:SUPPORTS]->(s)
                        """, {
                            "wall_id": wall['id'],
                            "slab_id": wall['supports_slab_id']
                        })
                        
            print("✅ Structure IFC chargée dans Neo4j")
        except Exception as err:
            print(f"❌ Échec de l'écriture Cypher dans Neo4j : {str(err)}")
            
    def close(self):
        if self.connected:
            self.driver.close()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python ifc_to_neo4j.py '<quantities_json_string>' [neo4j_uri] [user] [password]")
        sys.exit(1)
        
    quantities_data = json.loads(sys.argv[1])
    uri = sys.argv[2] if len(sys.argv) > 2 else "bolt://localhost:7687"
    user = sys.argv[3] if len(sys.argv) > 3 else "neo4j"
    pwd = sys.argv[4] if len(sys.argv) > 4 else "password"
    
    loader = IFCToNeo4jLoader(uri, user, pwd)
    loader.load_ifc_structure(quantities_data)
    loader.close()
