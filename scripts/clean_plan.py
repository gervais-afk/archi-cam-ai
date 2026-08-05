#!/usr/bin/env python3
# -*- font-encoding: utf-8 -*-
"""
CLEAN PLAN PROCESSOR V2 — ARCHI CAM AI
──────────────────────────────────────
1. Rasterisation HD des plans PDF/PNG et export d'une image d'aperçu PNG d'origine (_preview.png).
2. Binarisation adaptative douce & isolation du polygone englobant principal du bâtiment.
3. Suppression automatique des cotations extérieures (flèches, dimensions, marges).
4. Fermeture morphologique stricte (9x9) pour étanchéité parfaite des pièces sans fuite de texture.
5. Conservation nette du cartouche architectural en bas de page sans artefacts noirs.
"""

import os
import sys
import io
import json
import numpy as np

if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

import cv2
import pypdfium2 as pdfium
from PIL import Image

def process_hand_drawn_notebook_sketch(bgr_img: np.ndarray) -> np.ndarray:
    hsv = cv2.cvtColor(bgr_img, cv2.COLOR_BGR2HSV)
    gray = cv2.cvtColor(bgr_img, cv2.COLOR_BGR2GRAY)

    lower_blue = np.array([85, 40, 40])
    upper_blue = np.array([135, 255, 255])
    mask_blue = cv2.inRange(hsv, lower_blue, upper_blue)

    lower_red1, upper_red1 = np.array([0, 50, 50]), np.array([10, 255, 255])
    lower_red2, upper_red2 = np.array([170, 50, 50]), np.array([180, 255, 255])
    mask_red1 = cv2.inRange(hsv, lower_red1, upper_red1)
    mask_red2 = cv2.inRange(hsv, lower_red2, upper_red2)
    mask_red = cv2.bitwise_or(mask_red1, mask_red2)

    ink_mask = cv2.bitwise_or(mask_blue, mask_red)

    if np.sum(ink_mask > 0) < 500:
        ink_mask = cv2.adaptiveThreshold(
            gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 21, 5
        )

    kernel3 = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    kernel5 = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
    closed = cv2.morphologyEx(ink_mask, cv2.MORPH_CLOSE, kernel3)
    closed = cv2.morphologyEx(closed, cv2.MORPH_CLOSE, kernel5)
    return closed

def detect_building_envelope(binary_walls: np.ndarray, width: int, height: int) -> np.ndarray:
    """
    Isole le polygone englobant principal du bâtiment et efface les cotations extérieures tout en préservant le cartouche.
    """
    building_mask = np.zeros((height, width), dtype=np.uint8)
    cartouche_y_limit = int(height * 0.98)

    search_zone = binary_walls.copy()
    search_zone[cartouche_y_limit:, :] = 0

    margin_x = int(width * 0.04)
    margin_y = int(height * 0.04)
    search_zone[:margin_y, :] = 0
    search_zone[:, :margin_x] = 0
    search_zone[:, width - margin_x:] = 0

    cnts, _ = cv2.findContours(search_zone, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not cnts:
        building_mask[margin_y:height - margin_y, margin_x:width - margin_x] = 255
        return building_mask

    large_cnts = [c for c in cnts if cv2.contourArea(c) > 1500]
    if large_cnts:
        all_pts = np.vstack(large_cnts)
        hull = cv2.convexHull(all_pts)
        cv2.drawContours(building_mask, [hull], -1, 255, -1)
        kernel_exp = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (8, 8))
        building_mask = cv2.dilate(building_mask, kernel_exp)
        building_mask[cartouche_y_limit:, :] = 255
    else:
        building_mask[margin_y:height - margin_y, margin_x:width - margin_x] = 255

    return building_mask

