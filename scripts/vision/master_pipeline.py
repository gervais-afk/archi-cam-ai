#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PIPELINE MAÎTRE DE VISION PAR ORDINATEUR — ARCHI CAM AI
────────────────────────────────────────────────────────
Extrait fidèlement les murs (sans hachures), pièces, surfaces, cotes, menuiseries (portes/baies),
poteaux BAEL 91, mobilier pré-dessiné (WC, douches, penderies encastrées), garde-corps balcons,
ratios bioclimatiques WFR, zones humides et graphe Neo4j d'un plan d'architecte.
"""

import os
import sys
import json
import argparse
from pathlib import Path
import numpy as np
import cv2

# Configuration UTF-8 universelle pour console Windows
try:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

# Définition dynamique du chemin d'import local
script_dir = os.path.dirname(os.path.abspath(__file__))
if script_dir not in sys.path:
    sys.path.insert(0, script_dir)

from preprocessing import PlanPreprocessor
from wall_detector import WallDetector
from room_extractor import RoomExtractor
from label_extractor import LabelExtractor
from opening_detector import OpeningDetector
from column_detector import ColumnDetector
from wfr_calculator import WfrCalculator
from adjacency_graph_builder import AdjacencyGraphBuilder
from wet_zone_classifier import WetZoneClassifier
from hatch_remover import HatchRemover
from drawn_furniture_extractor import DrawnFurnitureExtractor
from dimension_line_separator import DimensionLineSeparator
from balcony_veranda_extractor import BalconyVerandaExtractor

class ArchiCamVisionPipeline:
    def __init__(self, dpi: int = 300):
        self.preprocessor = PlanPreprocessor(dpi=dpi)
        self.wall_detector = WallDetector()
        self.room_extractor = RoomExtractor()
        self.label_extractor = LabelExtractor()

    def process(self, input_path: str, output_dir: str) -> dict:
        Path(output_dir).mkdir(parents=True, exist_ok=True)
        print(f"[Vision Pipeline Master] 🚀 Traitement multi-features du plan : {input_path}")

        # 1. Chargement & Nettoyage
        img = self.preprocessor.load(input_path)
        layers = self.preprocessor.clean(img)
        h, w = img.shape[:2]

        # 🧹 1.1 Filtrage & Suppression des Hachures à 45°/135° dans les Murs
        clean_walls_layer = HatchRemover.remove_hatching(layers["walls_layer"])

        # 2. Détection vectorielle des murs propres (sans hachures)
        walls_data = self.wall_detector.detect(clean_walls_layer)

        # 3. Extraction spatiale des pièces
        rooms = self.room_extractor.extract(clean_walls_layer, (h, w))

        # 4. Extraction OCR et assignation des pièces
        labels = self.label_extractor.extract_all(img)
        rooms = self.label_extractor.assign_to_rooms(labels, rooms)

        # 5. Calcul de l'échelle métrique (pixels par mètre) - PASS 1 (OCR des surfaces)
        scale_ppm = self._compute_scale(labels, rooms)
        for room in rooms:
            if scale_ppm > 0:
                room["area_m2"] = round(room["area_pixels"] / (scale_ppm ** 2), 2)

        # 🔬 6. ENRICHISSEMENT EXPERT (Multi-Features Analytics)

        # A. Détection des Ouvertures & Menuiseries (Portes battantes, Fenêtres, Baies, Voûtes)
        opening_detector = OpeningDetector(pixels_per_meter=scale_ppm)
        openings_data = opening_detector.detect(img, clean_walls_layer)

        # ── PASS 2 : RE-CALIBRATION VIA PORTES STANDARD (Inférence Sémantique RAG B) ──
        swing_doors = [op for op in openings_data.get("openings", []) if op.get("type") == "SWING_DOOR"]
        if swing_doors:
            door_ppms = []
            for door in swing_doors:
                bbox = door.get("bbox", [0, 0, 0, 0])
                w_px = max(bbox[2], bbox[3])
                # ppm = pixels / 0.90m
                ppm_est = w_px / 0.90
                door_ppms.append(ppm_est)
                
            if door_ppms:
                door_scale = float(np.mean(door_ppms))
                # Ajustement si déviation de plus de 10%
                if abs(door_scale - scale_ppm) / scale_ppm > 0.10:
                    print(f"[Scale Calibration] 🔄 Re-calibration par Portes Standard (0.90m) : {scale_ppm:.2f} -> {door_scale:.2f} px/m")
                    scale_ppm = door_scale
                    for room in rooms:
                        room["area_m2"] = round(room["area_pixels"] / (scale_ppm ** 2), 2)
                    opening_detector.ppm = scale_ppm
                    # Re-détecter les ouvertures avec la bonne échelle
                    openings_data = opening_detector.detect(img, clean_walls_layer)

        # B. Détection des Poteaux / Piliers Béton (BAEL 91)
        column_detector = ColumnDetector(pixels_per_meter=scale_ppm)
        columns_data = column_detector.detect(clean_walls_layer)

        # C. Détection du Mobilier Pré-dessiné (WC, douches, plans de travail, penderies encastrées)
        furniture_extractor = DrawnFurnitureExtractor(pixels_per_meter=scale_ppm)
        drawn_furniture_data = furniture_extractor.extract(img, clean_walls_layer, rooms)

        # D. Séparation des Lignes de Cotation Extérieures
        dimension_data = DimensionLineSeparator.separate(img, clean_walls_layer, ppm=scale_ppm)

        # E. Extracteur de Balcons, Vérandas & Garde-corps
        balcony_data = BalconyVerandaExtractor.extract(img, clean_walls_layer, ppm=scale_ppm)

        # F. Calcul du Ratio d'Éclairage Naturel Bioclimatique (WFR)
        wfr_compliance_list = [
            WfrCalculator.calculate_room_wfr(r, openings_data.get("openings", []))
            for r in rooms
        ]

        # G. Graphe d'Adjacence Topologique Dual (Neo4j Cypher Export)
        adjacency_graph = AdjacencyGraphBuilder.build_graph(rooms, openings_data.get("openings", []))

        # H. Zonage des Gaines Techniques & Zones Humides
        wet_zones_data = WetZoneClassifier.classify_rooms(rooms, clean_walls_layer, ppm=scale_ppm)

        # 7. Sauvegarde des images de validation visuelle (Debug)
        self._save_debug_images(img, walls_data, rooms, labels, openings_data, columns_data, drawn_furniture_data, output_dir)

        # 8. Assemblage du JSON final certifié Grand Cabinet
        result = {
            "status": "success",
            "image_size": [w, h],
            "scale": {
                "pixels_per_meter": round(scale_ppm, 2)
            },
            "wall_count": len(walls_data.get("segments", [])),
            "walls": walls_data.get("segments", []),
            "room_count": len(rooms),
            "rooms": rooms,
            "all_text": labels,
            "expert_analytics": {
                "openings": openings_data,
                "columns_bael91": columns_data,
                "drawn_fixtures": drawn_furniture_data,
                "dimension_lines": dimension_data["total_dimension_lines_count"],
                "balcony_railings": balcony_data["balcony_railings_count"],
                "wfr_bioclimatic": wfr_compliance_list,
                "adjacency_graph": adjacency_graph,
                "wet_zones": wet_zones_data
            }
        }

        output_json = os.path.join(output_dir, "extraction.json")
        with open(output_json, "w", encoding="utf-8") as f:
            json.dump(result, f, ensure_ascii=False, indent=2)

        print(f"[Vision Pipeline Master] ✨ SUCCÈS : {len(rooms)} pièces, {openings_data['windows_count']} fenêtres, {drawn_furniture_data['wardrobes_count']} penderies, {drawn_furniture_data['toilets_count']} sanitaires, {columns_data['total_columns_count']} poteaux extraits -> {output_json}")
        return result

    def _compute_scale(self, labels: list, rooms: list) -> float:
        """
        Calcule le ratio pixels/mètre en croisant les surfaces détectées dans l'OCR (Pass 1).
        Si aucune surface n'est trouvée, retourne 48.0 par défaut (300 DPI plan type).
        """
        import re
        scales = []
        for label in labels:
            text = label.get("text", "")
            match = re.search(r"(\d+(?:[.,]\d+)?)\s*(?:m2|m²|sqm)", text, re.IGNORECASE)
            if match:
                val = float(match.group(1).replace(",", "."))
                if val > 2.0:
                    bx = label.get("bbox", [0, 0, 0, 0])
                    cx, cy = (bx[0] + bx[2]) // 2, (bx[1] + bx[3]) // 2
                    for r in rooms:
                        poly = np.array(r.get("polygon", []), dtype=np.int32)
                        if len(poly) >= 3:
                            if cv2.pointPolygonTest(poly, (cx, cy), False) >= 0:
                                area_px = r.get("area_pixels", 0)
                                if area_px > 5000:
                                    ppm = np.sqrt(area_px / val)
                                    scales.append(ppm)
                                    print(f"[Scale Calibration] Détecté via OCR '{text}' dans {r['id']} : ppm = {ppm:.2f}")
                                    break
        if scales:
            median_scale = float(np.median(scales))
            print(f"[Scale Calibration] Échelle médiane calibrée via OCR : {median_scale:.2f} pixels/mètre")
            return median_scale
            
        print("[Scale Calibration] Aucun label de surface trouvé. Échelle par défaut : 48.0 pixels/mètre")
        return 48.0

    def _save_debug_images(self, img: np.ndarray, walls: dict, rooms: list, labels: list, openings: dict, columns: dict, furniture: dict, output_dir: str):
        """Génère les visualisations de contrôle pour l'ingénieur."""
        # A. Debug Murs & Poteaux
        debug_walls = img.copy()
        for seg in walls.get("segments", []):
            p1 = tuple(seg["p1"])
            p2 = tuple(seg["p2"])
            thick = max(2, int(seg.get("thickness", 4) // 2))
            cv2.line(debug_walls, p1, p2, (0, 0, 230), thick)

        # Superposer les poteaux en vert vif
        for col in columns.get("columns", []):
            cx, cy = col["centroid"]
            cv2.circle(debug_walls, (cx, cy), 12, (0, 255, 0), -1)

        cv2.imwrite(os.path.join(output_dir, "debug_walls.png"), debug_walls)

        # B. Debug Pièces & Sémantique
        debug_rooms = img.copy()
        for i, room in enumerate(rooms):
            pts = room.get("polygon", [])
            if len(pts) >= 3:
                np_pts = np.array(pts, dtype=np.int32)
                np.random.seed(i * 123 + 7)
                color = tuple(int(c) for c in np.random.randint(70, 240, 3))
                cv2.fillPoly(debug_rooms, [np_pts], color)
                label_text = room.get("label") or f"P{i+1}"
                cv2.putText(debug_rooms, label_text, tuple(room["centroid"]),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, (20, 20, 20), 2)

        overlay = cv2.addWeighted(img, 0.45, debug_rooms, 0.55, 0)
        cv2.imwrite(os.path.join(output_dir, "debug_rooms.png"), overlay)

        # C. Debug Mobilier Pré-dessiné & Sanitaires
        debug_furniture = img.copy()
        for fix in furniture.get("drawn_fixtures", []):
            x, y, w_box, h_box = fix["bbox"]
            f_type = fix["type"]
            color = (0, 200, 255) if f_type == "BUILT_IN_WARDROBE" else (255, 0, 100) if f_type == "WC_TOILET" else (0, 255, 255)
            cv2.rectangle(debug_furniture, (x, y), (x + w_box, y + h_box), color, 2)
            cv2.putText(debug_furniture, f_type[:6], (x, max(15, y - 5)), cv2.FONT_HERSHEY_SIMPLEX, 0.45, color, 1)

        cv2.imwrite(os.path.join(output_dir, "debug_drawn_furniture.png"), debug_furniture)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Pipeline d'extraction de plan par vision Grand Cabinet Multi-Features")
    parser.add_argument("--input", required=True, help="Chemin du fichier source (.pdf ou .png)")
    parser.add_argument("--output-dir", required=True, help="Dossier de sortie pour extraction.json et debugs")

    args = parser.parse_args()
    pipeline = ArchiCamVisionPipeline()
    pipeline.process(args.input, args.output_dir)
