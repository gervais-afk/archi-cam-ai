#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ROOM EXTRACTOR V2 — Algorithme Watershed + Orthogonalisation
Spécialement conçu pour reconstruire des pièces propres depuis une image binaire de murs.
"""

import sys
import json
import argparse
import numpy as np
import cv2

try:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

try:
    from shapely.geometry import Polygon, Point
    from shapely.validation import make_valid
    SHAPELY_OK = True
except ImportError:
    SHAPELY_OK = False
    print("[RoomExtractorV2] WARN: shapely non disponible, fallback mode")


class RoomExtractorV2:
    def __init__(self,
                 wall_dilation=3,
                 min_room_area_ratio=0.004,
                 max_room_area_ratio=0.42,
                 border_margin=8):
        self.wall_dilation = wall_dilation
        self.min_room_area_ratio = min_room_area_ratio
        self.max_room_area_ratio = max_room_area_ratio
        self.border_margin = border_margin

    def extract(self, walls_binary: np.ndarray, debug_dir: str = None) -> list:
        h, w = walls_binary.shape[:2]
        canvas_area = h * w
        print(f"[RoomExtractorV2] Image: {w}x{h} = {canvas_area} px2")

        # Étape 1 : Fermeture morphologique légère pour refermer les micro-trous (portes)
        kernel_close = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
        walls_closed = cv2.morphologyEx(walls_binary, cv2.MORPH_CLOSE, kernel_close, iterations=2)

        # Dilatation légère pour épaissir les murs
        kernel_dil = np.ones((self.wall_dilation, self.wall_dilation), np.uint8)
        walls_thick = cv2.dilate(walls_closed, kernel_dil, iterations=1)

        if debug_dir:
            cv2.imwrite(f"{debug_dir}/rev2_01_walls_closed.png", walls_thick)

        # Étape 2 : Espaces libres intérieurs
        free_space = cv2.bitwise_not(walls_thick)

        # Érosion pour bien séparer les pièces contiguës
        kernel_sep = np.ones((5, 5), np.uint8)
        free_space_eroded = cv2.erode(free_space, kernel_sep, iterations=2)

        if debug_dir:
            cv2.imwrite(f"{debug_dir}/rev2_02_free_space.png", free_space_eroded)

        # Étape 3 : Composantes connexes
        num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(
            free_space_eroded, connectivity=4
        )
        print(f"[RoomExtractorV2] {num_labels - 1} composantes brutes detectees")

        # Étape 4 : Filtres
        min_area = int(canvas_area * self.min_room_area_ratio)
        max_area = int(canvas_area * self.max_room_area_ratio)
        m = self.border_margin

        candidates = []
        for i in range(1, num_labels):
            area = stats[i, cv2.CC_STAT_AREA]
            x = stats[i, cv2.CC_STAT_LEFT]
            y = stats[i, cv2.CC_STAT_TOP]
            rw = stats[i, cv2.CC_STAT_WIDTH]
            rh = stats[i, cv2.CC_STAT_HEIGHT]

            if area < min_area or area > max_area:
                continue

            touches = sum([x < m, y < m, x + rw > w - m, y + rh > h - m])
            if touches >= 2:
                continue

            aspect = max(rw, rh) / max(1, min(rw, rh))
            if aspect > 10:
                continue

            candidates.append({
                "component_id": i,
                "area": int(area),
                "bbox": [int(x), int(y), int(rw), int(rh)],
                "centroid": [int(centroids[i][0]), int(centroids[i][1])],
            })

        print(f"[RoomExtractorV2] {len(candidates)} candidats apres filtrage")

        # Étape 5 : Extraire polygones propres orthogonaux
        rooms = []
        for idx, cand in enumerate(candidates):
            mask = (labels == cand["component_id"]).astype(np.uint8) * 255
            mask_dilated = cv2.dilate(mask, kernel_sep, iterations=2)

            contours, _ = cv2.findContours(mask_dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            if not contours:
                continue

            contour = max(contours, key=cv2.contourArea)
            perimeter = cv2.arcLength(contour, True)
            epsilon = 0.012 * perimeter
            approx = cv2.approxPolyDP(contour, epsilon, True)
            polygon_points = [[int(p[0][0]), int(p[0][1])] for p in approx]

            if len(polygon_points) < 4:
                continue

            # Orthogonalisation (force murs à 90°)
            polygon_points = self._orthogonalize(polygon_points, tolerance=15)

            if len(polygon_points) < 4:
                continue

            if SHAPELY_OK:
                try:
                    shapely_poly = Polygon(polygon_points)
                    if not shapely_poly.is_valid:
                        shapely_poly = make_valid(shapely_poly)
                        if hasattr(shapely_poly, "geoms"):
                            shapely_poly = max(shapely_poly.geoms, key=lambda g: g.area)

                    if shapely_poly.area < min_area:
                        continue

                    c = shapely_poly.centroid
                    centroid = [int(c.x), int(c.y)]
                except Exception as e:
                    print(f"[RoomExtractorV2] Polygone {idx} invalide: {e}")
                    continue
            else:
                # Fallback sans shapely
                M = cv2.moments(np.array(polygon_points, dtype=np.int32))
                centroid = cand["centroid"]
                if M["m00"] > 0:
                    centroid = [int(M["m10"] / M["m00"]), int(M["m01"] / M["m00"])]

            rooms.append({
                "id": f"room_{len(rooms) + 1}",
                "polygon": polygon_points,
                "centroid": centroid,
                "area_pixels": cand["area"],
                "area_m2": round(cand["area"] * 0.0022, 2),
                "bbox": cand["bbox"],
                "label": None,
                "type": None,
            })

        print(f"[RoomExtractorV2] {len(rooms)} pieces finales")

        # Tri par surface décroissante
        rooms.sort(key=lambda r: r["area_pixels"], reverse=True)

        # Étape 6 : Debug visuel
        if debug_dir:
            debug_img = cv2.cvtColor(walls_binary, cv2.COLOR_GRAY2BGR)
            np.random.seed(42)
            for r in rooms:
                color = tuple(int(c) for c in np.random.randint(80, 230, 3))
                pts = np.array(r["polygon"], dtype=np.int32)
                overlay = debug_img.copy()
                cv2.fillPoly(overlay, [pts], color)
                debug_img = cv2.addWeighted(debug_img, 0.55, overlay, 0.45, 0)
                cv2.polylines(debug_img, [pts], True, (0, 0, 200), 2)
                label_txt = r.get("label") or r["id"]
                cv2.putText(debug_img, label_txt, tuple(r["centroid"]),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.55, (20, 20, 20), 2)
            cv2.imwrite(f"{debug_dir}/rev2_03_rooms_final.png", debug_img)
            print(f"[RoomExtractorV2] Debug image sauvegardee : {debug_dir}/rev2_03_rooms_final.png")

        return rooms

    def _orthogonalize(self, pts: list, tolerance: int = 15) -> list:
        """Force les segments quasi-horizontaux/verticaux à l'être strictement."""
        pts = [list(p) for p in pts]
        n = len(pts)

        # Passe 1 : snap H/V des segments
        for i in range(n):
            p1 = pts[i]
            p2 = pts[(i + 1) % n]
            dx = abs(p2[0] - p1[0])
            dy = abs(p2[1] - p1[1])

            if dx < tolerance and dy > tolerance:
                avg_x = (p1[0] + p2[0]) // 2
                pts[i][0] = avg_x
                pts[(i + 1) % n][0] = avg_x
            elif dy < tolerance and dx > tolerance:
                avg_y = (p1[1] + p2[1]) // 2
                pts[i][1] = avg_y
                pts[(i + 1) % n][1] = avg_y

        # Passe 2 : supprimer les points colinéaires
        cleaned = []
        for i in range(n):
            prev = pts[(i - 1) % n]
            curr = pts[i]
            nxt = pts[(i + 1) % n]
            v1 = (curr[0] - prev[0], curr[1] - prev[1])
            v2 = (nxt[0] - curr[0], nxt[1] - curr[1])
            cross = v1[0] * v2[1] - v1[1] * v2[0]
            if abs(cross) > 80:
                cleaned.append(curr)

        return cleaned if len(cleaned) >= 4 else pts