def clean_and_separate_plan_layers(input_path: str, output_path: str):
    if not input_path or not os.path.exists(input_path):
        print(f"❌ Erreur : Fichier introuvable : {input_path}")
        return False

    print(f"🧹 Démarrage du nettoyage plan traits fins OpenCV V2 sur : {input_path}")

    if input_path.lower().endswith((".png", ".jpg", ".jpeg")):
        base_image = Image.open(input_path).convert("RGBA")
    else:
        pdf = pdfium.PdfDocument(input_path)
        page = pdf[0]
        base_image = page.render(scale=2.5).to_pil().convert("RGBA")

    width, height = base_image.size
    base_np_rgb = np.array(base_image.convert("RGB"))
    base_np_bgr = cv2.cvtColor(base_np_rgb, cv2.COLOR_RGB2BGR)
    gray = cv2.cvtColor(base_np_bgr, cv2.COLOR_BGR2GRAY)

    preview_plan_path = output_path.replace(".png", "_preview.png") if output_path.endswith(".png") else output_path + "_preview.png"
    base_image.convert("RGB").save(preview_plan_path, "PNG")

    # 1. Binarisation adaptative douce
    binary_walls = cv2.adaptiveThreshold(
        gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 21, 5
    )

    # 2. Détection & Isolation du polygone principal du bâtiment (efface cotations extérieures)
    building_mask = detect_building_envelope(binary_walls, width, height)

    # Conservations des murs UNIQUEMENT dans l'enveloppe du bâtiment
    binary_walls_in_envelope = cv2.bitwise_and(binary_walls, building_mask)

    # 3. Fermeture morphologique stricte (15x15) pour étanchéité parfaite des pièces (colmatage portes & terrasses)
    kernel15 = cv2.getStructuringElement(cv2.MORPH_RECT, (15, 15))
    closed_walls = cv2.morphologyEx(binary_walls_in_envelope, cv2.MORPH_CLOSE, kernel15)

    # 4. Filtrage des composants résiduels
    num_components, comp_labels, comp_stats, _ = cv2.connectedComponentsWithStats(closed_walls)
    clean_walls = np.zeros_like(closed_walls, dtype=np.uint8)
    for i in range(1, num_components):
        if comp_stats[i, cv2.CC_STAT_AREA] >= 30:
            clean_walls[comp_labels == i] = 255

    # 5. Calque B : Textes, Annotations & Cartouche (net et vectoriel)
    orig_dark_pixels = (gray < 175)
    text_layer = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    text_np = np.array(text_layer)
    text_np[orig_dark_pixels] = (15, 23, 42, 255)
    text_layer = Image.fromarray(text_np)

    # 6. Image _clean_plan.png (Fond blanc pur #FFFFFF, Murs Anthracite #1E293B)
    clean_plan_img = np.ones((height, width, 3), dtype=np.uint8) * 255
    clean_plan_img[clean_walls > 0] = (30, 41, 59)

    clean_plan_path = output_path.replace(".png", "_clean_plan.png") if output_path.endswith(".png") else output_path + "_clean_plan.png"
    text_plan_path = output_path.replace(".png", "_text.png") if output_path.endswith(".png") else output_path + "_text.png"

    os.makedirs(os.path.dirname(os.path.abspath(clean_plan_path)), exist_ok=True)
    cv2.imwrite(clean_plan_path, cv2.cvtColor(clean_plan_img, cv2.COLOR_RGB2BGR))
    text_layer.save(text_plan_path, "PNG")

    # Comptage des pièces fermées
    inv_clean = cv2.bitwise_not(clean_walls)
    inv_clean[building_mask == 0] = 0 # restreindre aux pièces intérieures
    num_rooms, _, room_stats, _ = cv2.connectedComponentsWithStats(inv_clean)
    valid_room_count = 0
    img_area = width * height
    for i in range(1, num_rooms):
        area = room_stats[i, cv2.CC_STAT_AREA]
        if 1500 <= area <= 0.35 * img_area:
            valid_room_count += 1

    low_contrast_warning = valid_room_count < 3
    metadata = {
        "room_count": valid_room_count,
        "low_contrast_warning": low_contrast_warning,
        "preview_path": preview_plan_path
    }
    print(f"STATUS_METADATA:{json.dumps(metadata)}")

    print(f"✨ Calque A (_clean_plan.png murs étanches) : {clean_plan_path}")
    print(f"✨ Calque B (_text.png annotations vectorielles) : {text_plan_path}")
    print(f"🖼️ Aperçu PNG Plan Source pour Comparateur     : {preview_plan_path}")
def generate_controlnet_maps(structural_walls: np.ndarray, output_canny_path: str, output_depth_path: str):
    """
    Génère les cartes ControlNet (Canny & Depth wireframe) depuis les murs structuraux.
    """
    try:
        if structural_walls is None or structural_walls.size == 0:
            return
        canny_img = cv2.Canny(structural_walls, 100, 200)
        os.makedirs(os.path.dirname(os.path.abspath(output_canny_path)), exist_ok=True)
        cv2.imwrite(output_canny_path, canny_img)

        dist_transform = cv2.distanceTransform(structural_walls, cv2.DIST_L2, 5)
        depth_normalized = cv2.normalize(dist_transform, None, 0, 255, cv2.NORM_MINMAX, dtype=cv2.CV_8U)
        os.makedirs(os.path.dirname(os.path.abspath(output_depth_path)), exist_ok=True)
        cv2.imwrite(output_depth_path, depth_normalized)
    except Exception as e:
        print(f"⚠️ Notice ControlNet Maps generation (clean_plan) : {e}")

if __name__ == "__main__":
    input_file = sys.argv[1] if len(sys.argv) > 1 else "2D_RDC.pdf"
    output_file = sys.argv[2] if len(sys.argv) > 2 else "public/clean_output.png"
    clean_and_separate_plan_layers(input_file, output_file)
