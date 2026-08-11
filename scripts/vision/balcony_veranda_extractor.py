import cv2
import numpy as np
from typing import List, Dict, Any

class BalconyVerandaExtractor:
    """
    Extracteur de Lignes de Balcons, Vérandas & Garde-corps (Perimètre extérieur)
    """

    @staticmethod
    def extract(original_img: np.ndarray, walls_binary: np.ndarray, ppm: float = 48.0) -> Dict[str, Any]:
        """
        Détecte les balcons, vérandas et garde-corps en limites extérieures du bâtiment.
        """
        h, w = walls_binary.shape[:2]
        gray = cv2.cvtColor(original_img, cv2.COLOR_BGR2GRAY) if len(original_img.shape) == 3 else original_img.copy()

        # Enveloppe extérieure élargie
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (15, 15))
        wall_dilated = cv2.dilate(walls_binary, kernel, iterations=2)
        perimeter_ring = cv2.subtract(wall_dilated, walls_binary)

        # Extraction des lignes de garde-corps
        edges = cv2.Canny(gray, 30, 90)
        railings_edges = cv2.bitwise_and(edges, perimeter_ring)

        lines = cv2.HoughLinesP(railings_edges, 1, np.pi / 180, threshold=20, minLineLength=30, maxLineGap=10)
        balcony_zones = []

        if lines is not None:
            for line in lines:
                x1, y1, x2, y2 = line.ravel()
                length_m = round(float(np.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)) / ppm, 2)
                if length_m >= 0.8:
                    balcony_zones.append({
                        "line": [int(x1), int(y1), int(x2), int(y2)],
                        "length_m": length_m,
                        "type": "BALCONY_GUARDRAIL"
                    })

        balcony_mask = np.zeros((h, w), dtype=np.uint8)
        for bz in balcony_zones:
            x1, y1, x2, y2 = bz["line"]
            cv2.line(balcony_mask, (x1, y1), (x2, y2), 255, 3)

        return {
            "balcony_railings_count": len(balcony_zones),
            "balcony_zones": balcony_zones,
            "balcony_mask": balcony_mask
        }
