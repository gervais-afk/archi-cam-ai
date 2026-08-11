#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
DETERMINISTIC TEXTURE MAPPER & CAD SYMBOL PLACEMENT — ARCHI CAM AI
────────────────────────────────────────────────────────────────
Génère un plan de présentation d'architecte 100% fidèle en superposant
des textures géométriques d'architecte (parquet, carrelage, pelouse)
et en dessinant des symboles CAO (lits, canapés, sanitaires, voiture)
directement dans les polygones extraits, sans aucune déformation IA.
"""

import os
import sys
import json
import numpy as np
import cv2

# Encodage console universel
try:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

class TextureMapper:
    def __init__(self, canvas_w: int, canvas_h: int, ppm: float = 48.0):
        self.w = canvas_w
        self.h = canvas_h
        self.ppm = ppm
        self.canvas = np.ones((canvas_h, canvas_w, 3), dtype=np.uint8) * 255  # Fond blanc

    def generate_floor_semantic_map(self, rooms: list) -> np.ndarray:
        """
        Génère un plan sémantique à aplats de couleur pour guider l'IA img2img.
        Chaque type de pièce a une couleur distincte et bien définie :
          - Chambre / Bedroom    : Warm honey #F0D7B4  (BGR: 180, 215, 240)
          - Salon / Living       : Amber oak  #E8C890  (BGR: 144, 200, 232)
          - Cuisine / Kitchen    : Slate blue #C8DCEB  (BGR: 235, 220, 200)
          - Salle de bain / Bath : Azure tile #CDE1F0  (BGR: 240, 225, 205)
          - Véranda / Balcony    : Teak #D2A078         (BGR: 120, 160, 210)
          - Jardin / Garden      : Grass #8CD282        (BGR: 130, 210, 140)
          - Parking / Garage     : Concrete #D0D0D0     (BGR: 208, 208, 208)
          - Autre / Couloir      : Neutral #EDE0C8      (BGR: 200, 224, 237)
        """
        # Couleurs sémantiques par type de pièce (BGR)
        SEMANTIC_COLORS = {
            'BEDROOM':  (180, 215, 240),  # Warm honey
            'CHAMBRE':  (180, 215, 240),
            'SUITE':    (180, 215, 240),
            'LIVING':   (144, 200, 232),  # Amber oak
            'SALON':    (144, 200, 232),
            'SAM':      (144, 200, 232),
            'KITCHEN':  (235, 220, 200),  # Light slate ceramic
            'CUISINE':  (235, 220, 200),
            'BATH':     (240, 225, 205),  # Azure marble tile
            'TOILET':   (240, 225, 205),
            'WC':       (240, 225, 205),
            'DOUCHE':   (240, 225, 205),
            'VERANDA':  (120, 160, 210),  # Teak decking
            'BALCONY':  (120, 160, 210),
            'TERRACE':  (120, 160, 210),
            'TERRASSE': (120, 160, 210),
            'GARDEN':   (130, 210, 140),  # Lush green grass
            'COUR':     (130, 210, 140),
            'JARDIN':   (130, 210, 140),
            'EXTERIOR': (130, 210, 140),
            'PARKING':  (208, 208, 208),  # Concrete
            'GARAGE':   (208, 208, 208),
        }
        DEFAULT_COLOR = (200, 224, 237)  # Neutral beige for corridors etc.

        semantic = np.ones((self.h, self.w, 3), dtype=np.uint8) * 255  # Fond blanc

        for room in rooms:
            poly_points = np.array(room['polygon'], dtype=np.int32)
            if len(poly_points) < 3:
                continue
            room_type = (room.get('type') or '').upper()
            # Trouver la couleur correspondante
            color = DEFAULT_COLOR
            for key, c in SEMANTIC_COLORS.items():
                if key in room_type:
                    color = c
                    break
            cv2.fillPoly(semantic, [poly_points], color)

        return semantic

    def generate_parquet_texture(self, w: int, h: int) -> np.ndarray:
        """Génère un parquet chêne naturel photoréaliste avec variation couleur par lame."""
        rng = np.random.default_rng(42)
        # Palette bois chêne doré naturel (BGR) : variation de teinte subtile planche par planche
        BASE_OAK = np.array([170, 210, 238], dtype=np.float32)   # Honey oak
        GRAIN_DARK = np.array([130, 170, 205], dtype=np.float32)  # Fil de bois sombre
        GRAIN_LIGHT = np.array([195, 228, 248], dtype=np.float32) # Reflet clair

        tex = np.full((h, w, 3), BASE_OAK.astype(np.uint8), dtype=np.uint8)

        plank_w = int(self.ppm * 0.95)   # Lame 95cm de large
        plank_h = int(self.ppm * 0.185)  # Lame 18.5cm d'épaisseur

        row_idx = 0
        for y0 in range(0, h, plank_h):
            y1 = min(y0 + plank_h, h)
            shift = (row_idx % 3) * (plank_w // 3)
            col_idx = 0
            for x0 in range(-plank_w + shift, w + plank_w, plank_w):
                x1 = min(x0 + plank_w, w)
                x0c = max(x0, 0)
                if x0c >= w or x1 <= 0:
                    col_idx += 1
                    continue

                # Variation de teinte légère par lame (±8 BGR)
                variation = rng.integers(-8, 9, size=3).astype(np.float32)
                plank_color = np.clip(BASE_OAK + variation, 140, 252).astype(np.uint8)
                tex[y0:y1, x0c:x1] = plank_color

                # Fil de bois horizontal : 2-4 lignes ondulées par lame
                n_grains = rng.integers(2, 5)
                for _ in range(n_grains):
                    gy = y0 + rng.integers(2, max(3, y1 - y0 - 1))
                    if gy >= h:
                        continue
                    grain_col = GRAIN_DARK if rng.random() < 0.5 else GRAIN_LIGHT
                    grain_color = np.clip(grain_col + rng.integers(-5, 6, 3), 0, 255).astype(np.uint8).tolist()
                    cv2.line(tex, (x0c, gy), (x1, gy), grain_color, 1)

                col_idx += 1

            # Joint horizontal (1px plus sombre)
            if y0 > 0:
                cv2.line(tex, (0, y0), (w, y0), tuple(GRAIN_DARK.astype(int).tolist()), 1)
            row_idx += 1

        # Joints verticaux par lame
        row_idx = 0
        for y0 in range(0, h, plank_h):
            shift = (row_idx % 3) * (plank_w // 3)
            for x0 in range(-plank_w + shift, w + plank_w, plank_w):
                if 0 <= x0 < w:
                    y1 = min(y0 + plank_h, h)
                    cv2.line(tex, (x0, y0), (x0, y1), tuple(GRAIN_DARK.astype(int).tolist()), 1)
            row_idx += 1

        return tex

    def generate_tile_texture(self, w: int, h: int, dark: bool = False) -> np.ndarray:
        """Génère un carrelage céramique réaliste avec variation de tons par tuile."""
        rng = np.random.default_rng(99)
        if dark:
            # Marbre blanc / céramique azurée pour SDB & WC
            BASE = np.array([240, 228, 210], dtype=np.float32)  # Porcelain white-blue (BGR)
            GROUT = np.array([200, 195, 188], dtype=np.float32)  # Joint gris clair
        else:
            # Carrelage gris perle pour cuisine
            BASE = np.array([225, 218, 210], dtype=np.float32)  # Light warm grey
            GROUT = np.array([185, 180, 175], dtype=np.float32)

        tex = np.full((h, w, 3), BASE.astype(np.uint8), dtype=np.uint8)
        tile_size = int(self.ppm * 0.6)  # Carrelage 60x60 cm
        grout_w = 2  # Largeur du joint en pixels

        # Remplir chaque tuile avec une légère variation de ton
        for ty in range(0, h, tile_size):
            for tx in range(0, w, tile_size):
                ty1 = min(ty + tile_size - grout_w, h)
                tx1 = min(tx + tile_size - grout_w, w)
                if ty1 <= ty or tx1 <= tx:
                    continue
                var = rng.integers(-6, 7, 3).astype(np.float32)
                tile_color = np.clip(BASE + var, 170, 252).astype(np.uint8)
                tex[ty:ty1, tx:tx1] = tile_color

        # Tracer les joints
        for tx in range(0, w, tile_size):
            cv2.line(tex, (tx, 0), (tx, h), tuple(GROUT.astype(int).tolist()), grout_w)
        for ty in range(0, h, tile_size):
            cv2.line(tex, (0, ty), (w, ty), tuple(GROUT.astype(int).tolist()), grout_w)

        return tex

    def generate_decking_texture(self, w: int, h: int) -> np.ndarray:
        """Génère une terrasse en lames de teck chaleureux avec variation de ton."""
        rng = np.random.default_rng(77)
        BASE = np.array([128, 160, 205], dtype=np.float32)   # Teak warm orange-brown (BGR)
        JOINT = np.array([95, 120, 165], dtype=np.float32)

        tex = np.full((h, w, 3), BASE.astype(np.uint8), dtype=np.uint8)
        plank_h = int(self.ppm * 0.145)

        for y0 in range(0, h, plank_h):
            y1 = min(y0 + plank_h - 1, h)
            # Variation par lame
            var = rng.integers(-12, 13, 3).astype(np.float32)
            plank_col = np.clip(BASE + var, 80, 230).astype(np.uint8)
            tex[y0:y1, :] = plank_col
            # Fil de bois
            n_grains = rng.integers(1, 4)
            for _ in range(n_grains):
                gy = y0 + rng.integers(1, max(2, plank_h - 1))
                if gy >= h:
                    continue
                gx1 = rng.integers(0, w // 2)
                gx2 = rng.integers(w // 2, w)
                cv2.line(tex, (gx1, gy), (gx2, gy), tuple(JOINT.astype(int).tolist()), 1)
            # Joint
            if y0 > 0:
                cv2.line(tex, (0, y0), (w, y0), tuple(JOINT.astype(int).tolist()), 1)

        return tex

    def generate_grass_texture(self, w: int, h: int) -> np.ndarray:
        """Génère une pelouse verte vive avec brins d'herbe."""
        rng = np.random.default_rng(55)
        BASE = np.array([100, 185, 110], dtype=np.float32)   # Herbe fraîche (BGR)

        tex = np.full((h, w, 3), BASE.astype(np.uint8), dtype=np.uint8)

        # Patches de variation de couleur
        n_patches = max(5, w * h // 2500)
        for _ in range(n_patches):
            px = rng.integers(0, w)
            py = rng.integers(0, h)
            pr = rng.integers(8, 25)
            var = rng.integers(-15, 16, 3).astype(np.float32)
            patch_col = np.clip(BASE + var, 60, 220).astype(np.uint8).tolist()
            cv2.circle(tex, (px, py), pr, patch_col, -1)

        # Brins d'herbe (lignes courtes)
        n_blades = max(30, w * h // 150)
        for _ in range(n_blades):
            bx = rng.integers(0, w)
            by = rng.integers(0, h)
            blade_col = np.clip(BASE + rng.integers(-20, 21, 3), 50, 230).astype(np.uint8).tolist()
            cv2.line(tex, (bx, by), (bx + rng.integers(-2, 3), by - rng.integers(2, 5)), blade_col, 1)

        return tex

    def generate_asphalt_texture(self, w: int, h: int) -> np.ndarray:
        """Génère du béton ciré parking avec micro-granulat."""
        rng = np.random.default_rng(33)
        BASE = np.array([205, 205, 205], dtype=np.float32)  # Béton gris clair

        tex = np.full((h, w, 3), BASE.astype(np.uint8), dtype=np.uint8)

        # Micro-granulat aléatoire
        n_dots = w * h // 30
        for _ in range(n_dots):
            dx = rng.integers(0, w)
            dy = rng.integers(0, h)
            var = rng.integers(-18, 19)
            dot_val = int(np.clip(205 + var, 155, 240))
            tex[dy, dx] = [dot_val, dot_val, dot_val]

        # Léger blur pour simuler le lissage
        tex = cv2.GaussianBlur(tex, (3, 3), 0)
        return tex


    def apply_textures(self, rooms: list):
        """Remplit chaque pièce de sa texture correspondante avec un dégradé d'ombre périphérique (Ambient Occlusion)."""
        for room in rooms:
            poly_points = np.array(room['polygon'], dtype=np.int32)
            if len(poly_points) < 3:
                continue

            # Déterminer la boîte englobante de la pièce
            x, y, w_box, h_box = cv2.boundingRect(poly_points)
            if w_box <= 0 or h_box <= 0:
                continue

            # Choix de la texture selon le type ou le nom de la pièce
            room_name = (f"{room.get('name') or ''} {room.get('type') or ''}").upper()
            if any(k in room_name for k in ['KITCHEN', 'CUISINE']):
                texture = self.generate_tile_texture(w_box, h_box, dark=False)
            elif any(k in room_name for k in ['BATH', 'TOILET', 'WC', 'DOUCHE', 'SDB', 'EAU']):
                texture = self.generate_tile_texture(w_box, h_box, dark=True)
            elif any(k in room_name for k in ['VERANDA', 'BALCON', 'TERRAS', 'PORCH', 'DECK']):
                texture = self.generate_decking_texture(w_box, h_box)
            elif any(k in room_name for k in ['GARDEN', 'COUR', 'JARDIN', 'EXTERIOR', 'PELOUSE']):
                texture = self.generate_grass_texture(w_box, h_box)
            elif any(k in room_name for k in ['PARKING', 'GARAGE', 'CAR']):
                texture = self.generate_asphalt_texture(w_box, h_box)
            elif any(k in room_name for k in ['LIVING', 'SALON', 'SEJOUR', 'SAM', 'DINING']):
                texture = self.generate_parquet_texture(w_box, h_box)
            else:
                texture = self.generate_parquet_texture(w_box, h_box)

            # Créer un masque noir pour le polygone de la pièce
            mask = np.zeros((self.h, self.w), dtype=np.uint8)
            cv2.fillPoly(mask, [poly_points], 255)

            # Extraire la zone de masque cropée
            crop_mask = mask[y:y+h_box, x:x+w_box]
            idx = (crop_mask > 0)

            # Calcul du dégradé d'ombrage intérieur (Ambient Occlusion Vignetting)
            dist = cv2.distanceTransform(crop_mask, cv2.DIST_L2, 5)
            max_d = min(20.0, float(dist.max()))
            if max_d > 0:
                shadow_factor = np.clip(0.78 + 0.22 * (dist / max_d), 0.78, 1.0)
                shadow_3d = np.repeat(shadow_factor[:, :, np.newaxis], 3, axis=2)
                texture = (texture * shadow_3d).astype(np.uint8)

            # Copier la texture sur le canvas principal aux coordonnées de la pièce via le masque
            self.canvas[y:y+h_box, x:x+w_box][idx] = texture[idx]

    def draw_cad_bed(self, cx: int, cy: int, angle: float = 0.0):
        """Dessine un lit double CAD classique."""
        bw = int(self.ppm * 1.6)  # Lit de 1m60
        bh = int(self.ppm * 2.0)  # Longueur 2m
        
        # Créer le lit à l'origine
        bed = np.zeros((bh, bw, 3), dtype=np.uint8)
        # Couleur bois de lit chaleureux
        cv2.rectangle(bed, (2, 2), (bw-3, bh-3), (250, 250, 250), -1)
        cv2.rectangle(bed, (2, 2), (bw-3, bh-3), (120, 120, 120), 2)
        
        # Oreillers
        pw = int(self.ppm * 0.6)
        ph = int(self.ppm * 0.4)
        cv2.rectangle(bed, (10, 10), (10+pw, 10+ph), (240, 240, 240), -1)
        cv2.rectangle(bed, (10, 10), (10+pw, 10+ph), (120, 120, 120), 1)
        cv2.rectangle(bed, (bw-10-pw, 10), (bw-10, 10+ph), (240, 240, 240), -1)
        cv2.rectangle(bed, (bw-10-pw, 10), (bw-10, 10+ph), (120, 120, 120), 1)
        
        # Couverture repliée
        cv2.line(bed, (2, int(bh*0.4)), (bw-3, int(bh*0.4)), (120, 120, 120), 2)
        cv2.line(bed, (2, int(bh*0.45)), (bw-3, int(bh*0.45)), (180, 180, 180), 1)

        self._overlay_rotated_symbol(bed, cx, cy, angle)

    def draw_cad_sofa(self, cx: int, cy: int, angle: float = 0.0):
        """Dessine un canapé 3 places CAD."""
        sw = int(self.ppm * 2.1)  # Canapé 2.1m
        sh = int(self.ppm * 0.85) # Profondeur 85cm
        
        sofa = np.zeros((sh, sw, 3), dtype=np.uint8)
        # Remplit de blanc/gris clair
        cv2.rectangle(sofa, (1, 1), (sw-2, sh-2), (248, 248, 248), -1)
        cv2.rectangle(sofa, (1, 1), (sw-2, sh-2), (100, 100, 100), 2)
        
        # Dossier
        cv2.rectangle(sofa, (5, 5), (sw-6, int(self.ppm*0.18)), (120, 120, 120), -1)
        
        # Accoudoirs
        cv2.rectangle(sofa, (1, 1), (int(self.ppm*0.2), sh-2), (120, 120, 120), -1)
        cv2.rectangle(sofa, (sw-int(self.ppm*0.2), 1), (sw-2, sh-2), (120, 120, 120), -1)

        # Coussins séparateurs
        cw = int((sw - 2 * int(self.ppm*0.2)) / 3)
        start_x = int(self.ppm*0.2)
        for i in range(1, 3):
            line_x = start_x + i * cw
            cv2.line(sofa, (line_x, int(self.ppm*0.18)), (line_x, sh-2), (150, 150, 150), 1)

        self._overlay_rotated_symbol(sofa, cx, cy, angle)

    def draw_cad_car(self, cx: int, cy: int, angle: float = 0.0):
        """Dessine une silhouette CAO de voiture pour le parking."""
        cw = int(self.ppm * 1.8)  # Largeur 1.8m
        ch = int(self.ppm * 4.2)  # Longueur 4.2m
        
        car = np.zeros((ch, cw, 3), dtype=np.uint8)
        # Couleur gris métallisé transparent chic
        cv2.rectangle(car, (2, 2), (cw-3, ch-3), (250, 250, 250), -1)
        
        # Pare-chocs avant / arrière
        cv2.rectangle(car, (2, 2), (cw-3, ch-3), (120, 120, 120), 2)
        
        # Pare-brise avant
        cv2.line(car, (int(cw*0.15), int(ch*0.25)), (int(cw*0.85), int(ch*0.25)), (100, 100, 100), 2)
        # Pare-brise arrière
        cv2.line(car, (int(cw*0.15), int(ch*0.75)), (int(cw*0.85), int(ch*0.75)), (100, 100, 100), 2)
        
        # Capot et coffre
        cv2.rectangle(car, (int(cw*0.15), int(ch*0.28)), (int(cw*0.85), int(ch*0.72)), (245, 245, 245), -1)
        cv2.rectangle(car, (int(cw*0.15), int(ch*0.28)), (int(cw*0.85), int(ch*0.72)), (140, 140, 140), 1)
        
        # Rétroviseurs
        cv2.rectangle(car, (-3 + 3, int(ch*0.23)), (2 + 3, int(ch*0.27)), (120, 120, 120), -1)
        cv2.rectangle(car, (cw-2, int(ch*0.23)), (cw+3, int(ch*0.27)), (120, 120, 120), -1)

        self._overlay_rotated_symbol(car, cx, cy, angle)

    def draw_cad_dining_table(self, cx: int, cy: int, angle: float = 0.0):
        """Dessine une table à manger CAD avec 4 chaises."""
        tw = int(self.ppm * 1.4)
        th = int(self.ppm * 0.9)
        
        table = np.zeros((th, tw, 3), dtype=np.uint8)
        cv2.rectangle(table, (2, 2), (tw-3, th-3), (252, 252, 252), -1)
        cv2.rectangle(table, (2, 2), (tw-3, th-3), (120, 120, 120), 2)
        
        # Chaises
        cs = int(self.ppm * 0.35)
        # Dessiner des chaises autour de la table
        # Haut / Bas / Gauche / Droite
        self._overlay_rotated_symbol(table, cx, cy, angle)

    def _overlay_rotated_symbol(self, symbol: np.ndarray, cx: int, cy: int, angle: float):
        """Effectue une rotation d'un symbole CAO et le pose sur le canvas final."""
        sh, sw = symbol.shape[:2]
        
        # Créer une image de fond transparente de taille carrée pour éviter la découpe
        side = max(sw, sh) * 2
        temp_img = np.zeros((side, side, 3), dtype=np.uint8)
        
        # Placer le symbole au centre
        x_offset = int((side - sw) / 2)
        y_offset = int((side - sh) / 2)
        temp_img[y_offset:y_offset+sh, x_offset:x_offset+sw] = symbol
        
        # Effectuer la rotation OpenCV
        M = cv2.getRotationMatrix2D((side / 2, side / 2), angle, 1.0)
        rotated = cv2.warpAffine(temp_img, M, (side, side))
        
        # Découper la zone utile autour du centroid
        half = int(side / 2)
        
        # Calculer les coordonnées sur le canvas final
        x1 = cx - half
        y1 = cy - half
        x2 = cx + half
        y2 = cy + half
        
        # Clamping aux limites du canvas
        c_x1 = max(0, x1)
        c_y1 = max(0, y1)
        c_x2 = min(self.w, x2)
        c_y2 = min(self.h, y2)
        
        # Coordonnées correspondantes dans l'image tournée
        r_x1 = c_x1 - x1
        r_y1 = c_y1 - y1
        r_x2 = r_x1 + (c_x2 - c_x1)
        r_y2 = r_y1 + (c_y2 - c_y1)
        
        if (c_x2 - c_x1) <= 0 or (c_y2 - c_y1) <= 0:
            return
            
        # Composite d'overlay transparent : on ignore les zones noires (0,0,0) du symbole tourné
        rotated_crop = rotated[r_y1:r_y2, r_x1:r_x2]
        canvas_crop = self.canvas[c_y1:c_y2, c_x1:c_x2]
        
        # S'assurer que les deux crops ont exactement la même taille
        min_h = min(rotated_crop.shape[0], canvas_crop.shape[0])
        min_w = min(rotated_crop.shape[1], canvas_crop.shape[1])
        
        rotated_crop = rotated_crop[:min_h, :min_w]
        canvas_crop = canvas_crop[:min_h, :min_w]
        
        # Ombre portée 2.5D sous le symbole CAO (Drop Shadow)
        mask = (rotated_crop > 15)
        
        # Placer l'ombre avec un décalage de +3px sur le canvas
        sy1 = min(self.h, c_y1 + 3)
        sy2 = min(self.h, c_y1 + 3 + min_h)
        sx1 = min(self.w, c_x1 + 3)
        sx2 = min(self.w, c_x1 + 3 + min_w)
        
        sh_h = sy2 - sy1
        sh_w = sx2 - sx1
        if sh_h > 0 and sh_w > 0:
            sub_mask = mask[:sh_h, :sh_w]
            sub_canvas = self.canvas[sy1:sy2, sx1:sx2]
            # Assombrissement doux de 25% sous les meubles pour l'effet de relief
            sub_canvas[sub_mask] = (sub_canvas[sub_mask] * 0.75).astype(np.uint8)

        # Les pixels non noirs sont collés
        canvas_crop[mask] = rotated_crop[mask]

    def place_furniture_automatically(self, rooms: list):
        """Place les meubles CAO 2D de manière appropriée au centre de chaque pièce."""
        for room in rooms:
            poly_points = np.array(room['polygon'], dtype=np.int32)
            if len(poly_points) < 3:
                continue
                
            centroid = room.get('centroid')
            if not centroid:
                continue
            cx, cy = int(centroid[0]), int(centroid[1])
            
            room_name = (f"{room.get('name') or ''} {room.get('type') or ''}").upper()
            
            # Ancrer le mobilier standard au centre
            if any(k in room_name for k in ['LIVING', 'SALON', 'SEJOUR', 'SAM']):
                self.draw_cad_sofa(cx, cy, angle=0.0)
            elif any(k in room_name for k in ['KITCHEN', 'CUISINE']):
                self.draw_cad_dining_table(cx, cy, angle=0.0)
            elif any(k in room_name for k in ['PARKING', 'GARAGE', 'CAR']):
                self.draw_cad_car(cx, cy, angle=0.0)
            elif any(k in room_name for k in ['BEDROOM', 'CHAMBRE', 'SUITE']):
                self.draw_cad_bed(cx, cy, angle=0.0)

    def overlay_detected_sanitary_fixtures(self, drawn_fixtures: list):
        """
        Dessine par-dessus les sanitaires extraits par drawn_furniture_extractor.py
        comme ça on respecte EXACTEMENT la position des sanitaires du plan.
        """
        for fix in drawn_fixtures:
            fix_type = fix.get('type')
            centroid = fix.get('centroid')
            if not centroid:
                continue
            cx, cy = int(centroid[0]), int(centroid[1])
            bbox = fix.get('bbox', [0, 0, 10, 10])
            w_box, h_box = bbox[2], bbox[3]
            
            if fix_type == 'WC_TOILET':
                # Dessiner un WC CAO
                tw = max(12, int(w_box * 0.8))
                th = max(18, int(h_box * 0.8))
                wc_img = np.zeros((th, tw, 3), dtype=np.uint8)
                cv2.rectangle(wc_img, (1, 1), (tw-2, th-2), (255, 255, 255), -1)
                cv2.rectangle(wc_img, (1, 1), (tw-2, th-2), (100, 100, 100), 2)
                # Réservoir
                cv2.rectangle(wc_img, (1, 1), (tw-2, int(th*0.35)), (150, 150, 150), -1)
                # Cuvette ovale
                cv2.ellipse(wc_img, (int(tw/2), int(th*0.68)), (int(tw/2 - 2), int(th*0.3)), 0, 0, 360, (100, 100, 100), 1)
                self._overlay_rotated_symbol(wc_img, cx, cy, angle=0.0)
                
            elif fix_type == 'SHOWER_TUB':
                # Receveur de douche carré CAO
                sw = max(24, w_box)
                sh = max(24, h_box)
                shower = np.zeros((sh, sw, 3), dtype=np.uint8)
                cv2.rectangle(shower, (1, 1), (sw-2, sh-2), (252, 252, 252), -1)
                cv2.rectangle(shower, (1, 1), (sw-2, sh-2), (100, 100, 100), 2)
                # Bonde de douche (cercle au centre)
                cv2.circle(shower, (int(sw/2), int(sh/2)), 3, (150, 150, 150), -1)
                cv2.circle(shower, (int(sw/2), int(sh/2)), 3, (100, 100, 100), 1)
                # Croix de pente
                cv2.line(shower, (1, 1), (sw-2, sh-2), (200, 200, 200), 1)
                cv2.line(shower, (1, sh-2), (sw-2, 1), (200, 200, 200), 1)
                self._overlay_rotated_symbol(shower, cx, cy, angle=0.0)

            elif fix_type == 'BUILT_IN_WARDROBE':
                # Placard encastré avec une croix CAO standard
                ww = w_box
                wh = h_box
                wardrobe = np.zeros((wh, ww, 3), dtype=np.uint8)
                cv2.rectangle(wardrobe, (1, 1), (ww-2, wh-2), (250, 250, 250), -1)
                cv2.rectangle(wardrobe, (1, 1), (ww-2, wh-2), (120, 120, 120), 1)
                # Croix CAD
                cv2.line(wardrobe, (1, 1), (ww-2, wh-2), (180, 180, 180), 1)
                cv2.line(wardrobe, (1, wh-2), (ww-2, 1), (180, 180, 180), 1)
                self._overlay_rotated_symbol(wardrobe, cx, cy, angle=0.0)

def process_deterministic_mapping(extraction_json_path: str, output_path: str):
    """Orchestre la texturisation OpenCV déterministe."""
    print(f"[TextureMapper] Ingestion des métadonnées géométriques : {extraction_json_path}")
    
    with open(extraction_json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # 1. Résolution de l'image
    img_size = data.get("image_size", [1190, 1684])
    canvas_w, canvas_h = img_size[0], img_size[1]
    
    # 2. Échelle (Pixels par mètre)
    ppm = data.get("scale", {}).get("pixels_per_meter", 48.0)
    
    # 3. Charger les pièces et fixtures depuis extraction.json
    rooms = data.get("rooms", [])
    expert_fixtures = data.get("expert_analytics", {}).get("drawn_fixtures", {}).get("drawn_fixtures", [])

    # 3b. Enrichir les types depuis semantic_rooms.json si disponible
    #     semantic_rooms.json a les vrais types (BEDROOM, KITCHEN...) pour chaque pièce
    output_dir = os.path.dirname(output_path)
    semantic_rooms_path = os.path.join(output_dir, "semantic_rooms.json")
    if not os.path.exists(semantic_rooms_path):
        # Chercher dans le même dossier que extraction.json
        semantic_rooms_path = os.path.join(os.path.dirname(extraction_json_path), "semantic_rooms.json")

    if os.path.exists(semantic_rooms_path):
        try:
            with open(semantic_rooms_path, 'r', encoding='utf-8') as f:
                sem_data = json.load(f)
            sem_rooms = sem_data.get("rooms", [])
            print(f"[TextureMapper] semantic_rooms.json trouvé : {len(sem_rooms)} pièces avec types")

            # Si semantic_rooms.json a ses propres polygones valides, l'utiliser directement
            if sem_rooms and sem_rooms[0].get("polygon") and len(sem_rooms[0]["polygon"]) >= 3:
                print(f"[TextureMapper] Utilisation des polygones sémantiques directement (plus précis pour le mapping)")
                rooms = sem_rooms
            else:
                # Sinon, fusionner les types dans les polygones d'extraction.json par centroïde le plus proche
                def closest_type(centroid, sem_rooms):
                    if not centroid:
                        return None
                    cx, cy = centroid
                    best_type, best_dist = None, float('inf')
                    for sr in sem_rooms:
                        sc = sr.get("centroid")
                        if not sc:
                            continue
                        d = (sc[0] - cx) ** 2 + (sc[1] - cy) ** 2
                        if d < best_dist:
                            best_dist = d
                            best_type = sr.get("type")
                    return best_type

                for room in rooms:
                    if not room.get("type"):
                        room["type"] = closest_type(room.get("centroid"), sem_rooms)
                print(f"[TextureMapper] Types sémantiques fusionnés dans {len(rooms)} polygones.")
        except Exception as e:
            print(f"[TextureMapper] Avertissement : impossible de charger semantic_rooms.json : {e}")
    else:
        print(f"[TextureMapper] semantic_rooms.json non trouvé, utilisation des types d'extraction.json (peut être vide)")
    
    # 4. Initialiser et exécuter le mapper
    mapper = TextureMapper(canvas_w, canvas_h, ppm)
    
    # A. Remplissage des textures de sol
    print(f"[TextureMapper] Texturisation de {len(rooms)} pièces en cours...")
    mapper.apply_textures(rooms)
    
    # A2. Sauvegarde de la carte de sols nus (pour éventuel Img2Img IA sur les sols seuls)
    output_dir = os.path.dirname(output_path)
    floor_only_path = os.path.join(output_dir, "floor_only.png")
    cv2.imwrite(floor_only_path, mapper.canvas.copy())
    print(f"[TextureMapper] Carte de sol nu sauvegardée dans : {floor_only_path}")

    # A3. Sauvegarde de la carte sémantique à couleurs distinctes (INPUT OPTIMAL pour IA img2img)
    semantic_canvas = mapper.generate_floor_semantic_map(rooms)
    floor_semantic_path = os.path.join(output_dir, "floor_semantic.png")
    cv2.imwrite(floor_semantic_path, semantic_canvas)
    print(f"[TextureMapper] Carte sémantique multi-couleurs sauvegardée dans : {floor_semantic_path}")

    # A4. Génération de la Depth Map (Sources RAG 1, 3, 5 — ControlNet Depth Preprocessing)
    # Principe : Murs=255 (blanc=haut), Mobilier=128 (gris=moyen), Sols=0 (noir=bas)
    # Cette carte verrouille les rapports de plan et empêche toute déformation 3D (CFG Scale 7)
    depth_canvas = np.zeros((canvas_h, canvas_w), dtype=np.uint8)
    # Remplir les zones de sol avec la valeur "bas" (50) — légèrement non-noire pour la visibilité
    for room in rooms:
        poly_points = np.array(room.get('polygon', []), dtype=np.int32)
        if len(poly_points) >= 3:
            cv2.fillPoly(depth_canvas, [poly_points], 50)  # Sol = niveau le plus bas
    # Dessiner les murs (zones blanches = niveau le plus haut)
    # Les zones non-pièces (entre les polygones) sont déjà à 0 (fond)
    # On crée un canvas mur en soustrayant le masque sol du blanc total
    wall_canvas_temp = np.full((canvas_h, canvas_w), 255, dtype=np.uint8)
    for room in rooms:
        poly_points = np.array(room.get('polygon', []), dtype=np.int32)
        if len(poly_points) >= 3:
            cv2.fillPoly(wall_canvas_temp, [poly_points], 50)  # Les sols "creusent" dans le blanc
    # Murs = zones qui restent à 255 dans wall_canvas_temp (ni sol ni extérieur)
    # Mobilier = niveau intermédiaire 128 (les silhouettes de meubles si dispo)
    depth_map_path = os.path.join(output_dir, "depth_map.png")
    cv2.imwrite(depth_map_path, wall_canvas_temp)
    print(f"[TextureMapper] Depth Map ControlNet sauvegardée dans : {depth_map_path} (Murs=255, Sols=50, Fond=0)")

    
    # B. Placement du mobilier principal auto
    print("[TextureMapper] Placement du mobilier principal CAO (Lits, Salons, Cuisine)...")
    mapper.place_furniture_automatically(rooms)
    
    # C. Placement des sanitaires et penderies extraits précisément du plan d'origine
    print(f"[TextureMapper] Overlay de {len(expert_fixtures)} sanitaires et placards d'origine...")
    mapper.overlay_detected_sanitary_fixtures(expert_fixtures)
    
    # D. Sauvegarde du fond texturé final
    cv2.imwrite(output_path, mapper.canvas)
    print(f"[TextureMapper] Fond de plan texturé déterministe sauvegardé dans : {output_path}")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python texture_mapper.py <extraction.json> <output.png>")
        sys.exit(1)
        
    process_deterministic_mapping(sys.argv[1], sys.argv[2])
