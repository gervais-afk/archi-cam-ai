#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
MOTEUR DE COMPOSITION 2.5D HYBRIDE PRO — ARCHI CAM AI
────────────────────────────────────────────────────
Transforme un plan 2D brut vectoriel en un rendu photoréaliste top-down 2.5D :
- Sols texturés PBR (parquet chêne, marbre, mosaïque, gazon, pavés)
- Mobilier top-down réaliste dimensionné et positionné intelligemment
- Ombres portées douces à 45°
- Murs d'origine conservés au millimètre près
"""

import os
import sys
import json
import argparse
import numpy as np
import cv2
from PIL import Image, ImageDraw, ImageFilter, ImageOps

# Support universel encodage Windows (évite les erreurs CP1252 sur console)
try:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    if hasattr(sys.stderr, "reconfigure"):
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

ASSETS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "public", "assets", "floorplan_2_5d")
TEXTURES_DIR = os.path.join(ASSETS_DIR, "textures")
FURNITURE_DIR = os.path.join(ASSETS_DIR, "furniture")

class Plan2_5DComposer:
    def __init__(self, plan_image_path: str, yolo_json_path: str = None, metadata_json_path: str = None):
        self.plan_path = plan_image_path
        self.yolo_json_path = yolo_json_path
        self.metadata_json_path = metadata_json_path
        
        # 1. Charger l'image du plan de base
        self.orig_bgr = cv2.imread(plan_image_path, cv2.IMREAD_COLOR)
        if self.orig_bgr is None:
            raise FileNotFoundError(f"Impossible de lire le plan source : {plan_image_path}")
        
        self.height, self.width = self.orig_bgr.shape[:2]
        
        # 2. Charger les données sémantiques des pièces
        self.rooms = self._load_rooms_data()
        
    def _load_rooms_data(self):
        rooms = []
        if self.yolo_json_path and os.path.exists(self.yolo_json_path):
            try:
                with open(self.yolo_json_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    rooms = data.get("rooms", [])
            except Exception as e:
                print(f"[2.5D Composer] Warning lecture yolo_json: {e}")
                
        if not rooms and self.metadata_json_path and os.path.exists(self.metadata_json_path):
            try:
                with open(self.metadata_json_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    rooms = data.get("rooms", [])
            except Exception as e:
                print(f"[2.5D Composer] Warning lecture metadata_json: {e}")
                
        return rooms

    def _get_texture_for_room(self, room_name: str) -> Image.Image:
        """Associe le bon matériau PBR selon la fonction de la pièce."""
        name = (room_name or "").lower()
        
        if any(k in name for k in ["chambre", "bed", "dressing"]):
            tex_file = "parquet_chene.png"
        elif any(k in name for k in ["sejour", "salon", "living", "sam", "manger"]):
            tex_file = "parquet_chene.png"
        elif any(k in name for k in ["cuis", "kitchen"]):
            tex_file = "carrelage_cuisine.png"
        elif any(k in name for k in ["bain", "sdb", "eau", "toil", "wc", "douche"]):
            tex_file = "mosaique_sdb.png"
        elif any(k in name for k in ["park", "garage", "cours", "entree"]):
            tex_file = "paves_parking.png"
        elif any(k in name for k in ["jardin", "garden", "vert"]):
            tex_file = "gazon_jardin.png"
        else:
            tex_file = "marbre_blanc.png"
            
        tex_path = os.path.join(TEXTURES_DIR, tex_file)
        if os.path.exists(tex_path):
            return Image.open(tex_path).convert("RGB")
        return Image.new("RGB", (256, 256), (240, 240, 245))

    def _tile_texture(self, texture: Image.Image, target_size: tuple) -> Image.Image:
        """Répète une texture PBR carrelable sur toute la surface."""
        tw, th = texture.size
        w, h = target_size
        tiled = Image.new("RGB", (w, h))
        for y in range(0, h, th):
            for x in range(0, w, tw):
                tiled.paste(texture, (x, y))
        return tiled

    def compose(self, output_path: str):
        print(f"[2.5D Composer] Demarrage de la composition 2.5D ({self.width}x{self.height})...")
        
        # 1. Canvas de fond blanc pur
        canvas = Image.new("RGBA", (self.width, self.height), (255, 255, 255, 255))
        shadow_layer = Image.new("RGBA", (self.width, self.height), (0, 0, 0, 0))
        furniture_layer = Image.new("RGBA", (self.width, self.height), (0, 0, 0, 0))
        
        # 2. Remplissage des textures de sol par pièce
        for idx, room in enumerate(self.rooms):
            pts = room.get("polygon")
            if not pts or len(pts) < 3:
                continue
                
            np_pts = np.array(pts, dtype=np.int32)
            room_name = room.get("name") or room.get("label") or f"piece_{idx+1}"
            
            # Création du masque anti-aliasé de la pièce
            mask_np = np.zeros((self.height, self.width), dtype=np.uint8)
            cv2.fillPoly(mask_np, [np_pts], 255)
            mask_pil = Image.fromarray(mask_np).convert("L")
            
            # Application de la texture PBR
            texture = self._get_texture_for_room(room_name)
            tiled_tex = self._tile_texture(texture, (self.width, self.height))
            canvas.paste(tiled_tex, (0, 0), mask_pil)
            
            # Placement intelligent du mobilier dans la pièce
            self._place_room_furniture(room, np_pts, furniture_layer, shadow_layer)

        # 3. Flou gaussien pour ombres portées douces à 45°
        shadow_layer = shadow_layer.filter(ImageFilter.GaussianBlur(radius=6))
        
        # 4. Superposition : Sol ➔ Ombres ➔ Mobilier ➔ Murs originaux
        canvas.paste(shadow_layer, (6, 6), shadow_layer) # Décalage d'ombre douce (45°)
        canvas.paste(furniture_layer, (0, 0), furniture_layer)

        # 5. Incrustation des murs et détails techniques originaux (Textes, portes, fenêtres)
        gray = cv2.cvtColor(self.orig_bgr, cv2.COLOR_BGR2GRAY)
        # Isoler tous les éléments noirs/sombres du plan d'origine (murs, cotes, annotations)
        _, binary_ink = cv2.threshold(gray, 215, 255, cv2.THRESH_BINARY_INV)
        
        ink_rgba = np.zeros((self.height, self.width, 4), dtype=np.uint8)
        # Teinte anthracite technique professionnelle (RGB: 30, 32, 36)
        ink_rgba[binary_ink > 0] = [30, 32, 36, 255]
        ink_pil = Image.fromarray(ink_rgba, "RGBA")
        canvas.paste(ink_pil, (0, 0), ink_pil)

        # 6. Sauvegarde haute fidélité
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        canvas.save(output_path, "PNG", quality=98)
        print(f"[2.5D Composer] Rendu 2.5D sauvegarde avec succes : {output_path}")
        return output_path

    def _place_room_furniture(self, room: dict, poly_pts: np.ndarray, furn_layer: Image.Image, shadow_layer: Image.Image):
        """Positionne et redimensionne le mobilier adapté dans le polygone de la pièce."""
        room_name = (room.get("name") or room.get("label") or "").lower()
        
        # Calcul du rectangle englobant et centroïde
        x, y, w, h = cv2.boundingRect(poly_pts)
        cx, cy = x + w // 2, y + h // 2
        
        # Ne rien placer si la pièce est trop petite (< 60 px)
        if w < 60 or h < 60:
            return

        def paste_item(asset_name: str, target_cx: int, target_cy: int, scale_factor: float = 1.0, angle: float = 0):
            path = os.path.join(FURNITURE_DIR, asset_name)
            if not os.path.exists(path):
                return
            item = Image.open(path).convert("RGBA")
            iw, ih = item.size
            
            # Échelle adaptée à la surface de la pièce
            target_w = max(40, int(min(w, h) * scale_factor))
            ratio = target_w / iw
            target_h = int(ih * ratio)
            
            item = item.resize((target_w, target_h), Image.Resampling.LANCZOS)
            if angle != 0:
                item = item.rotate(angle, expand=True, resample=Image.Resampling.BICUBIC)
                
            pos = (target_cx - item.width // 2, target_cy - item.height // 2)
            
            # Créer l'ombre portée noire transparente
            shadow = Image.new("RGBA", item.size, (0, 0, 0, 0))
            shadow_draw = ImageDraw.Draw(shadow)
            item_alpha = item.split()[-1]
            shadow.paste((20, 20, 20, 110), (0, 0), item_alpha)
            
            shadow_layer.paste(shadow, (pos[0] + 5, pos[1] + 5), shadow)
            furn_layer.paste(item, pos, item)

        # Règles sémantiques d'ameublement par pièce
        if any(k in room_name for k in ["chambre", "bed"]):
            # Lit double orienté vers le mur
            paste_item("lit_double.png", cx, cy, scale_factor=0.60)
            if w > 140:
                paste_item("plante_monstera.png", x + 35, y + 35, scale_factor=0.25)
                
        elif any(k in room_name for k in ["sejour", "salon", "living"]):
            # Grand canapé + table basse + plante
            paste_item("canape_l.png", cx - 20, cy - 20, scale_factor=0.65)
            paste_item("table_salon.png", cx + 30, cy + 30, scale_factor=0.45)
            paste_item("plante_monstera.png", x + w - 40, y + 40, scale_factor=0.30)
            
        elif any(k in room_name for k in ["manger", "sam"]):
            paste_item("table_manger.png", cx, cy, scale_factor=0.65)
            
        elif any(k in room_name for k in ["bain", "sdb", "douche"]):
            paste_item("douche.png", x + 35, y + 35, scale_factor=0.40)
            paste_item("vasque.png", x + w - 35, y + 35, scale_factor=0.35)
            paste_item("wc.png", x + w - 35, y + h - 35, scale_factor=0.30)
            
        elif any(k in room_name for k in ["toil", "wc"]):
            paste_item("wc.png", cx, cy, scale_factor=0.45)
            paste_item("vasque.png", cx, y + 25, scale_factor=0.35)
            
        elif any(k in room_name for k in ["park", "garage"]):
            paste_item("voiture_topdown.png", cx, cy, scale_factor=0.75)
            
        elif any(k in room_name for k in ["veranda", "balcon"]):
            paste_item("plante_monstera.png", cx, cy, scale_factor=0.35)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Compositeur de plans 2.5D Archi Cam AI")
    parser.add_argument("--input", required=True, help="Chemin du plan d'architecte image ou PNG")
    parser.add_argument("--output", required=True, help="Chemin de sortie du rendu 2.5D")
    parser.add_argument("--yolo-json", default=None, help="Chemin du fichier yolo_output.json")
    parser.add_argument("--metadata-json", default=None, help="Chemin du metadata.json")
    
    args = parser.parse_args()
    composer = Plan2_5DComposer(args.input, args.yolo_json, args.metadata_json)
    composer.compose(args.output)
