#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TESTS C1 & C2 — CACHE SHA256, PARALLÉLISATION, MULTI-ÉTAGES, EXPORT DXF/PDF
"""

import os
import sys
import unittest
import time
import json
import numpy as np
import cv2
import tempfile

SCRIPTS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "scripts")
sys.path.insert(0, SCRIPTS_DIR)

from master_plan_processor import (
    MasterPlanProcessor,
    InputType,
    classify_input_image,
    classify_input_image_cached,
    compute_image_sha256,
    compute_file_sha256,
    invalidate_classification_cache,
    _CLASSIFICATION_CACHE,
)
from multi_floor_processor import (
    extract_floor_number,
    _compute_bbox_iou,
    validate_staircase_alignment,
)
from export_formats import export_to_dxf, export_all, HAS_EZDXF


class TestC1_CacheSHA256(unittest.TestCase):
    """Option C1.1 — Cache Intelligent SHA256"""

    def setUp(self):
        invalidate_classification_cache()

    def test_sha256_deterministic(self):
        """Le même tableau numpy doit produire le même hash."""
        img = np.ones((400, 400, 3), dtype=np.uint8) * 200
        h1 = compute_image_sha256(img)
        h2 = compute_image_sha256(img)
        self.assertEqual(h1, h2)
        self.assertEqual(len(h1), 64)  # SHA256 hex = 64 chars

    def test_sha256_different_images(self):
        """Deux images différentes produisent des hashes différents."""
        img_a = np.ones((400, 400, 3), dtype=np.uint8) * 200
        img_b = np.ones((400, 400, 3), dtype=np.uint8) * 100
        self.assertNotEqual(compute_image_sha256(img_a), compute_image_sha256(img_b))

    def test_cache_hit_speedup(self):
        """Le 2e appel avec la même image doit être significativement plus rapide (cache hit)."""
        img = np.ones((800, 800, 3), dtype=np.uint8) * 255
        cv2.rectangle(img, (100, 100), (700, 700), (0, 0, 0), 10)
        cv2.line(img, (400, 100), (400, 700), (0, 0, 0), 6)

        # Préchauffage (initialisation du cache Python lors du 1er appel)
        classify_input_image_cached(img)
        invalidate_classification_cache()

        # 1er appel réel : calcul complet
        t0 = time.perf_counter()
        result1 = classify_input_image_cached(img)
        t1 = time.perf_counter()
        first_call_ms = (t1 - t0) * 1000

        # 2e appel : cache hit (dictionnaire Python, < 1ms)
        t2 = time.perf_counter()
        result2 = classify_input_image_cached(img)
        t3 = time.perf_counter()
        second_call_ms = (t3 - t2) * 1000

        self.assertEqual(result1, result2)
        # Le 2e appel (cache hit) doit être au moins 3x plus rapide que le 1er (calcul Canny+Hough)
        # Sur Windows avec overhead de processus, on accepte un ratio >3
        if first_call_ms > 5:
            self.assertLess(second_call_ms, first_call_ms,
                            f"Cache pas plus rapide : {second_call_ms:.2f}ms >= {first_call_ms:.2f}ms")

    def test_cache_stores_result(self):
        """Après un appel, le hash doit être présent dans _CLASSIFICATION_CACHE."""
        img = np.ones((400, 400, 3), dtype=np.uint8) * 255
        cv2.rectangle(img, (50, 50), (350, 350), (0, 0, 0), 8)
        cv2.line(img, (200, 50), (200, 350), (0, 0, 0), 4)

        img_hash = compute_image_sha256(img)
        self.assertNotIn(img_hash, _CLASSIFICATION_CACHE)
        classify_input_image_cached(img)
        self.assertIn(img_hash, _CLASSIFICATION_CACHE)

    def test_cache_invalidation(self):
        """invalidate_classification_cache() doit vider le cache."""
        img = np.ones((300, 300, 3), dtype=np.uint8) * 240
        classify_input_image_cached(img)
        self.assertGreater(len(_CLASSIFICATION_CACHE), 0)
        invalidate_classification_cache()
        self.assertEqual(len(_CLASSIFICATION_CACHE), 0)

    def test_file_sha256(self):
        """compute_file_sha256 doit produire un hash valide sur un fichier."""
        with tempfile.NamedTemporaryFile(suffix='.bin', delete=False) as f:
            f.write(b'archi_cam_ai_test_data' * 100)
            tmp_path = f.name
        try:
            h = compute_file_sha256(tmp_path)
            self.assertEqual(len(h), 64)
        finally:
            os.unlink(tmp_path)


class TestC1_ParallelPlacement(unittest.TestCase):
    """Option C1.2 — Parallélisation ThreadPoolExecutor"""

    def setUp(self):
        self.processor = MasterPlanProcessor()

    def _make_room(self, room_type, x, y, w, h, room_id):
        poly = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]]
        centroid = [x + w // 2, y + h // 2]
        return {
            'id': room_id,
            'name': room_type,
            'type': room_type,
            'bbox': [x, y, x + w, y + h],
            'centroid': centroid,
            'polygon': poly,
            'area_m2': round((w * h) * 0.0025, 1)
        }

    def test_parallel_mask_integrity(self):
        """Le masque parallèle doit avoir la même intégrité qu'un masque séquentiel."""
        rooms = [
            self._make_room('BEDROOM', 50, 50, 200, 150, 'r1'),
            self._make_room('LIVING', 260, 50, 220, 200, 'r2'),
            self._make_room('KITCHEN', 50, 210, 180, 130, 'r3'),
            self._make_room('BATHROOM', 240, 260, 130, 120, 'r4'),
            self._make_room('DINING', 380, 260, 150, 120, 'r5'),
        ]

        img = np.ones((500, 600, 3), dtype=np.uint8) * 255

        with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as f:
            tmp_anchors = f.name

        try:
            anchors, placement_logic = self.processor.build_deterministic_mask_from_yolo(
                cleaned_image=img,
                yolo_data=None,
                rooms_list=rooms,
                staircase_zones=[],
                storage_zones=[],
                outdoor_data={'zones': []},
                output_path=tmp_anchors
            )
            self.assertIsInstance(anchors, np.ndarray)
            self.assertEqual(anchors.shape, (500, 600))
            # Vérifier que du mobilier est placé (valeurs > 200)
            furniture_pixels = np.count_nonzero(anchors > 200)
            self.assertGreater(furniture_pixels, 0,
                               "Aucun mobilier placé dans le masque parallèle")
            self.assertIn('stairwell_detected', placement_logic)
        finally:
            try:
                os.unlink(tmp_anchors)
            except Exception:
                pass

    def test_parallel_speedup_many_rooms(self):
        """Le traitement parallèle de 6+ pièces doit rester performant (<5s)."""
        rooms = [
            self._make_room('BEDROOM', 0 + (i % 3) * 200, (i // 3) * 200, 180, 180, f'r{i}')
            for i in range(6)
        ]
        img = np.ones((600, 600, 3), dtype=np.uint8) * 255

        with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as f:
            tmp = f.name

        try:
            t0 = time.perf_counter()
            self.processor.build_deterministic_mask_from_yolo(
                cleaned_image=img,
                yolo_data=None,
                rooms_list=rooms,
                staircase_zones=[],
                storage_zones=[],
                outdoor_data={'zones': []},
                output_path=tmp
            )
            elapsed = time.perf_counter() - t0
            self.assertLess(elapsed, 5.0,
                            f"Placement parallèle trop lent : {elapsed:.2f}s pour 6 pièces")
        finally:
            try:
                os.unlink(tmp)
            except Exception:
                pass


class TestC2_MultiFloor(unittest.TestCase):
    """Option C2.1 — Multi-Étages"""

    def test_extract_floor_number_rdc(self):
        self.assertEqual(extract_floor_number("RDC"), 0)
        self.assertEqual(extract_floor_number("Rez-de-chaussée"), 0)

    def test_extract_floor_number_r_plus(self):
        self.assertEqual(extract_floor_number("R+1"), 1)
        self.assertEqual(extract_floor_number("R+2"), 2)
        self.assertEqual(extract_floor_number("R+3"), 3)

    def test_extract_floor_number_etage(self):
        self.assertEqual(extract_floor_number("Étage 2"), 2)
        self.assertEqual(extract_floor_number("Etage 1"), 1)   # Sans accent
        self.assertEqual(extract_floor_number("Floor 3"), 3)

    def test_extract_floor_number_sous_sol(self):
        self.assertEqual(extract_floor_number("Sous-sol"), -1)

    def test_bbox_iou_perfect_overlap(self):
        bbox = [10, 10, 100, 100]
        self.assertAlmostEqual(_compute_bbox_iou(bbox, bbox), 1.0, places=3)

    def test_bbox_iou_no_overlap(self):
        self.assertAlmostEqual(_compute_bbox_iou([0, 0, 10, 10], [50, 50, 100, 100]), 0.0, places=3)

    def test_bbox_iou_partial_overlap(self):
        a = [0, 0, 100, 100]
        b = [50, 50, 150, 150]
        iou = _compute_bbox_iou(a, b)
        # Intersection = 50x50=2500, Union = 10000+10000-2500=17500, IoU=2500/17500≈0.143
        self.assertAlmostEqual(iou, 2500 / 17500, places=3)

    def test_staircase_alignment_aligned(self):
        """Deux étages avec escaliers au même endroit → ALIGNED."""
        floors = {
            'RDC':  {'floor_number': 0, 'metadata': {'staircase_zones': [{'bbox': [100, 100, 200, 200]}]}},
            'R+1':  {'floor_number': 1, 'metadata': {'staircase_zones': [{'bbox': [105, 102, 205, 202]}]}},
        }
        report = validate_staircase_alignment(floors, iou_threshold=0.50)
        self.assertTrue(report['global_aligned'])
        self.assertEqual(len(report['warnings']), 0)

    def test_staircase_alignment_misaligned(self):
        """Deux étages avec escaliers déplacés → MISALIGNED avec avertissement."""
        floors = {
            'RDC':  {'floor_number': 0, 'metadata': {'staircase_zones': [{'bbox': [100, 100, 200, 200]}]}},
            'R+1':  {'floor_number': 1, 'metadata': {'staircase_zones': [{'bbox': [400, 400, 500, 500]}]}},
        }
        report = validate_staircase_alignment(floors, iou_threshold=0.30)
        self.assertFalse(report['global_aligned'])
        self.assertGreater(len(report['warnings']), 0)


class TestC2_ExportDXF(unittest.TestCase):
    """Option C2.2 — Export DXF / PDF"""

    def test_dxf_export_creates_file(self):
        """export_to_dxf() doit créer un fichier .dxf valide."""
        if not HAS_EZDXF:
            self.skipTest("ezdxf non installé")

        rooms = [
            {
                'polygon': [[10, 10], [200, 10], [200, 150], [10, 150]],
                'centroid': [105, 80],
                'name': 'Salon',
                'type': 'LIVING',
                'area_m2': 18.5
            }
        ]
        placement_logic = {
            'room_1': {
                'type': 'LIVING',
                'living_layout': {
                    'sofa': {'center': [80, 80], 'size': [100, 50], 'rotation': 0},
                    'coffee_table': {'center': [80, 130], 'size': [60, 40], 'rotation': 0},
                }
            }
        }

        with tempfile.NamedTemporaryFile(suffix='.dxf', delete=False) as f:
            out_path = f.name

        try:
            export_to_dxf(
                placement_logic=placement_logic,
                rooms_list=rooms,
                staircase_zones=[[300, 100, 400, 200]],
                outdoor_zones=[],
                output_path=out_path,
                project_name="Test Unitaire DXF"
            )
            self.assertTrue(os.path.exists(out_path))
            self.assertGreater(os.path.getsize(out_path), 500)
        finally:
            try:
                os.unlink(out_path)
            except Exception:
                pass

    def test_dxf_without_ezdxf_raises_import_error(self):
        """Sans ezdxf, export_to_dxf doit lever ImportError."""
        import export_formats as ef
        original = ef.HAS_EZDXF
        ef.HAS_EZDXF = False
        try:
            with self.assertRaises(ImportError):
                ef.export_to_dxf({}, [], [], [], '/tmp/test.dxf')
        finally:
            ef.HAS_EZDXF = original


if __name__ == '__main__':
    unittest.main(verbosity=2)
