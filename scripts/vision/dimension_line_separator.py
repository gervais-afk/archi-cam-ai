import cv2
import numpy as np
from typing import List, Dict, Any

class DimensionLineSeparator:
    """
    Séparateur des Lignes de Cotation & Flèches d'Extension (Cotations Extérieures)
    """

    @staticmethod
    def separate(original_img: np.ndarray, walls_binary: np.ndarray, ppm: float = 48.0) -> Dict[str, Any]:
        """
        Isole les lignes de cotes fines situées à l'extérieur de l'enveloppe du bâtiment.
        """
        h, w = walls_binary.shape[:2]
        gray = cv2.cvtColor(original_img, cv2.COLOR_BGR2GRAY) if len(original_img.shape) == 3 else original_img.copy()

        # 1. Enveloppe globale du bâtiment
        kernel_env = cv2.getStructuringElement(cv2.MORPH_RECT, (25, 25))
        closed_building = cv2.morphologyEx(walls_binary, cv2.MORPH_CLOSE, kernel_env)
        contours, _ = cv2.findContours(closed_building, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        building_mask = np.zeros((h, w), dtype=np.uint8)
        if contours:
            cv2.drawContours(building_mask, contours, -1, 255, -1)

        # 2. Lignes fines extérieures (hors enveloppe)
        exterior_mask = cv2.bitwise_not(building_mask)
        edges = cv2.Canny(gray, 30, 100)
        ext_edges = cv2.bitwise_and(edges, exterior_mask)

        # 3. Extraction des lignes de cotes via Hough
        lines = cv2.HoughLinesP(ext_edges, 1, np.pi / 180, threshold=30, minLineLength=40, maxLineGap=15)
        dimension_lines = []

        if lines is not None:
            for line in lines:
                x1, y1, x2, y2 = line.ravel()
                length_px = float(np.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2))
                length_m = round(length_px / ppm, 2)

                if length_m >= 0.5:
                    dimension_lines.append({
                        "line": [int(x1), int(y1), int(x2), int(y2)],
                        "length_m": length_m
                    })

        dimension_mask = np.zeros((h, w), dtype=np.uint8)
        for dl in dimension_lines:
            x1, y1, x2, y2 = dl["line"]
            cv2.line(dimension_mask, (x1, y1), (x2, y2), 255, 2)

        return {
            "total_dimension_lines_count": len(dimension_lines),
            "dimension_lines": dimension_lines,
            "dimension_mask": dimension_mask
        }
