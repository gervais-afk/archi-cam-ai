#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TESTS UNITAIRES & D'INTÉGRATION — DUAL-INPUT UNIVERSAL PROCESSOR & MOBILIER DÉTERMINISTE
─────────────────────────────────────────────────────────────────────────────────────────
Couvre :
1. Classification des entrées (Type A: Digital Clean, Type B: Sketch Paper, Type C: Photo Unusable)
2. Prétraitement et Vectorisation Morphologique SketchProcessor
3. Suite Mathématique de Placement Déterministe (Chambre, Salon, Salle à manger, Cuisine, SDB)
4. Intégration globale dans MasterPlanProcessor
"""

import os
import sys
import unittest
import numpy as np
import cv2
import json

# Ajouter le chemin racine des scripts
SCRIPTS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "scripts")
sys.path.append(SCRIPTS_DIR)

from master_plan_processor import (
    MasterPlanProcessor,
    InputType,
    classify_input_image,
    SketchProcessor
)

class TestDualInputAndFurnitureSuite(unittest.TestCase):

    def setUp(self):
        self.processor = MasterPlanProcessor()

    def test_classify_digital_plan(self):
        """Test Type A : Plan CAO / Vectoriel net avec murs droits"""
        img = np.ones((800, 800, 3), dtype=np.uint8) * 255
        # Murs rectangulaires nets
        cv2.rectangle(img, (100, 100), (700, 700), (0, 0, 0), 12)
        cv2.line(img, (400, 100), (400, 700), (0, 0, 0), 8)
        cv2.line(img, (100, 400), (700, 400), (0, 0, 0), 8)
        
        input_type = classify_input_image(img)
        self.assertEqual(input_type, InputType.DIGITAL_CLEAN)

    def test_classify_sketch_paper(self):
        """Test Type B : Croquis papier scanné avec grain et traits texturés"""
        # Fond papier réaliste avec légère texture
        img = np.ones((600, 600, 3), dtype=np.uint8) * 230
        np.random.seed(42)
        noise = np.random.normal(0, 14, (600, 600, 3)).astype(np.int16)
        img = np.clip(img.astype(np.int16) + noise, 0, 255).astype(np.uint8)
        # Traits de stylo légèrement ondulés
        for i in range(100, 500, 3):
            cv2.circle(img, (i, 150 + int(np.sin(i/20)*3)), 2, (30, 30, 30), -1)
            cv2.circle(img, (i, 450 + int(np.sin(i/20)*3)), 2, (30, 30, 30), -1)
            cv2.circle(img, (150 + int(np.cos(i/20)*3), i), 2, (30, 30, 30), -1)
            cv2.circle(img, (450 + int(np.cos(i/20)*3), i), 2, (30, 30, 30), -1)

        input_type = classify_input_image(img)
        self.assertEqual(input_type, InputType.SKETCH_PAPER)

    def test_sketch_processor_cleaning(self):
        """Test de débruitage et vectorisation SketchProcessor"""
        np.random.seed(42)
        noise = np.random.normal(190, 20, (500, 500)).astype(np.uint8)
        img = cv2.cvtColor(noise, cv2.COLOR_GRAY2BGR)
        cv2.rectangle(img, (100, 100), (400, 400), (20, 20, 20), 4)

        sketch_proc = SketchProcessor(img)
        cleaned = sketch_proc.preprocess()

        self.assertEqual(cleaned.shape, img.shape)
        # Le fond doit être majoritairement blanc (255)
        white_pixels = np.count_nonzero(cleaned == 255)
        total_pixels = cleaned.size
        self.assertGreater(white_pixels / total_pixels, 0.85)

    def test_classify_unusable_photo(self):
        """Test Type C : Image noire ou texture illisible"""
        dark_img = np.zeros((400, 400, 3), dtype=np.uint8)
        input_type = classify_input_image(dark_img)
        self.assertEqual(input_type, InputType.PHOTO_UNUSABLE)

    def test_bed_placement_deterministic(self):
        """Test géométrique du placement de lit (Chambre)"""
        # Pièce rectangulaire 300x200px
        poly = [[100, 100], [400, 100], [400, 300], [100, 300]]
        res, err = self.processor.calculate_bed_anchor_in_room(poly)

        self.assertIsNotNone(res)
        self.assertIsNone(err)
        bed = res['bed_position']
        self.assertEqual(bed['size_cm'], [160, 200])
        # Le lit doit être orienté vers l'intérieur de la pièce
        self.assertGreater(bed['center'][1], 100)
        self.assertLess(bed['center'][1], 300)

    def test_living_layout_deterministic(self):
        """Test géométrique du salon (Canapé + Table basse)"""
        poly = [[100, 100], [500, 100], [500, 400], [100, 400]]
        res, err = self.processor.calculate_living_layout(poly)

        self.assertIsNotNone(res)
        self.assertIsNone(err)
        sofa = next(it for it in res if it['type'] == 'sofa')
        table = next(it for it in res if it['type'] == 'coffee_table')
        self.assertIn('center', sofa)
        self.assertIn('center', table)
        self.assertGreater(sofa['size'][0], table['size'][0]) # Canapé plus large que table basse

    def test_dining_layout_deterministic(self):
        """Test géométrique de la salle à manger"""
        poly = [[100, 100], [300, 100], [300, 300], [100, 300]]
        res, err = self.processor.calculate_dining_layout(poly)

        self.assertIsNotNone(res)
        table = next(it for it in res if it['type'] == 'dining_table')
        self.assertEqual(table['center'], [200, 200])

    def test_kitchen_countertops_deterministic(self):
        """Test géométrique linéaire cuisine"""
        poly = [[50, 50], [250, 50], [250, 200], [50, 200]]
        res, err = self.processor.calculate_kitchen_countertops(poly)

        self.assertIsNotNone(res)
        self.assertIsInstance(res, list)
        self.assertGreaterEqual(len(res), 1)
        self.assertTrue(any(it['type'] == 'countertop' for it in res))

    def test_bathroom_fixtures_deterministic(self):
        """Test géométrique sanitaires / SDB"""
        poly = [[50, 50], [150, 50], [150, 150], [50, 150]]
        res, err = self.processor.calculate_bathroom_fixtures(poly)

        self.assertIsNotNone(res)
        self.assertTrue(any(it['type'] == 'shower' for it in res))
        self.assertTrue(any(it['type'] == 'vanity' for it in res))



if __name__ == "__main__":
    unittest.main()
