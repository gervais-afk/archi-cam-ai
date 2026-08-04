# scripts/opencv_room_extractor.py
# ═══════════════════════════════════════════════════════════════
# EXTRACTION DÉTERMINISTE DES PIÈCES SANS LLM (FALLBACK OPENCV)
# Utilise ConnectedComponents sur le masque inversé des murs.
# ═══════════════════════════════════════════════════════════════

import cv2
import numpy as np

def extract_rooms_opencv_only(
    wall_mask: np.ndarray,
    image_width: int,
    image_height: int
) -> list[dict]:
    """
    Extraction géométrique des pièces sans aucune IA.
    Nommage déterministe : Pièce 1, Pièce 2...
    Surface estimée depuis le nombre de pixels et l'échelle.
    """
    inv_mask = cv2.bitwise_not(wall_mask)
    num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(inv_mask, connectivity=8)

    img_area = image_width * image_height
    rooms = []

    for i in range(1, num_labels):
        area_px = stats[i, cv2.CC_STAT_AREA]
        x = int(stats[i, cv2.CC_STAT_LEFT])
        y = int(stats[i, cv2.CC_STAT_TOP])
        w = int(stats[i, cv2.CC_STAT_WIDTH])
        h = int(stats[i, cv2.CC_STAT_HEIGHT])

        # Filtrer les composants trop petits (< 500 px) ou trop grands (> 40% de l'image)
        if area_px < 500 or area_px > 0.4 * img_area:
            continue
        # Filtrer les bords d'image
        if x < 5 or y < 5 or (x + w) > (image_width - 5) or (y + h) > (image_height - 5):
            continue

        # Surface estimée en m² (hypothèse échelle standard 100px = 1m -> 1m² = 10000px)
        area_m2 = round(area_px / 10000.0, 1)

        # Sélection texture selon surface
        texture = "parquet"
        if area_m2 < 5:
            texture = "azulejo_tile"
        elif area_m2 > 25:
            texture = "marble_tile"

        rooms.append({
            "id": f"room_{len(rooms) + 1:02d}",
            "name": f"Pièce {len(rooms) + 1}",
            "area_m2": area_m2,
            "texture": texture,
            "bbox": {"x": x, "y": y, "w": w, "h": h},
            "center": {
                "x": int(centroids[i][0]),
                "y": int(centroids[i][1])
            },
        })

    print(f"[OpenCV Room Extractor] 🧩 {len(rooms)} pièces extraites déterministement sans IA")
    return rooms
