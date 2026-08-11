import cv2
import numpy as np
from typing import List, Dict, Any

class OpeningDetector:
    """
    Détecteur d'ouvertures et menuiseries (Portes battantes, Fenêtres, Baies coulissantes, Voûtes)
    """

    def __init__(self, pixels_per_meter: float = 48.0):
        self.ppm = pixels_per_meter

    def detect(self, original_img: np.ndarray, walls_binary: np.ndarray) -> Dict[str, Any]:
        """
        Détecte et catégorise les ouvertures dans le plan d'architecte.
        """
        h, w = walls_binary.shape[:2]
        gray = cv2.cvtColor(original_img, cv2.COLOR_BGR2GRAY) if len(original_img.shape) == 3 else original_img.copy()

        # 1. Détection des arcs de cercle de balayage des portes battantes (90°)
        swing_doors = self._detect_door_arcs(gray, walls_binary)

        # 2. Détection des fenêtres et baies coulissantes (lignes doubles parallèles dans les murs)
        windows, sliding_doors = self._detect_glazing_lines(gray, walls_binary)

        # 3. Détection des ouvertures libres / voûtes (interruptions de murs sans arc ni double ligne)
        arches = self._detect_open_arches(walls_binary, swing_doors, windows, sliding_doors)

        openings = []
        openings.extend(swing_doors)
        openings.extend(windows)
        openings.extend(sliding_doors)
        openings.extend(arches)

        # Calcul de la surface vitrée totale pour les calculs WFR
        total_glazing_surface_m2 = sum(
            (op["width_cm"] / 100.0) * 1.5 for op in windows + sliding_doors
        )

        return {
            "total_count": len(openings),
            "swing_doors_count": len(swing_doors),
            "windows_count": len(windows),
            "sliding_doors_count": len(sliding_doors),
            "arches_count": len(arches),
            "total_glazing_surface_m2": round(total_glazing_surface_m2, 2),
            "openings": openings
        }

    def _detect_door_arcs(self, gray: np.ndarray, walls_binary: np.ndarray) -> List[Dict[str, Any]]:
        """
        Détecte les arcs de cercle fins correspondant aux portes battantes (arcs de 90°).
        """
        doors = []
        edges = cv2.Canny(gray, 30, 100)
        # Supprimer les murs du masque d'arêtes pour ne garder que les contours fins (arcs)
        arcs_only = cv2.subtract(edges, walls_binary)

        contours, _ = cv2.findContours(arcs_only, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        for c in contours:
            area = cv2.contourArea(c)
            perimeter = cv2.arcLength(c, False)
            if 30 <= perimeter <= 250 and area > 10:
                hull = cv2.convexHull(c)
                hull_area = cv2.contourArea(hull)
                solidity = float(area) / hull_area if hull_area > 0 else 0
                
                # Un arc de cercle a une solidité caractéristique (~0.4 à 0.75)
                if 0.35 <= solidity <= 0.80:
                    x, y, w_box, h_box = cv2.boundingRect(c)
                    size_px = max(w_box, h_box)
                    width_cm = int((size_px / self.ppm) * 100)

                    if 60 <= width_cm <= 130:  # Largeur standard porte (60cm à 120cm)
                        doors.append({
                            "type": "SWING_DOOR",
                            "bbox": [int(x), int(y), int(w_box), int(h_box)],
                            "centroid": [int(x + w_box / 2), int(y + h_box / 2)],
                            "width_cm": width_cm,
                            "confidence": 0.92
                        })

        return doors

    def _detect_glazing_lines(self, gray: np.ndarray, walls_binary: np.ndarray) -> tuple:
        """
        Détecte les lignes doubles parallèles au cœur des ouvertures pour isoler fenêtres et baies coulissantes.
        """
        windows = []
        sliding_doors = []

        # Dilater légèrement les murs pour trouver les ouvertures enchâssées
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
        wall_dilated = cv2.dilate(walls_binary, kernel, iterations=2)
        inv_walls = cv2.bitwise_not(wall_dilated)

        # Lignes fines à l'intérieur des ouvertures
        edges = cv2.Canny(gray, 50, 150)
        open_edges = cv2.bitwise_and(edges, inv_walls)

        lines = cv2.HoughLinesP(open_edges, 1, np.pi / 180, threshold=20, minLineLength=25, maxLineGap=10)

        if lines is not None:
            for line in lines:
                x1, y1, x2, y2 = line.ravel()
                length_px = float(np.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2))
                width_cm = int((length_px / self.ppm) * 100)

                if 50 <= width_cm <= 400:
                    centroid = [int((x1 + x2) / 2), int((y1 + y2) / 2)]
                    op_type = "SLIDING_DOOR" if width_cm >= 180 else "WINDOW"
                    item = {
                        "type": op_type,
                        "line": [int(x1), int(y1), int(x2), int(y2)],
                        "centroid": centroid,
                        "width_cm": width_cm,
                        "height_cm": 150 if op_type == "WINDOW" else 210,
                        "confidence": 0.88
                    }

                    if op_type == "SLIDING_DOOR":
                        sliding_doors.append(item)
                    else:
                        windows.append(item)

        return windows, sliding_doors

    def _detect_open_arches(self, walls_binary: np.ndarray, doors: list, windows: list, sliding: list) -> List[Dict[str, Any]]:
        """
        Détecte les voûtes et passages libres sans porte ni vitre.
        """
        arches = []
        # Squelette de rupture des murs
        dist_transform = cv2.distanceTransform(cv2.bitwise_not(walls_binary), cv2.DIST_L2, 5)
        _, open_zones = cv2.threshold(dist_transform, 15, 255, cv2.THRESH_BINARY)
        open_zones = open_zones.astype(np.uint8)

        num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(open_zones)

        for i in range(1, num_labels):
            w_box = stats[i, cv2.CC_STAT_WIDTH]
            h_box = stats[i, cv2.CC_STAT_HEIGHT]
            cx, cy = centroids[i]

            size_cm = int((max(w_box, h_box) / self.ppm) * 100)
            if 70 <= size_cm <= 250:
                # Vérifier si cet emplacement n'est pas déjà occupé par une porte ou fenêtre
                is_taken = False
                for existing in doors + windows + sliding:
                    ex_cx, ex_cy = existing["centroid"]
                    if np.sqrt((cx - ex_cx) ** 2 + (cy - ex_cy) ** 2) < 40:
                        is_taken = True
                        break

                if not is_taken:
                    arches.append({
                        "type": "OPEN_ARCH",
                        "centroid": [int(cx), int(cy)],
                        "width_cm": size_cm,
                        "confidence": 0.85
                    })

        return arches
