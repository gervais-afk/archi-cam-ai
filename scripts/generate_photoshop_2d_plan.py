import os
import sys
import io
import cv2
import numpy as np
from PIL import Image, ImageEnhance, ImageFilter, ImageDraw, ImageChops

# Force stdout et stderr en UTF-8 pour Windows PowerShell / CMD
if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

# ── IMPORTS OPTIONNELS (PDF) ─────────────────────────────────────────────────
HAS_PYPDFIUM = False
try:
    import pypdfium2 as pdfium
    HAS_PYPDFIUM = True
except ImportError:
    HAS_PYPDFIUM = False

# ── RÉSOLUTION DES CHEMINS D'ASSETS DE TEXTURES LOCALES ──────────────────────
_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
_PROJECT_ROOT = os.path.dirname(_SCRIPT_DIR)
_ASSETS_DIR = os.path.join(_PROJECT_ROOT, "public", "assets")
_TEX_DIR = os.path.join(_ASSETS_DIR, "textures")

def tile_real_texture(image_path: str, dest_w: int, dest_h: int, scale_factor: float = 0.30, brightness: float = 1.15) -> Image.Image:
    """Charge et pavillonne une texture JPG réelle avec répétition sans couture."""
    if not os.path.exists(image_path):
        return create_oak_parquet_texture(dest_w, dest_h)
    
    try:
        src = Image.open(image_path).convert("RGBA")
        enhancer = ImageEnhance.Brightness(src)
        src = enhancer.enhance(brightness)

        tw = max(64, int(src.width * scale_factor))
        th = max(64, int(src.height * scale_factor))
        tile = src.resize((tw, th), Image.LANCZOS)

        canvas = Image.new("RGBA", (dest_w, dest_h), (0, 0, 0, 0))
        for y in range(0, dest_h, th):
            for x in range(0, dest_w, tw):
                canvas.paste(tile, (x, y))
        return canvas
    except Exception:
        return create_oak_parquet_texture(dest_w, dest_h)

def create_oak_parquet_texture(width: int, height: int) -> Image.Image:
    """Texture Parquet lattes chêne miel/clair doux (#D9AA72)."""
    arr = np.ones((height, width, 4), dtype=np.uint8) * 255
    arr[:, :, 0] = 217 # R
    arr[:, :, 1] = 170 # G
    arr[:, :, 2] = 114 # B
    arr[:, :, 3] = 255
    for y in range(0, height, 40):
        arr[y:y+1, :, 0:3] = (arr[y:y+1, :, 0:3] * 0.88).astype(np.uint8)
    for x in range(0, width, 160):
        arr[:, x:x+1, 0:3] = (arr[:, x:x+1, 0:3] * 0.90).astype(np.uint8)
    return Image.fromarray(arr, "RGBA")

def create_bedroom_tile_texture(width: int, height: int) -> Image.Image:
    """Texture Chambres : Carrelage mat bleu/gris pastel très doux (#E3E8ED)."""
    arr = np.ones((height, width, 4), dtype=np.uint8) * 255
    arr[:, :, 0] = 227 # R
    arr[:, :, 1] = 232 # G
    arr[:, :, 2] = 237 # B
    arr[:, :, 3] = 255
    for y in range(0, height, 50):
        arr[y:y+1, :, 0:3] = 210
    for x in range(0, width, 50):
        arr[:, x:x+1, 0:3] = 210
    return Image.fromarray(arr, "RGBA")

def create_kitchen_tile_texture(width: int, height: int) -> Image.Image:
    """Texture Cuisines & SDB : Carrelage quadrillé beige clair / mint (#E8F0E6)."""
    arr = np.ones((height, width, 4), dtype=np.uint8) * 255
    arr[:, :, 0] = 232 # R
    arr[:, :, 1] = 240 # G
    arr[:, :, 2] = 230 # B
    arr[:, :, 3] = 255
    for y in range(0, height, 32):
        arr[y:y+1, :, 0:3] = 205
    for x in range(0, width, 32):
        arr[:, x:x+1, 0:3] = 205
    return Image.fromarray(arr, "RGBA")

def create_veranda_texture(width: int, height: int) -> Image.Image:
    """Texture Dégagements / Vérandas : Béton/Enduit crème (#F4F0EA)."""
    arr = np.ones((height, width, 4), dtype=np.uint8) * 255
    arr[:, :, 0] = 244 # R
    arr[:, :, 1] = 240 # G
    arr[:, :, 2] = 234 # B
    arr[:, :, 3] = 255
    return Image.fromarray(arr, "RGBA")

def create_red_cobblestone_texture(width: int, height: int) -> Image.Image:
    """Texture pavé brique rouge terre cuite (#A84838) pour carport."""
    arr = np.ones((height, width, 4), dtype=np.uint8) * 255
    arr[:, :, 0] = 168 # R
    arr[:, :, 1] = 72  # G
    arr[:, :, 2] = 56  # B
    arr[:, :, 3] = 255
    for y in range(0, height, 28):
        arr[y:y+1, :, 0:3] = 120
    for x in range(0, width, 56):
        arr[:, x:x+1, 0:3] = 120
    return Image.fromarray(arr, "RGBA")

class AssetCatalog:
    def __init__(self):
        self._tex_cache = {}

    def get_texture(self, name: str, width: int, height: int) -> Image.Image:
        key = f"{name}_{width}_{height}"
        if key in self._tex_cache:
            return self._tex_cache[key]
        
        path_parquet = os.path.join(_TEX_DIR, "parquet.jpg")
        path_marble = os.path.join(_TEX_DIR, "marble_tile.jpg")
        path_azulejo = os.path.join(_TEX_DIR, "azulejo_tile.jpg")
        path_concrete = os.path.join(_TEX_DIR, "concrete.jpg")
        path_cobble = os.path.join(_TEX_DIR, "cobblestone.jpg")

        if name == "parquet":
            tiled = tile_real_texture(path_parquet, width, height, scale_factor=0.20, brightness=1.05)
        elif name == "bedroom":
            tiled = tile_real_texture(path_marble, width, height, scale_factor=0.25, brightness=1.10)
        elif name == "kitchen":
            tiled = tile_real_texture(path_azulejo, width, height, scale_factor=0.25, brightness=1.10)
        elif name == "cobblestone":
            tiled = tile_real_texture(path_cobble, width, height, scale_factor=0.25, brightness=1.0)
        elif name == "veranda":
            tiled = tile_real_texture(path_concrete, width, height, scale_factor=0.30, brightness=1.15)
        else:
            tiled = tile_real_texture(path_marble, width, height, scale_factor=0.25, brightness=1.10)
        
        self._tex_cache[key] = tiled
        return tiled

_CATALOG = AssetCatalog()

# ═════════════════════════════════════════════════════════════════════════════
# 1. CHARGEMENT MULTI-FORMAT (PNG, JPG, PDF)
# ═════════════════════════════════════════════════════════════════════════════

def load_input_image(input_path: str) -> np.ndarray:
    if not os.path.exists(input_path):
        raise FileNotFoundError(f"Fichier d'entrée introuvable : {input_path}")

    ext = os.path.splitext(input_path)[1].lower()

    if ext == ".pdf":
        if not HAS_PYPDFIUM:
            raise ImportError(
                "Traitement PDF impossible : la bibliothèque 'pypdfium2' n'est pas installée. "
                "Veuillez fournir un fichier PNG/JPG ou installer pypdfium2 via 'pip install pypdfium2'."
            )
        try:
            pdf = pdfium.PdfDocument(input_path)
            page = pdf[0]
            pil_image = page.render(scale=2.0).to_pil().convert("RGB")
            
            png_copy_path = input_path.replace(".pdf", ".png")
            try:
                pil_image.save(png_copy_path, "PNG")
                print(f"📸 Copie PNG du PDF enregistrée pour LM Studio & VLM : {png_copy_path}")
            except Exception:
                pass

            return cv2.cvtColor(np.array(pil_image), cv2.COLOR_RGB2BGR)
        except Exception as e:
            raise ValueError(f"Erreur lors de la lecture du fichier PDF {input_path} : {str(e)}")

    bgr = cv2.imread(input_path, cv2.IMREAD_COLOR)
    if bgr is not None and bgr.size > 0:
        return bgr

    try:
        pil_img = Image.open(input_path).convert("RGB")
        return cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)
    except Exception as e:
        raise ValueError(f"Impossible de lire l'image {input_path} : {str(e)}")

# ═════════════════════════════════════════════════════════════════════════════
# 2. SEGMENTATION TOPOLOGIQUE PRÉCISE & ISOLATION DU BÂTIMENT
# ═════════════════════════════════════════════════════════════════════════════

