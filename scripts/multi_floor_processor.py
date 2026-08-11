#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
MULTI-FLOOR PROCESSOR — ARCHI CAM AI V8
════════════════════════════════════════════════════════════════════════════════
Traitement automatique des plans multi-étages (RDC, R+1, R+2, Sous-sol...) :
1. Extraction des pages PDF (1 page = 1 étage)
2. Détection OCR des marqueurs de niveau ("RDC", "R+1", "Étage 2"...)
3. Traitement classique de chaque étage via MasterPlanProcessor
4. Validation de la cohérence géométrique inter-étages (alignement escaliers)
5. Génération d'une vue empilée 3D isométrique
6. Génération d'un rapport JSON consolidé multi-étages
"""

import os
import re
import sys
import json
import time
from pathlib import Path
import numpy as np
import cv2
from typing import List, Dict, Optional, Tuple
import logging

logger = logging.getLogger(__name__)

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

HAS_PYPDFIUM = False
try:
    import pypdfium2 as pdfium
    HAS_PYPDFIUM = True
except ImportError:
    pass

HAS_EASYOCR = False
try:
    import easyocr
    _OCR_READER = None  # Lazy init
    HAS_EASYOCR = True
except ImportError:
    pass

from master_plan_processor import MasterPlanProcessor, compute_file_sha256, InputType, process_floor_plan


# ── PATTERNS DE NIVEAU ────────────────────────────────────────────────────────
FLOOR_PATTERNS = [
    (r'(?i)(?:r[Ee]z[- ]de[- ]chauss[eé]e|RDC)', 0),
    (r'(?i)(?:sous[- ]sol|SS|B1|B2)', -1),
    (r'(?i)R\+(\d+)|R(\d+)', None),
    (r'(?i)[ÉEe]tage\s*(\d+)', None),
    (r'(?i)Floor\s*(\d+)', None),
    (r'(?i)Level\s*(\d+)', None),
    (r'(?i)Level\s*G(?:round)?', 0),
    (r'(?i)(\d+)(?:ER|È[Mm][Ee]|E[Mm][Ee])\s+[ÉEe]tage', None)
]


def extract_floor_number(label: str) -> int:
    """Convertit un label textuel en numéro d'étage (-1, 0, 1, 2...)."""
    for pattern, value in FLOOR_PATTERNS:
        m = re.search(pattern, label)
        if m:
            if value is not None:
                return value
            for g in m.groups():
                if g is not None and g.isdigit():
                    return int(g)
            return 0
    return 0


def detect_floor_markers_ocr(image_bgr: np.ndarray, confidence_threshold: float = 0.4) -> List[Dict]:
    """
    Détecte les marqueurs de niveau dans une image via EasyOCR.
    Retourne une liste de dicts : {label, text, floor_number, bbox, confidence}
    """
    global _OCR_READER

    if not HAS_EASYOCR:
        return _detect_floor_markers_fallback(image_bgr)

    if _OCR_READER is None:
        logger.info("  [OCR] Initialisation EasyOCR (première fois)...")
        _OCR_READER = easyocr.Reader(['fr', 'en'], gpu=False, verbose=False)

    results = _OCR_READER.readtext(image_bgr)
    markers = []
    for (bbox_pts, text, conf) in results:
        if conf < confidence_threshold:
            continue
        text_clean = text.strip()
        matched = False
        for pattern, _ in FLOOR_PATTERNS:
            if re.search(pattern, text_clean):
                matched = True
                break
        if matched:
            xs = [pt[0] for pt in bbox_pts]
            ys = [pt[1] for pt in bbox_pts]
            markers.append({
                'label': text_clean,
                'text': text_clean,
                'floor_number': extract_floor_number(text_clean),
                'bbox': [int(min(xs)), int(min(ys)), int(max(xs)), int(max(ys))],
                'confidence': round(float(conf), 3)
            })

    return sorted(markers, key=lambda x: x['floor_number'])


def _detect_floor_markers_fallback(image_bgr: np.ndarray) -> List[Dict]:
    """Fallback sans EasyOCR : retourne un marqueur générique RDC."""
    return [{'label': 'RDC', 'text': 'RDC', 'floor_number': 0, 'bbox': [0, 0, 100, 30], 'confidence': 0.5}]


def _pdf_pages_to_images(pdf_path: str, dpi: int = 200) -> List[np.ndarray]:
    """Convertit chaque page d'un PDF en image BGR numpy."""
    if not HAS_PYPDFIUM:
        raise ImportError("pypdfium2 requis pour traiter les PDF multi-pages. "
                          "Installez via : pip install pypdfium2")
    doc = pdfium.PdfDocument(pdf_path)
    images = []
    for i in range(len(doc)):
        page = doc[i]
        scale = dpi / 72.0
        bitmap = page.render(scale=scale)
        pil_img = bitmap.to_pil().convert("RGB")
        images.append(cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR))
    return images


