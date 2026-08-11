#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
GÉNÉRATEUR D'ASSETS 2.5D ARCHITECTURAUX PRO — ARCHI CAM AI
──────────────────────────────────────────────────────────
Génère une bibliothèque de textures PBR carrelables haute résolution (1024x1024)
et de mobilier top-down réaliste (avec canal alpha PNG) pour le compositeur 2.5D.
"""

import os
import math
import numpy as np
import cv2
from PIL import Image, ImageDraw, ImageFilter

ASSETS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "public", "assets", "floorplan_2_5d")
TEXTURES_DIR = os.path.join(ASSETS_DIR, "textures")
FURNITURE_DIR = os.path.join(ASSETS_DIR, "furniture")

os.makedirs(TEXTURES_DIR, exist_ok=True)
os.makedirs(FURNITURE_DIR, exist_ok=True)

# ─────────────────────────────────────────────────────────────────────────────
# 1. GÉNÉRATION DES TEXTURES DE SOL PBR (1024x1024)
# ─────────────────────────────────────────────────────────────────────────────

def create_parquet_chene():
    """Parquet chêne miel à lames fines avec chanfreins."""
    size = 1024
    img = np.zeros((size, size, 3), dtype=np.uint8)
    
    # Couleur de base chêne chaud (RGB: 218, 185, 140)
    base_color = np.array([140, 185, 218], dtype=np.float32) # BGR
    plank_height = 64
    plank_width = 256
    
    for y in range(0, size, plank_height):
        row_idx = y // plank_height
        offset = (row_idx * 110) % plank_width
        for x in range(-plank_width, size + plank_width, plank_width):
            px = x + offset
            # Variation de teinte par lame (+/- 8%)
            np.random.seed((row_idx * 997 + px) % 10000)
            tint = (np.random.rand() - 0.5) * 24
            wood_bgr = np.clip(base_color + np.array([tint*0.8, tint, tint*1.1]), 100, 245).astype(np.uint8)
            
            x1, y1 = max(0, px), y
            x2, y2 = min(size, px + plank_width), min(size, y + plank_height)
            if x1 < x2 and y1 < y2:
                img[y1:y2, x1:x2] = wood_bgr
                
                # Fines veinures de bois horizontales
                vein_noise = np.random.randint(-6, 7, (y2 - y1, x2 - x1, 3))
                img[y1:y2, x1:x2] = np.clip(img[y1:y2, x1:x2].astype(np.int16) + vein_noise, 0, 255).astype(np.uint8)
                
                # Chanfrein (joint noir fin)
                cv2.rectangle(img, (x1, y1), (x2, y2), (90, 120, 150), 1)

    cv2.imwrite(os.path.join(TEXTURES_DIR, "parquet_chene.png"), img)
    print("✅ Texture générée : parquet_chene.png")

def create_marbre_blanc():
    """Carrelage grand format 60x60 effet marbre blanc/beige doux."""
    size = 1024
    img = np.full((size, size, 3), (242, 244, 245), dtype=np.uint8)
    tile_size = 256

    # Veines douces de marbre
    noise = np.random.normal(0, 4, (size, size, 3)).astype(np.uint8)
    img = cv2.add(img, noise)
    
    # Joints de carrelage fins
    for i in range(0, size, tile_size):
        cv2.line(img, (i, 0), (i, size), (200, 205, 208), 2)
        cv2.line(img, (0, i), (size, i), (200, 205, 208), 2)

    cv2.imwrite(os.path.join(TEXTURES_DIR, "marbre_blanc.png"), img)
    print("✅ Texture générée : marbre_blanc.png")

def create_carrelage_cuisine():
    """Carrelage moderne gris ardoise perlé."""
    size = 1024
    img = np.full((size, size, 3), (195, 200, 202), dtype=np.uint8)
    tile_size = 128
    
    for i in range(0, size, tile_size):
        for j in range(0, size, tile_size):
            shade = np.random.randint(-4, 5)
            cv2.rectangle(img, (i, j), (i + tile_size, j + tile_size), 
                          (195 + shade, 200 + shade, 202 + shade), -1)
            cv2.rectangle(img, (i, j), (i + tile_size, j + tile_size), (150, 155, 158), 1)

    cv2.imwrite(os.path.join(TEXTURES_DIR, "carrelage_cuisine.png"), img)
    print("✅ Texture générée : carrelage_cuisine.png")

def create_mosaique_sdb():
    """Mosaïque bleu lagon / turquoise pour salles de bain."""
    size = 1024
    img = np.zeros((size, size, 3), dtype=np.uint8)
    tile = 64
    for y in range(0, size, tile):
        for x in range(0, size, tile):
            # Nuances de turquoise aquatique (BGR)
            b = np.random.randint(190, 230)
            g = np.random.randint(180, 215)
            r = np.random.randint(110, 150)
            cv2.rectangle(img, (x, y), (x + tile, y + tile), (b, g, r), -1)
            cv2.rectangle(img, (x, y), (x + tile, y + tile), (240, 240, 240), 2)

    cv2.imwrite(os.path.join(TEXTURES_DIR, "mosaique_sdb.png"), img)
    print("✅ Texture générée : mosaique_sdb.png")

def create_gazon_jardin():
    """Pelouse verte tropicale fraîche."""
    size = 1024
    # Base vert prairie (BGR: 50, 160, 70)
    img = np.zeros((size, size, 3), dtype=np.uint8)
    img[:] = (60, 165, 80)
    
    # Texture organique d'herbe
    noise = np.random.randint(-18, 19, (size, size, 3))
    img = np.clip(img.astype(np.int16) + noise, 0, 255).astype(np.uint8)
    img = cv2.GaussianBlur(img, (3, 3), 0)

    cv2.imwrite(os.path.join(TEXTURES_DIR, "gazon_jardin.png"), img)
    print("✅ Texture générée : gazon_jardin.png")

def create_paves_parking():
    """Pavés autobloquants terracotta pour parking extérieur."""
    size = 1024
    img = np.zeros((size, size, 3), dtype=np.uint8)
    img[:] = (120, 130, 175) # Teinte terracotta douce (BGR)
    
    pw, ph = 64, 32
    for y in range(0, size, ph):
        row = y // ph
        offset = (row * 32) % 64
        for x in range(-64, size + 64, pw):
            px = x + offset
            cv2.rectangle(img, (px, y), (px + pw, y + ph), (90, 100, 140), 1)

    cv2.imwrite(os.path.join(TEXTURES_DIR, "paves_parking.png"), img)
    print("✅ Texture générée : paves_parking.png")

# ─────────────────────────────────────────────────────────────────────────────
# 2. GÉNÉRATION DU MOBILIER TOP-DOWN (PNG AVEC TRANSPARENCE RGBA)
# ─────────────────────────────────────────────────────────────────────────────

def create_lit_double():
    """Grand lit king size (draps blancs, oreillers, chemin de lit)."""
    w, h = 260, 320
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Tête de lit en bois
    draw.rounded_rectangle([20, 10, w - 20, 45], radius=6, fill=(110, 80, 55, 255), outline=(70, 50, 30, 255), width=2)
    # Matelas & Drap principal
    draw.rounded_rectangle([25, 40, w - 25, h - 15], radius=12, fill=(245, 245, 248, 255), outline=(200, 200, 205, 255), width=2)
    # Oreillers (2)
    draw.rounded_rectangle([38, 55, 118, 105], radius=6, fill=(255, 255, 255, 255), outline=(210, 210, 215, 255), width=2)
    draw.rounded_rectangle([w - 118, 55, w - 38, 105], radius=6, fill=(255, 255, 255, 255), outline=(210, 210, 215, 255), width=2)
    # Couette repliée & plaid couleur taupe
    draw.rounded_rectangle([25, 125, w - 25, h - 15], radius=8, fill=(230, 225, 220, 255), outline=(190, 185, 180, 255), width=1)
    draw.rectangle([25, h - 80, w - 25, h - 15], fill=(160, 130, 105, 255))
    
    # Tables de chevet intégrées
    draw.rounded_rectangle([0, 25, 22, 65], radius=4, fill=(130, 95, 65, 255))
    draw.rounded_rectangle([w - 22, 25, w, 65], radius=4, fill=(130, 95, 65, 255))

    img.save(os.path.join(FURNITURE_DIR, "lit_double.png"))
    print("✅ Mobilier généré : lit_double.png")

def create_canape_salon():
    """Grand canapé d'angle moderne en tissu beige/gris."""
    w, h = 340, 280
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Corps du canapé en L
    # Partie principale
    draw.rounded_rectangle([20, 20, w - 20, 120], radius=15, fill=(215, 210, 200, 255), outline=(170, 165, 155, 255), width=2)
    # Méridienne droite
    draw.rounded_rectangle([w - 120, 20, w - 20, h - 20], radius=15, fill=(215, 210, 200, 255), outline=(170, 165, 155, 255), width=2)
    
    # Coussins d'assise
    draw.rounded_rectangle([30, 30, 130, 110], radius=8, fill=(235, 230, 220, 255), outline=(180, 175, 165, 255), width=1)
    draw.rounded_rectangle([135, 30, 235, 110], radius=8, fill=(235, 230, 220, 255), outline=(180, 175, 165, 255), width=1)
    draw.rounded_rectangle([w - 110, 125, w - 30, h - 30], radius=8, fill=(235, 230, 220, 255), outline=(180, 175, 165, 255), width=1)
    
    # Coussins décoratifs colorés (moutarde / vert d'eau)
    draw.rounded_rectangle([32, 32, 62, 62], radius=4, fill=(210, 165, 60, 255))
    draw.rounded_rectangle([w - 62, 32, w - 32, 62], radius=4, fill=(80, 150, 140, 255))

    img.save(os.path.join(FURNITURE_DIR, "canape_l.png"))
    print("✅ Mobilier généré : canape_l.png")

