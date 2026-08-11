#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
OCR TEXT EXTRACTOR — Archi Cam AI
Extrait les textes de labels depuis text_layer.png et les sauvegarde
dans un JSON pour que LabelAssignerV2 puisse les utiliser.

Usage :
  python scripts/vision/ocr_text_extractor.py \
    --input <text_layer.png> \
    --output <texts.json>
"""
import sys
import json
import argparse
import re
from pathlib import Path

try:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

import cv2
import numpy as np


def extract_texts_from_image(img_path: str, debug_dir: str = None) -> list:
    """Extrait les textes depuis une image (text_layer.png ou source_clean.png)."""
    img = cv2.imread(img_path)
    if img is None:
        raise FileNotFoundError(f"Image introuvable : {img_path}")

    h, w = img.shape[:2]
    texts = []

    # ── MOTEUR 1 : EasyOCR (meilleur pour plans architecturaux) ──────────────
    try:
        import easyocr
        reader = easyocr.Reader(["fr", "en"], gpu=False, verbose=False)
        results = reader.readtext(img_path, detail=1, paragraph=False)
        for bbox, text, conf in results:
            if conf < 0.25 or len(text.strip()) < 2:
                continue
            pts = np.array(bbox, dtype=np.float32)
            cx = int(np.mean(pts[:, 0]))
            cy = int(np.mean(pts[:, 1]))
            texts.append({
                "text": text.strip(),
                "confidence": round(float(conf), 3),
                "centroid": [cx, cy],
                "engine": "easyocr"
            })
        if texts:
            print(f"[OCR-EasyOCR] {len(texts)} textes extraits")
            return texts
    except ImportError:
        print("[OCR] EasyOCR non disponible, essai Tesseract...")
    except Exception as e:
        print(f"[OCR] Avertissement EasyOCR : {e}")

    # ── MOTEUR 2 : Tesseract (fallback) ──────────────────────────────────────
    try:
        import pytesseract
        from PIL import Image

        pil_img = Image.fromarray(cv2.cvtColor(img, cv2.COLOR_BGR2RGB))
        tsv = pytesseract.image_to_data(
            pil_img,
            lang="fra+eng",
            output_type=pytesseract.Output.DICT,
            config="--psm 11 --oem 3"
        )

        n = len(tsv["text"])
        for i in range(n):
            text = str(tsv["text"][i]).strip()
            conf = int(tsv["conf"][i])
            if conf < 30 or len(text) < 2:
                continue
            x = int(tsv["left"][i]) + int(tsv["width"][i]) // 2
            y = int(tsv["top"][i]) + int(tsv["height"][i]) // 2
            texts.append({
                "text": text,
                "confidence": round(conf / 100.0, 3),
                "centroid": [x, y],
                "engine": "tesseract"
            })

        if texts:
            print(f"[OCR-Tesseract] {len(texts)} textes extraits")
            return texts
    except ImportError:
        print("[OCR] Tesseract non disponible, utilisation du fallback heuristique...")
    except Exception as e:
        print(f"[OCR] Avertissement Tesseract : {e}")

    # ── MOTEUR 3 : PaddleOCR ────────────────────────────────────────────────
    try:
        from paddleocr import PaddleOCR
        ocr = PaddleOCR(use_angle_cls=True, lang="en", show_log=False)
        result = ocr.ocr(img_path, cls=True)
        if result:
            for line in result[0]:
                box, (text, conf) = line
                if conf < 0.25 or len(text.strip()) < 2:
                    continue
                pts = np.array(box, dtype=np.float32)
                cx = int(np.mean(pts[:, 0]))
                cy = int(np.mean(pts[:, 1]))
                texts.append({
                    "text": text.strip(),
                    "confidence": round(float(conf), 3),
                    "centroid": [cx, cy],
                    "engine": "paddle"
                })
        if texts:
            print(f"[OCR-Paddle] {len(texts)} textes extraits")
            return texts
    except ImportError:
        pass
    except Exception as e:
        print(f"[OCR] Avertissement PaddleOCR : {e}")

    print("[OCR] Aucun moteur OCR disponible. Retour vide.")
    return []


def classify_texts(texts: list) -> dict:
    """Classifie les textes extraits en catégories (labels de pièces, surfaces, cotes)."""
    ROOM_KEYWORDS = {
        "chambre": "bedroom", "bed": "bedroom", "parent": "bedroom",
        "sejour": "living", "salon": "living", "living": "living",
        "cuisine": "kitchen", "kitchen": "kitchen",
        "toil": "toilet", "wc": "toilet", "sdb": "bathroom", "bain": "bathroom", "douche": "bathroom",
        "sam": "dining", "manger": "dining",
        "couloir": "corridor", "hall": "corridor", "dégag": "corridor",
        "balcon": "balcony", "veranda": "terrace", "terrasse": "terrace",
        "garage": "garage", "parking": "garage",
        "dressing": "dressing",
        "entree": "entrance", "entrée": "entrance",
        "bureau": "office",
    }

    room_texts = []
    surface_texts = []
    cote_texts = []
    other_texts = []

    for t in texts:
        raw = t["text"].strip()
        tl = raw.lower()

        # Surface m²
        if re.search(r"\d+[.,]\d+\s*m", tl) or "m2" in tl or "m²" in tl:
            m = re.search(r"(\d+[.,]\d+)", tl)
            if m:
                t["area_m2"] = float(m.group(1).replace(",", "."))
            surface_texts.append(t)
            continue

        # Cote (ex: "3.50" seul)
        if re.match(r"^\d+[.,]\d+$", tl):
            cote_texts.append(t)
            continue

        # Label de pièce
        found_type = None
        for kw, rtype in ROOM_KEYWORDS.items():
            if kw in tl:
                t["room_type"] = rtype
                found_type = rtype
                break

        if found_type:
            room_texts.append(t)
        else:
            other_texts.append(t)

    return {
        "room_labels": room_texts,
        "surface_labels": surface_texts,
        "cote_labels": cote_texts,
        "other_texts": other_texts,
        "all_text": texts,
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="OCR Text Extractor for Archi Cam AI plans")
    parser.add_argument("--input", required=True, help="Chemin vers text_layer.png")
    parser.add_argument("--output", required=True, help="Chemin vers le JSON de sortie")
    parser.add_argument("--debug-dir", default=None)
    args = parser.parse_args()

    print(f"[OCR] Extraction depuis : {args.input}")
    texts = extract_texts_from_image(args.input, debug_dir=args.debug_dir)
    classified = classify_texts(texts)

    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(classified, f, ensure_ascii=False, indent=2)

    print(f"[OCR] {len(texts)} textes -> {args.output}")
    for r in classified["room_labels"]:
        print(f"  ROOM  : {r['text']:25s} | type={r.get('room_type','?'):12s} | conf={r['confidence']:.2f}")
    for s in classified["surface_labels"]:
        print(f"  AREA  : {s['text']:25s} | {s.get('area_m2','?')} m2")