def detect_building_envelope(binary_walls: np.ndarray, width: int, height: int) -> np.ndarray:
    """Isole le polygone englobant principal du bâtiment et efface les cotations extérieures tout en préservant le cartouche bas."""
    building_mask = np.zeros((height, width), dtype=np.uint8)
    cartouche_y_limit = int(height * 0.98)

    search_zone = binary_walls.copy()
    search_zone[cartouche_y_limit:, :] = 0

    margin_x = int(width * 0.04)
    margin_y = int(height * 0.04)
    search_zone[:margin_y, :] = 0
    search_zone[:, :margin_x] = 0
    search_zone[:, width - margin_x:] = 0

    cnts, _ = cv2.findContours(search_zone, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not cnts:
        building_mask[margin_y:height - margin_y, margin_x:width - margin_x] = 255
        return building_mask

    large_cnts = [c for c in cnts if cv2.contourArea(c) > 1500]
    if large_cnts:
        all_pts = np.vstack(large_cnts)
        hull = cv2.convexHull(all_pts)
        cv2.drawContours(building_mask, [hull], -1, 255, -1)
        kernel_exp = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (8, 8))
        building_mask = cv2.dilate(building_mask, kernel_exp)
        # Conserver la zone du cartouche bas
        building_mask[cartouche_y_limit:, :] = 255
    else:
        building_mask[margin_y:height - margin_y, margin_x:width - margin_x] = 255

    return building_mask

def detect_and_remove_ruled_lines(binary_img: np.ndarray, width: int) -> np.ndarray:
    """
    Supprime les lignes horizontales de cahier réglé (Seyès, petits carreaux)
    SANS toucher aux murs architecturaux horizontaux.

    Stratégie :
      1. Détection initiale via MORPH_OPEN (30×1)
      2. Validation HoughLinesP pour confirmer que les lignes sont bien
         des réglures (longueur > 50% de la largeur, angle < 2°)
      3. Signature de cahier : vérification que l'espacement est régulier (std < 5px)
      4. Si < 3 lignes ou espacement irrégulier → ce sont des murs, on NE supprime PAS
    """
    h, w = binary_img.shape[:2]

    # 1. Détection primaire : noyau horizontal (30×1)
    kernel_hline = cv2.getStructuringElement(cv2.MORPH_RECT, (30, 1))
    candidate_hlines = cv2.morphologyEx(binary_img, cv2.MORPH_OPEN, kernel_hline, iterations=1)

    # 2. Validation Hough : confirme les vraies réglures
    lines = cv2.HoughLinesP(
        candidate_hlines,
        rho=1,
        theta=np.pi / 180,
        threshold=50,
        minLineLength=int(width * 0.50),  # Au moins 50% de la largeur
        maxLineGap=10
    )

    if lines is None:
        print("[LineFilter] Aucune réglure confirmée par Hough. Aucune suppression.")
        return binary_img

    # 3. Filtrer les lignes quasi-horizontales (angle < 2°)
    horizontal_lines = []
    for line in lines:
        x1, y1, x2, y2 = line.ravel()
        angle = abs(np.arctan2(y2 - y1, x2 - x1) * 180 / np.pi)
        if angle < 2.0:
            horizontal_lines.append((x1, y1, x2, y2))

    if len(horizontal_lines) < 3:
        print(f"[LineFilter] Seulement {len(horizontal_lines)} lignes horizontales (<3) → probablement des murs. Conservation.")
        return binary_img

    # 4. Signature cahier : espacement régulier (std < 5px)
    y_positions = sorted(set(y1 for _, y1, _, _ in horizontal_lines))
    if len(y_positions) >= 2:
        spacings = np.diff(y_positions)
        spacing_std = float(np.std(spacings))
        spacing_mean = float(np.mean(spacings))

        if spacing_std > 5.0:
            print(f"[LineFilter] Espacement irrégulier (std={spacing_std:.1f}px) → ce sont des murs architecturaux. Conservation.")
            return binary_img

        print(f"[LineFilter] ✅ Cahier détecté : {len(horizontal_lines)} réglures, espacement moyen={spacing_mean:.1f}px (std={spacing_std:.1f}px). Suppression.")
    else:
        print("[LineFilter] Positions Y insuffisantes pour calculer l'espacement. Conservation.")
        return binary_img

    # 5. Suppression sécurisée : masque des lignes validées uniquement
    mask_to_remove = np.zeros_like(binary_img, dtype=np.uint8)
    for x1, y1, x2, y2 in horizontal_lines:
        cv2.line(mask_to_remove, (x1, y1), (x2, y2), 255, thickness=3)

    cleaned = cv2.subtract(binary_img, mask_to_remove)
    return cleaned


def validate_mask_quality(binary_mask: np.ndarray) -> tuple:
    """
    Analyse adaptative de la qualité du masque binaire de murs (255 = murs, 0 = fond).
    Retourne (is_valid: bool, reason: str)
    """
    h, w = binary_mask.shape[:2]
    total_pixels = h * w
    if total_pixels == 0:
        return False, "EMPTY_IMAGE"

    white_pixels = np.sum(binary_mask > 0)
    white_ratio = white_pixels / total_pixels
    black_ratio = 1.0 - white_ratio

    edges = cv2.Canny(binary_mask, 50, 150)
    edge_pixels = int(np.sum(edges > 0))
    edge_density = edge_pixels / total_pixels

    print(f"[MaskQuality] Murs (blanc)={white_ratio*100:.1f}%, Fond (noir)={black_ratio*100:.1f}%, Contours={edge_density*100:.2f}%")

    # Règle 1 : Moins de 0.5% de murs → masque quasi-vide
    if white_ratio < 0.005:
        print("[MaskQuality] ⚠️ TOO_EMPTY : masque sans murs détectés (< 0.5%)")
        return False, "TOO_EMPTY"

    # Règle 2 : CORRECTION BUG RACINE — Un plan sur fond blanc a naturellement 70-90% blanc (NORMAL)
    # On ne rejette QUE si blanc uniforme ET aucun contour (vrai masque corrompu)
    if white_ratio > 0.65 and edge_density < 0.003:
        print("[MaskQuality] ⚠️ SOLID_WHITE_CORRUPTED : blanc uniforme sans contours de murs détectés")
        return False, "SOLID_WHITE_CORRUPTED"

    if white_ratio > 0.65 and edge_density >= 0.003:
        print(f"[MaskQuality] ✅ VALID (plan fond blanc normal) : {white_ratio*100:.1f}% blanc mais {edge_density*100:.2f}% contours actifs")
        return True, "VALID"

    print("[MaskQuality] ✅ VALID : masque de murs binaire exploitable")
    return True, "VALID"


