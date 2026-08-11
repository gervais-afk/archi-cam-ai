import numpy as np
from typing import List, Dict, Any

class AdjacencyGraphBuilder:
    """
    Générateur du Graphe d'Adjacence Topologique Dual (Rooms Dual Graph) & Export Neo4j Cypher
    """

    @staticmethod
    def build_graph(rooms: List[Dict[str, Any]], openings: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Construit le graphe G=(V,E) où V=Pièces et E=Ouvertures/Connexions.
        """
        nodes = []
        edges = []
        cypher_queries = []

        for r in rooms:
            node_id = f"room_{r.get('id', 'unk')}"
            room_type = r.get("type", "UNKNOWN")
            area_m2 = r.get("area_m2", 0.0)
            nodes.append({
                "id": node_id,
                "type": room_type,
                "area_m2": area_m2,
                "centroid": r.get("centroid", [0, 0])
            })
            cypher_queries.append(
                f"MERGE (r:{room_type} {{id: '{node_id}', area_m2: {area_m2}}})"
            )

        # Déterminer les pièces adjacentes partageant une ouverture ou une frontière
        num_rooms = len(rooms)
        for i in range(num_rooms):
            for j in range(i + 1, num_rooms):
                r1 = rooms[i]
                r2 = rooms[j]
                
                # Calculer la distance entre centroïdes
                c1 = np.array(r1.get("centroid", [0, 0]))
                c2 = np.array(r2.get("centroid", [0, 0]))
                dist = np.linalg.norm(c1 - c2)

                # Si deux pièces sont proches (< 350px), vérifier s'il existe une ouverture liante
                if dist < 350:
                    connecting_opening = None
                    for op in openings:
                        op_c = np.array(op.get("centroid", [0, 0]))
                        dist1 = np.linalg.norm(c1 - op_c)
                        dist2 = np.linalg.norm(c2 - op_c)
                        if dist1 < 200 and dist2 < 200:
                            connecting_opening = op
                            break

                    if connecting_opening:
                        edge_id = f"edge_{r1.get('id')}_{r2.get('id')}"
                        edges.append({
                            "id": edge_id,
                            "source": f"room_{r1.get('id')}",
                            "target": f"room_{r2.get('id')}",
                            "connection_type": connecting_opening["type"],
                            "passage_width_cm": connecting_opening.get("width_cm", 90)
                        })
                        cypher_queries.append(
                            f"MATCH (r1 {{id: 'room_{r1.get('id')}'}}), (r2 {{id: 'room_{r2.get('id')}'}}) "
                            f"MERGE (r1)-[:CONNECTED_VIA {{type: '{connecting_opening['type']}'}}]->(r2)"
                        )

        return {
            "node_count": len(nodes),
            "edge_count": len(edges),
            "nodes": nodes,
            "edges": edges,
            "cypher_queries": cypher_queries
        }
