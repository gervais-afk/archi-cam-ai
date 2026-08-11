#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
DÉTECTION ET VECTORISATION DE MURS — ARCHI CAM AI
─────────────────────────────────────────────────
Squelettisation, détection de segments Hough, snap orthogonal aux angles droits (90°),
fermeture des intersections de coins et mesure des épaisseurs de murs.
"""

import numpy as np
import cv2
from shapely.geometry import LineString
from shapely.ops import unary_union

class WallDetector:
    def __init__(self, min_wall_length: int = 15):
        self.min_wall_length = min_wall_length

    def detect(self, walls_layer: np.ndarray) -> dict:
        """Détecte tous les murs et retourne les segments vectorisés avec épaisseur."""
        # 1. Squelettisation morphologique
        skeleton = self._skeletonize(walls_layer)
        
        # 2. Détection de segments via HoughLinesP
        lines = cv2.HoughLinesP(
            skeleton,
            rho=1,
            theta=np.pi/180,
            threshold=25,
            minLineLength=self.min_wall_length,
            maxLineGap=15
        )
        
        if lines is None:
            return {"segments": [], "skeleton": skeleton}
            
        raw_segments = [tuple(l.ravel()) for l in lines]
        
        # 3. Snap orthogonal (angles 0° / 90°)
        snapped_segments = self._snap_orthogonal(raw_segments)
        
        # 4. Fusion des segments colinéaires proches
        merged_segments = self._merge_collinear(snapped_segments)
        
        # 5. Fermeture des intersections (coins de murs)
        closed_segments = self._close_intersections(merged_segments, tolerance=15)
        
        # 6. Mesure d'épaisseur pour chaque segment
        segments_with_thickness = self._measure_thickness(closed_segments, walls_layer)
        
        return {
            "segments": segments_with_thickness,
            "skeleton": skeleton
        }

    def _skeletonize(self, binary: np.ndarray) -> np.ndarray:
        """Squelettisation robuste compatible OpenCV / SciKit."""
        try:
            from skimage.morphology import skeletonize
            skel = skeletonize(binary > 0)
            return (skel * 255).astype(np.uint8)
        except ImportError:
            # Fallback morphologique OpenCV
            skel = np.zeros(binary.shape, np.uint8)
            element = cv2.getStructuringElement(cv2.MORPH_CROSS, (3, 3))
            img = binary.copy()
            done = False
            while not done:
                eroded = cv2.erode(img, element)
                temp = cv2.dilate(eroded, element)
                temp = cv2.subtract(img, temp)
                skel = cv2.bitwise_or(skel, temp)
                img = eroded.copy()
                if cv2.countNonZero(img) == 0:
                    done = True
            return skel

    def _snap_orthogonal(self, segments: list, tol: int = 4) -> list:
        """Force les segments quasi-horizontaux et verticaux à être rigoureusement droits."""
        snapped = []
        for x1, y1, x2, y2 in segments:
            if abs(y2 - y1) <= tol:
                avg_y = int((y1 + y2) / 2)
                snapped.append((x1, avg_y, x2, avg_y))
            elif abs(x2 - x1) <= tol:
                avg_x = int((x1 + x2) / 2)
                snapped.append((avg_x, y1, avg_x, y2))
            else:
                snapped.append((x1, y1, x2, y2))
        return snapped

    def _merge_collinear(self, segments: list, dist_tol: int = 8) -> list:
        """Fusionne les segments alignés avec Shapely."""
        if not segments:
            return []
            
        try:
            line_objs = [LineString([(x1, y1), (x2, y2)]) for x1, y1, x2, y2 in segments if (x1 != x2 or y1 != y2)]
            if not line_objs:
                return segments
                
            buffered = [l.buffer(dist_tol) for l in line_objs]
            union = unary_union(buffered)
            
            geoms = union.geoms if hasattr(union, "geoms") else [union]
            merged = []
            for geom in geoms:
                minx, miny, maxx, maxy = geom.bounds
                w, h = maxx - minx, maxy - miny
                if w >= h: # Segment horizontal
                    mid_y = int((miny + maxy) / 2)
                    merged.append((int(minx), mid_y, int(maxx), mid_y))
                else: # Segment vertical
                    mid_x = int((minx + maxx) / 2)
                    merged.append((mid_x, int(miny), mid_x, int(maxy)))
            return merged if merged else segments
        except Exception:
            return segments

    def _close_intersections(self, segments: list, tolerance: int = 15) -> list:
        """Connecte les coins de murs pour garantir des pièces parfaitement fermées."""
        if not segments:
            return []
            
        endpoints = []
        for i, (x1, y1, x2, y2) in enumerate(segments):
            endpoints.append([x1, y1, i, 0]) # Start
            endpoints.append([x2, y2, i, 1]) # End
            
        new_segs = [list(s) for s in segments]
        n = len(endpoints)
        for i in range(n):
            for j in range(i + 1, n):
                x1, y1, si, type_i = endpoints[i]
                x2, y2, sj, type_j = endpoints[j]
                if si == sj:
                    continue
                dist = np.hypot(x2 - x1, y2 - y1)
                if 0 < dist <= tolerance:
                    mx, my = int((x1 + x2) / 2), int((y1 + y2) / 2)
                    if type_i == 0:
                        new_segs[si][0], new_segs[si][1] = mx, my
                    else:
                        new_segs[si][2], new_segs[si][3] = mx, my
                    if type_j == 0:
                        new_segs[sj][0], new_segs[sj][1] = mx, my
                    else:
                        new_segs[sj][2], new_segs[sj][3] = mx, my
                        
        return [tuple(s) for s in new_segs]

    def _measure_thickness(self, segments: list, walls_layer: np.ndarray) -> list:
        """Mesure l'épaisseur réelle de chaque mur en analysant le profil perpendiculaire."""
        h, w = walls_layer.shape
        result = []
        for x1, y1, x2, y2 in segments:
            dx, dy = x2 - x1, y2 - y1
            length = int(np.hypot(dx, dy))
            if length < 10:
                continue
                
            perp_x, perp_y = -dy / length, dx / length
            
            # Échantillonnage à mi-longueur
            mx, my = int((x1 + x2) / 2), int((y1 + y2) / 2)
            thickness = 1
            for step in range(1, 25):
                nx1, ny1 = int(mx + step * perp_x), int(my + step * perp_y)
                nx2, ny2 = int(mx - step * perp_x), int(my - step * perp_y)
                if 0 <= nx1 < w and 0 <= ny1 < h and walls_layer[ny1, nx1] > 0:
                    thickness += 1
                if 0 <= nx2 < w and 0 <= ny2 < h and walls_layer[ny2, nx2] > 0:
                    thickness += 1
                    
            result.append({
                "p1": [x1, y1],
                "p2": [x2, y2],
                "thickness": max(6, min(30, thickness)),
                "length": length
            })
            
        return result