def create_table_salon():
    """Table basse en verre avec plateau bois et tapis graphique."""
    w, h = 240, 180
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Grand tapis sous la table
    draw.rounded_rectangle([10, 10, w - 10, h - 10], radius=8, fill=(235, 230, 222, 255), outline=(200, 195, 185, 255), width=2)
    # Motifs géométriques fins sur tapis
    for offset in range(30, w - 30, 40):
        draw.line([offset, 20, offset + 20, h - 20], fill=(215, 210, 200, 255), width=2)
    
    # Table basse rectangulaire centrale
    draw.rounded_rectangle([50, 40, w - 50, h - 40], radius=8, fill=(160, 120, 85, 255), outline=(100, 75, 50, 255), width=2)
    # Plateau verre bleuté transparent
    draw.rounded_rectangle([58, 48, w - 58, h - 48], radius=6, fill=(220, 240, 255, 220), outline=(160, 200, 230, 255), width=1)

    img.save(os.path.join(FURNITURE_DIR, "table_salon.png"))
    print("✅ Mobilier généré : table_salon.png")

def create_table_manger():
    """Table de salle à manger 6 personnes avec chaises."""
    w, h = 280, 220
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Chaises haut (3)
    for x in [45, 115, 185]:
        draw.rounded_rectangle([x, 5, x + 50, 35], radius=6, fill=(80, 80, 85, 255))
    # Chaises bas (3)
    for x in [45, 115, 185]:
        draw.rounded_rectangle([x, h - 35, x + 50, h - 5], radius=6, fill=(80, 80, 85, 255))
        
    # Plateau de table en chêne massif
    draw.rounded_rectangle([30, 40, w - 30, h - 40], radius=10, fill=(195, 150, 105, 255), outline=(130, 95, 60, 255), width=3)
    
    # Sets de table
    for x in [45, 115, 185]:
        draw.rounded_rectangle([x + 5, 50, x + 45, 75], radius=3, fill=(245, 245, 245, 255))
        draw.rounded_rectangle([x + 5, h - 75, x + 45, h - 50], radius=3, fill=(245, 245, 245, 255))

    img.save(os.path.join(FURNITURE_DIR, "table_manger.png"))
    print("✅ Mobilier généré : table_manger.png")

