#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ARCHICAM 2.5D COMPOSER V2 PRO — RECONSTRUCTION & CADRAGE OPTIMAL
───────────────────────────────────────────────────────────────
Reconstruit le plan 2.5D sur canvas blanc avec auto-cadrage adaptatif :
- Recadre le canvas sur la villa pour éliminer les espaces vides inutiles
- Sols texturés PBR (parquet chêne, marbre poli, carrelage moderne, mosaïque)
- Ombres ambiantes douces le long des murs
- Murs structurels épais en noir profond
- Mobilier top-down réaliste dimensionné à l'échelle de chaque pièce
- Badges typographiques ultra-nets avec surfaces certifiées en m²
"""

import os
import sys
import json
import argparse
from pathlib import Path
import numpy as np
import cv2
from PIL import Image, ImageDraw, ImageFont, ImageFilter

# Support UTF-8 console Windows
try:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    if hasattr(sys.stderr, "reconfigure"):
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

BASE_DIR = Path(__file__).resolve().parent.parent
ASSETS_DIR = BASE_DIR / "public" / "assets" / "floorplan_2_5d"
TEXTURES_DIR = ASSETS_DIR / "textures"
FURNITURE_DIR = ASSETS_DIR / "furniture"

TEXTURE_MAP = {
    "bedroom": "parquet_chene.png",
    "chambre": "parquet_chene.png",
    "living": "parquet_chene.png",
    "sejour": "parquet_chene.png",
    "salon": "parquet_chene.png",
    "dining": "parquet_chene.png",
    "sam": "parquet_chene.png",
    "kitchen": "carrelage_cuisine.png",
    "cuisine": "carrelage_cuisine.png",
    "bathroom": "mosaique_sdb.png",
    "toilet": "mosaique_sdb.png",
    "toil": "mosaique_sdb.png",
    "sdb": "mosaique_sdb.png",
    "wc": "mosaique_sdb.png",
    "corridor": "parquet_chene.png",
    "couloir": "parquet_chene.png",
    "terrace": "marbre_blanc.png",
    "veranda": "marbre_blanc.png",
    "balcon": "marbre_blanc.png",
    "garage": "paves_parking.png",
    "parking": "paves_parking.png",
    "default": "marbre_blanc.png"
}

COLOR_MAP = {
    "bedroom": (222, 190, 150),
    "living": (228, 200, 160),
    "kitchen": (215, 220, 225),
    "bathroom": (175, 220, 235),
    "corridor": (225, 200, 165),
    "terrace": (240, 240, 245),
    "garage": (185, 145, 115),
    "default": (242, 242, 246)
}

FURNITURE_RULES = {
    "bedroom": [
        ("lit_double.png", 0.52, "center"),
        ("plante_monstera.png", 0.20, "corner_nw")
    ],
    "living": [
        ("canape_l.png", 0.52, "wall_south"),
        ("table_salon.png", 0.35, "center"),
        ("plante_monstera.png", 0.22, "corner_ne")
    ],
    "dining": [
        ("table_manger.png", 0.52, "center")
    ],
    "kitchen": [
        ("table_manger.png", 0.42, "center")
    ],
    "bathroom": [
        ("douche.png", 0.35, "corner_nw"),
        ("vasque.png", 0.28, "wall_north"),
        ("wc.png", 0.25, "corner_se")
    ],
    "toilet": [
        ("wc.png", 0.38, "center"),
        ("vasque.png", 0.28, "wall_north")
    ],
    "garage": [
        ("voiture_topdown.png", 0.72, "center")
    ],
    "terrace": [
        ("plante_monstera.png", 0.28, "corner_se")
    ]
}

class Composer2_5D_V2_Pro:
    def __init__(self, json_path: str, output_path: str):
        self.output_path = Path(output_path)
        self.output_path.parent.mkdir(parents=True, exist_ok=True)

        with open(json_path, "r", encoding="utf-8") as f:
            self.data = json.load(f)

        self.rooms = self.data.get("rooms", [])

        # 📐 RECADRAGE ADAPTATIF SUR LA BBOX DE LA MAISON
        all_polys = [np.array(r["polygon"]) for r in self.rooms if r.get("polygon") and len(r["polygon"]) >= 3]
        if all_polys:
            all_pts = np.vstack(all_polys)
            min_x, min_y = all_pts.min(axis=0)
            max_x, max_y = all_pts.max(axis=0)
            
            margin = 120
            w = int(max_x - min_x + 2 * margin)
            h = int(max_y - min_y + 2 * margin)
            self.canvas_size = (max(800, w), max(800, h))
            self.offset = (int(margin - min_x), int(margin - min_y))

            # Recalage des coordonnées
            for room in self.rooms:
                room["polygon"] = [[p[0] + self.offset[0], p[1] + self.offset[1]] for p in room["polygon"]]
                if "centroid" in room and room["centroid"]:
                    room["centroid"] = [room["centroid"][0] + self.offset[0], room["centroid"][1] + self.offset[1]]
                else:
                    xs = [p[0] for p in room["polygon"]]
                    ys = [p[1] for p in room["polygon"]]
                    room["centroid"] = [int(np.mean(xs)), int(np.mean(ys))]
        else:
            self.canvas_size = (1600, 1600)
            self.offset = (0, 0)

        self.canvas = Image.new("RGBA", self.canvas_size, (250, 249, 246, 255))

    def compose(self):
        print(f"[Composer V2 Pro] Canvas auto-cadre : {self.canvas_size[0]}x{self.canvas_size[1]} ({len(self.rooms)} pieces)")

        # 1. Extérieur & Jardin d'ambiance
        self._draw_exterior()

        # 2. Sols PBR pièce par pièce
        self._draw_room_floors()

        # 3. Ombres douces d'ambiance 2.5D
        self._draw_ambient_shadows()

        # 4. Murs nets et structurés
        self._draw_walls()

        # 5. Mobilier réaliste top-down avec ombres
        self._place_furniture()

        # 6. Voiture SUV et plantes
        self._draw_exterior_props()

        # 7. Badges de labels typographiques avec surfaces
        self._draw_labels()

        # 8. Cadre de présentation
        self._draw_frame()

        # Sauvegarde
        self.canvas.convert("RGB").save(self.output_path, "PNG", quality=98, optimize=True)
        print(f"[Composer V2 Pro] Plan 2.5D généré avec succès -> {self.output_path}")

    def _draw_exterior(self):
        all_polys = [np.array(r["polygon"]) for r in self.rooms if r.get("polygon") and len(r["polygon"]) >= 3]
        if not all_polys:
            return

        all_pts = np.vstack(all_polys)
        min_x, min_y = all_pts.min(axis=0)
        max_x, max_y = all_pts.max(axis=0)

        margin = 40
        ew = int(max_x - min_x + 2 * margin)
        eh = int(max_y - min_y + 2 * margin)
        ex = int(min_x - margin)
        ey = int(min_y - margin)

        grass_tex = self._load_texture("gazon_jardin.png", fallback_color=(200, 230, 185))
        if grass_tex:
            tiled = self._tile_texture(grass_tex, (ew, eh))
            mask = Image.new("L", (ew, eh), 0)
            ImageDraw.Draw(mask).rounded_rectangle([0, 0, ew, eh], radius=30, fill=255)
            self.canvas.paste(tiled, (ex, ey), mask)

    def _draw_room_floors(self):
        for room in self.rooms:
            polygon = room.get("polygon")
            if not polygon or len(polygon) < 3:
                continue

            rtype = self._determine_room_type(room)
            mask = Image.new("L", self.canvas_size, 0)
            ImageDraw.Draw(mask).polygon([tuple(p) for p in polygon], fill=255)

            tex_file = TEXTURE_MAP.get(rtype, TEXTURE_MAP["default"])
            texture = self._load_texture(tex_file, fallback_color=COLOR_MAP.get(rtype, COLOR_MAP["default"]))

            xs = [p[0] for p in polygon]
            ys = [p[1] for p in polygon]
            bx1, by1, bx2, by2 = min(xs), min(ys), max(xs), max(ys)
            rw, rh = max(10, bx2 - bx1), max(10, by2 - by1)

            if texture:
                floor_tile = self._tile_texture(texture, (rw, rh))
                full_floor = Image.new("RGBA", self.canvas_size, (0, 0, 0, 0))
                full_floor.paste(floor_tile, (bx1, by1))
            else:
                color = COLOR_MAP.get(rtype, COLOR_MAP["default"])
                full_floor = Image.new("RGBA", self.canvas_size, (*color, 255))

            self.canvas.paste(full_floor, (0, 0), mask)

    def _draw_ambient_shadows(self):
        for room in self.rooms:
            polygon = room.get("polygon")
            if not polygon or len(polygon) < 3:
                continue

            mask = Image.new("L", self.canvas_size, 0)
            ImageDraw.Draw(mask).polygon([tuple(p) for p in polygon], fill=255)

            mask_np = np.array(mask)
            eroded = cv2.erode(mask_np, np.ones((10, 10), np.uint8))
            shadow_area = mask_np - eroded

            shadow_mask = Image.fromarray(shadow_area).filter(ImageFilter.GaussianBlur(radius=5))
            shadow_layer = Image.new("RGBA", self.canvas_size, (20, 20, 25, 75))
            self.canvas.paste(shadow_layer, (0, 0), shadow_mask)

    def _draw_walls(self):
        draw = ImageDraw.Draw(self.canvas)
        wall_thickness = 9
        wall_color = (35, 38, 42, 255)

        for room in self.rooms:
            polygon = room.get("polygon")
            if not polygon or len(polygon) < 3:
                continue

            pts = [tuple(p) for p in polygon] + [tuple(polygon[0])]
            draw.line(pts, fill=wall_color, width=wall_thickness, joint="curve")

    def _place_furniture(self):
        for room in self.rooms:
            polygon = room.get("polygon")
            if not polygon or len(polygon) < 3:
                continue

            rtype = self._determine_room_type(room)
            rules = FURNITURE_RULES.get(rtype, [])
            if not rules:
                continue

            xs = [p[0] for p in polygon]
            ys = [p[1] for p in polygon]
            bx1, by1, bx2, by2 = min(xs), min(ys), max(xs), max(ys)
            rw, rh = bx2 - bx1, by2 - by1
            cx, cy = (bx1 + bx2) // 2, (by1 + by2) // 2

            if rw < 70 or rh < 70:
                continue

            for asset_name, size_ratio, position in rules:
                asset_path = FURNITURE_DIR / asset_name
                if not asset_path.exists():
                    continue

                asset = Image.open(asset_path).convert("RGBA")
                target_w = max(35, int(min(rw, rh) * size_ratio))
                ratio = target_w / asset.width
                target_h = max(35, int(asset.height * ratio))
                asset_resized = asset.resize((target_w, target_h), Image.Resampling.LANCZOS)

                px, py = self._compute_position(position, cx, cy, bx1, by1, bx2, by2, target_w, target_h)

                shadow = self._create_shadow(asset_resized)
                self.canvas.paste(shadow, (px + 4, py + 6), shadow)
                self.canvas.paste(asset_resized, (px, py), asset_resized)

    def _draw_exterior_props(self):
        car_path = FURNITURE_DIR / "voiture_topdown.png"
        if car_path.exists():
            car = Image.open(car_path).convert("RGBA").resize((110, 240), Image.Resampling.LANCZOS)
            shadow = self._create_shadow(car)
            pos = (40, self.canvas_size[1] - 280)
            self.canvas.paste(shadow, (pos[0] + 5, pos[1] + 7), shadow)
            self.canvas.paste(car, pos, car)

    def _draw_labels(self):
        draw = ImageDraw.Draw(self.canvas)
        font = ImageFont.load_default()

        for idx, room in enumerate(self.rooms):
            label = room.get("label") or room.get("name") or f"Piece {idx+1}"
            area = room.get("area_m2") or room.get("area")
            centroid = room.get("centroid")

            if not centroid:
                continue

            cx, cy = centroid[0], centroid[1]
            text_lines = [str(label).upper()]
            if area:
                text_lines.append(f"{area} m2" if isinstance(area, (int, float)) else str(area))

            text_w = max(len(l) * 8 for l in text_lines) + 16
            text_h = len(text_lines) * 16 + 8
            rx1, ry1 = cx - text_w // 2, cy - text_h // 2
            rx2, ry2 = cx + text_w // 2, cy + text_h // 2

            draw.rounded_rectangle([rx1, ry1, rx2, ry2], radius=5, fill=(255, 255, 255, 235), outline=(70, 70, 75, 180), width=1)

            for i, line in enumerate(text_lines):
                line_w = len(line) * 6
                color = (25, 25, 30, 255) if i == 0 else (80, 80, 85, 255)
                draw.text((cx - line_w // 2, ry1 + 4 + i * 15), line, fill=color, font=font)

    def _draw_frame(self):
        draw = ImageDraw.Draw(self.canvas)
        draw.rectangle([10, 10, self.canvas_size[0] - 10, self.canvas_size[1] - 10], outline=(55, 60, 65, 255), width=2)

    def _determine_room_type(self, room):
        label = str(room.get("label") or room.get("name") or room.get("type") or "").lower().strip()
        keywords = {
            "chambre": "bedroom", "bed": "bedroom",
            "sejour": "living", "salon": "living", "living": "living",
            "cuisine": "kitchen", "kitchen": "kitchen",
            "toil": "toilet", "wc": "toilet", "sdb": "bathroom", "bain": "bathroom",
            "sam": "dining", "manger": "dining",
            "couloir": "corridor", "hall": "corridor",
            "veranda": "terrace", "balcon": "terrace", "terrasse": "terrace",
            "garage": "garage", "parking": "garage"
        }
        for kw, rtype in keywords.items():
            if kw in label:
                return rtype
        return "default"

    def _load_texture(self, filename, fallback_color=None):
        path = TEXTURES_DIR / filename
        if path.exists():
            return Image.open(path).convert("RGBA")
        elif fallback_color:
            return Image.new("RGBA", (256, 256), (*fallback_color, 255))
        return None

    def _tile_texture(self, texture, target_size):
        tw, th = texture.size
        w, h = max(1, target_size[0]), max(1, target_size[1])
        result = Image.new("RGBA", (w, h))
        for y in range(0, h, th):
            for x in range(0, w, tw):
                result.paste(texture, (x, y))
        return result

    def _compute_position(self, position, cx, cy, bx1, by1, bx2, by2, aw, ah):
        margin = 16
        positions = {
            "center": (cx - aw // 2, cy - ah // 2),
            "corner_nw": (bx1 + margin, by1 + margin),
            "corner_ne": (bx2 - aw - margin, by1 + margin),
            "corner_sw": (bx1 + margin, by2 - ah - margin),
            "corner_se": (bx2 - aw - margin, by2 - ah - margin),
            "wall_north": (cx - aw // 2, by1 + margin),
            "wall_south": (cx - aw // 2, by2 - ah - margin),
        }
        return positions.get(position, positions["center"])

    def _create_shadow(self, asset):
        alpha = asset.split()[3]
        shadow = Image.new("RGBA", asset.size, (0, 0, 0, 0))
        black = Image.new("RGBA", asset.size, (20, 20, 25, 90))
        shadow.paste(black, (0, 0), alpha)
        return shadow.filter(ImageFilter.GaussianBlur(radius=5))

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Composer 2.5D V2 Pro Archi Cam AI")
    parser.add_argument("--yolo-json", required=True, help="Chemin vers extraction.json ou yolo_output.json")
    parser.add_argument("--output", required=True, help="Chemin de sortie de l'image 2.5D")

    args = parser.parse_args()
    composer = Composer2_5D_V2_Pro(args.yolo_json, args.output)
    composer.compose()
