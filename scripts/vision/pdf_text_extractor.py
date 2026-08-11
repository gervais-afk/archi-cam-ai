#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
EXTRACTEUR DE TEXTE PDF — Archi Cam AI
Utilise pypdfium2 pour extraire FIDÈLEMENT les textes d'un PDF architecte,
avec leurs coordonnées spatiales sur la page.

Usage :
  python scripts/vision/pdf_text_extractor.py \
    --input plan.pdf \
    --output texts_ocr.json \
    [--page 0]
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

ROOM_KEYWORDS = {
    "toil externe": "toilet", "toil ext": "toilet", "wc ext": "toilet", "externe": "toilet",
    "chambre": "bedroom", "bed": "bedroom", "parent": "bedroom",
    "sejour": "living", "salon": "living", "living": "living",
    "cuisine": "kitchen", "kitchen": "kitchen",
    "toil": "toilet", "wc": "toilet", "sdb": "bathroom", "bain": "bathroom", "douche": "bathroom",
    "sam": "dining", "manger": "dining",
    "couloir": "corridor", "hall": "corridor", "degag": "corridor",
    "balcon": "balcony", "veranda": "terrace", "terrasse": "terrace",
    "garage": "garage", "parking": "garage",
    "dressing": "dressing",
    "entree": "entrance",
    "bureau": "office",
}


def classify_text(text: str):
    """Retourne (room_type|None) selon les mots-clés."""
    tl = text.lower()
    for kw, rtype in ROOM_KEYWORDS.items():
        if kw in tl:
            return rtype
    return None


def extract_from_pdf(pdf_path: str, page_index: int = 0, target_w: int = 1191, target_h: int = 1684):
    """Extrait les textes du PDF avec leurs coordonnées."""
    import pypdfium2 as pdfium

    doc = pdfium.PdfDocument(pdf_path)
    page = doc[page_index]
    pw, ph = page.get_width(), page.get_height()
    print(f"[PDF-Text] Page {page_index}: {pw:.0f} x {ph:.0f} pt")

    scale_x = target_w / pw
    scale_y = target_h / ph

    textpage = page.get_textpage()
    n_chars = textpage.count_chars()
    print(f"[PDF-Text] {n_chars} caractères vectoriels dans le PDF")

    # Extraire par blocs de texte (rectangles)
    n_rects = textpage.count_rects()
    texts = []
    print(f"[PDF-Text] {n_rects} blocs texte detectes")

    for i in range(n_rects):
        left, bottom, right, top = textpage.get_rect(i)
        raw = textpage.get_text_range()  # all text (fallback)
        text_in_rect = textpage.get_text_bounded(left=left, bottom=bottom, right=right, top=top)
        text_in_rect = text_in_rect.strip()
        if not text_in_rect or len(text_in_rect) < 2:
            continue

        # Conversion coordonnées PDF (bas-gauche) -> image pixels (haut-gauche)
        cx_pdf = (left + right) / 2
        cy_pdf = ph - (bottom + top) / 2
        cx_px = int(cx_pdf * scale_x)
        cy_px = int(cy_pdf * scale_y)

        texts.append({
            "text": text_in_rect,
            "confidence": 1.0,
            "centroid": [cx_px, cy_px],
            "bbox_pdf": [round(left, 1), round(bottom, 1), round(right, 1), round(top, 1)],
            "engine": "pypdfium2"
        })

    doc.close()
    return texts


def extract_full_text_fallback(pdf_path: str, page_index: int = 0, target_w: int = 1191, target_h: int = 1684):
    """Fallback: extrait tout le texte du PDF page par page sans coordonnées."""
    import pypdfium2 as pdfium

    doc = pdfium.PdfDocument(pdf_path)
    page = doc[page_index]
    pw, ph = page.get_width(), page.get_height()
    scale_x = target_w / pw
    scale_y = target_h / ph

    textpage = page.get_textpage()
    full_text = textpage.get_text_range()
    doc.close()

    # Cherche les labels de pièces dans le texte brut
    texts = []
    for token in re.split(r"[\r\n\t]+", full_text):
        token = token.strip()
        if len(token) < 2:
            continue
        texts.append({
            "text": token,
            "confidence": 0.85,
            "centroid": [target_w // 2, target_h // 2],
            "engine": "pypdfium2-fallback"
        })
    return texts


def classify_all(texts: list) -> dict:
    room_labels = []
    surface_labels = []
    other_texts = []

    for t in texts:
        raw = t["text"].strip()
        tl = raw.lower()

        # Surface m²
        if re.search(r"\d+[.,]\d+\s*m", tl) or "m2" in tl or "m2" in tl:
            m = re.search(r"(\d+[.,]\d+)", tl)
            if m:
                t["area_m2"] = float(m.group(1).replace(",", "."))
            surface_labels.append(t)
            continue

        rtype = classify_text(tl)
        if rtype:
            t["room_type"] = rtype
            room_labels.append(t)
        else:
            other_texts.append(t)

    return {
        "room_labels": room_labels,
        "surface_labels": surface_labels,
        "other_texts": other_texts,
        "all_text": texts,
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, help="Chemin vers le PDF")
    parser.add_argument("--output", required=True, help="Chemin JSON de sortie")
    parser.add_argument("--page", type=int, default=0)
    parser.add_argument("--target-w", type=int, default=1191)
    parser.add_argument("--target-h", type=int, default=1684)
    args = parser.parse_args()

    print(f"[PDF-Text] Extraction depuis : {args.input}")
    try:
        texts = extract_from_pdf(args.input, args.page, args.target_w, args.target_h)
        if not texts:
            print("[PDF-Text] Aucun bloc extrait via rects, essai texte brut...")
            texts = extract_full_text_fallback(args.input, args.page, args.target_w, args.target_h)
    except Exception as e:
        print(f"[PDF-Text] ERREUR: {e}")
        texts = []

    classified = classify_all(texts)

    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(classified, f, ensure_ascii=False, indent=2)

    print(f"[PDF-Text] {len(texts)} textes extraits -> {args.output}")
    print(f"  {len(classified['room_labels'])} labels de pieces, {len(classified['surface_labels'])} surfaces")
    for r in classified["room_labels"]:
        print(f"  ROOM : {r['text']:30s} | {r.get('room_type','?'):12s} | px={r['centroid']}")
