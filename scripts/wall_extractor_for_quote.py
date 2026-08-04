# scripts/wall_extractor_for_quote.py
# ═══════════════════════════════════════════════════════════════
# EXTRACTION GÉOMÉTRIQUE POUR DEVIS
# Calcule longueurs de murs, surfaces, périmètres
# Compatible avec tous types de plans (PDF vectoriel, scan, stylo)
# ═══════════════════════════════════════════════════════════════

import cv2
import numpy as np
import json
from dataclasses import dataclass, asdict
from typing import Optional

@dataclass
class WallSegment:
    """Un segment de mur mesuré."""
    id          : str
    x1          : int
    y1          : int
    x2          : int
    y2          : int
    length_px   : float
    length_m    : float
    orientation : str     # "horizontal" | "vertical" | "diagonal"
    thickness_px: int

@dataclass
class RoomGeometry:
    """Géométrie complète d'une pièce."""
    id          : str
    name        : str
    area_px2    : float
    area_m2     : float
    perimeter_px: float
    perimeter_m : float
    bbox_x      : int
    bbox_y      : int
    bbox_w      : int
    bbox_h      : int
    wall_ids    : list

@dataclass
class QuoteGeometry:
    """Données complètes pour le devis."""
    scale_px_per_m      : float
    total_wall_length_m : float
    total_floor_area_m2 : float
    total_perimeter_m   : float
    rooms               : list
    walls               : list
    plan_type           : str


def estimate_scale(
    wall_mask: np.ndarray,
    known_dimension_m: Optional[float] = None
) -> float:
    """
    Estime l'échelle px/m.
    Priorité 1 : dimension connue passée en paramètre
    Priorité 2 : heuristique (bâtiment résidentiel ~12m)
    """
    h, w = wall_mask.shape

    if known_dimension_m:
        contours, _ = cv2.findContours(
            wall_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
        )
        if contours:
            largest = max(contours, key=cv2.contourArea)
            _, _, bw, bh = cv2.boundingRect(largest)
            max_dim_px = max(bw, bh)
            return max_dim_px / known_dimension_m

    contours, _ = cv2.findContours(
        wall_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
    )
    if contours:
        largest = max(contours, key=cv2.contourArea)
        _, _, bw, bh = cv2.boundingRect(largest)
        estimated_real_width_m = 12.0
        return max(bw, bh) / estimated_real_width_m

    return w / 15.0  # fallback : image = 15m de large


def extract_wall_segments(
    wall_mask: np.ndarray,
    scale_px_per_m: float
) -> list:
    """
    Extrait les segments de murs individuels via HoughLinesP.
    """
    edges  = cv2.Canny(wall_mask, 50, 150)
    lines  = cv2.HoughLinesP(
        edges,
        rho=1,
        theta=np.pi / 180,
        threshold=40,
        minLineLength=20,
        maxLineGap=8
    )

    segments = []
    if lines is None:
        return segments

    for i, line in enumerate(lines):
        x1, y1, x2, y2 = line[0]

        length_px = float(np.sqrt((x2-x1)**2 + (y2-y1)**2))
        length_m  = length_px / scale_px_per_m

        dx = abs(x2 - x1)
        dy = abs(y2 - y1)
        if dx > dy * 3:
            orientation = "horizontal"
        elif dy > dx * 3:
            orientation = "vertical"
        else:
            orientation = "diagonal"

        thickness = _estimate_wall_thickness(wall_mask, x1, y1, x2, y2)

        segments.append(WallSegment(
            id           = f"wall_{i:03d}",
            x1=x1, y1=y1, x2=x2, y2=y2,
            length_px    = round(length_px, 1),
            length_m     = round(length_m,  2),
            orientation  = orientation,
            thickness_px = thickness,
        ))

    segments = _merge_collinear_segments(segments, scale_px_per_m)
    return segments


def _estimate_wall_thickness(
    wall_mask: np.ndarray,
    x1: int, y1: int, x2: int, y2: int
) -> int:
    """Mesure l'épaisseur du mur perpendiculairement au segment."""
    cx = (x1 + x2) // 2
    cy = (y1 + y2) // 2
    h, w = wall_mask.shape

    thickness = 0
    for offset in range(-30, 31):
        px = min(w-1, max(0, cx + offset))
        if wall_mask[cy, px] > 128:
            thickness += 1

    return max(1, thickness)