def validate_staircase_alignment(
    floors_data: Dict[str, Dict],
    iou_threshold: float = 0.30,
    max_distance_cm: float = 20.0,
    max_area_diff_pct: float = 15.0
) -> Dict:
    """
    Vérifie l'alignement des cages d'escalier entre étages consécutifs.
    """
    sorted_floors = sorted(
        [(k, v) for k, v in floors_data.items() if 'error' not in v and v.get('status') != 'ERROR'],
        key=lambda x: x[1].get('floor_number', 0)
    )
    alignment_report = {
        'pairs_checked': [],
        'global_aligned': True,
        'aligned': True,
        'warnings': [],
        'errors': [],
        'staircase_positions': {}
    }

    if len(sorted_floors) < 2:
        alignment_report['warnings'].append("Moins de 2 étages détectés - validation impossible")
        return alignment_report

    for i in range(len(sorted_floors) - 1):
        f_a, data_a = sorted_floors[i]
        f_b, data_b = sorted_floors[i + 1]

        stairs_a = data_a.get('metadata', {}).get('staircase_zones', [])
        stairs_b = data_b.get('metadata', {}).get('staircase_zones', [])

        if not stairs_a or not stairs_b:
            alignment_report['pairs_checked'].append({
                'from': f_a, 'to': f_b,
                'status': 'SKIP_NO_STAIRS',
                'iou': None
            })
            continue

        bbox_a = stairs_a[0].get('bbox', [0, 0, 1, 1]) if isinstance(stairs_a[0], dict) else stairs_a[0]
        bbox_b = stairs_b[0].get('bbox', [0, 0, 1, 1]) if isinstance(stairs_b[0], dict) else stairs_b[0]

        iou = _compute_bbox_iou(bbox_a, bbox_b)
        cx_a = (bbox_a[0] + bbox_a[2]) / 2.0
        cy_a = (bbox_a[1] + bbox_a[3]) / 2.0
        cx_b = (bbox_b[0] + bbox_b[2]) / 2.0
        cy_b = (bbox_b[1] + bbox_b[3]) / 2.0
        centroid_dist = ((cx_a - cx_b) ** 2 + (cy_a - cy_b) ** 2) ** 0.5
        dist_cm = centroid_dist / 10.0  # Approx 10 px/cm

        is_aligned = (iou >= iou_threshold) or (dist_cm <= max_distance_cm)

        pair_result = {
            'from': f_a,
            'to': f_b,
            'iou': round(iou, 3),
            'centroid_distance_px': round(centroid_dist, 1),
            'centroid_distance_cm': round(dist_cm, 1),
            'status': 'ALIGNED' if is_aligned else 'MISALIGNED'
        }
        alignment_report['pairs_checked'].append(pair_result)

        if not is_aligned:
            alignment_report['global_aligned'] = False
            alignment_report['aligned'] = False
            msg = (
                f"⚠️ Désalignement escalier entre '{f_a}' et '{f_b}' "
                f"(IoU={iou:.2f} < {iou_threshold}, Distance: {dist_cm:.1f}cm > {max_distance_cm}cm)."
            )
            alignment_report['warnings'].append(msg)
            logger.warning(msg)
        else:
            logger.info(f"  ✅ Escalier aligné : '{f_a}' ↔ '{f_b}' (IoU={iou:.2f})")

    return alignment_report


def _compute_bbox_iou(bbox_a: list, bbox_b: list) -> float:
    """Calcule l'IoU entre deux bounding boxes [x1,y1,x2,y2]."""
    ax1, ay1, ax2, ay2 = bbox_a
    bx1, by1, bx2, by2 = bbox_b

    inter_x1 = max(ax1, bx1)
    inter_y1 = max(ay1, by1)
    inter_x2 = min(ax2, bx2)
    inter_y2 = min(ay2, by2)

    if inter_x2 <= inter_x1 or inter_y2 <= inter_y1:
        return 0.0

    inter_area = (inter_x2 - inter_x1) * (inter_y2 - inter_y1)
    area_a = max(1, (ax2 - ax1) * (ay2 - ay1))
    area_b = max(1, (bx2 - bx1) * (by2 - by1))
    union_area = area_a + area_b - inter_area

    return inter_area / union_area if union_area > 0 else 0.0


