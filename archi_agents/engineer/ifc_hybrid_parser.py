import sqlite3
import json
import os
import ifcopenshell
import ifcopenshell.util.element
import ifcopenshell.util.shape
import numpy as np

class IFCHybridParser:
    """
    Moteur d'extraction hybride déterministe (IfcLLM + MCP4IFC Standards 2026).
    Convertit un fichier IFC natif en :
    1. Une base relationnelle SQLite (Attributs, Psets, volumes, centroïdes) pour le SQL.
    2. Un graphe de topologie et d'adjacence spatiale basé sur le calcul d'intersections 3D réelles.
    """
    def __init__(self, ifc_path: str, db_dir: str = None):
        self.ifc_path = ifc_path
        if not os.path.exists(ifc_path):
            raise FileNotFoundError(f"Fichier IFC introuvable: {ifc_path}")
        
        self.model = ifcopenshell.open(ifc_path)
        self.db_dir = db_dir or os.path.dirname(ifc_path) or "."
        base_name = os.path.splitext(os.path.basename(ifc_path))[0]
        self.sqlite_path = os.path.join(self.db_dir, f"{base_name}_relational.db")
        self.graph_path = os.path.join(self.db_dir, f"{base_name}_graph.json")

    def build_relational_db(self):
        """Construit la base SQLite déterministe pour les requêtes de comptage et de propriétés."""
        conn = sqlite3.connect(self.sqlite_path)
        cursor = conn.cursor()

        # Table principale des éléments du bâtiment
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS building_elements (
                guid TEXT PRIMARY KEY,
                ifc_type TEXT NOT NULL,
                name TEXT,
                description TEXT,
                storey TEXT,
                volume REAL DEFAULT 0.0,
                area REAL DEFAULT 0.0,
                height REAL DEFAULT 0.0,
                bbox_min_x REAL, bbox_min_y REAL, bbox_min_z REAL,
                bbox_max_x REAL, bbox_max_y REAL, bbox_max_z REAL,
                psets_json TEXT
            )
        ''')

        # Nettoyage précédent si ré-exécution
        cursor.execute('DELETE FROM building_elements')

        for element in self.model.by_type("IfcProduct"):
            if not element.is_a("IfcElement") and not element.is_a("IfcSpace"):
                continue

            guid = element.GlobalId
            ifc_type = element.is_a()
            name = getattr(element, "Name", "") or ""
            desc = getattr(element, "Description", "") or ""

            # Extraction de l'étage (IfcBuildingStorey)
            storey = "Unassigned"
            if hasattr(element, "Decomposes") and element.Decomposes:
                for rel in element.Decomposes:
                    if rel.RelatingObject.is_a("IfcBuildingStorey"):
                        storey = rel.RelatingObject.Name
            elif hasattr(element, "ContainedInStructure") and element.ContainedInStructure:
                for rel in element.ContainedInStructure:
                    if rel.RelatingStructure.is_a("IfcBuildingStorey"):
                        storey = rel.RelatingStructure.Name

            # Quantités et Psets
            psets = ifcopenshell.util.element.get_psets(element)
            volume = 0.0
            area = 0.0
            height = 0.0

            if "BaseQuantities" in psets:
                bq = psets["BaseQuantities"]
                volume = float(bq.get("NetVolume", bq.get("GrossVolume", 0.0)))
                area = float(bq.get("NetSideArea", bq.get("GrossSideArea", bq.get("NetFloorArea", 0.0))))
                height = float(bq.get("Height", 0.0))

            # Géométrie englobante (Bounding Box 3D)
            bbox_min_x, bbox_min_y, bbox_min_z = 0.0, 0.0, 0.0
            bbox_max_x, bbox_max_y, bbox_max_z = 0.0, 0.0, 0.0
            try:
                shape = ifcopenshell.geom.create_shape(self.model, element)
                verts = shape.geometry.verts
                if verts:
                    xyz = np.array(verts).reshape(-1, 3)
                    bbox_min_x, bbox_min_y, bbox_min_z = map(float, xyz.min(axis=0))
                    bbox_max_x, bbox_max_y, bbox_max_z = map(float, xyz.max(axis=0))
            except Exception:
                pass # Éléments sans représentation 3D directe (ex: espaces abstraits)

            cursor.execute('''
                INSERT INTO building_elements 
                (guid, ifc_type, name, description, storey, volume, area, height,
                 bbox_min_x, bbox_min_y, bbox_min_z, bbox_max_x, bbox_max_y, bbox_max_z, psets_json)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (guid, ifc_type, name, desc, storey, volume, area, height,
                  bbox_min_x, bbox_min_y, bbox_min_z, bbox_max_x, bbox_max_y, bbox_max_z,
                  json.dumps(psets)))

        conn.commit()
        conn.close()
        return self.sqlite_path

    def build_topological_graph(self):
        """
        Construit le graphe d'adjacence spatiale déterministe (IfcLLM spatial derivation).
        Calcule les connexions réelles par chevauchement/intersection des boîtes 3D.
        """
        conn = sqlite3.connect(self.sqlite_path)
        cursor = conn.cursor()
        cursor.execute("SELECT guid, ifc_type, name, storey, bbox_min_x, bbox_min_y, bbox_min_z, bbox_max_x, bbox_max_y, bbox_max_z FROM building_elements")
        rows = cursor.fetchall()
        conn.close()

        nodes = []
        adjacencies = []

        elements = []
        for r in rows:
            elem = {
                "guid": r[0], "ifc_type": r[1], "name": r[2], "storey": r[3],
                "bbox_min": [r[4], r[5], r[6]], "bbox_max": [r[7], r[8], r[9]]
            }
            elements.append(elem)
            nodes.append({"id": elem["guid"], "labels": [elem["ifc_type"]], "properties": {"name": elem["name"], "storey": elem["storey"]}})

        # Calcul des intersections 3D pour dériver la vraie topologie spatiale
        num_elems = len(elements)
        for i in range(num_elems):
            e1 = elements[i]
            for j in range(i + 1, num_elems):
                e2 = elements[j]

                # Condition de chevauchement AABB (Axis-Aligned Bounding Box) avec tolérance 0.05m
                overlap_x = (e1["bbox_min"][0] <= e2["bbox_max"][0] + 0.05) and (e1["bbox_max"][0] >= e2["bbox_min"][0] - 0.05)
                overlap_y = (e1["bbox_min"][1] <= e2["bbox_max"][1] + 0.05) and (e1["bbox_max"][1] >= e2["bbox_min"][1] - 0.05)
                overlap_z = (e1["bbox_min"][2] <= e2["bbox_max"][2] + 0.05) and (e1["bbox_max"][2] >= e2["bbox_min"][2] - 0.05)

                if overlap_x and overlap_y and overlap_z:
                    adjacencies.append({
                        "source": e1["guid"],
                        "target": e2["guid"],
                        "type": "ADJACENT_TO"
                    })

        graph_data = {"nodes": nodes, "relationships": adjacencies}
        with open(self.graph_path, "w", encoding="utf-8") as f:
            json.dump(graph_data, f, indent=2)

        return self.graph_path

    def execute_sql_query(self, sql_query: str):
        """Exécute une requête SQL exacte sur la base relationnelle."""
        conn = sqlite3.connect(self.sqlite_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute(sql_query)
        results = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return results

    def query_graph_adjacencies(self, guid: str):
        """Exécute une recherche d'adjacence topologique dans le graphe."""
        if not os.path.exists(self.graph_path):
            self.build_topological_graph()
        with open(self.graph_path, "r", encoding="utf-8") as f:
            graph_data = json.load(f)

        connected_guids = []
        for rel in graph_data.get("relationships", []):
            if rel["source"] == guid:
                connected_guids.append(rel["target"])
            elif rel["target"] == guid:
                connected_guids.append(rel["source"])
        return connected_guids


# =============================================================================
# HELPER GÉOTECHNIQUE — Paramètres sols LABOGENIE Cameroun
# =============================================================================

_SOIL_PARAMS_DB = {
    "Normal": {
        "contrainte_MPa": 0.20,
        "ancrage_cm": 80,
        "type_fondation": "Semelle Isolée",
        "majoration_acier_pct": 0.0,
        "enrobage_mm": 30,
    },
    "Argileux": {
        "contrainte_MPa": 0.12,
        "ancrage_cm": 120,
        "type_fondation": "Semelle Filante",
        "majoration_acier_pct": 15.0,
        "enrobage_mm": 35,
    },
    "Marécageux": {
        "contrainte_MPa": 0.07,
        "ancrage_cm": 200,
        "type_fondation": "Radier Général",
        "majoration_acier_pct": 20.0,
        "enrobage_mm": 40,
    },
    "Rocheux": {
        "contrainte_MPa": 0.40,
        "ancrage_cm": 60,
        "type_fondation": "Semelle Isolée Courte",
        "majoration_acier_pct": -5.0,
        "enrobage_mm": 30,
    },
}


def get_soil_params(type_sol: str) -> dict:
    """
    Retourne les paramètres géotechniques LABOGENIE pour un type de sol Camerounais.
    Utilisé par l'Orchestrateur Central pour paramétrer le dimensionnement BAEL 91.
    
    Args:
        type_sol: "Normal" | "Argileux" | "Marécageux" | "Rocheux"
    
    Returns:
        dict avec les clés : contrainte_MPa, ancrage_cm, type_fondation,
                             majoration_acier_pct, enrobage_mm
    """
    params = _SOIL_PARAMS_DB.get(type_sol, _SOIL_PARAMS_DB["Normal"])
    if type_sol not in _SOIL_PARAMS_DB:
        print(f"[GeoTechnique] ⚠️ Type de sol '{type_sol}' inconnu → utilisation de 'Normal' par défaut.")
    return params


if __name__ == "__main__":
    print("Moteur IFCHybridParser initialisé avec succès.")
    # Test get_soil_params
    for sol in ["Normal", "Marécageux", "Rocheux", "Inconnu"]:
        p = get_soil_params(sol)
        print(f"  Sol '{sol}': contrainte={p['contrainte_MPa']} MPa, fondation={p['type_fondation']}")
