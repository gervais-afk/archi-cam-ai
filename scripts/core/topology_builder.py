import math
from typing import List, Dict, Any, Tuple
import shapely.geometry as geom
from shapely.ops import polygonize, unary_union, linemerge, snap as shapely_snap

class ArchitecturalTopologist:
    def __init__(self, mlsd_lines: List[List[float]], yolo_symbols: List[Dict], ocr_texts: List[Dict]):
        """
        Initialise le VIM avec les 3 flux de perception.
        mlsd_lines: Liste de [x1, y1, x2, y2]
        """
        self.raw_walls = [
            geom.LineString([(l[0], l[1]), (l[2], l[3])])
            for l in mlsd_lines
            if abs(l[0] - l[2]) > 0.001 or abs(l[1] - l[3]) > 0.001  # Ignorer les points
        ]
        self.symbols = yolo_symbols
        self.ocr_texts = ocr_texts

    def close_colinear_gaps(self, lines: List[geom.LineString], gap_threshold: float = 0.15) -> List[geom.LineString]:
        """
        Soude les segments quasi-colinéaires qui ont un petit gap entre eux.
        Stratégie : Si l'endpoint d'un segment A est proche du startpoint d'un segment B
        ET qu'ils sont colinéaires, on crée un segment de jonction pour combler le trou.
        Tolérance : 15cm (gap_threshold).
        """
        result = list(lines)
        extra_bridges = []

        coords_list = []
        for line in lines:
            c = list(line.coords)
            coords_list.append((c[0], c[-1]))  # (start, end) de chaque segment

        # Comparer tous les endpoints entre eux
        for i, (s1, e1) in enumerate(coords_list):
            for j, (s2, e2) in enumerate(coords_list):
                if i >= j:
                    continue
                # Vérifier si end_i est proche de start_j (ou end_j proche de start_i)
                pairs = [
                    (e1, s2), (e1, e2),
                    (s1, s2), (s1, e2),
                ]
                for pa, pb in pairs:
                    dist = math.hypot(pa[0] - pb[0], pa[1] - pb[1])
                    if 0.0 < dist <= gap_threshold:
                        # Créer un micro-segment de jonction pour combler le trou
                        bridge = geom.LineString([pa, pb])
                        extra_bridges.append(bridge)

        return result + extra_bridges

    def merge_collinear(self, lines: List[geom.LineString]) -> List[geom.LineString]:
        """Fusionner les segments colinéaires en lignes continues via linemerge."""
        if not lines:
            return []
        try:
            unioned = unary_union(lines)
            merged = linemerge(unioned)
            if isinstance(merged, geom.LineString):
                return [merged]
            elif isinstance(merged, geom.MultiLineString):
                return list(merged.geoms)
        except Exception:
            pass
        return lines

    def snap_to_network(self, lines: List[geom.LineString], tolerance: float = 0.1) -> List[geom.LineString]:
        """
        Utilise shapely_snap pour forcer les endpoints de chaque ligne
        à s'accrocher au réseau global (ferme les intersections manquantes).
        """
        if not lines:
            return []
        network = unary_union(lines)
        snapped = []
        for line in lines:
            try:
                snapped_line = shapely_snap(line, network, tolerance)
                snapped.append(snapped_line)
            except Exception:
                snapped.append(line)
        return snapped

    def find_label_at(self, centroid: geom.Point, texts: List[Dict]) -> str:
        """Trouve si le centroïde de la pièce contient un texte OCR."""
        for t in texts:
            bbox = t.get("bbox")
            if bbox:
                if bbox[0] <= centroid.x <= bbox[2] and bbox[1] <= centroid.y <= bbox[3]:
                    return t.get("label", "")
        return ""

    def build_plan_graph(self) -> Dict[str, Any]:
        """
        Transforme des lignes cassées en un plan BIM topologiquement valide.
        Pipeline en 4 passes :
          1. Soudure des gaps colinéaires (ponts de jonction)
          2. Fusion des segments colinéaires (linemerge)
          3. Snap global du réseau (ferme les intersections manquantes)
          4. Polygonisation (création des pièces)
        """
        if not self.raw_walls:
            return {"rooms": [], "topology_valid": False, "error": "Aucun mur fourni."}

        # Passe 1 : Soudure des gaps (jusqu'à 15cm)
        bridged = self.close_colinear_gaps(self.raw_walls, gap_threshold=0.15)

        # Passe 2 : Fusion des colinéaires
        merged = self.merge_collinear(bridged)

        # Passe 3 : Snap global pour fermer les intersections manquantes
        snapped = self.snap_to_network(merged, tolerance=0.1)

        # Passe 4 : Polygonisation
        try:
            network = unary_union(snapped)
            polygons = list(polygonize(network))
        except Exception as e:
            return {"rooms": [], "topology_valid": False, "error": f"Erreur polygonize: {str(e)}"}

        # Filtrer les micro-polygones (artéfacts < 1 m²)
        polygons = [p for p in polygons if p.area >= 1.0]

        if not polygons:
            return {
                "rooms": [],
                "topology_valid": False,
                "error": "Topologie non fermable. Vérifiez la qualité du scan (murs trop fragmentés ou gaps > 15cm)."
            }

        # Annotation sémantique de chaque pièce
        rooms = []
        for poly in polygons:
            centroid = poly.centroid
            label = self.find_label_at(centroid, self.ocr_texts)
            if not label:
                label = "circulation" if poly.area < 8 else "espace_indéterminé"

            rooms.append({
                "geometry": poly.wkt,
                "label":    label,
                "area_m2":  round(poly.area, 2),
                "walls_count": len(list(poly.exterior.coords)) - 1,
                "centroid": {"x": round(centroid.x, 2), "y": round(centroid.y, 2)},
            })

        # Tri par surface décroissante (pièce principale en premier)
        rooms.sort(key=lambda r: r["area_m2"], reverse=True)

        return {
            "rooms": rooms,
            "topology_valid": True,
            "total_area_m2": round(sum(r["area_m2"] for r in rooms), 2),
            "room_count": len(rooms),
        }
