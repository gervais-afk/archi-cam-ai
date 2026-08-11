#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
EXTRACTION VECTORIELLE DIRECTE DE PLANS PDF — ARCHI CAM AI
──────────────────────────────────────────────────────────
Extrait les textes natifs, dimensions, blocs de pièces et cotes
directement depuis la structure vectorielle du PDF sans passer par l'OCR.
"""

import os
import sys
import json
import re

try:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

class PdfVectorExtractor:
    def __init__(self):
        pass

    def extract_text_and_boxes(self, pdf_path: str) -> list:
        """Extrait tous les textes et coordonnées exactes d'un PDF vectoriel."""
        if not os.path.exists(pdf_path) or not pdf_path.lower().endswith(".pdf"):
            return []

        labels = []

        # 1. Tentative PyMuPDF (fitz)
        try:
            import fitz
            doc = fitz.open(pdf_path)
            page = doc[0]
            text_page = page.get_text("dict")
            for block in text_page.get("blocks", []):
                if "lines" in block:
                    for line in block["lines"]:
                        for span in line["spans"]:
                            txt = span.get("text", "").strip()
                            if len(txt) >= 2:
                                bbox = span.get("bbox", [0, 0, 0, 0])
                                cx = int((bbox[0] + bbox[2]) / 2)
                                cy = int((bbox[1] + bbox[3]) / 2)
                                labels.append({
                                    "text": txt,
                                    "centroid": [cx, cy],
                                    "bbox": [
                                        [int(bbox[0]), int(bbox[1])],
                                        [int(bbox[2]), int(bbox[1])],
                                        [int(bbox[2]), int(bbox[3])],
                                        [int(bbox[0]), int(bbox[3])]
                                    ],
                                    "confidence": 1.0,
                                    "type": self._classify(txt)
                                })
            return labels
        except Exception:
            pass

        # 2. Tentative pypdfium2
        try:
            import pypdfium2 as pdfium
            pdf = pdfium.PdfDocument(pdf_path)
            page = pdf[0]
            textpage = page.get_textpage()
            num_rects = textpage.count_rects()
            for i in range(num_rects):
                rect = textpage.get_rect(i)
                txt = textpage.get_text_bounded(*rect).strip()
                if len(txt) >= 2:
                    cx = int((rect[0] + rect[2]) / 2)
                    cy = int((rect[1] + rect[3]) / 2)
                    labels.append({
                        "text": txt,
                        "centroid": [cx, cy],
                        "bbox": [
                            [int(rect[0]), int(rect[1])],
                            [int(rect[2]), int(rect[1])],
                            [int(rect[2]), int(rect[3])],
                            [int(rect[0]), int(rect[3])]
                        ],
                        "confidence": 1.0,
                        "type": self._classify(txt)
                    })
            return labels
        except Exception:
            pass

        return labels

    def _classify(self, text: str) -> str:
        t_clean = text.lower().strip()
        if "m²" in t_clean or "m2" in t_clean:
            return "area"
        
        keywords = {
            "chambre": "bedroom", "chamber": "bedroom", "sejour": "living", "salon": "living",
            "cuisine": "kitchen", "toil": "bathroom", "wc": "bathroom", "sdb": "bathroom",
            "sam": "dining", "manger": "dining", "couloir": "corridor", "veranda": "terrace",
            "garage": "garage", "bureau": "office"
        }
        for kw, r_type in keywords.items():
            if kw in t_clean:
                return f"room_label:{r_type}"

        return "text"