def autocrop_sheet_robust(image: np.ndarray) -> tuple:
    """
    Détecte et rogne la feuille de papier avec 3 stratégies de fallback.
    Retourne (cropped_image, success_boolean)
    """
    h, w = image.shape[:2]
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if len(image.shape) == 3 else image.copy()
    
    # === STRATÉGIE 1 : Détection de contour sur binarisation Otsu ===
    _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    
    # Inverser si le fond est plus clair que le contenu
    if np.mean(binary) > 127:
        binary = cv2.bitwise_not(binary)
    
    # Morphologie pour fermer les trous
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (15, 15))
    closed = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel)
    
    # Trouver les contours
    contours, _ = cv2.findContours(closed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    if contours:
        # Prendre le plus grand contour
        largest = max(contours, key=cv2.contourArea)
        area_ratio = cv2.contourArea(largest) / (w * h)
        
        if area_ratio > 0.15:  # Au moins 15% de l'image
            x, y, cw, ch = cv2.boundingRect(largest)
            
            # Ajouter une marge de sécurité de 2%
            margin = int(min(w, h) * 0.02)
            x = max(0, x - margin)
            y = max(0, y - margin)
            cw = min(w - x, cw + 2 * margin)
            ch = min(h - y, ch + 2 * margin)
            
            cropped = image[y:y+ch, x:x+cw]
            
            print(f"✅ Autocrop Stratégie 1 (Contour) : {w}x{h} -> {cw}x{ch} ({area_ratio*100:.1f}% de l'image)")
            return cropped, True
    
    # === STRATÉGIE 2 : Détection de bords avec Canny + Hough Lines ===
    edges = cv2.Canny(gray, 30, 100)
    lines = cv2.HoughLinesP(edges, 1, np.pi/180, threshold=100, minLineLength=int(min(w,h)*0.3), maxLineGap=20)
    
    if lines is not None and len(lines) > 10:
        # Trouver les lignes quasi-verticales et quasi-horizontales
        vertical_xs = []
        horizontal_ys = []
        
        for line in lines:
            x1, y1, x2, y2 = line.ravel()
            angle = abs(np.arctan2(y2 - y1, x2 - x1) * 180 / np.pi)
            
            if angle < 10 or angle > 170:  # Horizontal
                horizontal_ys.extend([y1, y2])
            elif 80 < angle < 100:  # Vertical
                vertical_xs.extend([x1, x2])
        
        if vertical_xs and horizontal_ys:
            x_min, x_max = int(np.percentile(vertical_xs, 5)), int(np.percentile(vertical_xs, 95))
            y_min, y_max = int(np.percentile(horizontal_ys, 5)), int(np.percentile(horizontal_ys, 95))
            
            if (x_max - x_min) > w * 0.3 and (y_max - y_min) > h * 0.3:
                cropped = image[y_min:y_max, x_min:x_max]
                print(f"✅ Autocrop Stratégie 2 (Hough) : {w}x{h} -> {x_max-x_min}x{y_max-y_min}")
                return cropped, True
    
    # === STRATÉGIE 3 : Fallback - Crop 5% des bords ===
    margin_x = int(w * 0.05)
    margin_y = int(h * 0.05)
    cropped = image[margin_y:h-margin_y, margin_x:w-margin_x]
    
    print(f"⚠️ Autocrop Fallback (5% crop) : {w}x{h} -> {cropped.shape[1]}x{cropped.shape[0]}")
    return cropped, False


def detect_stroke_thickness(binary_image: np.ndarray) -> int:
    """
    Détecte l'épaisseur moyenne des traits dans l'image.
    """
    dist_transform = cv2.distanceTransform(binary_image, cv2.DIST_L2, 5)
    stroke_pixels = dist_transform[binary_image > 0]
    
    if len(stroke_pixels) == 0:
        return 2  # Défaut
        
    avg_thickness = np.mean(stroke_pixels) * 2
    return int(avg_thickness)


def get_adaptive_kernels(binary_image: np.ndarray) -> tuple:
    """
    Retourne les noyaux de dilatation/fermeture adaptés à l'épaisseur des traits.
    """
    thickness = detect_stroke_thickness(binary_image)
    print(f"📏 Épaisseur moyenne des traits détectée : {thickness}px")
    
    if thickness <= 2:
        dilate_kernel = (3, 3)
        close_kernel = (4, 4)
        print("🖊️ Mode : Stylo fin")
    elif thickness <= 4:
        dilate_kernel = (5, 5)
        close_kernel = (6, 6)
        print("✏️ Mode : Stylo standard")
    else:
        dilate_kernel = (7, 7)
        close_kernel = (9, 9)
        print("🖍️ Mode : Marqueur épais")
        
    return dilate_kernel, close_kernel


def is_dashed_line(line_segment: tuple, binary_image: np.ndarray, threshold_gaps: int = 3) -> bool:
    """
    Détermine si une ligne est en pointillés en analysant son profil d'intensité.
    """
    x1, y1, x2, y2 = line_segment
    length = int(np.sqrt((x2 - x1)**2 + (y2 - y1)**2))
    
    if length < 30 or length > 1000:
        return False
        
    num_samples = min(25, length)
    x_coords = np.linspace(x1, x2, num_samples).astype(int)
    y_coords = np.linspace(y1, y2, num_samples).astype(int)
    
    h, w = binary_image.shape[:2]
    valid_indices = (x_coords >= 0) & (x_coords < w) & (y_coords >= 0) & (y_coords < h)
    x_coords = x_coords[valid_indices]
    y_coords = y_coords[valid_indices]
    
    if len(x_coords) < 5:
        return False
        
    profile = binary_image[y_coords, x_coords]
    transitions = np.diff(profile.astype(int))
    gaps = np.sum(np.abs(transitions) > 100)
    
    duty_cycle = np.sum(profile > 0) / len(profile)
    is_dashed = gaps >= threshold_gaps and 0.25 <= duty_cycle <= 0.75
    
    return is_dashed


def extract_dashed_lines(binary_image: np.ndarray) -> tuple:
    """
    Extrait les lignes pointillées de l'image.
    Retourne (binary_clean, dashed_mask)
    """
    lines = cv2.HoughLinesP(
        binary_image,
        rho=1,
        theta=np.pi/180,
        threshold=50,
        minLineLength=30,
        maxLineGap=5
    )
    
    if lines is None:
        return binary_image, np.zeros_like(binary_image)
        
    mask_dashed = np.zeros_like(binary_image)
    dashed_count = 0
    solid_count = 0
    
    for line in lines:
        x1, y1, x2, y2 = line.ravel()
        if is_dashed_line((x1, y1, x2, y2), binary_image):
            cv2.line(mask_dashed, (x1, y1), (x2, y2), 255, 2)
            dashed_count += 1
        else:
            solid_count += 1
            
    print(f"📊 Analyse Hough : {solid_count} segments continus, {dashed_count} pointillés détectés")
    binary_clean = cv2.subtract(binary_image, mask_dashed)
    return binary_clean, mask_dashed


def add_smart_padding(image: np.ndarray, target_padding_ratio: float = 0.15, max_padding_px: int = 150) -> tuple:
    """
    Ajoute un padding blanc adaptatif plafonné en pixels.
    Retourne (padded_image, padding_pixels)
    """
    h, w = image.shape[:2]
    padding_px = int(min(w, h) * target_padding_ratio)
    padding_px = min(padding_px, max_padding_px)
    
    padded = cv2.copyMakeBorder(
        image,
        top=padding_px,
        bottom=padding_px,
        left=padding_px,
        right=padding_px,
        borderType=cv2.BORDER_CONSTANT,
        value=[255, 255, 255]
    )
    
    actual_ratio = padding_px / min(w, h)
    print(f"🖼️ Padding appliqué : {padding_px}px de chaque côté ({actual_ratio*100:.1f}%)")
    print(f"   Dimensions : {w}x{h} -> {padded.shape[1]}x{padded.shape[0]}")
    
    return padded, padding_px


def detect_text_and_cartouche_regions(bgr_img: np.ndarray) -> tuple:
    """
    Détecte les boîtes englobantes des textes (OCR/morphologie) et du cartouche (grand rectangle en bas).
    Retourne (text_boxes, cartouche_box)
    Chaque boîte est un tuple (x, y, w, h).
    """
    height, width = bgr_img.shape[:2]
    gray = cv2.cvtColor(bgr_img, cv2.COLOR_BGR2GRAY)
    
    # 1. Détection du cartouche en bas (y > height * 0.70)
    cartouche_box = None
    
    # Binarisation pour trouver les contours rectangulaires
    _, thresh_c = cv2.threshold(gray, 220, 255, cv2.THRESH_BINARY_INV)
    contours_c, _ = cv2.findContours(thresh_c, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    best_area = 0
    for c in contours_c:
        x, y, w, h = cv2.boundingRect(c)
        area = w * h
        # Doit être dans la zone du bas (y > height * 0.70) et avoir une taille significative
        if y > height * 0.70 and w > width * 0.15 and h > height * 0.03:
            if area > best_area:
                best_area = area
                cartouche_box = (x, y, w, h)
                
    # Si aucun grand rectangle n'est détecté par contour, on définit un cartouche par défaut (les 12% du bas)
    if cartouche_box is None:
        cartouche_box = (0, int(height * 0.88), width, int(height * 0.12))
        print(f"[OCR] Cartouche non détecté par contour. Zone par défaut : {cartouche_box}")
    else:
        print(f"[OCR] Cartouche détecté par contour : {cartouche_box}")

    # 2. Détection des textes et cotations
    text_boxes = []
    
    # Option A: Pytesseract
    pytesseract_success = False
    try:
        import pytesseract
        d = pytesseract.image_to_data(gray, output_type=pytesseract.Output.DICT)
        n_boxes = len(d['level'])
        for i in range(n_boxes):
            conf = float(d['conf'][i]) if 'conf' in d else -1
            if conf > 10:
                tx, ty, tw, th = d['left'][i], d['top'][i], d['width'][i], d['height'][i]
                if tw < width * 0.3 and th < height * 0.15:
                    text_boxes.append((tx, ty, tw, th))
        if len(text_boxes) > 0:
            pytesseract_success = True
            print(f"[OCR] Pytesseract a détecté {len(text_boxes)} blocs de texte.")
    except Exception as e:
        print(f"[OCR] Pytesseract indisponible ou en erreur ({e}). Fallback morphologique OpenCV.")

    # Option B: Fallback morphologique OpenCV
    if not pytesseract_success:
        _, thresh_t = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
        
        # Fermeture horizontale large pour fusionner les caractères en blocs
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (25, 6))
        morphed = cv2.morphologyEx(thresh_t, cv2.MORPH_CLOSE, kernel)
        
        contours_t, _ = cv2.findContours(morphed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        for c in contours_t:
            x, y, w, h = cv2.boundingRect(c)
            # Les blocs de texte ou de cotations sont généralement de petite ou moyenne taille
            if 5 < w < width * 0.25 and 5 < h < height * 0.12:
                # Éviter de capturer des éléments sous le cartouche
                if y >= cartouche_box[1]:
                    continue
                text_boxes.append((x, y, w, h))
        print(f"[OCR] Fallback morphologique OpenCV a détecté {len(text_boxes)} blocs de texte/cotation.")
        
    return text_boxes, cartouche_box


def extract_balcony_guardrails(binary_img: np.ndarray) -> tuple:
    """
    Isole les traits fins correspondants aux balcons, terrasses et garde-corps.
    Retourne (cleaned_binary, balcony_guardrail_mask)
    """
    height, width = binary_img.shape[:2]
    dist_transform = cv2.distanceTransform(binary_img, cv2.DIST_L2, 5)
    
    avg_t = detect_stroke_thickness(binary_img)
    max_radius = max(1.5, avg_t * 0.45)
    
    # Masque des lignes fines (traits fins)
    thin_lines = (binary_img > 0) & (dist_transform < max_radius)
    thin_lines_mask = thin_lines.astype(np.uint8) * 255
    
    num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(thin_lines_mask)
    balcony_guardrail_mask = np.zeros_like(thin_lines_mask)
    
    for i in range(1, num_labels):
        area = stats[i, cv2.CC_STAT_AREA]
        w = stats[i, cv2.CC_STAT_WIDTH]
        h = stats[i, cv2.CC_STAT_HEIGHT]
        
        # Filtre linéaire (les garde-corps/lignes de balcons ont une longueur minimale)
        if area > 15 and (w > 20 or h > 20 or area > 50):
            balcony_guardrail_mask[labels == i] = 255
            
    # Retirer les garde-corps du masque des murs porteurs
    cleaned_binary = cv2.subtract(binary_img, balcony_guardrail_mask)
    
    return cleaned_binary, balcony_guardrail_mask


def process_hand_drawn_notebook_sketch(bgr_img: np.ndarray) -> dict:
    height, width = bgr_img.shape[:2]

    # ── ÉTAPE 0.1 : NETTOYAGE DES COULEURS (bleu cahier HSV) ───────────────────
    hsv = cv2.cvtColor(bgr_img, cv2.COLOR_BGR2HSV)
    grid_blue_mask = cv2.inRange(hsv, (80, 20, 100), (140, 255, 255))
    cleaned_bgr = bgr_img.copy()
    cleaned_bgr[grid_blue_mask > 0] = (255, 255, 255)

    # === ÉTAPE 0.2 : OCR ET GOMMAGE DU CARTOUCHE ===
    text_boxes, cartouche_box = detect_text_and_cartouche_regions(cleaned_bgr)
    
    text_cartouche_mask = np.zeros((height, width), dtype=np.uint8)
    for (x, y, w, h) in text_boxes:
        mx = max(0, x - 4)
        my = max(0, y - 4)
        mw = min(width - mx, w + 8)
        mh = min(height - my, h + 8)
        cv2.rectangle(text_cartouche_mask, (mx, my), (mx + mw, my + mh), 255, -1)
        
    cx, cy, cw, ch = cartouche_box
    mcx = max(0, cx - 4)
    mcy = max(0, cy - 4)
    mcw = min(width - mcx, cw + 8)
    mch = min(height - mcy, ch + 8)
    cv2.rectangle(text_cartouche_mask, (mcx, mcy), (mcx + mcw, mcy + mch), 255, -1)
    
    # Récupérer l'encre de texte propre
    gray_orig = cv2.cvtColor(bgr_img, cv2.COLOR_BGR2GRAY)
    _, binary_orig = cv2.threshold(gray_orig, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    
    clean_text_mask = np.zeros((height, width), dtype=np.uint8)
    for (x, y, w, h) in text_boxes:
        if y >= cartouche_box[1]:
            continue
        mx = max(0, x - 2)
        my = max(0, y - 2)
        mw = min(width - mx, w + 4)
        mh = min(height - my, h + 4)
        clean_text_mask[my:my+mh, mx:mx+mw] = binary_orig[my:my+mh, mx:mx+mw]

    # Blanchir le texte et le cartouche avant extraction des murs
    cleaned_bgr[text_cartouche_mask > 0] = (255, 255, 255)

    gray = cv2.cvtColor(cleaned_bgr, cv2.COLOR_BGR2GRAY)
    clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
    enhanced = clahe.apply(gray)
    denoised = cv2.bilateralFilter(enhanced, d=5, sigmaColor=35, sigmaSpace=35)

    _, binary = cv2.threshold(denoised, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)

    # ── ÉTAPE 1 : SUPPRESSION DES LIGNES HORIZONTALES DU CAHIER (adapt. Hough) ───
    binary = detect_and_remove_ruled_lines(binary, width)

    # ── ÉTAPE 1.5 : EXTRACTION DES POINTILLÉS / LIGNES INTERROMPUES ───────────
    binary, dashed_mask = extract_dashed_lines(binary)

    # ── ÉTAPE 1.6 : EXTRACTION DES GARDE-CORPS / BALCONS ─────────────────────
    binary, balcony_guardrail_mask = extract_balcony_guardrails(binary)

    # ── GARDE-FOU ADAPTATIF : remplacement du seuil fixe 40% ──────────────────
    pts = cv2.findNonZero(binary)
    if pts is not None:
        x_pts, y_pts, bw_pts, bh_pts = cv2.boundingRect(pts)
        x_min = max(0, x_pts - 15)
        y_min = max(0, y_pts - 15)
        x_max = min(width, x_pts + bw_pts + 15)
        y_max = min(height, y_pts + bh_pts + 15)
        validation_target = binary[y_min:y_max, x_min:x_max]
    else:
        validation_target = binary

    is_valid, quality_reason = validate_mask_quality(validation_target)
    if not is_valid:
        print(f"[Sketch] ⚠️ Masque invalide (raison: {quality_reason}). Fallback Lineart Canny propre.")
        fallback_canny = cv2.Canny(binary, 50, 150)
        binary = fallback_canny

    # Détection de l'enveloppe du bâtiment pour éliminer les cotations extérieures
    building_mask = detect_building_envelope(binary, width, height)
    binary_in_building = cv2.bitwise_and(binary, building_mask)

    # ── ÉTAPE 2 : FERMETURE MORPHOLOGIQUE ADAPTATIVE DES MURS ──
    dilate_size, close_size = get_adaptive_kernels(binary_in_building)
    kernel_dilate = cv2.getStructuringElement(cv2.MORPH_RECT, dilate_size)
    binary_thickened = cv2.dilate(binary_in_building, kernel_dilate, iterations=1)

    kernel_seal = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, close_size)
    sealed_walls = cv2.morphologyEx(binary_thickened, cv2.MORPH_CLOSE, kernel_seal)

    num_wall_comps, wall_labels, wall_stats, _ = cv2.connectedComponentsWithStats(sealed_walls)
    structural_walls = np.zeros_like(sealed_walls, dtype=np.uint8)

    for i in range(1, num_wall_comps):
        area = wall_stats[i, cv2.CC_STAT_AREA]
        comp_w = wall_stats[i, cv2.CC_STAT_WIDTH]
        comp_h = wall_stats[i, cv2.CC_STAT_HEIGHT]
        
        if area >= 30 or comp_w >= 15 or comp_h >= 18:
            structural_walls[wall_labels == i] = 255

    # ── ÉTAPE 4 : SÉPARATION DU MOBILIER ───────────────────────────────────────
    non_wall_ink = cv2.bitwise_and(binary_in_building, cv2.bitwise_not(structural_walls))
    num_ink_comps, ink_labels, ink_stats, _ = cv2.connectedComponentsWithStats(non_wall_ink)
    
    furniture_mask = np.zeros_like(non_wall_ink, dtype=np.uint8)

    for i in range(1, num_ink_comps):
        area = ink_stats[i, cv2.CC_STAT_AREA]
        w_c = ink_stats[i, cv2.CC_STAT_WIDTH]
        h_c = ink_stats[i, cv2.CC_STAT_HEIGHT]

        if area >= 120 or (w_c >= 25 and h_c >= 25):
            furniture_mask[ink_labels == i] = 255

    text_rgba = np.zeros((height, width, 4), dtype=np.uint8)
    text_rgba[clean_text_mask > 0] = (15, 23, 42, 255)

    return {
        "structural_walls": structural_walls,
        "furniture_mask": furniture_mask,
        "clean_text_mask": clean_text_mask,
        "text_layer_rgba": Image.fromarray(text_rgba, "RGBA"),
        "building_mask": building_mask,
        "dashed_mask": dashed_mask,
        "balcony_guardrail_mask": balcony_guardrail_mask,
        "width": width,
        "height": height
    }

# ═════════════════════════════════════════════════════════════════════════════
# 3. CRÉATION DU PLAN STRUCTURAL PROPRE DE HAUTE PRÉCISION (_clean_plan.png)
# ═════════════════════════════════════════════════════════════════════════════

def apply_soft_shadow(canvas: Image.Image, mask_img: Image.Image, opacity: int = 60, offset: tuple = (3, 3)) -> Image.Image:
    """Génère une ombre portée floue douce (Drop Shadow dx=3, dy=3, blur=5px, alpha 20%)."""
    w, h = canvas.size
    alpha_ch = mask_img.convert("L")
    
    shadow_base = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    shadow_base.putalpha(alpha_ch.point(lambda p: int(p * opacity / 255)))
    shadow_base = shadow_base.filter(ImageFilter.GaussianBlur(5))
    
    shadow_full = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    shadow_full.paste(shadow_base, offset)
    return Image.alpha_composite(canvas, shadow_full)

# ── RENDU AVANCÉ MOBILIER & VÉHICULES ────────────────────────────────────────

def render_car_sprite(canvas: Image.Image, x: int, y: int, w: int, h: int) -> Image.Image:
    """Dessine une voiture vue du dessus photoréaliste avec reflets et 4 roues."""
    car_layer = canvas.copy()
    draw = ImageDraw.Draw(car_layer)

    body_color = (185, 28, 28, 255)     # Rouge profond
    glass_color = (30, 58, 138, 220)    # Bleu nuit vitres
    wheel_color = (15, 15, 15, 255)     # Noir pneus
    chrome_color = (203, 213, 225, 255) # Chrome

    margin_x = int(w * 0.08)
    margin_y = int(h * 0.05)
    draw.rounded_rectangle(
        [x + margin_x, y + margin_y, x + w - margin_x, y + h - margin_y],
        radius=int(min(w, h) * 0.12),
        fill=body_color
    )

    roof_x1 = x + int(w * 0.20)
    roof_y1 = y + int(h * 0.25)
    roof_x2 = x + int(w * 0.80)
    roof_y2 = y + int(h * 0.75)
    draw.rounded_rectangle(
        [roof_x1, roof_y1, roof_x2, roof_y2],
        radius=int(min(w, h) * 0.08),
        fill=glass_color
    )

    draw.ellipse(
        [roof_x1 + int(w*0.05), roof_y1 + int(h*0.05), roof_x1 + int(w*0.25), roof_y1 + int(h*0.15)],
        fill=(255, 255, 255, 70)
    )

    wheel_r = int(min(w, h) * 0.08)
    wheels = [
        (x + int(w*0.10), y + int(h*0.12)),
        (x + int(w*0.75), y + int(h*0.12)),
        (x + int(w*0.10), y + int(h*0.75)),
        (x + int(w*0.75), y + int(h*0.75)),
    ]
    for wx, wy in wheels:
        draw.ellipse([wx, wy, wx + wheel_r*2, wy + wheel_r*2], fill=wheel_color)
        draw.ellipse([wx + int(wheel_r*0.4), wy + int(wheel_r*0.4), wx + int(wheel_r*1.6), wy + int(wheel_r*1.6)], fill=chrome_color)

    draw.ellipse([x + int(w*0.15), y + int(h*0.04), x + int(w*0.35), y + int(h*0.12)], fill=(255, 244, 180, 255))
    draw.ellipse([x + int(w*0.65), y + int(h*0.04), x + int(w*0.85), y + int(h*0.12)], fill=(255, 244, 180, 255))

    shadow = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow)
    shadow_draw.ellipse([x + int(w*0.05), y + int(h*0.80), x + int(w*0.95), y + int(h*1.02)], fill=(0, 0, 0, 50))
    shadow = shadow.filter(ImageFilter.GaussianBlur(5))
    
    return Image.alpha_composite(car_layer, shadow)

def render_bed(canvas: Image.Image, x: int, y: int, w: int, h: int, color_scheme: str = "beige") -> Image.Image:
    """Rendu lit vue du dessus avec matelas, draps et oreillers."""
    draw = ImageDraw.Draw(canvas)

    schemes = {
        "beige": {"sheet": (245, 240, 230, 255), "pillow": (255, 252, 245, 255), "frame": (120, 80, 40, 255)},
        "white": {"sheet": (248, 250, 252, 255), "pillow": (255, 255, 255, 255), "frame": (80, 60, 40, 255)},
        "grey":  {"sheet": (226, 232, 240, 255), "pillow": (241, 245, 249, 255), "frame": (71, 85, 105, 255)},
    }
    colors = schemes.get(color_scheme, schemes["beige"])

    headboard_h = int(h * 0.18)
    draw.rounded_rectangle([x, y, x + w, y + headboard_h], radius=4, fill=colors["frame"])

    draw.rounded_rectangle(
        [x + int(w*0.04), y + headboard_h, x + w - int(w*0.04), y + h],
        radius=6,
        fill=colors["sheet"]
    )

    draw.rounded_rectangle(
        [x + int(w*0.06), y + headboard_h + int(h*0.08), x + w - int(w*0.06), y + h - int(h*0.05)],
        radius=4,
        fill=(*colors["sheet"][:3], 200)
    )

    p_w = int(w * 0.38)
    p_h = int(h * 0.20)
    p_y = y + headboard_h + int(h * 0.04)
    for offset_x in [int(w*0.06), int(w*0.54)]:
        draw.rounded_rectangle(
            [x + offset_x, p_y, x + offset_x + p_w, p_y + p_h],
            radius=5,
            fill=colors["pillow"],
            outline=(200, 200, 195, 255),
            width=1
        )

    shadow_layer = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow_layer)
    shadow_draw.rectangle([x + 3, y + h, x + w + 3, y + h + 5], fill=(0, 0, 0, 45))
    shadow_layer = shadow_layer.filter(ImageFilter.GaussianBlur(5))
    
    return Image.alpha_composite(canvas, shadow_layer)