class MultiFloorProcessor:
    """
    Classe processeur multi-étages orientée objet.
    """
    def __init__(self, ocr_languages: List[str] = ['fr', 'en']):
        self.ocr_languages = ocr_languages

    def extract_floor_number(self, text: str) -> int:
        return extract_floor_number(text)

    def detect_floor_indicators(self, image: np.ndarray, confidence_threshold: float = 0.4) -> List[Dict]:
        return detect_floor_markers_ocr(image, confidence_threshold)

    def process_pdf_multi_floor(self, pdf_path: str, output_base_dir: str, dpi: int = 200) -> Dict:
        return process_multi_floor_plan(pdf_path, output_base_dir, dpi=dpi)

    def validate_staircase_alignment(self, floors_data: Dict[str, dict]) -> Dict:
        return validate_staircase_alignment(floors_data)

    def generate_stacked_visualization(self, floors_data: Dict[str, dict], output_path: str, floor_height_px: int = 300):
        """Génération d'une vue empilée multi-étages."""
        sorted_floors = sorted(
            [(name, data) for name, data in floors_data.items() if 'error' not in data and data.get('status') != 'ERROR'],
            key=lambda x: x[1].get('floor_number', 0)
        )
        if not sorted_floors:
            return

        total_height = len(sorted_floors) * floor_height_px + 200
        canvas_width = 2048
        canvas = np.ones((total_height, canvas_width, 3), dtype=np.uint8) * 255

        for idx, (floor_name, floor_data) in enumerate(sorted_floors):
            y_offset = total_height - (idx + 1) * floor_height_px
            mask_path = os.path.join(floor_data.get('output_dir', ''), "furniture_anchors_map.png")
            if os.path.exists(mask_path):
                mask_img = cv2.imread(mask_path)
                if mask_img is not None:
                    resized = cv2.resize(mask_img, (1800, floor_height_px - 40))
                    canvas[y_offset:y_offset + floor_height_px - 40, 150:150 + 1800] = resized

            cv2.putText(canvas, f"{floor_name} (Niveau {floor_data.get('floor_number', 0)})",
                        (30, y_offset + 30), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 0), 2)

        cv2.imwrite(output_path, canvas)
        logger.info(f"🎨 Visualisation empilée sauvegardée : {output_path}")


def process_multi_floor_plan(
    input_path: str,
    output_base_dir: str,
    processor: Optional[MasterPlanProcessor] = None,
    dpi: int = 200,
    debug_mode: bool = True
) -> Dict:
    """
    Pipeline unifié multi-étages complet.
    """
    if processor is None:
        processor = MasterPlanProcessor()

    os.makedirs(output_base_dir, exist_ok=True)
    start_time = time.time()

    ext = os.path.splitext(input_path)[1].lower()
    if ext == '.pdf':
        page_images = _pdf_pages_to_images(input_path, dpi=dpi)
    else:
        img = cv2.imread(input_path)
        if img is None:
            raise FileNotFoundError(f"Image introuvable : {input_path}")
        page_images = [img]

    floors_data: Dict[str, Dict] = {}

    for idx, page_img in enumerate(page_images):
        markers = detect_floor_markers_ocr(page_img)
        if markers:
            floor_label = markers[0]['label']
            floor_number = markers[0]['floor_number']
        else:
            floor_label = f"Étage_{idx}"
            floor_number = idx

        safe_label = re.sub(r'[^a-zA-Z0-9_+]', '_', floor_label)
        floor_output_dir = os.path.join(output_base_dir, safe_label)
        os.makedirs(floor_output_dir, exist_ok=True)

        floor_input_path = os.path.join(floor_output_dir, "source_page.png")
        cv2.imwrite(floor_input_path, page_img)

        try:
            result = processor.process(
                input_path=floor_input_path,
                output_dir=floor_output_dir,
                debug_mode=debug_mode
            )
            floors_data[floor_label] = {
                'floor_number': floor_number,
                'floor_label': floor_label,
                'output_dir': floor_output_dir,
                'mask_path': os.path.join(floor_output_dir, "furniture_anchors_map.png"),
                'placement_logic': result.get('placement_logic', {}),
                'metadata': result,
                'status': 'SUCCESS'
            }
        except Exception as e:
            floors_data[floor_label] = {
                'floor_number': floor_number,
                'floor_label': floor_label,
                'output_dir': floor_output_dir,
                'metadata': None,
                'status': f'ERROR: {str(e)}'
            }

    alignment_report = validate_staircase_alignment(floors_data)

    total_time = round(time.time() - start_time, 2)
    consolidated_report = {
        'source_file': input_path,
        'source_sha256': compute_file_sha256(input_path) if os.path.exists(input_path) else None,
        'total_floors': len(floors_data),
        'processing_time_seconds': total_time,
        'floors': floors_data,
        'staircase_alignment': alignment_report
    }

    report_path = os.path.join(output_base_dir, 'multi_floor_report.json')
    with open(report_path, 'w', encoding='utf-8') as rp:
        json.dump(consolidated_report, rp, indent=2, ensure_ascii=False)

    return consolidated_report


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser(description='Archi Cam AI — Multi-Floor Processor')
    parser.add_argument('--input', required=True, help='Chemin PDF multi-pages ou image')
    parser.add_argument('--output-dir', required=True, help='Répertoire de sortie')
    parser.add_argument('--dpi', type=int, default=200, help='DPI de rendu PDF (défaut 200)')
    parser.add_argument('--no-debug', action='store_true', help='Désactiver les exports de debug')
    args = parser.parse_args()

    process_multi_floor_plan(
        input_path=args.input,
        output_base_dir=args.output_dir,
        dpi=args.dpi,
        debug_mode=not args.no_debug
    )
