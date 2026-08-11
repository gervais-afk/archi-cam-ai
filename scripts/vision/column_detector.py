import cv2
import numpy as np
from typing import List, Dict, Any

class ColumnDetector:
    """
    Détecteur de Poteaux, Piliers et Voiles Béton (BIM & BAEL 91)
    """

    def __init__(self, pixels_per_meter: float = 48.0):
        self.ppm = pixels_per_meter

    def detect(self, walls_binary: np.ndarray) -> Dict[str, Any]:
        """
        Isole les carrés, rectangles et disques noirs/blancs massifs aux intersections de murs
        correspondant aux poteaux structurels (20x20 cm à 40x40 cm).
        """
        h, w = walls_binary.shape[:2]
        columns = []

        # 1. Fermeture morphologique pour fusionner les intersections de murs
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (7, 7))
        closed_walls = cv2.morphologyEx(walls_binary, cv2.MORPH_CLOSE, kernel)

        # 2. Extraction des coins et intersections
        num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(closed_walls)

        for i in range(1, num_labels):
            area = stats[i, cv2.CC_STAT_AREA]
            w_comp = stats[i, cv2.CC_STAT_WIDTH]
            h_comp = stats[i, cv2.CC_STAT_HEIGHT]

            size_w_cm = (w_comp / self.ppm) * 100.0
            size_h_cm = (h_comp / self.ppm) * 100.0

            # Détection d'un poteau carré / circulaire standard (15x15 cm à 50x50 cm)
            if 15 <= size_w_cm <= 50 and 15 <= size_h_cm <= 50:
                aspect_ratio = float(w_comp) / float(h_comp) if h_comp > 0 else 0
                if 0.70 <= aspect_ratio <= 1.40:
                    cx, cy = centroids[i]
                    columns.append({
                        "id": f"col_{len(columns) + 1}",
                        "type": "RECTANGULAR_COLUMN" if aspect_ratio != 1.0 else "CIRCULAR_COLUMN",
                        "centroid": [int(cx), int(cy)],
                        "dimensions_cm": [round(size_w_cm, 1), round(size_h_cm, 1)],
                        "estimated_section_m2": round((size_w_cm / 100.0) * (size_h_cm / 100.0), 3),
                        "concrete_volume_m3": round((size_w_cm / 100.0) * (size_h_cm / 100.0) * 3.0, 3) # Hauteur 3.0m
                    })

        total_concrete_m3 = sum(c["concrete_volume_m3"] for c in columns)
        total_steel_kg = total_concrete_m3 * 100.0 # Standard BAEL 91: 100kg d'acier HA par m³ de béton poteau

        return {
            "total_columns_count": len(columns),
            "total_concrete_volume_m3": round(total_concrete_m3, 2),
            "estimated_steel_rebar_kg": round(total_steel_kg, 1),
            "columns": columns
        }