def draw_plant(draw: ImageDraw.Draw, cx: int, cy: int, radius: int = 14):
    """Dessine une plante en pot vue du dessus avec relief et reflet."""
    pot_r = int(radius * 0.5)
    draw.ellipse([cx - pot_r, cy - pot_r, cx + pot_r, cy + pot_r], fill=(161, 88, 50, 255))
    draw.ellipse([cx - radius, cy - radius, cx + radius, cy + radius], fill=(34, 120, 54, 220))
    draw.ellipse([cx - int(radius*0.6), cy - int(radius*0.6), cx + int(radius*0.6), cy + int(radius*0.6)], fill=(52, 160, 72, 200))
    draw.ellipse([cx - int(radius*0.25), cy - int(radius*0.35), cx + int(radius*0.1), cy], fill=(120, 210, 100, 120))

def add_plants_to_canvas(canvas: Image.Image) -> Image.Image:
    """Ajoute des plantes en pot aux angles des vérandas et pièces de séjour."""
    draw = ImageDraw.Draw(canvas)
    width, height = canvas.size

    plant_positions = [
        (int(width * 0.52), int(height * 0.62)),
        (int(width * 0.58), int(height * 0.70)),
        (int(width * 0.38), int(height * 0.78)),
        (int(width * 0.50), int(height * 0.82)),
        (int(width * 0.72), int(height * 0.55)),
        (int(width * 0.88), int(height * 0.65)),
        (int(width * 0.90), int(height * 0.38)),
    ]

    for cx, cy in plant_positions:
        draw_plant(draw, cx, cy, radius=16)

    return canvas

