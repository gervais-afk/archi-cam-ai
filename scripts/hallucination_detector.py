# scripts/hallucination_detector.py
# ═══════════════════════════════════════════════════════════════
# DÉTECTEUR D'HALLUCINATION STRUCTURELLE DÉTERMINISTE (OPENCV)
# Compare le masque d'arêtes _canny.png du plan original avec
# la structure du rendu 3D généré par les modèles d'IA.
# ═══════════════════════════════════════════════════════════════

import cv2
import numpy as np
from dataclasses import dataclass, asdict

@dataclass
class HallucinationReport:
    score           : float   # 0.0 = parfait, 1.0 = tout faux
    wall_match_pct  : float   # % murs originaux retrouvés dans le rendu
    extra_elements  : int     # nombre de pixels de lignes inventées
    verdict         : str     # "OK" | "SUSPECT" | "REJET"
    details         : list

    def to_dict(self):
        return asdict(self)

def detect_hallucination(
    original_canny : np.ndarray,
    generated_image: np.ndarray,
    threshold      : float = 0.35
) -> HallucinationReport:
    """
    Compare la structure du rendu IA avec le plan original.

    Méthode :
    1. Extraire les bords du rendu généré via OpenCV Canny.
    2. Comparer avec le _canny.png original (référence géométrique).
    3. Calculer le taux de correspondance structurelle et d'éléments inventés.
    """
    if original_canny is None or generated_image is None:
        return HallucinationReport(
            score=0.0, wall_match_pct=1.0, extra_elements=0,
            verdict="OK", details=["Reference image or generated image missing"]
        )

    h, w = original_canny.shape[:2]

    # Redimensionner le rendu à la même taille que le plan original
    gen_resized = cv2.resize(generated_image, (w, h), interpolation=cv2.INTER_AREA)

    # Extraire les bords du rendu généré
    if len(gen_resized.shape) == 3:
        gen_gray = cv2.cvtColor(gen_resized, cv2.COLOR_BGR2GRAY)
    else:
        gen_gray = gen_resized

    gen_canny = cv2.Canny(gen_gray, 50, 150)

    # Dilater les deux masques pour appliquer une tolérance spatiale de 5px
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    orig_dilated = cv2.dilate(original_canny, kernel)
    gen_dilated  = cv2.dilate(gen_canny, kernel)

    # Pixels de murs originaux retrouvés dans le rendu
    orig_pixels = np.sum(original_canny > 0)
    matched_pixels = np.sum((original_canny > 0) & (gen_dilated > 0))
    wall_match_pct = float(matched_pixels) / float(max(orig_pixels, 1))

    # Pixels inventés dans le rendu absents du plan original
    gen_pixels = np.sum(gen_canny > 0)
    extra_pixels = np.sum((gen_canny > 0) & (orig_dilated == 0))
    extra_ratio = float(extra_pixels) / float(max(gen_pixels, 1))

    # Score global d'hallucination (0.0 = conforme, 1.0 = divergence totale)
    hallucination_score = ((1.0 - wall_match_pct) * 0.6) + (extra_ratio * 0.4)

    # Verdict automatisé
    if hallucination_score < 0.25:
        verdict = "OK"
    elif hallucination_score < threshold:
        verdict = "SUSPECT"
    else:
        verdict = "REJET"

    details = []
    if wall_match_pct < 0.70:
        details.append(f"Seulement {wall_match_pct * 100:.0f}% des murs originaux sont retrouvés")
    if extra_ratio > 0.30:
        details.append(f"{extra_ratio * 100:.0f}% des lignes du rendu n'existent pas dans le plan original")

    print(f"[HallucinationDetector] Score={hallucination_score:.2f} | WallMatch={wall_match_pct*100:.0f}% | Extra={extra_ratio*100:.0f}% → {verdict}")

    return HallucinationReport(
        score=round(hallucination_score, 3),
        wall_match_pct=round(wall_match_pct, 3),
        extra_elements=int(extra_pixels),
        verdict=verdict,
        details=details,
    )

def compare_room_count(
    original_rooms : list,
    generated_image: np.ndarray,
    tolerance      : int = 2
) -> dict:
    """
    Estime le nombre de pièces dans le rendu généré via ConnectedComponents
    et compare avec l'analyse originale.
    """
    if generated_image is None:
        return {"expected_rooms": len(original_rooms), "detected_rooms": 0, "coherent": False, "warning": "Image vide"}

    if len(generated_image.shape) == 3:
        gen_gray = cv2.cvtColor(generated_image, cv2.COLOR_BGR2GRAY)
    else:
        gen_gray = generated_image

    _, binary = cv2.threshold(gen_gray, 200, 255, cv2.THRESH_BINARY_INV)

    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
    closed = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel)

    num_labels, _, stats, _ = cv2.connectedComponentsWithStats(closed)
    img_area = generated_image.shape[0] * generated_image.shape[1]

    generated_rooms = sum(
        1 for i in range(1, num_labels)
        if 500 < stats[i, cv2.CC_STAT_AREA] < 0.4 * img_area
    )

    expected_rooms = len(original_rooms)
    diff = abs(generated_rooms - expected_rooms)
    coherent = diff <= tolerance

    result = {
        "expected_rooms": expected_rooms,
        "detected_rooms": generated_rooms,
        "difference": diff,
        "coherent": coherent,
    }

    if not coherent:
        result["warning"] = f"Le rendu contient ~{generated_rooms} zones mais le plan original en comporte {expected_rooms}"

    return result