class LabelAssignerV2:
    ROOM_KEYWORDS = {
        "chambre": "bedroom", "chamber": "bedroom", "bed": "bedroom", "parent": "bedroom",
        "sejour": "living", "salon": "living", "living": "living",
        "cuisine": "kitchen", "kitchen": "kitchen",
        "toil": "bathroom", "wc": "bathroom", "sdb": "bathroom", "bain": "bathroom", "douche": "bathroom",
        "sam": "dining", "manger": "dining",
        "couloir": "corridor", "hall": "corridor", "degag": "corridor",
        "veranda": "terrace", "balcon": "balcony", "terrasse": "terrace",
        "garage": "garage", "parking": "garage",
        "dressing": "dressing",
        "entree": "entrance", "entrée": "entrance",
        "bureau": "office",
    }

    def assign(self, rooms: list, texts: list) -> list:
        import re

        if not SHAPELY_OK:
            return rooms

        room_polys = [(i, Polygon(r["polygon"])) for i, r in enumerate(rooms) if len(r.get("polygon", [])) >= 3]

        room_labels = []
        area_labels = []

        for t in texts:
            raw = t.get("text", "").strip()
            t_clean = raw.lower()

            if "m2" in t_clean or "m²" in t_clean:
                m = re.search(r"(\d+[.,]\d+)", t_clean)
                if m:
                    area_labels.append({**t, "area_value": float(m.group(1).replace(",", "."))})
                continue

            for kw, rtype in self.ROOM_KEYWORDS.items():
                if kw in t_clean:
                    room_labels.append({**t, "room_type": rtype})
                    break

        print(f"[LabelAssignerV2] {len(room_labels)} labels pieces, {len(area_labels)} surfaces")

        # Assignation par contenance géométrique
        for label in room_labels:
            pt = Point(label["centroid"])
            for i, poly in room_polys:
                if poly.contains(pt):
                    rooms[i]["label"] = label["text"]
                    rooms[i]["type"] = label["room_type"]
                    break

        # Assignation surfaces
        for area in area_labels:
            pt = Point(area["centroid"])
            for i, poly in room_polys:
                if poly.contains(pt):
                    rooms[i]["area_declared_m2"] = area["area_value"]
                    break

        # Fallback : pièce la plus proche si label non contenu
        for label in room_labels:
            if any(r.get("label") == label["text"] for r in rooms):
                continue
            pt = Point(label["centroid"])
            best_i, best_d = None, 120.0
            for i, poly in room_polys:
                if rooms[i].get("label"):
                    continue
                d = pt.distance(poly)
                if d < best_d:
                    best_d = d
                    best_i = i
            if best_i is not None:
                rooms[best_i]["label"] = label["text"]
                rooms[best_i]["type"] = label["room_type"]
                print(f"[LabelAssignerV2] Fallback: '{label['text']}' piece {best_i} (dist={best_d:.0f}px)")

        # Labels génériques pour pièces non identifiées
        counter = 1
        for r in rooms:
            if not r.get("label"):
                r["label"] = f"Piece {counter}"
                r["type"] = "default"
                counter += 1

        return rooms


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--walls-image", required=True)
    parser.add_argument("--texts-json", required=True)
    parser.add_argument("--output-json", required=True)
    parser.add_argument("--debug-dir", default=None)
    args = parser.parse_args()

    walls = cv2.imread(args.walls_image, cv2.IMREAD_GRAYSCALE)
    if walls is None:
        raise FileNotFoundError(f"Impossible de lire : {args.walls_image}")

    _, walls_bin = cv2.threshold(walls, 127, 255, cv2.THRESH_BINARY)

    with open(args.texts_json, "r", encoding="utf-8") as f:
        data = json.load(f)
    texts = data.get("all_text", data.get("texts", []))

    extractor = RoomExtractorV2()
    rooms = extractor.extract(walls_bin, debug_dir=args.debug_dir)

    assigner = LabelAssignerV2()
    rooms = assigner.assign(rooms, texts)

    result = {
        "image_width": walls.shape[1],
        "image_height": walls.shape[0],
        "image_size": [walls.shape[1], walls.shape[0]],
        "scale": {"pixels_per_meter": 48.0},
        "rooms": rooms,
    }

    with open(args.output_json, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    print(f"\n[RoomExtractorV2] Resultat sauvegarde -> {args.output_json}")
    for r in rooms:
        area = r.get("area_declared_m2") or f"{r['area_m2']} m2"
        print(f"   -> {str(r['label']):25s} | {str(r['type']):12s} | {area}")
