# scripts/adaptive_plan_detector.py
# ═══════════════════════════════════════════════════════════════
# DÉTECTEUR ADAPTATIF DE TYPE DE PLAN & PRÉTRAITEMENT ROBUSTE (8 CAS)
# Supporte : Vector PDF, Scan JPG, PNG RGBA, Smartphone EXIF, Stylo, Filmé, Sombre, Fond coloré
# ═══════════════════════════════════════════════════════════════

import cv2
import numpy as np
from PIL import Image, ImageOps
from enum import Enum

class PlanType(Enum):
    VECTOR_PDF      = "vector_pdf"      # AutoCAD / ArchiCAD net
    CLEAN_SCAN      = "clean_scan"      # Scan imprimé propre
    PNG_ARCHI       = "png_archi"       # Plan PNG (gère canal alpha)
    SMARTPHONE_PHOTO= "smartphone_photo"# Photo avec métadonnées EXIF
    HAND_DRAWN      = "hand_drawn"      # Stylo/crayon manuscrit
    FILMED_SKETCH   = "filmed_sketch"   # Vidéo / croquis flou
    EXTREME_LIGHT   = "extreme_light"   # Plan très sombre ou surexposé
    COLORED_BG      = "colored_bg"      # Papier jaune / bleu

MAX_DIMENSION = 4096

def load_with_exif_correction(path: str) -> np.ndarray:
    """
    Charge l'image en respectant l'orientation EXIF.
    Critique pour les photos de plans prises au smartphone.
    """
    try:
        pil_img = Image.open(path)
        pil_img = ImageOps.exif_transpose(pil_img)
        pil_img = pil_img.convert("RGB")
        return cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)
    except Exception:
        bgr = cv2.imread(path, cv2.IMREAD_COLOR)
        if bgr is not None:
            return bgr
        raise ValueError(f"Impossible de lire l'image source : {path}")

def smart_resize(bgr: np.ndarray) -> tuple[np.ndarray, float]:
    """
    Redimensionne si nécessaire (dimension max 4096px).
    Retourne l'image redimensionnée et le facteur d'échelle.
    """
    h, w = bgr.shape[:2]
    max_dim = max(h, w)

    if max_dim <= MAX_DIMENSION:
        return bgr, 1.0

    scale = MAX_DIMENSION / max_dim
    new_w = int(w * scale)
    new_h = int(h * scale)
    resized = cv2.resize(bgr, (new_w, new_h), interpolation=cv2.INTER_LANCZOS4)

    print(f"[SmartResize] {w}×{h} → {new_w}×{new_h} (scale={scale:.2f})")
    return resized, scale

def detect_plan_type(bgr_img: np.ndarray) -> PlanType:
    """
    Analyse automatique du type de plan reçu (8 cas).
    Retourne le type exact avec score de confiance loggé.
    """
    h, w, c = bgr_img.shape

    # 1. Vérification fond coloré (Teinte en LAB)
    lab = cv2.cvtColor(bgr_img, cv2.COLOR_BGR2LAB)
    l_channel, a_channel, b_channel = cv2.split(lab)
    a_std, b_std = np.std(a_channel), np.std(b_channel)
    if a_std > 12 or b_std > 12:
        print(f"[PlanDetector] Type: COLORED_BG (a_std={a_std:.1f}, b_std={b_std:.1f})")
        return PlanType.COLORED_BG

    gray = cv2.cvtColor(bgr_img, cv2.COLOR_BGR2GRAY)
    mean_val = np.mean(gray)

    # 2. Vérification plan très sombre ou surbrillance extrême
    if mean_val < 60 or mean_val > 230:
        print(f"[PlanDetector] Type: EXTREME_LIGHT (mean_val={mean_val:.1f})")
        return PlanType.EXTREME_LIGHT

    # 3. Indicateurs netteté et contrastes
    laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()

    _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    ink_ratio = np.sum(binary > 0) / (h * w)

    bg_std = np.std(gray[binary == 0]) if np.sum(binary == 0) > 0 else 0

    if laplacian_var < 100:
        print(f"[PlanDetector] Type: FILMED_SKETCH (Laplacian={laplacian_var:.1f})")
        return PlanType.FILMED_SKETCH

    if laplacian_var > 800 and ink_ratio < 0.15 and bg_std < 15:
        print(f"[PlanDetector] Type: VECTOR_PDF (Laplacian={laplacian_var:.1f})")
        return PlanType.VECTOR_PDF

    if laplacian_var > 400 and bg_std < 25:
        print(f"[PlanDetector] Type: CLEAN_SCAN (Laplacian={laplacian_var:.1f})")
        return PlanType.CLEAN_SCAN

    if laplacian_var < 250 or bg_std > 35:
        print(f"[PlanDetector] Type: SMARTPHONE_PHOTO (Laplacian={laplacian_var:.1f})")
        return PlanType.SMARTPHONE_PHOTO

    print(f"[PlanDetector] Type: HAND_DRAWN (Laplacian={laplacian_var:.1f})")
    return PlanType.HAND_DRAWN

