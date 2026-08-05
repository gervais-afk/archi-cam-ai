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
        x1, y1, x2, y2 = line[0]
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
    Remplace le seuil fixe 40% par une analyse adaptative multi-critères.
    Retourne (is_valid: bool, reason: str)

    Catégories :
      - DARK_CORRUPTED : Beaucoup de noir + peu de contours (fond sombre uniforme)
      - TOO_LIGHT      : Presque tout blanc (masque vide ou surexposé)
      - BLURRY         : Forte zone grise + flou Laplacien < 100
      - COMPLEX_VALID  : Ratio élevé MAIS beaucoup de contours (coupe/façade détaillée)
      - VALID          : Cas normal bien exploitable
    """
    h, w = binary_mask.shape[:2]
    total_pixels = h * w

    black_pixels = np.sum(binary_mask == 0)
    black_ratio = black_pixels / total_pixels

    # Densité de contours via Canny
    edges = cv2.Canny(binary_mask, 50, 150)
    edge_pixels = int(np.sum(edges > 0))
    edge_density = edge_pixels / total_pixels

    print(f"[MaskQuality] Noir={black_ratio*100:.1f}%, Contours={edge_density*100:.2f}%")

    # Règle 1 : Très noir ET peu de détails → fond sombre corrompu
    if black_ratio > 0.70 and edge_density < 0.03:
        print("[MaskQuality] ⚠️ DARK_CORRUPTED : fond très sombre et peu de contours")
        return False, "DARK_CORRUPTED"

    # Règle 2 : Presque tout blanc → masque vide
    if black_ratio < 0.05:
        print("[MaskQuality] ⚠️ TOO_LIGHT : masque quasi-vide")
        return False, "TOO_LIGHT"

    # Règle 3 : Ratio élevé MAIS beaucoup de contours → dessin complexe valide
    if 0.40 < black_ratio < 0.65 and edge_density > 0.08:
        print("[MaskQuality] ✅ COMPLEX_VALID : dessin complexe (coupe/façade détaillée)")
        return True, "COMPLEX_VALID"

    # Règle 4 : Zone grise + score flou bas → photo floue
    if black_ratio > 0.40:
        blur_score = float(cv2.Laplacian(binary_mask, cv2.CV_64F).var())
        print(f"[MaskQuality] Score flou Laplacien : {blur_score:.1f}")
        if blur_score < 100.0:
            print("[MaskQuality] ⚠️ BLURRY : photo floue détectée")
            return False, "BLURRY"

    print("[MaskQuality] ✅ VALID : masque exploitable")
    return True, "VALID"


def autocrop_sheet(bgr_img: np.ndarray) -> np.ndarray:
    """
    Détecte la feuille blanche de plan sur une table sombre et effectue un rognage (crop) automatique.
    Si aucune feuille n'est clairement détectée, applique un recadrage de repli de 5% sur tous les bords.
    """
    h, w = bgr_img.shape[:2]
    gray = cv2.cvtColor(bgr_img, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    
    # Binarisation d'Otsu pour isoler la zone claire (la feuille blanche)
    _, thresh = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    best_rect = None
    max_area = 0
    min_area = 0.15 * w * h  # La feuille doit représenter au moins 15% de l'image
    
    for cnt in contours:
        area = cv2.contourArea(cnt)
        if area > min_area and area > max_area:
            # Enveloppe approximative
            peri = cv2.arcLength(cnt, True)
            approx = cv2.approxPolyDP(cnt, 0.04 * peri, True)
            # Accepter le rectangle englobant du plus grand contour clair trouvé
            max_area = area
            best_rect = cv2.boundingRect(cnt)
            
    if best_rect is not None:
        x, y, bw, bh = best_rect
        print(f"[Autocrop] Feuille détectée : x={x}, y={y}, w={bw}, h={bh} ({max_area / (w * h) * 100:.1f}% de la surface)")
        if bw > 0.3 * w and bh > 0.3 * h:
            # Rognage propre
            return bgr_img[y:y+bh, x:x+bw]
            
    # Échenillage de repli : 5% sur tous les bords
    print("[Autocrop] Feuille claire non détectée. Échenillage de repli (crop 5% sur les 4 bords).")
    pad_y = int(h * 0.05)
    pad_x = int(w * 0.05)
    return bgr_img[pad_y:h-pad_y, pad_x:w-pad_x]

def extract_dashed_lines(binary_img: np.ndarray) -> tuple:
    """
    Identifie et sépare les lignes interrompues / pointillés (- - -) des murs pleins.
    Retourne (murs_propres, masque_pointilles)
    """
    h, w = binary_img.shape[:2]
    dashed_mask = np.zeros_like(binary_img)
    
    # HoughLinesP avec un petit seuil pour trouver les petits segments
    lines = cv2.HoughLinesP(
        binary_img,
        rho=1,
        theta=np.pi / 180,
        threshold=12,
        minLineLength=6,
        maxLineGap=18
    )
    
    if lines is not None:
        for line in lines:
            x1, y1, x2, y2 = line[0]
            length = np.hypot(x2 - x1, y2 - y1)
            if length < 8:
                continue
                
            # Sample les points le long du segment pour inspecter le profil
            num_samples = int(length)
            xs = np.linspace(x1, x2, num_samples).astype(int)
            ys = np.linspace(y1, y2, num_samples).astype(int)
            xs = np.clip(xs, 0, w - 1)
            ys = np.clip(ys, 0, h - 1)
            
            profile = binary_img[ys, xs]
            transitions = np.sum(profile[:-1] != profile[1:])
            
            # S'il y a des transitions (alternance d'encre et de vide), c'est une ligne en pointillés !
            if transitions >= 2:
                cv2.line(dashed_mask, (x1, y1), (x2, y2), 255, thickness=2)
                
    # On nettoie l'image binarisée d'origine en soustrayant le masque des pointillés
    murs_propres = cv2.subtract(binary_img, dashed_mask)
    return murs_propres, dashed_mask


def process_hand_drawn_notebook_sketch(bgr_img: np.ndarray) -> dict:
    height, width = bgr_img.shape[:2]

    # ── ÉTAPE 0 : NETTOYAGE DES COULEURS (bleu cahier HSV) ───────────────────
    # Supprimer l'encre bleue/cyan des lignes de grille (HSV H:80-140)
    hsv = cv2.cvtColor(bgr_img, cv2.COLOR_BGR2HSV)
    grid_blue_mask = cv2.inRange(hsv, (80, 20, 100), (140, 255, 255))
    cleaned_bgr = bgr_img.copy()
    cleaned_bgr[grid_blue_mask > 0] = (255, 255, 255)

    gray = cv2.cvtColor(cleaned_bgr, cv2.COLOR_BGR2GRAY)
    clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
    enhanced = clahe.apply(gray)
    denoised = cv2.bilateralFilter(enhanced, d=5, sigmaColor=35, sigmaSpace=35)

    _, binary = cv2.threshold(denoised, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)

    # ── ÉTAPE 1 : SUPPRESSION DES LIGNES HORIZONTALES DU CAHIER (adapt. Hough) ───
    # Utilise detect_and_remove_ruled_lines() qui valide la régularité des espacements
    # pour ne pas supprimer les murs architecturaux horizontaux par erreur.
    binary = detect_and_remove_ruled_lines(binary, width)

    # ── ÉTAPE 1.5 : EXTRACTION DES POINTILLÉS / LIGNES INTERROMPUES ───────────
    # On isole les pointillés (- - -) avant la dilatation des murs pour éviter de
    # fermer les ouvertures comme s'il s'agissait de cloisons opaques portantes.
    binary, dashed_mask = extract_dashed_lines(binary)

    # ── GARDE-FOU ADAPTATIF : remplacement du seuil fixe 40% ──────────────────
    # validate_mask_quality() analyse la densité de contours (Canny) et le flou.
    # On isole la zone active du dessin pour ne pas fausser les métriques avec le padding blanc.
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
        # Retourner un Canny propre plutôt qu'un masque corrompu
        fallback_canny = cv2.Canny(binary, 50, 150)
        binary = fallback_canny

    # Détection de l'enveloppe du bâtiment pour éliminer les cotations extérieures
    building_mask = detect_building_envelope(binary, width, height)
    binary_in_building = cv2.bitwise_and(binary, building_mask)

    # ── ÉTAPE 2 : FERMETURE MORPHOLOGIQUE RENFORCÉE DES MURS FIN (3x3 / 4x4) ──
    # Épaississement des traits de stylo pour boucher les micro-trous et éviter les fuites.
    # Réduction à un noyau très fin de (3x3)/(4x4) pour des cloisons fines et élégantes.
    kernel_dilate = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    binary_thickened = cv2.dilate(binary_in_building, kernel_dilate, iterations=1)

    kernel_seal = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (4, 4))
    sealed_walls = cv2.morphologyEx(binary_thickened, cv2.MORPH_CLOSE, kernel_seal)

    num_wall_comps, wall_labels, wall_stats, _ = cv2.connectedComponentsWithStats(sealed_walls)
    structural_walls = np.zeros_like(sealed_walls, dtype=np.uint8)

    for i in range(1, num_wall_comps):
        area = wall_stats[i, cv2.CC_STAT_AREA]
        comp_w = wall_stats[i, cv2.CC_STAT_WIDTH]
        comp_h = wall_stats[i, cv2.CC_STAT_HEIGHT]
        
        if area >= 30 or comp_w >= 15 or comp_h >= 18:
            structural_walls[wall_labels == i] = 255

    # ── ÉTAPE 4 : SÉPARATION DU TEXTE MANUSCRIT ET DU MOBILIER ─────────────────
    non_wall_ink = cv2.bitwise_and(binary_in_building, cv2.bitwise_not(structural_walls))
    num_ink_comps, ink_labels, ink_stats, _ = cv2.connectedComponentsWithStats(non_wall_ink)
    
    furniture_mask = np.zeros_like(non_wall_ink, dtype=np.uint8)
    clean_text_mask = np.zeros_like(non_wall_ink, dtype=np.uint8)

    for i in range(1, num_ink_comps):
        area = ink_stats[i, cv2.CC_STAT_AREA]
        w_c = ink_stats[i, cv2.CC_STAT_WIDTH]
        h_c = ink_stats[i, cv2.CC_STAT_HEIGHT]

        if area >= 120 or (w_c >= 25 and h_c >= 25):
            furniture_mask[ink_labels == i] = 255
        elif area >= 6:
            clean_text_mask[ink_labels == i] = 255

    text_rgba = np.zeros((height, width, 4), dtype=np.uint8)
    text_rgba[clean_text_mask > 0] = (15, 23, 42, 255)

    return {
        "structural_walls": structural_walls,
        "furniture_mask": furniture_mask,
        "clean_text_mask": clean_text_mask,
        "text_layer_rgba": Image.fromarray(text_rgba, "RGBA"),
        "building_mask": building_mask,
        "dashed_mask": dashed_mask,
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

def generate_controlnet_maps(structural_walls: np.ndarray, dashed_mask: np.ndarray, output_canny_path: str, output_depth_path: str):
    """
    Génère les cartes ControlNet (Canny & Depth wireframe) depuis les murs structuraux et les pointillés.
    """
    try:
        if structural_walls is None or structural_walls.size == 0:
            print("⚠️ Notice ControlNet : Image de murs vide ou invalide.")
            return

        # 1. Canny edge map (on combine les murs et les pointillés)
        canny_img = cv2.Canny(structural_walls, 100, 200)
        if dashed_mask is not None and dashed_mask.size > 0:
            canny_img = cv2.bitwise_or(canny_img, dashed_mask)
            
        os.makedirs(os.path.dirname(os.path.abspath(output_canny_path)), exist_ok=True)
        cv2.imwrite(output_canny_path, canny_img)

        # 2. Depth map (synthétique basée sur la distance aux bords)
        combined_struct = structural_walls.copy()
        if dashed_mask is not None and dashed_mask.size > 0:
            combined_struct = cv2.bitwise_or(combined_struct, dashed_mask)
            
        dist_transform = cv2.distanceTransform(combined_struct, cv2.DIST_L2, 5)
        depth_normalized = cv2.normalize(dist_transform, None, 0, 255, cv2.NORM_MINMAX, dtype=cv2.CV_8U)
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
    img_area = width * height

    # 1. Canvas fond crème/béton ciré clair Nano Banana (#F4F0EA)
    canvas_base = Image.new("RGBA", (width, height), (244, 240, 234, 255))
    layer1_floors = canvas_base.copy()

    cartouche_y_limit = int(height * 0.82)

    # 2. Texturage intérieur pièce par pièce - PALETTE SOFT ARCHITECTURAL
    inv_sealed = cv2.bitwise_not(sealed_walls)
    inv_sealed[building_mask == 0] = 0
    num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(inv_sealed)
    areas = stats[:, cv2.CC_STAT_AREA]
    largest_label = np.argmax(areas)

    valid_room_count = 0

    for label_idx in range(1, num_labels):
        if label_idx == largest_label:
            continue

        area = stats[label_idx, cv2.CC_STAT_AREA]
        if area < 600 or area > 0.38 * img_area:
            continue

        x = stats[label_idx, cv2.CC_STAT_LEFT]
        y = stats[label_idx, cv2.CC_STAT_TOP]
        w = stats[label_idx, cv2.CC_STAT_WIDTH]
        h = stats[label_idx, cv2.CC_STAT_HEIGHT]

        if (y + h) >= cartouche_y_limit or y >= cartouche_y_limit:
            continue
        if x <= 2 or y <= 2 or (x + w) >= (width - 2):
            continue

        valid_room_count += 1
        room_mask = np.where(labels == label_idx, 255, 0).astype(np.uint8)
        floor_only_mask = cv2.bitwise_and(room_mask, cv2.bitwise_not(furniture_mask))
        room_mask_pil = Image.fromarray(floor_only_mask)

        # Sélection des textures Soft Pastel selon le type de pièce
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

    # 5. Rendu du Mobilier et du Véhicule extraits ou superposés avec Ombres Portées Douces
    render_furniture_layer(layer1_floors, furniture_mask, width, height)

    # 6. Ajout des plantes décoratives en pot
    add_plants_to_canvas(layer1_floors)

    # 7. HABILLAGE DOUX DES MURS — Contour Bois Sombre Warm (#3D2817) + Stroke 3px (#24170D)
    # Ombre portée 3D ambiante sous les murs (opacity 60%, blur 5px)
    layer2_walls = apply_soft_shadow(layer1_floors, Image.fromarray(sealed_walls), opacity=60, offset=(3, 3))
    
    # Rendu des pointillés sur un calque séparé (comme des ouvertures/poutres en gris moyen #475569) SANS gros pochage massif
    dashed_mask = proc_result.get("dashed_mask")
    if dashed_mask is not None and dashed_mask.size > 0:
        dashed_pil = Image.fromarray(dashed_mask)
        layer2_walls.paste(Image.new("RGBA", (width, height), (71, 85, 105, 255)), (0, 0), mask=dashed_pil)
        
    wall_pil = Image.fromarray(sealed_walls)
    # Pochage brun foncé / bois sombre (#3D2817 / 61, 40, 23)
    layer2_walls.paste(Image.new("RGBA", (width, height), (61, 40, 23, 255)), (0, 0), mask=wall_pil)
    
    # Contour fin 3px brun foncé chaleureux (#24170D / 36, 23, 13)
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
        bgr_img = autocrop_sheet(bgr_img)
        h_crop, w_crop = bgr_img.shape[:2]
        print(f"📐 Résolution après autocrop : {w_crop} x {h_crop} px")

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

        # 2. Ajout de la marge blanche (padding) de 15% pour donner de l'espace à l'IA pour la verdure
        # On applique le padding après coup à tous les éléments de sortie de proc_result
        pad_y = int(h_crop * 0.15)
        pad_x = int(w_crop * 0.15)

        bgr_img = cv2.copyMakeBorder(
            bgr_img,
            top=pad_y,
            bottom=pad_y,
            left=pad_x,
            right=pad_x,
            borderType=cv2.BORDER_CONSTANT,
            value=[255, 255, 255] # Blanc
        )
        h, w = bgr_img.shape[:2]
        print(f"📐 Résolution finale avec padding de 15% : {w} x {h} px")

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
            generate_controlnet_maps(proc_result["structural_walls"], proc_result.get("dashed_mask"), output_canny, output_depth)
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
        print(f"❌ ERREUR CRITIQUE lors du prétraitement OpenCV : {str(err)}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
