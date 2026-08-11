import cv2
import numpy as np
from typing import List, Dict, Any

class WetZoneClassifier:
    """
    Classificateur de Zones Humides & Gaines Techniques (Plomberie, Sanitaires & VRD)
    """

    WET_ROOM_TYPES = ["BATHROOM", "SHOWER", "WC", "KITCHEN", "LAUNDRY", "SDB", "CUISINE"]

    @staticmethod
    def classify_rooms(rooms: List[Dict[str, Any]], walls_binary: np.ndarray, ppm: float = 48.0) -> Dict[str, Any]:
        """
        Catégorise les pièces en WET_ZONE vs DRY_ZONE et repère les gaines techniques (20x40 cm).
        """
        wet_rooms = []
        dry_rooms = []
        technical_shafts = []

        for r in rooms:
            room_type = str(r.get("type") or r.get("label") or "").upper()
            is_wet = any(wt in room_type for wt in WetZoneClassifier.WET_ROOM_TYPES)

            room_info = {
                "id": r.get("id"),
                "type": room_type,
                "area_m2": r.get("area_m2", 0.0),
                "is_wet_zone": is_wet
            }

            if is_wet:
                wet_rooms.append(room_info)
            else:
                dry_rooms.append(room_info)

        # Extraction des petites gaines techniques verticales/horizontales (20x40 cm)
        num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(cv2.bitwise_not(walls_binary))
        for i in range(1, num_labels):
            w_comp = stats[i, cv2.CC_STAT_WIDTH]
            h_comp = stats[i, cv2.CC_STAT_HEIGHT]

            w_cm = (w_comp / ppm) * 100.0
            h_cm = (h_comp / ppm) * 100.0

            if 15 <= w_cm <= 50 and 30 <= h_cm <= 80:
                cx, cy = centroids[i]
                technical_shafts.append({
                    "id": f"shaft_{len(technical_shafts) + 1}",
                    "centroid": [int(cx), int(cy)],
                    "dimensions_cm": [round(w_cm, 1), round(h_cm, 1)],
                    "type": "PLUMBING_DUCT_SHAFT"
                })

        total_wet_area_m2 = sum(r["area_m2"] for r in wet_rooms)

        return {
            "wet_rooms_count": len(wet_rooms),
            "dry_rooms_count": len(dry_rooms),
            "technical_shafts_count": len(technical_shafts),
            "total_wet_area_m2": round(total_wet_area_m2, 2),
            "wet_rooms": wet_rooms,
            "technical_shafts": technical_shafts
        }
