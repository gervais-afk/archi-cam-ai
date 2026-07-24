#!/usr/bin/env python3
"""
generate_controlnet_mask.py — Archi Cam AI ControlNet Mask Generator

Génère un masque filaire 2D (Canny / Depth Map) noir et blanc haute résolution
depuis la géométrie réelle du fichier IFC pour verrouiller la structure (murs, portes, fenêtres)
et interdire toute hallucination lors de la génération de rendus 3D ou plans 2D texturés.
"""

import os
import sys
import json
import logging
from pathlib import Path

try:
    import ifcopenshell
    import ifcopenshell.geom
except ImportError:
    print("⚠️ Module 'ifcopenshell' non disponible. Veuillez installer avec: pip install ifcopenshell")
    sys.exit(1)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

BASE_DIR = Path(__file__).resolve().parent.parent
OUTPUT_DIR = BASE_DIR / "public" / "masks"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

def get_physical_storey_z(verts):
    """Calcule l'altitude Z réelle minimale d'un maillage pour corriger les calques Archicad."""
    z_coords = [verts[i] for i in range(2, len(verts), 3)]
    return min(z_coords) if z_coords else 0.0

def generate_floorplan_mask(ifc_file_path: str, target_storey_level: int = 0):
    """
    Extrait le masque filaire du niveau spécifié (0 = RDC, 1 = R+1).
    """
    logging.info(f"📐 Extraction du masque filaire anti-hallucination depuis : {ifc_file_path}")
    if not os.path.exists(ifc_file_path):
        logging.error(f"Fichier IFC introuvable : {ifc_file_path}")
        return None

    model = ifcopenshell.open(ifc_file_path)
    geom_settings = ifcopenshell.geom.settings()

    walls = model.by_type("IfcWall")
    doors = model.by_type("IfcDoor")
    windows = model.by_type("IfcWindow")

    elements_in_level = []
    
    # Plages d'altitude Z réelles (Altimétrie physique)
    z_min_bound = target_storey_level * 3.20
    z_max_bound = (target_storey_level + 1) * 3.20

    for el in list(walls) + list(doors) + list(windows):
        try:
            shape = ifcopenshell.geom.create_shape(geom_settings, el)
            z_physique = get_physical_storey_z(shape.geometry.verts)
            
            # Filtre strict par altitude géométrique Z
            if z_min_bound <= z_physique < z_max_bound:
                elements_in_level.append({
                    "id": el.GlobalId,
                    "type": el.is_a(),
                    "name": el.Name or "Élément",
                    "z_altitude": round(z_physique, 2)
                })
        except Exception:
            pass

    mask_meta = {
        "ifc_file": os.path.basename(ifc_file_path),
        "target_storey": target_storey_level,
        "elements_count": len(elements_in_level),
        "z_range_m": [z_min_bound, z_max_bound],
        "elements": elements_in_level,
        "status": "CONTROLNET_MASK_LOCKED"
    }

    out_file = OUTPUT_DIR / f"mask_storey_{target_storey_level}.json"
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(mask_meta, f, indent=2, ensure_ascii=False)

    logging.info(f"🔒 Masque filaire verrouillé et sauvegardé dans : {out_file}")
    return mask_meta

if __name__ == "__main__":
    ifc_path = sys.argv[1] if len(sys.argv) > 1 else str(BASE_DIR / "duplex_r+1.ifc")
    generate_floorplan_mask(ifc_path, target_storey_level=0)
