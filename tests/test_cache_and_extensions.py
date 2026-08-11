import unittest
import os
import sys
import time
import tempfile
from pathlib import Path
import numpy as np
import cv2

SCRIPTS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "scripts")
sys.path.insert(0, SCRIPTS_DIR)

from cache_manager import PlanProcessingCache
from master_plan_processor import process_floor_plan, MasterPlanProcessor, get_cache_stats, clear_cache
from multi_floor_processor import MultiFloorProcessor, extract_floor_number, validate_staircase_alignment
from export_formats import DXFExporter, PDFAnnotator, export_plan_to_dxf, export_plan_to_pdf


class TestCachePerformance(unittest.TestCase):
    
    def setUp(self):
        self.tmpdir = tempfile.TemporaryDirectory()
        self.cache_instance = PlanProcessingCache(cache_dir=self.tmpdir.name)
    
    def tearDown(self):
        self.tmpdir.cleanup()
    
    def test_cache_hit_flow(self):
        """Vérification gain de performance avec cache"""
        test_img = np.ones((400, 400, 3), dtype=np.uint8) * 255
        cv2.rectangle(test_img, (50, 50), (350, 350), (0, 0, 0), 6)
        test_plan = os.path.join(self.tmpdir.name, "test_plan.png")
        cv2.imwrite(test_plan, test_img)
        output_dir = os.path.join(self.tmpdir.name, "output")
        
        result1 = process_floor_plan(test_plan, output_dir, use_cache=True)
        result2 = process_floor_plan(test_plan, output_dir, use_cache=True)
        
        self.assertEqual(result1['file_hash'], result2['file_hash'])
        self.assertTrue(result2['from_cache'])
    
    def test_cache_invalidation_on_version_change(self):
        """Vérification invalidation si version change"""
        file_hash = "test_hash_123"
        self.cache_instance.set_classification(file_hash, "digital", {})
        self.assertEqual(self.cache_instance.get_classification(file_hash), "digital")
        
        old_version = self.cache_instance.CACHE_VERSION
        self.cache_instance.CACHE_VERSION = "v9.0"
        self.assertIsNone(self.cache_instance.get_classification(file_hash))
        self.cache_instance.CACHE_VERSION = old_version
    
    def test_cache_stats_accuracy(self):
        """Vérification précision des statistiques"""
        file_hash = "test_hash_456"
        self.cache_instance.set_classification(file_hash, "sketch", {'density': 0.25})
        stats = self.cache_instance.get_stats()
        self.assertGreaterEqual(stats['classification']['total_entries'], 1)
        self.assertGreaterEqual(stats['classification']['valid_entries'], 1)


class TestMultiFloorAndExports(unittest.TestCase):

    def test_floor_indicators(self):
        self.assertEqual(extract_floor_number("RDC"), 0)
        self.assertEqual(extract_floor_number("R+1"), 1)
        self.assertEqual(extract_floor_number("R+2"), 2)
        self.assertEqual(extract_floor_number("Étage 3"), 3)
        self.assertEqual(extract_floor_number("Sous-sol"), -1)

    def test_staircase_alignment(self):

        floors_ok = {
            'RDC': {'floor_number': 0, 'metadata': {'staircase_zones': [{'bbox': [100, 100, 200, 200]}]}},
            'R+1': {'floor_number': 1, 'metadata': {'staircase_zones': [{'bbox': [105, 102, 205, 202]}]}}
        }
        self.assertTrue(validate_staircase_alignment(floors_ok)['aligned'])

    def test_exports(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            mask_path = os.path.join(tmpdir, "mask.png")
            dummy_mask = np.ones((400, 400), dtype=np.uint8) * 240
            cv2.rectangle(dummy_mask, (50, 50), (350, 350), 0, 8)
            cv2.imwrite(mask_path, dummy_mask)

            dxf_out = os.path.join(tmpdir, "out.dxf")
            export_plan_to_dxf(mask_path, {}, dxf_out)
            self.assertTrue(os.path.exists(dxf_out))

            pdf_out = os.path.join(tmpdir, "out.pdf")
            export_plan_to_pdf(mask_path, {}, {'rooms': [{'name': 'Salon', 'type': 'LIVING', 'area_m2': 25.0}]}, pdf_out)
            self.assertTrue(os.path.exists(pdf_out))


if __name__ == '__main__':
    unittest.main(verbosity=2)
