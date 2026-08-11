#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PERSPECTIVE FLATTENER & CAD OVERLAY — ARCHI CAM AI
──────────────────────────────────────────────────
Aplatit la perspective 3D, efface les ombres de hauteur de mur et
superpose les cloisons 2D vectorielles sur le rendu Fal.ai.
"""

import os
import sys
import argparse
import numpy as np
import cv2
import urllib.request

# Encodage console universel
try:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

def download_image(url, temp_path):
    """Télécharge une image depuis une URL."""
    try:
        urllib.request.urlretrieve(url, temp_path)
        return True
    except Exception as e:
        print(f"[Flattener] Erreur de téléchargement : {e}")
        return False

def flatten_perspective(render_path, wall_mask_path, output_path, preset_style='architect_pro', text_layer_path=None):
    """
    Superpose le masque de mur 2D plat sur le rendu 3D pour écraser la perspective des cloisons.
    """
    print(f"[Flattener] Chargement du rendu : {render_path}")
    print(f"[Flattener] Chargement du masque de mur : {wall_mask_path}")

    # 1. Charger les images
    render = cv2.imread(render_path, cv2.IMREAD_COLOR)
    mask = cv2.imread(wall_mask_path, cv2.IMREAD_GRAYSCALE)

    if render is None:
        raise ValueError(f"Rendu introuvable ou illisible : {render_path}")
    if mask is None:
        raise ValueError(f"Masque introuvable ou illisible : {wall_mask_path}")

    # Redimensionner le masque si nécessaire pour correspondre au rendu
    if mask.shape[:2] != render.shape[:2]:
        print(f"[Flattener] Ajustement de la taille du masque {mask.shape[:2]} -> {render.shape[:2]}")
        mask = cv2.resize(mask, (render.shape[1], render.shape[0]), interpolation=cv2.INTER_NEAREST)

    # 2. Déterminer la couleur des murs 2D selon le style
    # Style professionnel scandinave: anthracite chic (#2C3E50 ou #1E293B)
    # Style tropical: brun chocolat ou gris sombre
    if 'tropical' in preset_style.lower():
        wall_color = (40, 50, 60)      # BGR pour Anthracite chaud
        border_color = (20, 25, 30)
    else:
        wall_color = (59, 41, 30)      # BGR pour Anthracite sombre chic #1E293B
        border_color = (10, 10, 10)    # Noir pour les lignes d'arêtes

    # 3. Dilater légèrement le masque pour recouvrir les ombres portées intérieures des murs 3D
    kernel_clean = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    mask_dilated = cv2.dilate(mask, kernel_clean, iterations=1)

    # 4. Créer le calque de mur 2D plat
    flat_walls = np.zeros_like(render)
    flat_walls[:] = wall_color

    # 5. Fusionner les deux calques : le fond texturé pour le sol/mobilier et le calque 2D pour les murs stricts
    # Utiliser un alpha-blending (85% opacité mur + 15% fond) pour que le mur encadre joliment le sol sans l'écraser
    alpha = 0.85
    result = render.copy()
    idx = (mask_dilated > 0)
    result[idx] = (alpha * flat_walls[idx] + (1.0 - alpha) * render[idx]).astype(np.uint8)

    # Dessiner des lignes de contour noires fines (2px) autour du masque de mur pour un encadrement architectural d'exception
    contours, _ = cv2.findContours(mask_dilated, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
    cv2.drawContours(result, contours, -1, border_color, 2)

    # 5b. Si un calque de texte est fourni, superposer les textes originaux (cotations, cotes)
    if text_layer_path and os.path.exists(text_layer_path):
        text_img = cv2.imread(text_layer_path, cv2.IMREAD_COLOR)
        if text_img is not None:
            # Redimensionner si nécessaire
            if text_img.shape[:2] != result.shape[:2]:
                text_img = cv2.resize(text_img, (result.shape[1], result.shape[0]), interpolation=cv2.INTER_AREA)
            
            # Isoler les pixels sombres (le texte d'origine)
            gray_text = cv2.cvtColor(text_img, cv2.COLOR_BGR2GRAY)
            _, text_mask = cv2.threshold(gray_text, 200, 255, cv2.THRESH_BINARY_INV)
            
            # Overlay
            idx_text = (text_mask > 0)
            result[idx_text] = text_img[idx_text]
            print(f"[Flattener] Calque de texte superposé : {text_layer_path}")

    # 6. Sauvegarder le résultat
    cv2.imwrite(output_path, result)
    print(f"[Flattener] Rendu hybride sauvegardé avec succès dans : {output_path}")
    return True

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Aplatisseur de perspective hybride 2D/3D")
    parser.add_argument("--render", required=True, help="Chemin du rendu original (URL ou fichier local)")
    parser.add_argument("--wall-mask", required=True, help="Chemin du masque de mur 2D local")
    parser.add_argument("--output", required=True, help="Chemin du fichier de sortie")
    parser.add_argument("--style", default="architect_pro", help="Style du plan pour le choix des couleurs")
    parser.add_argument("--text-layer", default=None, help="Chemin du calque de texte/cotations d'origine")

    args = parser.parse_args()

    temp_render = args.render
    is_temp = False

    if args.render.startswith("http"):
        temp_render = args.output + ".temp_download.png"
        print(f"[Flattener] Téléchargement du rendu distant depuis {args.render}...")
        if not download_image(args.render, temp_render):
            sys.exit(1)
        is_temp = True

    try:
        flatten_perspective(temp_render, args.wall_mask, args.output, args.style, args.text_layer)
    finally:
        if is_temp and os.path.exists(temp_render):
            try:
                os.remove(temp_render)
            except Exception:
                pass