def _merge_collinear_segments(
    segments: list,
    scale_px_per_m: float,
    gap_threshold_m: float = 0.3
) -> list:
    """Fusionne les segments colinéaires séparés par < gap_threshold_m."""
    gap_px = gap_threshold_m * scale_px_per_m
    merged = []
    used   = set()

    for i, s1 in enumerate(segments):
        if i in used:
            continue

        group = [s1]
        used.add(i)

        for j, s2 in enumerate(segments):
            if j in used or j == i:
                continue
            if s1.orientation != s2.orientation:
                continue

            dist = np.sqrt(
                (s1.x2 - s2.x1)**2 + (s1.y2 - s2.y1)**2
            )
            if dist < gap_px:
                group.append(s2)
                used.add(j)

        if len(group) == 1:
            merged.append(s1)
        else:
            x1 = min(s.x1 for s in group)
            y1 = min(s.y1 for s in group)
            x2 = max(s.x2 for s in group)
            y2 = max(s.y2 for s in group)
            l  = float(np.sqrt((x2-x1)**2 + (y2-y1)**2))
            merged.append(WallSegment(
                id           = s1.id + "_merged",
                x1=x1, y1=y1, x2=x2, y2=y2,
                length_px    = round(l, 1),
                length_m     = round(l / scale_px_per_m, 2),
                orientation  = s1.orientation,
                thickness_px = s1.thickness_px,
            ))

    return merged


def extract_room_geometries(
    wall_mask: np.ndarray,
    scale_px_per_m: float,
    lm_rooms: list
) -> list:
    """
    Calcule la géométrie précise de chaque pièce en combinant :
    - Les bboxes détectées par LM Studio
    - Le masque de murs OpenCV (pour exclure les murs)
    """
    room_geometries = []

    for room in lm_rooms:
        bbox = room.get("bbox", {})
        rx = int(bbox.get("x", 0))
        ry = int(bbox.get("y", 0))
        rw = int(bbox.get("w", 0))
        rh = int(bbox.get("h", 0))

        if rw < 10 or rh < 10:
            continue

        area_px2 = rw * rh
        area_m2  = area_px2 / (scale_px_per_m ** 2)

        perimeter_px = 2 * (rw + rh)
        perimeter_m  = perimeter_px / scale_px_per_m

        room_geometries.append(RoomGeometry(
            id           = room.get("id", "?"),
            name         = room.get("name", "?"),
            area_px2     = round(area_px2, 0),
            area_m2      = round(area_m2,  2),
            perimeter_px = round(perimeter_px, 0),
            perimeter_m  = round(perimeter_m,  2),
            bbox_x=rx, bbox_y=ry,
            bbox_w=rw, bbox_h=rh,
            wall_ids     = [],
        ))

    return room_geometries


def build_quote_geometry(
    wall_mask: np.ndarray,
    lm_json: dict,
    plan_type: str = "hand_drawn",
    known_width_m: Optional[float] = None
) -> QuoteGeometry:
    """
    Point d'entrée principal.
    Retourne toutes les données géométriques pour le devis.
    """
    print("\n[QuoteGeometry] 📐 Extraction géométrique pour devis...")

    scale = estimate_scale(wall_mask, known_width_m)
    print(f"[QuoteGeometry] Échelle estimée : {scale:.1f} px/m")

    rooms  = lm_json.get("rooms", [])
    walls  = extract_wall_segments(wall_mask, scale)
    geoms  = extract_room_geometries(wall_mask, scale, rooms)

    total_wall_m  = sum(w.length_m  for w in walls)
    total_area_m2 = sum(r.area_m2   for r in geoms)
    total_perim_m = sum(r.perimeter_m for r in geoms)

    print(f"[QuoteGeometry] Murs     : {len(walls)} segments, {total_wall_m:.1f} m total")
    print(f"[QuoteGeometry] Pièces   : {len(geoms)} pièces, {total_area_m2:.1f} m² total")

    return QuoteGeometry(
        scale_px_per_m       = round(scale, 2),
        total_wall_length_m  = round(total_wall_m,  2),
        total_floor_area_m2  = round(total_area_m2, 2),
        total_perimeter_m    = round(total_perim_m, 2),
        rooms                = [asdict(r) for r in geoms],
        walls                = [asdict(w) for w in walls],
        plan_type            = plan_type,
    )
