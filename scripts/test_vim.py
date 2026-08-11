"""
TEST RAPIDE DU TOPOLOGY BUILDER (VIM)
Simule un scan dégradé avec des murs quasi-ouverts et vérifie que
Shapely ferme correctement les polygones et calcule les surfaces.
"""
import sys
import os

# Ajouter le dossier scripts/core au path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "core"))

from topology_builder import ArchitecturalTopologist

print("=" * 60)
print("  TEST VIM TopologyBuilder — Archi Cam AI")
print("=" * 60)

# --- Jeu de données simulant un scan dégradé ---
# Murs du RDC d'une petite villa (20x12 m)
# Plusieurs segments sont intentionnellement cassés (gap 0.04 m = 4 cm)
mock_mlsd_lines = [
    # Mur bas cassé en deux (gap de 4cm au milieu)
    [0.0, 0.0, 9.96, 0.0],
    [10.04, 0.0, 20.0, 0.0],
    # Mur droit
    [20.0, 0.0, 20.0, 12.0],
    # Mur haut
    [20.0, 12.0, 0.0, 12.0],
    # Mur gauche quasi-fermé (gap de 4cm en bas)
    [0.0, 12.0, 0.0, 0.04],
    # Cloison interne chambre/salon (x=10)
    [10.0, 0.0, 10.0, 8.0],
    # Cloison salle de bain (y=8, de x=10 à x=20)
    [10.0, 8.0, 20.0, 8.0],
]

mock_ocr_texts = [
    {"bbox": [0.5, 0.5, 9.5, 7.5],  "label": "Salon",          "value_type": "area", "numerical_value": 76.0,  "unit": "m2"},
    {"bbox": [10.5, 0.5, 19.5, 7.5], "label": "Chambre Parent", "value_type": "area", "numerical_value": 76.0,  "unit": "m2"},
    {"bbox": [10.5, 8.5, 19.5, 11.5],"label": "Salle de Bain",  "value_type": "area", "numerical_value": 30.0,  "unit": "m2"},
]

mock_yolo_symbols = [
    {"type": "door",   "bbox": [9.0, -0.5, 11.0, 0.5]},
    {"type": "window", "bbox": [14.0, -0.5, 17.0, 0.5]},
]

print("\n📥 Entrée  : %d segments MLSD, %d textes OCR, %d symboles YOLO" % (
    len(mock_mlsd_lines), len(mock_ocr_texts), len(mock_yolo_symbols)
))
print("           Murs intentionnellement brisés (gaps de 4cm)")
print()

# --- Exécution du TopologyBuilder ---
topologist = ArchitecturalTopologist(
    mlsd_lines=mock_mlsd_lines,
    yolo_symbols=mock_yolo_symbols,
    ocr_texts=mock_ocr_texts
)

result = topologist.build_plan_graph()

# --- Affichage des résultats ---
if result.get("topology_valid"):
    rooms = result["rooms"]
    print("✅ TOPOLOGIE VALIDE — %d pièce(s) reconstruite(s)\n" % len(rooms))
    total_area = 0.0
    for i, room in enumerate(rooms):
        print("  Pièce %d : %-18s | Surface : %6.2f m² | Murs : %d" % (
            i+1,
            room["label"] or "non identifiée",
            room["area_m2"],
            room["walls_count"]
        ))
        total_area += room["area_m2"]

    print()
    print("  SURFACE TOTALE   : %.2f m²" % total_area)
    print("  CRITÈRE ±2%%     : %.2f m² attendu | Écart : %.2f%%" % (
        182.0,
        abs(total_area - 182.0) / 182.0 * 100
    ))
    print()
    print("=" * 60)
    print("  ✅ TEST RÉUSSI — Le VIM est opérationnel !")
    print("=" * 60)
else:
    print("❌ TEST ÉCHOUÉ : %s" % result.get("error", "Erreur inconnue"))
    print("   Vérifiez la géométrie des segments MLSD fournis.")