def render_furniture_layer(canvas: Image.Image, furniture_mask: np.ndarray, width: int, height: int):
    draw = ImageDraw.Draw(canvas)
    num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(furniture_mask)

    for i in range(1, num_labels):
        x = stats[i, cv2.CC_STAT_LEFT]
        y = stats[i, cv2.CC_STAT_TOP]
        w = stats[i, cv2.CC_STAT_WIDTH]
        h = stats[i, cv2.CC_STAT_HEIGHT]
        area = stats[i, cv2.CC_STAT_AREA]

        # 1. Grand objet non-identifié — rendu générique sobre (PAS de voiture générée automatiquement)
        # Les véhicules ne sont rendus QUE si le plan source contient explicitement un espace de stationnement.
        if area > 12000 and (w > h * 1.5 or h > w * 1.5):
            # Forme allongée inconnue → table ou meuble massif
            elem_mask = np.where(labels == i, 255, 0).astype(np.uint8)
            elem_mask_pil = Image.fromarray(elem_mask)
            canvas.paste(Image.new("RGBA", (width, height), (180, 160, 130, 220)), (0, 0), mask=elem_mask_pil)
            continue

        # 2. Lits (Duvet + oreillers)
        if (w > 50 and h > 50) and area > 2500 and area < 12000:
            canvas = render_bed(canvas, x, y, w, h, "beige")
            continue

        # 3. Grande table à manger (SAM)
        if area > 4000 and w > h * 1.2:
            elem_mask = np.where(labels == i, 255, 0).astype(np.uint8)
            elem_mask_pil = Image.fromarray(elem_mask)
            table_fill = Image.new("RGBA", (width, height), (122, 67, 29, 255))
            canvas.paste(table_fill, (0, 0), mask=elem_mask_pil)
            continue

        # 3.5 2ème Table Console Basse avec Pot de Fleurs
        if x > width * 0.65 and y > height * 0.55 and area > 800 and area < 4000:
            elem_mask = np.where(labels == i, 255, 0).astype(np.uint8)
            elem_mask_pil = Image.fromarray(elem_mask)
            table_fill = Image.new("RGBA", (width, height), (140, 85, 45, 255))
            canvas.paste(table_fill, (0, 0), mask=elem_mask_pil)
            cx, cy = x + w // 2, y + h // 2
            draw_plant(draw, cx, cy, radius=14)
            continue

        # 4. Mobilier Général / Canapés / Sanitaires
        elem_mask = np.where(labels == i, 255, 0).astype(np.uint8)
        elem_mask_pil = Image.fromarray(elem_mask)
        default_fill = Image.new("RGBA", (width, height), (241, 245, 249, 230))
        canvas.paste(default_fill, (0, 0), mask=elem_mask_pil)
        outline_img = Image.fromarray(cv2.Canny(elem_mask, 100, 200))
        canvas.paste(Image.new("RGBA", (width, height), (71, 85, 105, 255)), (0, 0), mask=outline_img)

