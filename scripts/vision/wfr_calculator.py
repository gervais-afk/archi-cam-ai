from typing import List, Dict, Any

class WfrCalculator:
    """
    Calculateur du Ratio d'Éclairage Naturel (Window-to-Floor Ratio - WFR)
    Conforme aux normes BTP et Urbanisme (POS Cameroun / Permis de Bâtir).
    """

    MIN_COMPLIANT_WFR = 0.12 # 12% minimum requis pour pièces principales

    @staticmethod
    def calculate_room_wfr(room: Dict[str, Any], openings: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Calcule le WFR pour une pièce donnée.
        """
        room_area_m2 = room.get("area_m2", 15.0)
        room_bbox = room.get("bbox", [0, 0, 100, 100])
        rx, ry, rw, rh = room_bbox

        glazing_area_m2 = 0.0
        associated_windows = []

        for op in openings:
            if op["type"] in ["WINDOW", "SLIDING_DOOR"]:
                cx, cy = op["centroid"]
                # Vérifier la proximité spatiale de la fenêtre par rapport à la pièce (avec marge 30px)
                if (rx - 30) <= cx <= (rx + rw + 30) and (ry - 30) <= cy <= (ry + rh + 30):
                    window_area = (op["width_cm"] / 100.0) * (op.get("height_cm", 150) / 100.0)
                    glazing_area_m2 += window_area
                    associated_windows.append(op)

        wfr_ratio = (glazing_area_m2 / room_area_m2) if room_area_m2 > 0 else 0.0
        is_compliant = wfr_ratio >= WfrCalculator.MIN_COMPLIANT_WFR if room.get("type") in ["BEDROOM", "LIVING", "SALON"] else True

        return {
            "room_id": room.get("id"),
            "room_type": room.get("type", "ROOM"),
            "room_area_m2": room_area_m2,
            "glazing_area_m2": round(glazing_area_m2, 2),
            "wfr_ratio_percent": round(wfr_ratio * 100.0, 1),
            "is_compliant": is_compliant,
            "min_required_percent": 12.0,
            "status_message": "PASS - Éclairage Naturel Conforme" if is_compliant else "WARNING - Surface Vitrée Insuffisante (< 12%)"
        }
