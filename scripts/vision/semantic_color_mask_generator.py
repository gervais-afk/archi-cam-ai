#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
GENERATUER DE MASQUE SÉMANTIQUE DE ZONAGE COLORÉ (Regional Prompting) — Archi Cam AI
Génère une carte de segmentation couleur RGB exacte pour verrouiller la fonction
de chaque pièce auprès de l'IA (Fal.ai Flux / OpenRouter ControlNet).

Code Couleur ADE20K / ControlNet Architecture :
  - BLEU     (RGB  40, 120, 240) : Pièces d'eau (SDB, Toilettes, WC) & Annexes techniques (< 5m²)
  - ROUGE    (RGB 220,  50,  50) : Espaces de nuit (Chambres)
  - VERT     (RGB  50, 180,  80) : Espaces de vie (Séjour, Salon, SAM)
  - JAUNE    (RGB 240, 200,  40) : Cuisine (Kitchen)
  - MARRON   (RGB 180, 120,  60) : Balcons, Terrasses, Vérandas
  - GRIS     (RGB 100, 100, 100) : Escalier (Staircase)
  - BEIGE    (RGB 210, 200, 180) : Couloirs & Dégagements

Usage :
  python scripts/vision/semantic_color_mask_generator.py \
    --semantic-json public/debug_xxx/semantic_rooms.json \
    --output-png public/debug_xxx/semantic_color_mask.png
"""
import sys
import json
import argparse
from pathlib import Path

try:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

import cv2
import numpy as np

COLOR_PALETTE_BGR = {
    "bathroom": (240, 120, 40),   # BLEU ADE20K (BGR)
    "toilet": (240, 120, 40),     # BLEU ADE20K
    "bedroom": (50, 50, 220),     # ROUGE ADE20K
    "living": (80, 180, 50),      # VERT ADE20K
    "dining": (80, 180, 50),      # VERT ADE20K
    "kitchen": (40, 200, 240),    # JAUNE ADE20K
    "balcony": (60, 120, 180),    # MARRON ADE20K
    "terrace": (60, 120, 180),    # MARRON ADE20K
    "stairs": (100, 100, 100),    # GRIS
    "corridor": (180, 200, 210),  # BEIGE
    "default": (180, 200, 210)
}


def generate_color_mask(semantic_json_path: str, output_png_path: str):
    with open(semantic_json_path, encoding="utf-8") as f:
        data = json.load(f)

    img_w = data.get("image_width", 1191)
    img_h = data.get("image_height", 1684)
    rooms = data.get("rooms", [])

    # Canvas noir 3 canaux BGR
    mask = np.zeros((img_h, img_w, 3), dtype=np.uint8)
    scale_ppm = 48.0

    count = 0
    for r in rooms:
        polygon = r.get("polygon", [])
        if len(polygon) < 3:
            continue

        pts = np.array(polygon, dtype=np.int32)
        area_pixels = cv2.contourArea(pts)
        area_m2 = area_pixels / (scale_ppm ** 2)

        # Filtrage bruit géométrique
        if area_m2 < 1.0 or area_m2 > 100.0:
            continue

        rtype = str(r.get("type", "default")).lower()
        rname = str(r.get("name", "")).lower()

        # RÈGLE RUSTIQUE : Si petite pièce < 5m² non classée ou annexe => Forcer BLEU (Pièce d'eau / Toilettes)
        if area_m2 < 5.0 and (rtype == "default" or "toil" in rname or "ext" in rname or "wc" in rname):
            rtype = "toilet"

        color = COLOR_PALETTE_BGR.get(rtype, COLOR_PALETTE_BGR["default"])

        # Remplissage du polygone de la pièce avec sa couleur sémantique
        cv2.fillPoly(mask, [pts], color)

        # Tracer la frontière de cloison en noir (0, 0, 0)
        cv2.polylines(mask, [pts], isClosed=True, color=(0, 0, 0), thickness=4)
        count += 1

    cv2.imwrite(output_png_path, mask)
    print(f"[SemanticMask] Carte sémantique couleur générée : {count} zones -> {output_png_path}")
    return True


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--semantic-json", required=True)
    parser.add_argument("--output-png", required=True)
    args = parser.parse_args()

    generate_color_mask(args.semantic_json, args.output_png)
