#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ARCHICAM 2.5D — ADAPTATEUR SEMANTIC ROOMS VERS COMPOSER
Convertit semantic_rooms.json -> format composer_2_5d_v2.py avec :
  - Filtrage des micro/méga pièces (< 3 m² ou > 70 m²)
  - Classification multi-source (JSON + nom de pièce)
  - Labels depuis text_layer OCR si disponibles
  - Lancement automatique du Composer 2.5D V2 Pro

Usage :
  python scripts/adapt_semantic_to_composer.py \
    --semantic-json <path> [--text-json <path>] --output-png <path>
"""
import sys
import json
import subprocess
import argparse
from pathlib import Path

try:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

TYPE_MAP = {
    "BEDROOM": "bedroom", "BED": "bedroom",
    "LIVING": "living", "SALON": "living", "LIVINGROOM": "living", "LOUNGE": "living", "SEJOUR": "living",
    "KITCHEN": "kitchen", "CUISINE": "kitchen",
    "BATHROOM": "bathroom", "TOILET": "toilet", "WC": "toilet", "SDB": "bathroom", "TOIL": "toilet",
    "DINING": "dining", "SAM": "dining",
    "CORRIDOR": "corridor", "HALL": "corridor",
    "BALCONY": "balcony", "BALCON": "balcony", "VERANDA": "terrace", "TERRACE": "terrace",
    "GARAGE": "garage",
    "DRESSING": "dressing",
}

LABEL_MAP = {
    "bedroom": "Chambre", "living": "Sejour", "kitchen": "Cuisine",
    "bathroom": "Salle de Bain", "toilet": "Toilettes",
    "dining": "Salle a Manger", "corridor": "Couloir", "balcony": "Balcon",
    "terrace": "Veranda", "garage": "Garage", "dressing": "Dressing", "default": "Piece"
}

NAME_KEYWORDS = {
    "sejour": "living", "salon": "living", "living": "living",
    "chambre": "bedroom", "bed": "bedroom", "parent": "bedroom",
    "cuisine": "kitchen", "kitchen": "kitchen",
    "toil": "toilet", "wc": "toilet", "sdb": "bathroom", "bain": "bathroom",
    "sam": "dining", "manger": "dining",
    "couloir": "corridor", "hall": "corridor",
    "balcon": "balcony", "veranda": "terrace",
    "garage": "garage", "dressing": "dressing",
}


def classify_from_name(name: str) -> str:
    name_low = name.lower()
    for kw, rtype in NAME_KEYWORDS.items():
        if kw in name_low:
            return rtype
    return None


def run_adaptation(semantic_json_path: str, output_png_path: str, text_json_path: str = None):
    import cv2
    import numpy as np

    semantic_dir = Path(semantic_json_path).parent

    with open(semantic_json_path, encoding="utf-8") as f:
        data = json.load(f)

    rooms_raw = data.get("rooms", [])
    img_w = data.get("image_width", 1191)
    img_h = data.get("image_height", 1684)
    scale_ppm = 48.0

    print(f"[Adapter] {len(rooms_raw)} pieces trouvees dans {Path(semantic_json_path).name}")

    # ── Charger les textes OCR ─────────────────────────────────────────────
    ocr_texts = []
    if text_json_path and Path(text_json_path).exists():
        with open(text_json_path, encoding="utf-8") as f:
            td = json.load(f)
        ocr_texts = td.get("room_labels", td.get("all_text", td.get("texts", [])))
        print(f"[Adapter] {len(ocr_texts)} textes OCR charges depuis {text_json_path}")

    # Si pas de textes externes, essayer d'extraire depuis text_layer.png dans le même dossier
    if not ocr_texts:
        text_layer_path = semantic_dir / "text_layer.png"
        ocr_cache_path = semantic_dir / "texts_ocr.json"

        if ocr_cache_path.exists():
            with open(ocr_cache_path, encoding="utf-8") as f:
                ocr_data = json.load(f)
            ocr_texts = ocr_data.get("room_labels", [])
            print(f"[Adapter] OCR cache lu : {len(ocr_texts)} labels de pieces")

        elif text_layer_path.exists():
            print(f"[Adapter] Lancement OCR sur {text_layer_path}...")
            try:
                ocr_script = str(Path(__file__).parent / "vision" / "ocr_text_extractor.py")
                result = subprocess.run(
                    ["python", ocr_script, "--input", str(text_layer_path), "--output", str(ocr_cache_path)],
                    capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=60
                )
                print(result.stdout.strip())
                if ocr_cache_path.exists():
                    with open(ocr_cache_path, encoding="utf-8") as f:
                        ocr_data = json.load(f)
                    ocr_texts = ocr_data.get("room_labels", [])
                    print(f"[Adapter] OCR extrait : {len(ocr_texts)} labels de pieces")
            except Exception as e:
                print(f"[Adapter] OCR echoue (non bloquant) : {e}")


    rooms_converted = []
    counter = {"bedroom": 1, "living": 1, "kitchen": 1, "toilet": 1, "bathroom": 1,
               "dining": 1, "corridor": 1, "balcony": 1, "terrace": 1, "garage": 1,
               "dressing": 1, "default": 1}

    for r in rooms_raw:
        polygon = r.get("polygon", [])
        if len(polygon) < 3:
            continue

        pts = np.array(polygon, dtype=np.int32)
        area_pixels = cv2.contourArea(pts)
        area_m2 = area_pixels / (scale_ppm ** 2)

        # Filtrage strict : garder uniquement les vraies pièces habitables
        if area_m2 < 2.5 or area_m2 > 70.0:
            continue

        rtype_raw = str(r.get("type", "default")).upper()
        rtype = TYPE_MAP.get(rtype_raw, "default")

        name_label = r.get("name_label") or r.get("label") or ""
        type_from_name = classify_from_name(name_label)
        if type_from_name:
            rtype = type_from_name

        if name_label:
            label = name_label
        else:
            base = LABEL_MAP.get(rtype, "Piece")
            n = counter.get(rtype, 1)
            label = f"{base} {n}"
        counter[rtype] = counter.get(rtype, 0) + 1

        centroid_raw = r.get("centroid", [0, 0])
        if isinstance(centroid_raw, list) and len(centroid_raw) >= 2:
            cx, cy = int(centroid_raw[0]), int(centroid_raw[1])
        else:
            M = cv2.moments(pts)
            cx = int(M["m10"] / M["m00"]) if M["m00"] > 0 else 0
            cy = int(M["m01"] / M["m00"]) if M["m00"] > 0 else 0

        rooms_converted.append({
            "id": str(r.get("id", len(rooms_converted) + 1)),
            "polygon": [[int(p[0]), int(p[1])] for p in polygon],
            "centroid": [cx, cy],
            "area_pixels": int(area_pixels),
            "area_m2": round(area_m2, 2),
            "label": label,
            "type": rtype,
        })
        print(f"  -> {label:25s} | {rtype:12s} | {area_m2:.1f} m2")

    print(f"[Adapter] {len(rooms_converted)} pieces retenues (apres filtrage)")

    if not rooms_converted:
        print("[Adapter] ERREUR : aucune piece valide apres filtrage !")
        return False

    # ── Assignation des labels OCR aux pièces par proximité spatiale ─────────
    if ocr_texts:
        import math
        print(f"[Adapter] Assignation de {len(ocr_texts)} labels OCR aux {len(rooms_converted)} pieces...")
        assigned = set()

        for ocr in ocr_texts:
            ox, oy = ocr.get("centroid", [0, 0])
            room_type = ocr.get("room_type", None)
            if not room_type:
                room_type = classify_from_name(ocr.get("text", ""))
            if not room_type:
                continue

            best_i, best_dist = None, 250.0  # 250px max de distance
            for i, room in enumerate(rooms_converted):
                if i in assigned:
                    continue
                rx, ry = room["centroid"]
                dist = math.sqrt((ox - rx) ** 2 + (oy - ry) ** 2)
                if dist < best_dist:
                    best_dist = dist
                    best_i = i

            if best_i is not None:
                rooms_converted[best_i]["label"] = ocr["text"]
                rooms_converted[best_i]["type"] = room_type
                assigned.add(best_i)
                print(f"  [OCR-Match] '{ocr['text']}' -> piece {best_i} (dist={best_dist:.0f}px)")

    out_dir = Path(semantic_json_path).parent
    composer_input = str(out_dir / "rooms_for_composer.json")


    composer_json = {
        "image_size": [img_w, img_h],
        "scale": {"pixels_per_meter": scale_ppm},
        "rooms": rooms_converted,
    }
    with open(composer_input, "w", encoding="utf-8") as f:
        json.dump(composer_json, f, ensure_ascii=False, indent=2)
    print(f"[Adapter] JSON composer -> {composer_input}")

    script = str(Path(__file__).parent / "composer_2_5d_v2.py")
    result = subprocess.run(
        ["python", script, "--yolo-json", composer_input, "--output", output_png_path],
        capture_output=True, text=True, encoding="utf-8", errors="replace"
    )
    print(result.stdout.strip())
    if result.returncode != 0:
        print(f"[Adapter] ERREUR Composer: {result.stderr[:500]}")
        return False

    return True


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Semantic -> Composer 2.5D Adapter")
    parser.add_argument("--semantic-json", default="public/debug_1786202281519/semantic_rooms.json")
    parser.add_argument("--text-json", default=None)
    parser.add_argument("--output-png", default="public/renders/test_semantic_2_5d.png")
    args = parser.parse_args()

    success = run_adaptation(args.semantic_json, args.output_png, args.text_json)
    if success:
        print(f"[Adapter] Composition 2.5D terminee -> {args.output_png}")
