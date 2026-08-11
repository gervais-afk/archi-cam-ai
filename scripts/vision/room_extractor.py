#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
EXTRACTION ROBUSTE DES PIÈCES — ARCHI CAM AI
───────────────────────────────────────────
Isole chaque pièce intérieure fermée par fermeture morphologique forte des ouvertures,
analyse des composantes connexes, filtres stricts anti-bruit et simplification Douglas-Peucker.
"""

import sys
import numpy as np
import cv2

# Support UTF-8 console Windows
try:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

class RoomExtractor:
    def __init__(self, min_room_area: int = 5000):
        self.min_room_area = min_room_area

    def extract(self, walls_binary: np.ndarray, image_shape: tuple) -> list:
        h, w = image_shape[:2]
        img_total_area = w * h

        # 1. Fermeture morphologique FORTE pour sceller les ouvertures de portes et fenêtres
        kernel_5 = np.ones((5, 5), np.uint8)
        walls_closed = cv2.dilate(walls_binary, kernel_5, iterations=4)
        kernel_15 = np.ones((15, 15), np.uint8)
        walls_closed = cv2.morphologyEx(walls_closed, cv2.MORPH_CLOSE, kernel_15, iterations=3)

        # 2. Espaces intérieurs libres (complémentaire des murs fermés)
        free_space = cv2.bitwise_not(walls_closed)

        # 3. Analyse des composantes connexes
        num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(free_space, connectivity=4)
        print(f"[RoomExtractor] {num_labels - 1} composantes potentielles detectees")

        rooms = []
        for i in range(1, num_labels):
            area = stats[i, cv2.CC_STAT_AREA]
            x = stats[i, cv2.CC_STAT_LEFT]
            y = stats[i, cv2.CC_STAT_TOP]
            width = stats[i, cv2.CC_STAT_WIDTH]
            height = stats[i, cv2.CC_STAT_HEIGHT]

            # FILTRE 1 : Taille minimale réaliste (au moins ~5 m² réels)
            if area < self.min_room_area:
                continue

            # FILTRE 2 : Rejet de l'extérieur (qui touche au moins 2 bords du document)
            touches_borders = 0
            if x <= 6: touches_borders += 1
            if y <= 6: touches_borders += 1
            if x + width >= w - 6: touches_borders += 1
            if y + height >= h - 6: touches_borders += 1

            if touches_borders >= 2:
                continue

            # FILTRE 3 : Ratio d'aspect raisonnable (élimine les bandes de bordure parasites)
            aspect = max(width, height) / max(1, min(width, height))
            if aspect > 9:
                continue

            # FILTRE 4 : Pas trop grand (élimine le fond global)
            if area > (img_total_area * 0.65):
                continue

            # Extraction du polygone précis
            room_mask = (labels == i).astype(np.uint8) * 255
            contours, _ = cv2.findContours(room_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            if not contours:
                continue

            contour = max(contours, key=cv2.contourArea)
            # Simplification polygonale Douglas-Peucker (epsilon = 0.8% du périmètre)
            epsilon = 0.008 * cv2.arcLength(contour, True)
            approx = cv2.approxPolyDP(contour, epsilon, True)
            polygon = [[int(p[0][0]), int(p[0][1])] for p in approx]

            rooms.append({
                "id": f"room_{len(rooms) + 1}",
                "polygon": polygon,
                "bbox": [int(x), int(y), int(width), int(height)],
                "centroid": [int(centroids[i][0]), int(centroids[i][1])],
                "area_pixels": int(area),
                "area_m2": round(area * 0.0022, 2),
                "label": None,
                "type": None
            })

        print(f"[RoomExtractor] Total pieces retenues et validees : {len(rooms)}")
        
        # Snapping des coordonnées pour aligner les cloisons parallèles et coins (Loop Merging RAG 2026)
        rooms = self.snap_coordinates(rooms, tol=5.0)
        
        # Tri par surface décroissante
        rooms.sort(key=lambda r: r["area_pixels"], reverse=True)
        return rooms

    def snap_coordinates(self, rooms: list, tol: float = 5.0) -> list:
        """
        Algorithme de Snapping de grille (Loop Merging) pour aligner les parois parallèles 
        et fusionner les sommets extrêmement proches (tolérance = 5 pixels).
        """
        if not rooms:
            return rooms
            
        # Collecter toutes les coordonnées X et Y
        all_x = []
        all_y = []
        for r in rooms:
            for pt in r.get('polygon', []):
                all_x.append(pt[0])
                all_y.append(pt[1])
                
        # Regrouper et fusionner les coordonnées X proches
        snapped_x = {}
        for x in sorted(all_x):
            found = False
            for ref_x in snapped_x.values():
                if abs(x - ref_x) <= tol:
                    snapped_x[x] = ref_x
                    found = True
                    break
            if not found:
                snapped_x[x] = x
                
        # Regrouper et fusionner les coordonnées Y proches
        snapped_y = {}
        for y in sorted(all_y):
            found = False
            for ref_y in snapped_y.values():
                if abs(y - ref_y) <= tol:
                    snapped_y[y] = ref_y
                    found = True
                    break
            if not found:
                snapped_y[y] = y
                
        # Appliquer aux polygones de pièces
        for r in rooms:
            new_poly = []
            for pt in r.get('polygon', []):
                new_x = int(round(snapped_x[pt[0]]))
                new_y = int(round(snapped_y[pt[1]]))
                new_poly.append([new_x, new_y])
            r['polygon'] = new_poly
            
            # Recalculer la bbox et le centroïde après alignement
            np_poly = np.array(new_poly, dtype=np.int32)
            rx, ry, rw, rh = cv2.boundingRect(np_poly)
            r['bbox'] = [int(rx), int(ry), int(rx + rw), int(ry + rh)]
            
            M = cv2.moments(np_poly)
            if M["m00"] > 0:
                r['centroid'] = [int(M["m10"] / M["m00"]), int(M["m01"] / M["m00"])]
                
        return rooms

