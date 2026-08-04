#!/usr/bin/env python3
# -*- font-encoding: utf-8 -*-
"""
CLEAN PLAN PROCESSOR — ARCHI CAM AI
───────────────────────────────────
1. Rasterisation HD des plans PDF/PNG et export d'une image d'aperçu PNG d'origine (_preview.png).
2. Binarisation adaptative douce (21x5) & fermeture morphologique (3x3 puis 5x5).
3. Export de _clean_plan.png (murs anthracite #1E293B sur fond blanc pur #FFFFFF) et _text.png.
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

def clean_and_separate_plan_layers(input_path: str, output_path: str):
    if not input_path or not os.path.exists(input_path):
        print(f"❌ Erreur : Fichier introuvable : {input_path}")
        return False

    print(f"🧹 Démarrage du nettoyage plan traits fins OpenCV sur : {input_path}")

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

    # Export d'une image d'aperçu d'origine au format PNG (pour le comparateur Frontend)
    preview_plan_path = output_path.replace(".png", "_preview.png") if output_path.endswith(".png") else output_path + "_preview.png"
    base_image.convert("RGB").save(preview_plan_path, "PNG")

    # 1. Binarisation adaptative douce pour capturer les traits fins sans perte
    binary_walls = cv2.adaptiveThreshold(
        gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 21, 5
    )

    # 2. Double fermeture morphologique (3x3 puis 5x5)
    kernel3 = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    kernel5 = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
    closed_walls = cv2.morphologyEx(binary_walls, cv2.MORPH_CLOSE, kernel3)
    closed_walls = cv2.morphologyEx(closed_walls, cv2.MORPH_CLOSE, kernel5)

    # 3. Filtrage très doux (CC_STAT_AREA >= 10 px)
    num_components, comp_labels, comp_stats, _ = cv2.connectedComponentsWithStats(closed_walls)
    clean_walls = np.zeros_like(closed_walls, dtype=np.uint8)
    for i in range(1, num_components):
        if comp_stats[i, cv2.CC_STAT_AREA] >= 10:
            clean_walls[comp_labels == i] = 255

    # 4. Calque B : Textes et Annotations
    orig_dark_pixels = (gray < 175)
    text_layer = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    text_np = np.array(text_layer)
    text_np[orig_dark_pixels] = (15, 23, 42, 255)
    text_layer = Image.fromarray(text_np)

    # 5. Image _clean_plan.png (Fond blanc pur #FFFFFF, Murs Anthracite #1E293B)
    clean_plan_img = np.ones((height, width, 3), dtype=np.uint8) * 255
    clean_plan_img[clean_walls > 0] = (30, 41, 59)

    clean_plan_path = output_path.replace(".png", "_clean_plan.png") if output_path.endswith(".png") else output_path + "_clean_plan.png"
    text_plan_path = output_path.replace(".png", "_text.png") if output_path.endswith(".png") else output_path + "_text.png"

    os.makedirs(os.path.dirname(os.path.abspath(clean_plan_path)), exist_ok=True)
    cv2.imwrite(clean_plan_path, cv2.cvtColor(clean_plan_img, cv2.COLOR_RGB2BGR))
    text_layer.save(text_plan_path, "PNG")

    # Comptage des pièces fermées
    inv_clean = cv2.bitwise_not(clean_walls)
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

    print(f"✨ Calque A (_clean_plan.png murs complets) : {clean_plan_path}")
    print(f"✨ Calque B (_text.png annotations vectorielles)          : {text_plan_path}")
    print(f"🖼️ Aperçu PNG Plan Source pour Comparateur              : {preview_plan_path}")
    return True

if __name__ == "__main__":
    input_file = sys.argv[1] if len(sys.argv) > 1 else "2D_RDC.pdf"
    output_file = sys.argv[2] if len(sys.argv) > 2 else "public/clean_output.png"
    clean_and_separate_plan_layers(input_file, output_file)
