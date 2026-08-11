import cv2
import numpy as np
from typing import List, Dict, Any

class DrawnFurnitureExtractor:
    """
    Extracteur de Mobilier Pré-dessiné (Sanitaires WC, Douches, Baignoires, Éviers, Placards & Penderies encastrées)
    """

    def __init__(self, pixels_per_meter: float = 48.0):
        self.ppm = pixels_per_meter

    def extract(self, original_img: np.ndarray, walls_binary: np.ndarray, rooms: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Détecte le mobilier dessiné et extrait leurs coordonnées spatiales (x, y, w, h).
        """
        h, w = walls_binary.shape[:2]
        gray = cv2.cvtColor(original_img, cv2.COLOR_BGR2GRAY) if len(original_img.shape) == 3 else original_img.copy()

        # Isolons les traits fins hors des murs massifs
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
        wall_dilated = cv2.dilate(walls_binary, kernel, iterations=2)
        fine_lines = cv2.subtract(cv2.Canny(gray, 40, 120), wall_dilated)

        # 1. Détection des Placards / Penderies encastrées (BUILT_IN_WARDROBE)
        wardrobes = self._detect_built_in_wardrobes(fine_lines, rooms)

        # 2. Détection des Sanitaires WC (WC_TOILET)
        toilets = self._detect_wc_toilets(fine_lines, rooms)

        # 3. Détection des Éviers & Plans de Travail Cuisine (KITCHEN_SINK_COUNTER)
        kitchen_counters = self._detect_kitchen_counters(fine_lines, rooms)

        # 4. Détection des Douches & Baignoires (SHOWER_TUB)
        showers = self._detect_showers(fine_lines, rooms)

        all_fixtures = []
        all_fixtures.extend(wardrobes)
        all_fixtures.extend(toilets)
        all_fixtures.extend(kitchen_counters)
        all_fixtures.extend(showers)

        return {
            "total_drawn_fixtures_count": len(all_fixtures),
            "wardrobes_count": len(wardrobes),
            "toilets_count": len(toilets),
            "kitchen_counters_count": len(kitchen_counters),
            "showers_count": len(showers),
            "drawn_fixtures": all_fixtures
        }

    def _detect_built_in_wardrobes(self, fine_lines: np.ndarray, rooms: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Détecte les placards / penderies dans les chambres (renfoncements allongés 50-80 cm de profondeur).
        """
        wardrobes = []
        contours, _ = cv2.findContours(fine_lines, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        for c in contours:
            x, y, w_box, h_box = cv2.boundingRect(c)
            w_cm = (w_box / self.ppm) * 100.0
            h_cm = (h_box / self.ppm) * 100.0

            # Une penderie encastrée fait 50-80cm de profondeur et 100-300cm de longueur
            is_wardrobe_shape = (45 <= w_cm <= 90 and 90 <= h_cm <= 350) or (45 <= h_cm <= 90 and 90 <= w_cm <= 350)

            if is_wardrobe_shape:
                cx, cy = int(x + w_box / 2), int(y + h_box / 2)
                room_name = self._find_containing_room(cx, cy, rooms)
                
                # Priorité aux chambres ou couloirs pour les penderies
                if "CHAMBRE" in room_name or "BEDROOM" in room_name or "SUITE" in room_name or "COULOIR" in room_name or room_name == "ZONE_GENERATION":
                    wardrobes.append({
                        "id": f"wardrobe_{len(wardrobes) + 1}",
                        "type": "BUILT_IN_WARDROBE",
                        "bbox": [int(x), int(y), int(w_box), int(h_box)],
                        "centroid": [cx, cy],
                        "dimensions_cm": [round(w_cm, 1), round(h_cm, 1)],
                        "associated_room": room_name,
                        "confidence": 0.89
                    })

        return wardrobes

    def _detect_wc_toilets(self, fine_lines: np.ndarray, rooms: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Détecte les cuvettes WC (contour arrondi/ovale 40x65 cm).
        """
        toilets = []
        contours, _ = cv2.findContours(fine_lines, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)

        for c in contours:
            area = cv2.contourArea(c)
            if 100 <= area <= 2000:
                x, y, w_box, h_box = cv2.boundingRect(c)
                w_cm = (w_box / self.ppm) * 100.0
                h_cm = (h_box / self.ppm) * 100.0

                # Forme cuvette WC (35-50 cm large, 50-75 cm long)
                if 30 <= w_cm <= 60 and 45 <= h_cm <= 80:
                    cx, cy = int(x + w_box / 2), int(y + h_box / 2)
                    room_name = self._find_containing_room(cx, cy, rooms)

                    if "WC" in room_name or "SDB" in room_name or "BATHROOM" in room_name or "SHOWER" in room_name or room_name == "ZONE_GENERATION":
                        toilets.append({
                            "id": f"wc_{len(toilets) + 1}",
                            "type": "WC_TOILET",
                            "bbox": [int(x), int(y), int(w_box), int(h_box)],
                            "centroid": [cx, cy],
                            "dimensions_cm": [round(w_cm, 1), round(h_cm, 1)],
                            "associated_room": room_name,
                            "confidence": 0.91
                        })

        return toilets

    def _detect_kitchen_counters(self, fine_lines: np.ndarray, rooms: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Détecte les plans de travail et éviers de cuisine (longueur 120-350 cm, profondeur 60 cm).
        """
        counters = []
        contours, _ = cv2.findContours(fine_lines, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        for c in contours:
            x, y, w_box, h_box = cv2.boundingRect(c)
            w_cm = (w_box / self.ppm) * 100.0
            h_cm = (h_box / self.ppm) * 100.0

            if (50 <= w_cm <= 80 and 120 <= h_cm <= 400) or (50 <= h_cm <= 80 and 120 <= w_cm <= 400):
                cx, cy = int(x + w_box / 2), int(y + h_box / 2)
                room_name = self._find_containing_room(cx, cy, rooms)

                if "CUISINE" in room_name or "KITCHEN" in room_name or "CELLIER" in room_name or room_name == "ZONE_GENERATION":
                    counters.append({
                        "id": f"kitchen_counter_{len(counters) + 1}",
                        "type": "KITCHEN_SINK_COUNTER",
                        "bbox": [int(x), int(y), int(w_box), int(h_box)],
                        "centroid": [cx, cy],
                        "dimensions_cm": [round(w_cm, 1), round(h_cm, 1)],
                        "associated_room": room_name,
                        "confidence": 0.90
                    })

        return counters

    def _detect_showers(self, fine_lines: np.ndarray, rooms: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Détecte les receveurs de douche (80x80 cm à 100x120 cm) et baignoires (70x170 cm).
        """
        showers = []
        contours, _ = cv2.findContours(fine_lines, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        for c in contours:
            x, y, w_box, h_box = cv2.boundingRect(c)
            w_cm = (w_box / self.ppm) * 100.0
            h_cm = (h_box / self.ppm) * 100.0

            if (70 <= w_cm <= 130 and 70 <= h_cm <= 130) or (65 <= w_cm <= 90 and 140 <= h_cm <= 190):
                cx, cy = int(x + w_box / 2), int(y + h_box / 2)
                room_name = self._find_containing_room(cx, cy, rooms)

                if "SDB" in room_name or "BATHROOM" in room_name or "SHOWER" in room_name or room_name == "ZONE_GENERATION":
                    showers.append({
                        "id": f"shower_{len(showers) + 1}",
                        "type": "SHOWER_TUB",
                        "bbox": [int(x), int(y), int(w_box), int(h_box)],
                        "centroid": [cx, cy],
                        "dimensions_cm": [round(w_cm, 1), round(h_cm, 1)],
                        "associated_room": room_name,
                        "confidence": 0.93
                    })

        return showers

    def _find_containing_room(self, cx: int, cy: int, rooms: List[Dict[str, Any]]) -> str:
        """
        Trouve le nom de la pièce englobant la coordonnée (cx, cy).
        """
        for r in rooms:
            bbox = r.get("bbox", [])
            if len(bbox) == 4:
                rx, ry, rw, rh = bbox
                if rx <= cx <= (rx + rw) and ry <= cy <= (ry + rh):
                    return str(r.get("label") or r.get("type") or "ZONE_INTERNE").upper()
        return "ZONE_GENERATION"