# ═══════════════════════════════════════════════════════════════
# PRÉTRAITEMENTS SPÉCIALISÉS (8 CAS)
# ═══════════════════════════════════════════════════════════════

def preprocess_vector_pdf(gray: np.ndarray) -> np.ndarray:
    _, binary = cv2.threshold(gray, 180, 255, cv2.THRESH_BINARY_INV)
    return binary

def preprocess_clean_scan(gray: np.ndarray) -> np.ndarray:
    denoised = cv2.GaussianBlur(gray, (3, 3), 0)
    _, binary = cv2.threshold(denoised, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    return binary

def preprocess_hand_drawn(gray: np.ndarray) -> np.ndarray:
    clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
    enhanced = clahe.apply(gray)
    denoised = cv2.bilateralFilter(enhanced, 9, 50, 50)
    adaptive = cv2.adaptiveThreshold(
        denoised, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 25, 8
    )

    kernel_open = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2, 2))
    cleaned = cv2.morphologyEx(adaptive, cv2.MORPH_OPEN, kernel_open)

    kernel_close = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
    closed = cv2.morphologyEx(cleaned, cv2.MORPH_CLOSE, kernel_close)

    kernel_dilate = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    thickened = cv2.dilate(closed, kernel_dilate, iterations=2)

    num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(thickened, connectivity=8)
    clean_mask = np.zeros_like(thickened)
    for i in range(1, num_labels):
        if stats[i, cv2.CC_STAT_AREA] >= 30:
            clean_mask[labels == i] = 255

    return clean_mask

def preprocess_smartphone_photo(gray: np.ndarray) -> np.ndarray:
    clahe = cv2.createCLAHE(clipLimit=3.5, tileGridSize=(8, 8))
    equalized = clahe.apply(gray)
    return preprocess_hand_drawn(equalized)

def preprocess_filmed_sketch(gray: np.ndarray) -> np.ndarray:
    # Unsharp Mask si flou
    gaussian = cv2.GaussianBlur(gray, (9, 9), 10.0)
    unsharp = cv2.addWeighted(gray, 1.5, gaussian, -0.5, 0)
    gamma = 1.4
    lut = np.array([((i / 255.0) ** (1.0 / gamma)) * 255 for i in range(256)], dtype=np.uint8)
    corrected = cv2.LUT(unsharp, lut)
    blurred = cv2.GaussianBlur(corrected, (51, 51), 0)
    normalized = cv2.divide(corrected, blurred, scale=255)
    return preprocess_hand_drawn(normalized)

def preprocess_extreme_light(gray: np.ndarray) -> np.ndarray:
    normalized = cv2.normalize(gray, None, alpha=0, beta=255, norm_type=cv2.NORM_MINMAX)
    return preprocess_clean_scan(normalized)

def preprocess_colored_bg(bgr_img: np.ndarray) -> np.ndarray:
    lab = cv2.cvtColor(bgr_img, cv2.COLOR_BGR2LAB)
    l_channel, _, _ = cv2.split(lab)
    return preprocess_clean_scan(l_channel)

def get_wall_mask(bgr_img: np.ndarray, plan_type: PlanType) -> np.ndarray:
    """
    Dispatcher principal pour tous les 8 cas de prétraitement OpenCV.
    """
    if plan_type == PlanType.COLORED_BG:
        binary = preprocess_colored_bg(bgr_img)
    else:
        gray = cv2.cvtColor(bgr_img, cv2.COLOR_BGR2GRAY)
        processors = {
            PlanType.VECTOR_PDF: preprocess_vector_pdf,
            PlanType.CLEAN_SCAN: preprocess_clean_scan,
            PlanType.PNG_ARCHI: preprocess_clean_scan,
            PlanType.SMARTPHONE_PHOTO: preprocess_smartphone_photo,
            PlanType.HAND_DRAWN: preprocess_hand_drawn,
            PlanType.FILMED_SKETCH: preprocess_filmed_sketch,
            PlanType.EXTREME_LIGHT: preprocess_extreme_light,
        }
        processor = processors.get(plan_type, preprocess_hand_drawn)
        binary = processor(gray)

    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (7, 7))
    sealed = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel)
    return sealed