def generate_controlnet_maps(structural_walls: np.ndarray, dashed_mask: np.ndarray, output_canny_path: str, output_depth_path: str, balcony_guardrail_mask: np.ndarray = None):
    """
    Génère les cartes ControlNet (Canny & Depth wireframe) depuis les murs structuraux, les pointillés et les garde-corps.
    """
    try:
        if structural_walls is None or structural_walls.size == 0:
            print("⚠️ Notice ControlNet : Image de murs vide ou invalide.")
            return

        # 1. Canny edge map (on combine les murs, les pointillés et les garde-corps)
        canny_img = cv2.Canny(structural_walls, 100, 200)
        kernel_3x3 = np.ones((3, 3), dtype=np.uint8)
        canny_img = cv2.dilate(canny_img, kernel_3x3, iterations=1)
        
        # 1b. Simulation d'épaisseur des murs extérieurs (dilatation périphérique de 5px)
        try:
            cnts, _ = cv2.findContours(structural_walls, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            if cnts:
                large_cnts = [c for c in cnts if cv2.contourArea(c) > 1000]
                if large_cnts:
                    all_pts = np.vstack(large_cnts)
                    hull = cv2.convexHull(all_pts)
                    cv2.drawContours(canny_img, [hull], -1, 255, 5)
        except Exception as e:
            print(f"  ⚠️ Warning wall thickness effect: {e}")
            
        if dashed_mask is not None and dashed_mask.size > 0:
            canny_img = cv2.bitwise_or(canny_img, dashed_mask)
        if balcony_guardrail_mask is not None and balcony_guardrail_mask.size > 0:
            canny_img = cv2.bitwise_or(canny_img, balcony_guardrail_mask)
            
        os.makedirs(os.path.dirname(os.path.abspath(output_canny_path)), exist_ok=True)
        cv2.imwrite(output_canny_path, canny_img)

        # 2. Depth map (synthétique basée sur la distance aux bords)
        combined_struct = structural_walls.copy()
        if dashed_mask is not None and dashed_mask.size > 0:
            combined_struct = cv2.bitwise_or(combined_struct, dashed_mask)
        if balcony_guardrail_mask is not None and balcony_guardrail_mask.size > 0:
            combined_struct = cv2.bitwise_or(combined_struct, balcony_guardrail_mask)
            
        dist_transform = cv2.distanceTransform(combined_struct, cv2.DIST_L2, 5)
        depth_normalized = cv2.normalize(dist_transform, None, 0, 255, cv2.NORM_MINMAX, dtype=cv2.CV_8U)
        
        # Rendre les garde-corps plus bas dans la depth map (max 120 sur 255)
        if balcony_guardrail_mask is not None and balcony_guardrail_mask.size > 0:
            mask_indices = balcony_guardrail_mask > 0
            depth_normalized[mask_indices] = np.minimum(depth_normalized[mask_indices], 120)

        os.makedirs(os.path.dirname(os.path.abspath(output_depth_path)), exist_ok=True)
        cv2.imwrite(output_depth_path, depth_normalized)
        print(f"✨ Cartes ControlNet générées avec succès : Canny={output_canny_path}, Depth={output_depth_path}")
    except Exception as e:
        print(f"⚠️ Notice ControlNet Maps generation : {e}")

def generate_clean_plan(bgr_img: np.ndarray, proc_result: dict, output_clean_path: str):
    width, height = proc_result["width"], proc_result["height"]
    sealed_walls = proc_result["structural_walls"]
    furniture_mask = proc_result["furniture_mask"]
    building_mask = proc_result.get("building_mask", np.ones((height, width), dtype=np.uint8) * 255)
    balcony_guardrail_mask = proc_result.get("balcony_guardrail_mask", np.zeros_like(sealed_walls))
    img_area = width * height

    # 1. Canvas fond crème/béton ciré clair Nano Banana (#F4F0EA)
    canvas_base = Image.new("RGBA", (width, height), (244, 240, 234, 255))
    layer1_floors = canvas_base.copy()

    cartouche_y_limit = int(height * 0.82)

    # 2. Détection topologique des balcons/vérandas
    # 2a. Masque de fond extérieur (sans les garde-corps)
    inv_sealed = cv2.bitwise_not(sealed_walls)
    inv_sealed[building_mask == 0] = 0
    num_labels_s, labels_s, stats_s, _ = cv2.connectedComponentsWithStats(inv_sealed)
    largest_label_s = np.argmax(stats_s[:, cv2.CC_STAT_AREA])
    bg_mask = (labels_s == largest_label_s)

    # 2b. Partitionnement avec les garde-corps inclus
    combined_walls = cv2.bitwise_or(sealed_walls, balcony_guardrail_mask)
    inv_combined = cv2.bitwise_not(combined_walls)
    inv_combined[building_mask == 0] = 0
    num_labels_c, labels_c, stats_c, _ = cv2.connectedComponentsWithStats(inv_combined)
    largest_label_c = np.argmax(stats_c[:, cv2.CC_STAT_AREA])

    valid_room_count = 0

    for label_idx in range(1, num_labels_c):
        if label_idx == largest_label_c:
            continue

        area = stats_c[label_idx, cv2.CC_STAT_AREA]
        if area < 600 or area > 0.38 * img_area:
            continue

        x = stats_c[label_idx, cv2.CC_STAT_LEFT]
        y = stats_c[label_idx, cv2.CC_STAT_TOP]
        w = stats_c[label_idx, cv2.CC_STAT_WIDTH]
        h = stats_c[label_idx, cv2.CC_STAT_HEIGHT]

        if (y + h) >= cartouche_y_limit or y >= cartouche_y_limit:
            continue
        if x <= 2 or y <= 2 or (x + w) >= (width - 2):
            continue

        room_mask = np.where(labels_c == label_idx, 255, 0).astype(np.uint8)
        floor_only_mask = cv2.bitwise_and(room_mask, cv2.bitwise_not(furniture_mask))
        room_mask_pil = Image.fromarray(floor_only_mask)

        # Si le composant intersecte avec le fond extérieur (quand on retire les garde-corps)
        # alors c'est topologiquement un balcon/véranda ouvert.
        is_balcony = np.any(cv2.bitwise_and(room_mask, bg_mask.astype(np.uint8) * 255) > 0)

        if is_balcony:
            # Espace extérieur ouvert : Texture de véranda (béton ciré/deck)
            print(f"[FloorTexture] Component {label_idx} (area={area}px) détecté comme ESPACE BALCON/VERANDE")
            tex_img = _CATALOG.get_texture("veranda", width, height)
            layer1_floors.paste(tex_img, (0, 0), mask=room_mask_pil)
        else:
            # Sélection des textures Soft Pastel selon le type de pièce
            valid_room_count += 1
            if area < 3500:
                # Cuisines / Sanitaires : Carrelage beige/mint (#E8F0E6)
                tex_img = _CATALOG.get_texture("kitchen", width, height)
                layer1_floors.paste(tex_img, (0, 0), mask=room_mask_pil)
            elif area > 10000 or valid_room_count % 2 == 1:
                # Salons / Séjours : Parquet chêne miel/clair (#D9AA72)
                tex_img = _CATALOG.get_texture("parquet", width, height)
                layer1_floors.paste(tex_img, (0, 0), mask=room_mask_pil)
            else:
                # Chambres : Carrelage mat bleu/gris pastel (#E3E8ED)
                tex_img = _CATALOG.get_texture("bedroom", width, height)
                layer1_floors.paste(tex_img, (0, 0), mask=room_mask_pil)

    # 5. Rendu du Mobilier avec Ombres Portées Douces
    render_furniture_layer(layer1_floors, furniture_mask, width, height)

    # 6. Ajout des plantes décoratives en pot
    add_plants_to_canvas(layer1_floors)

    # 7. HABILLAGE DOUX DES MURS — Contour Bois Sombre Warm (#3D2817) + Stroke 3px (#24170D)
    layer2_walls = apply_soft_shadow(layer1_floors, Image.fromarray(sealed_walls), opacity=60, offset=(3, 3))
    
    # Rendu des pointillés sur un calque séparé (comme des ouvertures/poutres en gris moyen #475569) SANS gros pochage massif
    dashed_mask = proc_result.get("dashed_mask")
    if dashed_mask is not None and dashed_mask.size > 0:
        dashed_pil = Image.fromarray(dashed_mask)
        layer2_walls.paste(Image.new("RGBA", (width, height), (71, 85, 105, 255)), (0, 0), mask=dashed_pil)

    # Rendu des garde-corps de balcons en gris acier (#475569)
    if balcony_guardrail_mask is not None and balcony_guardrail_mask.size > 0:
        balcony_pil = Image.fromarray(balcony_guardrail_mask)
        layer2_walls.paste(Image.new("RGBA", (width, height), (71, 85, 105, 255)), (0, 0), mask=balcony_pil)
        
    wall_pil = Image.fromarray(sealed_walls)
    layer2_walls.paste(Image.new("RGBA", (width, height), (61, 40, 23, 255)), (0, 0), mask=wall_pil)
    
    wall_outline = Image.fromarray(cv2.Canny(sealed_walls, 100, 200))
    layer2_walls.paste(Image.new("RGBA", (width, height), (36, 23, 13, 255)), (0, 0), mask=wall_outline)

    os.makedirs(os.path.dirname(os.path.abspath(output_clean_path)), exist_ok=True)
    layer2_walls.convert("RGB").save(output_clean_path, "PNG")

# ═════════════════════════════════════════════════════════════════════════════
# 5. CLI & MAIN PIPELINE EXECUTION WITH MULTIPLY TEXT BLENDING
# ═════════════════════════════════════════════════════════════════════════════

def apply_plan_watermark(image_rgba: Image.Image, user_plan: str = "free") -> Image.Image:
    """Applique un filigrane adapté selon le plan tarifaire (Free = visible, Pro/Enterprise = discret)."""
    draw = ImageDraw.Draw(image_rgba)
    w, h = image_rgba.size
    if user_plan == "free":
        draw.text((20, h - 45), "ARCHI CAM AI — PLAN FREE (PRODUIT NON CERTIFIÉ)", fill=(239, 68, 68, 220))
        draw.text((20, h - 25), "Passez Pro sur archicam.cm pour supprimer ce filigrane", fill=(255, 255, 255, 180))
    else:
        draw.text((w - 180, h - 25), "ARCHI CAM AI ® PRO", fill=(255, 255, 255, 60))
    return image_rgba


def main():
    if len(sys.argv) < 3:
        print("Usage: python generate_photoshop_2d_plan.py <input_path> <output_base_path>")
        print("Exemple: python generate_photoshop_2d_plan.py \"../public/uploads/plan.jpg\" \"../public/renders/test_output.png\"")
        sys.exit(1)

    input_path = os.path.abspath(sys.argv[1])
    output_base_path = os.path.abspath(sys.argv[2])

    print("=" * 65)
    print("🏛️ ARCHI CAM AI — ENGINE DE PRÉTRAITEMENT OPENCV V7 (NANO BANANA HD)")
    print("=" * 65)
    print(f"📁 Entrée source : {input_path}")
    print(f"🎯 Sortie de base : {output_base_path}")

    try:
        bgr_img = load_input_image(input_path)
        
        # 1. Autocrop du plan (élimination de la table sombre en fond)
        bgr_img, autocrop_success = autocrop_sheet_robust(bgr_img)
        h_crop, w_crop = bgr_img.shape[:2]
        print(f"📐 Résolution après autocrop : {w_crop} x {h_crop} px (Succès: {autocrop_success})")

        if max(h_crop, w_crop) > 4096:
            scale = 4096.0 / float(max(h_crop, w_crop))
            new_w, new_h = int(w_crop * scale), int(h_crop * scale)
            bgr_img = cv2.resize(bgr_img, (new_w, new_h), interpolation=cv2.INTER_AREA)
            h_crop, w_crop = bgr_img.shape[:2]
            print(f"📐 Image haute résolution ajustée à max 4096px : {w_crop} x {h_crop} px")

        out_dir = os.path.dirname(output_base_path)
        os.makedirs(out_dir, exist_ok=True)

        base_filename = os.path.basename(output_base_path)
        name_without_ext, _ = os.path.splitext(base_filename)
        output_prefix = os.path.join(out_dir, name_without_ext)

        output_clean_plan = f"{output_prefix}_clean_plan.png"
        output_canny = f"{output_prefix}_canny.png"
        output_depth = f"{output_prefix}_depth.png"
        output_text = f"{output_prefix}_text.png"

        print("⚙️ Traitement en cours : dénoyautage du bruit, segmentation des murs & extraction du texte...")
        proc_result = process_hand_drawn_notebook_sketch(bgr_img)

        # 2. Ajout de la marge blanche (padding) adaptative pour donner de l'espace à l'IA pour la verdure
        # On applique le padding après coup à tous les éléments de sortie de proc_result
        bgr_img, padding_px = add_smart_padding(bgr_img, target_padding_ratio=0.15, max_padding_px=150)
        pad_y = padding_px
        pad_x = padding_px
        h, w = bgr_img.shape[:2]

        proc_result["structural_walls"] = cv2.copyMakeBorder(
            proc_result["structural_walls"],
            top=pad_y, bottom=pad_y, left=pad_x, right=pad_x,
            borderType=cv2.BORDER_CONSTANT, value=0
        )
        proc_result["furniture_mask"] = cv2.copyMakeBorder(
            proc_result["furniture_mask"],
            top=pad_y, bottom=pad_y, left=pad_x, right=pad_x,
            borderType=cv2.BORDER_CONSTANT, value=0
        )
        proc_result["building_mask"] = cv2.copyMakeBorder(
            proc_result["building_mask"],
            top=pad_y, bottom=pad_y, left=pad_x, right=pad_x,
            borderType=cv2.BORDER_CONSTANT, value=0
        )
        if proc_result.get("dashed_mask") is not None:
            proc_result["dashed_mask"] = cv2.copyMakeBorder(
                proc_result["dashed_mask"],
                top=pad_y, bottom=pad_y, left=pad_x, right=pad_x,
                borderType=cv2.BORDER_CONSTANT, value=0
            )
        if proc_result.get("balcony_guardrail_mask") is not None:
            proc_result["balcony_guardrail_mask"] = cv2.copyMakeBorder(
                proc_result["balcony_guardrail_mask"],
                top=pad_y, bottom=pad_y, left=pad_x, right=pad_x,
                borderType=cv2.BORDER_CONSTANT, value=0
            )

        proc_result["clean_text_mask"] = cv2.copyMakeBorder(
            proc_result["clean_text_mask"],
            top=pad_y, bottom=pad_y, left=pad_x, right=pad_x,
            borderType=cv2.BORDER_CONSTANT, value=0
        )
        text_rgba = np.zeros((h, w, 4), dtype=np.uint8)
        text_rgba[proc_result["clean_text_mask"] > 0] = (15, 23, 42, 255)
        proc_result["text_layer_rgba"] = Image.fromarray(text_rgba, "RGBA")

        proc_result["width"] = w
        proc_result["height"] = h

        print("🎨 Génération du plan Nano Banana HD (textures soft, murs bois #3D2817, calque multiply)...")
        generate_clean_plan(bgr_img, proc_result, output_clean_plan)
        try:
            generate_controlnet_maps(
                proc_result["structural_walls"],
                proc_result.get("dashed_mask"),
                output_canny,
                output_depth,
                proc_result.get("balcony_guardrail_mask")
            )
        except Exception as e:
            print(f"⚠️ Notice ControlNet Maps generation : {e}")

        proc_result["text_layer_rgba"].save(output_text, "PNG")

        # ── APPLICATION DU FILIGRANE PROPRE SUR LE PLAN HD ──
        try:
            rendered_img = Image.open(output_clean_plan).convert("RGBA")
            user_plan = os.environ.get("USER_PLAN", "free")
            final_watermarked = apply_plan_watermark(rendered_img, user_plan)
            final_watermarked.save(output_clean_plan, "PNG")
            print("✨ Plan propre HD généré avec succès !")
        except Exception as e:
            print(f"⚠️ Notice Plan Watermarking : {e}")

        if output_base_path.lower().endswith(".png"):
            layer_clean_bgr = cv2.imread(output_clean_plan)
            if layer_clean_bgr is not None:
                cv2.imwrite(output_base_path, layer_clean_bgr)

        print("-" * 65)
        print("✨ SUCCÈS ! Le rendu Nano Banana HD a été généré avec précision :")
        print(f"   1. 🖼️ Clean Plan : {output_clean_plan}")
        print(f"   2. ✏️ Lineart Canny: {output_canny}")
        print(f"   3. 🗺️ Depth Map 2.5D: {output_depth}")
        print(f"   4. 📝 Text Layer  : {output_text}")
        print("=" * 65)

    except Exception as err:
        import traceback
        traceback.print_exc()
        print(f"❌ ERREUR CRITIQUE lors du prétraitement OpenCV : {str(err)}", file=sys.stderr)
        sys.exit(1)

def find_optimal_bed_wall(room_polygon, min_length_px=100):
    """
    Extrait les segments du polygone de la chambre et trouve le mur optimal pour placer le lit.
    """
    if len(room_polygon) < 3:
        return None, "Polygon has too few vertices"
        
    segments = []
    for j in range(len(room_polygon)):
        p1 = room_polygon[j]
        p2 = room_polygon[(j + 1) % len(room_polygon)]
        dx = p2[0] - p1[0]
        dy = p2[1] - p1[1]
        length = np.sqrt(dx**2 + dy**2)
        segments.append({
            'start': p1,
            'end': p2,
            'length': length,
            'dx': dx,
            'dy': dy
        })
        
    valid_segments = [s for s in segments if s['length'] >= min_length_px]
    if not valid_segments:
        return None, "No walls long enough (minimum effective length >= 220cm)"
        
    valid_segments.sort(key=lambda s: s['length'], reverse=True)
    chosen_segment = valid_segments[0]
    p1 = chosen_segment['start']
    p2 = chosen_segment['end']
    
    mx = (p1[0] + p2[0]) / 2
    my = (p1[1] + p2[1]) / 2
    
    length = chosen_segment['length']
    nx = -chosen_segment['dy'] / length
    ny = chosen_segment['dx'] / length
    
    contour = np.array(room_polygon, dtype=np.int32).reshape((-1, 1, 2))
    test_pt = (float(mx + nx * 20), float(my + ny * 20))
    dist = cv2.pointPolygonTest(contour, test_pt, False)
    
    if dist < 0:
        nx, ny = -nx, -ny
        
    bed_length = 75
    bed_width = 60
    bx = mx + nx * (bed_length / 2)
    by = my + ny * (bed_length / 2)
    
    angle_rad = np.arctan2(ny, nx)
    angle_deg = np.degrees(angle_rad)
    
    return {
        'chosen_wall': {
            'start': [int(p1[0]), int(p1[1])],
            'end': [int(p2[0]), int(p2[1])],
            'length_cm': int(length * 2.5)
        },
        'bed_position': {
            'center': [int(bx), int(by)],
            'rotation_deg': int(angle_deg),
            'size_cm': [160, 200]
        }
    }, None

def draw_oriented_rect(img, center, size, angle_deg, val):
    """
    Dessine un rectangle orienté sur l'image
    """
    cx, cy = center
    w_rect, h_rect = size
    
    corners = np.array([
        [-w_rect/2, -h_rect/2],
        [w_rect/2, -h_rect/2],
        [w_rect/2, h_rect/2],
        [-w_rect/2, h_rect/2]
    ])
    
    theta = np.radians(angle_deg)
    c, s = np.cos(theta), np.sin(theta)
    R = np.array([[c, -s], [s, c]])
    
    rotated_corners = np.dot(corners, R.T) + [cx, cy]
    rotated_corners = rotated_corners.astype(np.int32)
    
    cv2.fillPoly(img, [rotated_corners], val)

def generate_furniture_anchors(cleaned_image, rooms_list, staircase_zones, storage_zones, outdoor_data, output_path):
    """
    Génère la Depth Map d'ancrage du mobilier (_furniture_anchors.png)
    """
    h, w = cleaned_image.shape[:2]
    anchors = np.ones((h, w), dtype=np.uint8) * 255
    
    gray = cv2.cvtColor(cleaned_image, cv2.COLOR_BGR2GRAY)
    _, thresh_walls = cv2.threshold(gray, 220, 255, cv2.THRESH_BINARY_INV)
    anchors[thresh_walls > 0] = 0
    
    outside_mask = np.ones((h, w), dtype=np.uint8) * 255
    for r in rooms_list:
        if r['type'] != 'OUTSIDE':
            if len(r['polygon']) > 0:
                cv2.fillPoly(outside_mask, [np.array(r['polygon'], dtype=np.int32)], 0)
    anchors[outside_mask == 255] = 0
    
    placement_logic = {}
    stair_detected = False
    stair_zones_coords = []
    for sz in staircase_zones:
        stair_detected = True
        sx1, sy1, sx2, sy2 = sz
        stair_zones_coords.append([int(sx1), int(sy1), int(sx2), int(sy2)])
        
        stair_h = sy2 - sy1
        if stair_h > 0:
            for y in range(sy1, sy2):
                if 0 <= y < h:
                    val = int(50 + (y - sy1) / stair_h * 50)
                    anchors[y, sx1:sx2] = val
                    
    placement_logic['stairwell_detected'] = stair_detected
    if stair_detected:
        placement_logic['stair_confinement_zone'] = stair_zones_coords
        
    for r in rooms_list:
        if r['type'] == 'BEDROOM':
            room_id_str = f"room_{r['id']}"
            polygon = r['polygon']
            res, err = find_optimal_bed_wall(polygon)
            if res:
                center = res['bed_position']['center']
                size = (60, 75)
                angle = res['bed_position']['rotation_deg']
                draw_oriented_rect(anchors, center, size, angle, 180)
                placement_logic[room_id_str] = {
                    'chosen_wall': res['chosen_wall'],
                    'bed_position': res['bed_position'],
                    'rejected_reason': None
                }
            else:
                placement_logic[room_id_str] = {
                    'chosen_wall': None,
                    'bed_position': None,
                    'rejected_reason': err
                }
                
    for z in outdoor_data['zones']:
        bx1, by1, bx2, by2 = z['bbox']
        balcony_crop = anchors[by1:by2, bx1:bx2]
        if balcony_crop.size > 0:
            _, crop_bin = cv2.threshold(balcony_crop, 220, 255, cv2.THRESH_BINARY)
            num_labels, labels_im, stats, centroids = cv2.connectedComponentsWithStats(crop_bin)
            
            cleaned_crop = np.zeros_like(balcony_crop)
            for i in range(1, num_labels):
                area = stats[i, cv2.CC_STAT_AREA]
                w_box = stats[i, cv2.CC_STAT_WIDTH]
                h_box = stats[i, cv2.CC_STAT_HEIGHT]
                if area >= 50 and w_box >= 3 and h_box >= 3:
                    cleaned_crop[labels_im == i] = 255
            anchors[by1:by2, bx1:bx2] = np.where(cleaned_crop == 255, 255, anchors[by1:by2, bx1:bx2])
            
    cv2.imwrite(output_path, anchors)
    
    debug_dir = os.path.join(os.path.dirname(output_path), 'debug')
    os.makedirs(debug_dir, exist_ok=True)
    
    cv2.imwrite(os.path.join(debug_dir, 'source_inpainted.png'), cleaned_image)
    cv2.imwrite(os.path.join(debug_dir, 'furniture_anchors_map.png'), anchors)
    
    import json
    with open(os.path.join(debug_dir, 'placement_logic.json'), 'w', encoding='utf-8') as pf:
        json.dump(placement_logic, pf, indent=2, ensure_ascii=False)
        
    print(f"✅ Depth Map d'ancrage mobilier générée : {output_path}")

if __name__ == "__main__":
    main()
