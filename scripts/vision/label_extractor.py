#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
EXTRACTION & CLASSIFICATION DES LABELS PAR OCR — ARCHI CAM AI
─────────────────────────────────────────────────────────────
Extrait les textes du plan d'architecte, classifie chaque label en type sémantique
(chambre, séjour, cuisine, etc.) et l'associe géométriquement à la pièce correspondante.
"""

import re
import numpy as np
from shapely.geometry import Point, Polygon as SPolygon

class LabelExtractor:
    ROOM_DICTIONARY = {
        "chambre": "bedroom",
        "chamber": "bedroom",
        "bed": "bedroom",
        "sejour": "living",
        "salon": "living",
        "living": "living",
        "cuisine": "kitchen",
        "kitchen": "kitchen",
        "toilet": "bathroom",
        "toil": "bathroom",
        "wc": "bathroom",
        "sdb": "bathroom",
        "bain": "bathroom",
        "eau": "bathroom",
        "douche": "bathroom",
        "sam": "dining",
        "manger": "dining",
        "couloir": "corridor",
        "hall": "corridor",
        "degagement": "corridor",
        "veranda": "terrace",
        "balcon": "balcony",
        "terrasse": "terrace",
        "garage": "garage",
        "parking": "garage",
        "bureau": "office",
        "dressing": "dressing",
        "entree": "entrance"
    }

    def __init__(self):
        self.ocr_engine = self._init_ocr()

    def _init_ocr(self):
        """Initialise le meilleur moteur OCR disponible."""
        # 1. EasyOCR
        try:
            import easyocr
            reader = easyocr.Reader(["fr", "en"], gpu=False, verbose=False)
            return ("easyocr", reader)
        except Exception:
            pass

        # 2. PaddleOCR
        try:
            from paddleocr import PaddleOCR
            ocr = PaddleOCR(use_angle_cls=True, lang="fr", show_log=False)
            return ("paddleocr", ocr)
        except Exception:
            pass

        # 3. PyTesseract
        try:
            import pytesseract
            return ("tesseract", pytesseract)
        except Exception:
            pass

        return ("none", None)

    def extract_all(self, image: np.ndarray) -> list:
        """Extrait tous les textes détectés avec leurs boîtes et centroïdes."""
        engine_type, engine = self.ocr_engine
        labels = []

        if engine_type == "easyocr":
            results = engine.readtext(image)
            for bbox, text, conf in results:
                if conf < 0.45 or len(text.strip()) < 2:
                    continue
                pts = np.array(bbox, dtype=np.int32)
                cx = int(np.mean(pts[:, 0]))
                cy = int(np.mean(pts[:, 1]))
                labels.append({
                    "text": text.strip(),
                    "centroid": [cx, cy],
                    "bbox": pts.tolist(),
                    "confidence": float(conf),
                    "type": self._classify(text)
                })

        elif engine_type == "paddleocr":
            results = engine.ocr(image, cls=True)
            if results and results[0]:
                for line in results[0]:
                    bbox = line[0]
                    text, conf = line[1]
                    if conf < 0.45 or len(text.strip()) < 2:
                        continue
                    cx = int(np.mean([p[0] for p in bbox]))
                    cy = int(np.mean([p[1] for p in bbox]))
                    labels.append({
                        "text": text.strip(),
                        "centroid": [cx, cy],
                        "bbox": [[int(p[0]), int(p[1])] for p in bbox],
                        "confidence": float(conf),
                        "type": self._classify(text)
                    })

        elif engine_type == "tesseract":
            import pytesseract
            data = pytesseract.image_to_data(image, output_type=pytesseract.Output.DICT)
            n_boxes = len(data["text"])
            for i in range(n_boxes):
                text = data["text"][i].strip()
                conf = float(data["conf"][i])
                if conf > 40 and len(text) >= 2:
                    x, y, w, h = data["left"][i], data["top"][i], data["width"][i], data["height"][i]
                    cx, cy = x + w // 2, y + h // 2
                    labels.append({
                        "text": text,
                        "centroid": [cx, cy],
                        "bbox": [[x, y], [x + w, y], [x + w, y + h], [x, y + h]],
                        "confidence": conf / 100.0,
                        "type": self._classify(text)
                    })

        return labels

    def _classify(self, text: str) -> str:
        """Classifie le texte (label de pièce, cotation métrique, ou surface)."""
        t_clean = text.lower().strip()
        
        # Détection surface (ex: "14.5 m²")
        if "m²" in t_clean or "m2" in t_clean:
            return "area"
            
        # Détection cote technique (ex: "3.50", "4.20")
        try:
            val = float(t_clean.replace(",", "."))
            if 0.5 <= val <= 30.0:
                return "dimension"
        except ValueError:
            pass

        # Détection pièce
        for kw, r_type in self.ROOM_DICTIONARY.items():
            if kw in t_clean:
                return f"room_label:{r_type}"

        return "text"

    def assign_to_rooms(self, labels: list, rooms: list) -> list:
        """Associe géométriquement chaque label à son polygone de pièce parent."""
        if not labels or not rooms:
            return rooms

        # Construction des polygones Shapely
        shapely_rooms = []
        for r in rooms:
            pts = r.get("polygon", [])
            if len(pts) >= 3:
                try:
                    shapely_rooms.append((r, SPolygon(pts)))
                except Exception:
                    pass

        for label in labels:
            if not label["type"].startswith("room_label"):
                continue

            pt = Point(label["centroid"])
            room_type = label["type"].split(":")[1]

            for room, poly in shapely_rooms:
                if poly.contains(pt) or poly.distance(pt) < 15:
                    room["label"] = label["text"]
                    room["type"] = room_type
                    break

        return rooms
