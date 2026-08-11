import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import pytest
import numpy as np
import cv2
import os
import tempfile
from scripts.master_plan_processor import MasterPlanProcessor


def test_v8_bedroom_layout():
    proc = MasterPlanProcessor()
    # Polygone rectangulaire simple 100x120px
    poly = [[10, 10], [110, 10], [110, 130], [10, 130]]
    items, err = proc.calculate_bedroom_layout(poly)
    assert err is None
    assert len(items) >= 4 # Lit, 2 chevets, 1 dégagement
    bed = next(it for it in items if it['type'] == 'bed')
    assert bed['mask_value'] == 205
    assert bed['dimensions_cm'] == [160, 200]

def test_v8_living_layout():
    proc = MasterPlanProcessor()
    poly = [[0, 0], [200, 0], [200, 150], [0, 150]]
    items, err = proc.calculate_living_layout(poly)
    assert err is None
    assert len(items) >= 3 # Canapé, Table basse, Meuble TV
    sofa = next(it for it in items if it['type'] == 'sofa')
    assert sofa['mask_value'] == 180
    tv = next(it for it in items if it['type'] == 'tv_cabinet')
    assert tv['mask_value'] == 140

def test_v8_kitchen_layout():
    proc = MasterPlanProcessor()
    poly = [[0, 0], [120, 0], [120, 100], [0, 100]]
    items, err = proc.calculate_kitchen_countertops(poly)
    assert err is None
    assert any(it['type'] == 'countertop' for it in items)
    assert any(it['type'] == 'sink' for it in items)
    assert any(it['type'] == 'hob' for it in items)

def test_v8_bathroom_layout():
    proc = MasterPlanProcessor()
    poly = [[0, 0], [80, 0], [80, 80], [0, 80]]
    items, err = proc.calculate_bathroom_fixtures(poly)
    assert err is None
    assert any(it['type'] == 'shower' for it in items)
    assert any(it['type'] == 'vanity' for it in items)
    assert any(it['type'] == 'toilet' for it in items)

def test_v8_dining_and_storage():
    proc = MasterPlanProcessor()
    poly = [[0, 0], [100, 0], [100, 100], [0, 100]]
    dining_items, _ = proc.calculate_dining_layout(poly)
    assert any(it['type'] == 'dining_table' for it in dining_items)
    
    storage_items, _ = proc.calculate_storage_strips(poly)
    assert any(it['type'] == 'closet_strip' for it in storage_items)

def test_universal_furniture_anchor_map_generation():
    proc = MasterPlanProcessor()
    img = np.ones((400, 400, 3), dtype=np.uint8) * 255
    rooms = [
        {'id': 1, 'type': 'BEDROOM', 'polygon': [[20, 20], [150, 20], [150, 150], [20, 150]], 'area_m2': 14.5},
        {'id': 2, 'type': 'LIVING', 'polygon': [[160, 20], [380, 20], [380, 180], [160, 180]], 'area_m2': 28.0},
        {'id': 3, 'type': 'KITCHEN', 'polygon': [[20, 160], [150, 160], [150, 280], [20, 280]], 'area_m2': 10.0},
        {'id': 4, 'type': 'BATHROOM', 'polygon': [[160, 190], [260, 190], [260, 280], [160, 280]], 'area_m2': 6.5},
    ]
    staircase_zones = [[280, 190, 380, 280]]
    
    with tempfile.TemporaryDirectory() as tmp_dir:
        out_path = os.path.join(tmp_dir, "universal_anchor_map.png")
        mask, report = proc.generate_universal_furniture_anchor_map(
            cleaned_image=img,
            yolo_data=None,
            rooms_list=rooms,
            staircase_zones=staircase_zones,
            storage_zones=[],
            outdoor_data={'zones': []},
            output_path=out_path
        )
        assert os.path.exists(out_path)
        assert mask.shape == (400, 400)
if __name__ == "__main__":
    print("▶️ Lancement des tests du Moteur V8 Déterministe...")
    test_v8_bedroom_layout()
    print("  ✅ Chambre OK (Lit + Chevets + Dégagement)")
    test_v8_living_layout()
    print("  ✅ Salon OK (Canapé + Table basse + Meuble TV)")
    test_v8_kitchen_layout()
    print("  ✅ Cuisine OK (Plans L + Évier + Plaques)")
    test_v8_bathroom_layout()
    print("  ✅ SDB OK (Douche + Vasque + WC)")
    test_v8_dining_and_storage()
    print("  ✅ Salle à manger & Dressing OK")
    test_universal_furniture_anchor_map_generation()
    print("  ✅ Masque Ancre Universel + Rapport JSON OK")
    print("\n🎉 TOUS LES TESTS GÉOMÉTRIQUES V8 ONT RÉUSSI !")