def create_sanitaires():
    """Pack sanitaire complet : Douche italienne, Meuble vasque, WC."""
    # 1. Douche italienne vitrée
    w, h = 180, 180
    img_d = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw_d = ImageDraw.Draw(img_d)
    draw_d.rounded_rectangle([5, 5, w - 5, h - 5], radius=6, fill=(230, 245, 250, 255), outline=(140, 190, 220, 255), width=3)
    # Bonde carrée
    draw_d.rectangle([w//2 - 15, h//2 - 15, w//2 + 15, h//2 + 15], fill=(160, 170, 180, 255), outline=(100, 110, 120, 255))
    # Pommeau de douche
    draw_d.ellipse([w//2 - 25, 15, w//2 + 25, 65], fill=(200, 210, 220, 255), outline=(120, 130, 140, 255), width=2)
    img_d.save(os.path.join(FURNITURE_DIR, "douche.png"))
    
    # 2. WC top-down
    w, h = 100, 140
    img_wc = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw_wc = ImageDraw.Draw(img_wc)
    # Réservoir
    draw_wc.rounded_rectangle([10, 10, w - 10, 45], radius=4, fill=(255, 255, 255, 255), outline=(190, 195, 200, 255), width=2)
    # Cuvette ovale
    draw_wc.ellipse([15, 35, w - 15, h - 10], fill=(250, 250, 252, 255), outline=(190, 195, 200, 255), width=2)
    img_wc.save(os.path.join(FURNITURE_DIR, "wc.png"))

    # 3. Meuble vasque
    w, h = 160, 110
    img_v = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw_v = ImageDraw.Draw(img_v)
    draw_v.rounded_rectangle([5, 5, w - 5, h - 5], radius=6, fill=(120, 85, 60, 255), outline=(70, 50, 30, 255), width=2)
    draw_v.ellipse([25, 20, w - 25, h - 20], fill=(255, 255, 255, 255), outline=(190, 195, 200, 255), width=2)
    # Robinet
    draw_v.rectangle([w//2 - 4, 12, w//2 + 4, 32], fill=(180, 190, 200, 255))
    img_v.save(os.path.join(FURNITURE_DIR, "vasque.png"))
    print("✅ Sanitaires générés : douche.png, wc.png, vasque.png")

def create_voiture_topdown():
    """Voiture SUV moderne vue de dessus pour espace parking."""
    w, h = 200, 420
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Carrosserie rouge carmin métallisé (RGB: 195, 35, 45)
    body_color = (195, 35, 45, 255)
    draw.rounded_rectangle([25, 25, w - 25, h - 25], radius=35, fill=body_color, outline=(130, 20, 30, 255), width=3)
    
    # Pare-brise avant
    draw.polygon([(40, 120), (w - 40, 120), (w - 35, 175), (35, 175)], fill=(30, 40, 50, 240))
    # Toit ouvrant panoramique
    draw.rounded_rectangle([42, 185, w - 42, 295], radius=8, fill=(20, 25, 30, 255))
    # Lunette arrière
    draw.polygon([(38, 305), (w - 38, 305), (w - 42, 345), (42, 345)], fill=(30, 40, 50, 240))
    # Rétroviseurs
    draw.polygon([(10, 130), (25, 125), (25, 150)], fill=body_color)
    draw.polygon([(w - 10, 130), (w - 25, 125), (w - 25, 150)], fill=body_color)
    # Phares avant LED
    draw.rounded_rectangle([32, 28, 62, 42], radius=4, fill=(240, 250, 255, 255))
    draw.rounded_rectangle([w - 62, 28, w - 32, 42], radius=4, fill=(240, 250, 255, 255))

    img.save(os.path.join(FURNITURE_DIR, "voiture_topdown.png"))
    print("✅ Voiture générée : voiture_topdown.png")

def create_plante_monstera():
    """Plante verte tropicale Monstera en pot."""
    size = 140
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Pot terracotta central
    draw.ellipse([size//2 - 25, size//2 - 25, size//2 + 25, size//2 + 25], fill=(190, 100, 60, 255), outline=(130, 60, 30, 255), width=2)
    draw.ellipse([size//2 - 18, size//2 - 18, size//2 + 18, size//2 + 18], fill=(70, 45, 25, 255))
    
    # 6 Grandes feuilles vertes déployées à 360°
    angles = [0, 60, 120, 180, 240, 300]
    for ang in angles:
        rad = math.radians(ang)
        cx = size//2 + int(math.cos(rad) * 35)
        cy = size//2 + int(math.sin(rad) * 35)
        draw.ellipse([cx - 22, cy - 22, cx + 22, cy + 22], fill=(45, 140, 65, 235), outline=(25, 95, 40, 255), width=1)

    img.save(os.path.join(FURNITURE_DIR, "plante_monstera.png"))
    print("✅ Plante générée : plante_monstera.png")

if __name__ == "__main__":
    print("🚀 Génération de la bibliothèque d'assets 2.5D Pro...")
    create_parquet_chene()
    create_marbre_blanc()
    create_carrelage_cuisine()
    create_mosaique_sdb()
    create_gazon_jardin()
    create_paves_parking()
    
    create_lit_double()
    create_canape_salon()
    create_table_salon()
    create_table_manger()
    create_sanitaires()
    create_voiture_topdown()
    create_plante_monstera()
    print("✨ Tous les assets 2.5D ont été créés avec succès dans public/assets/floorplan_2_5d/ !")
