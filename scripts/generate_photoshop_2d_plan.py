import os
import sys
import io
import cv2
import numpy as np
from PIL import Image, ImageEnhance, ImageFilter, ImageDraw

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
        return create_honey_parquet_texture(dest_w, dest_h)
    
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
        return create_honey_parquet_texture(dest_w, dest_h)

def create_honey_parquet_texture(width: int, height: int) -> Image.Image:
    """Texture parquet chêne miel chaleureux (#B87739)."""
    arr = np.ones((height, width, 4), dtype=np.uint8) * 255
    arr[:, :, 0] = 184 # R
    arr[:, :, 1] = 119 # G
    arr[:, :, 2] = 57  # B
    arr[:, :, 3] = 255
    for y in range(0, height, 48):
        arr[y:y+1, :, 0:3] = (arr[y:y+1, :, 0:3] * 0.82).astype(np.uint8)
    for x in range(0, width, 180):
        arr[:, x:x+1, 0:3] = (arr[:, x:x+1, 0:3] * 0.85).astype(np.uint8)
    return Image.fromarray(arr, "RGBA")

def create_light_tile_texture(width: int, height: int) -> Image.Image:
    """Texture marbre / carrelage grand format blanc clair (#F1F5F9)."""
    arr = np.ones((height, width, 4), dtype=np.uint8) * 255
    arr[:, :, 0] = 241 # R
    arr[:, :, 1] = 245 # G
    arr[:, :, 2] = 249 # B
    arr[:, :, 3] = 255
    for y in range(0, height, 60):
        arr[y:y+1, :, 0:3] = 225
    for x in range(0, width, 60):
        arr[:, x:x+1, 0:3] = 225
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

def create_patterned_tile_texture(width: int, height: int) -> Image.Image:
    """Texture carrelage à motifs azulejos douce pour sanitaires/SDB (#D0D7DE)."""
    arr = np.ones((height, width, 4), dtype=np.uint8) * 255
    arr[:, :, 0] = 208 # R
    arr[:, :, 1] = 215 # G
    arr[:, :, 2] = 222 # B
    arr[:, :, 3] = 255
    for y in range(0, height, 36):
        arr[y:y+1, :, 0:3] = 180
    for x in range(0, width, 36):
        arr[:, x:x+1, 0:3] = 180
    return Image.fromarray(arr, "RGBA")

def create_veranda_concrete_texture(width: int, height: int) -> Image.Image:
    """Texture béton lissé clair (#C8CECF) pour véranda et cheminements."""
    arr = np.ones((height, width, 4), dtype=np.uint8) * 255
    arr[:, :, 0] = 200 # R
    arr[:, :, 1] = 206 # G
    arr[:, :, 2] = 207 # B
    arr[:, :, 3] = 255
    return Image.fromarray(arr, "RGBA")

class AssetCatalog:
    def __init__(self):
        self._tex_cache = {}

    def get_texture(self, name: str, width: int, height: int) -> Image.Image:
        key = f"{name}_{width}_{height}"
        if key in self._tex_cache:
            return self._tex_cache[key]
        
        path_parquet = os.path.join(_TEX_DIR, "parquet.jpg")

        if name == "parquet":
            tiled = tile_real_texture(path_parquet, width, height, scale_factor=0.30, brightness=1.15)
        elif name == "light_tile":
            tiled = create_light_tile_texture(width, height)
        elif name == "cobblestone":
            tiled = create_red_cobblestone_texture(width, height)
        elif name == "patterned_tile":
            tiled = create_patterned_tile_texture(width, height)
        elif name == "veranda":
            tiled = create_veranda_concrete_texture(width, height)
        else:
            tiled = create_light_tile_texture(width, height)
        
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
            # scale=2.0 au lieu de 3.0 pour diviser le temps de calcul par 4 tout en gardant une netteté HD
            pil_image = page.render(scale=2.0).to_pil().convert("RGB")
            
            # Sauvegarder automatiquement une copie PNG du PDF pour LM Studio et le cache Next.js
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
# 2. SEGMENTATION TOPOLOGIQUE PRÉCISE (MURS DÉPENDANCE + MOBILIER)
# ═════════════════════════════════════════════════════════════════════════════

def process_hand_drawn_notebook_sketch(bgr_img: np.ndarray) -> dict:
    height, width = bgr_img.shape[:2]
    gray = cv2.cvtColor(bgr_img, cv2.COLOR_BGR2GRAY)

    clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8))
    enhanced = clahe.apply(gray)

    denoised = cv2.bilateralFilter(enhanced, d=5, sigmaColor=30, sigmaSpace=30)

    _, binary = cv2.threshold(denoised, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)

    kernel_seal = cv2.getStructuringElement(cv2.MORPH_RECT, (7, 7))
    sealed_walls = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel_seal)
    sealed_walls = cv2.morphologyEx(sealed_walls, cv2.MORPH_DILATE, cv2.getStructuringElement(cv2.MORPH_RECT, (2, 2)))

    num_wall_comps, wall_labels, wall_stats, _ = cv2.connectedComponentsWithStats(sealed_walls)
    structural_walls = np.zeros_like(sealed_walls, dtype=np.uint8)

    for i in range(1, num_wall_comps):
        area = wall_stats[i, cv2.CC_STAT_AREA]
        comp_w = wall_stats[i, cv2.CC_STAT_WIDTH]
        comp_h = wall_stats[i, cv2.CC_STAT_HEIGHT]
        
        if area >= 30 or comp_w >= 15 or comp_h >= 18:
            structural_walls[wall_labels == i] = 255

    non_wall_ink = cv2.bitwise_and(binary, cv2.bitwise_not(structural_walls))
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
        "width": width,
        "height": height
    }

# ═════════════════════════════════════════════════════════════════════════════
# 3. GÉNÉRATION DES CARTES CONTROLNET (_canny.png et _depth.png)
# ═════════════════════════════════════════════════════════════════════════════

def generate_controlnet_maps(structure_mask: np.ndarray, output_canny_path: str, output_depth_path: str):
    h, w = structure_mask.shape
    
    canny_edges = cv2.Canny(structure_mask, 80, 180)
    kernel_smooth = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2, 2))
    canny_edges = cv2.morphologyEx(canny_edges, cv2.MORPH_CLOSE, kernel_smooth)
    
    canny_inv = cv2.bitwise_not(canny_edges)
    canny_rgb = cv2.cvtColor(canny_inv, cv2.COLOR_GRAY2RGB)

    os.makedirs(os.path.dirname(os.path.abspath(output_canny_path)), exist_ok=True)
    cv2.imwrite(output_canny_path, cv2.cvtColor(canny_rgb, cv2.COLOR_RGB2BGR))

    dist_transform = cv2.distanceTransform(structure_mask, cv2.DIST_L2, 5)
    roof_gradient = np.zeros_like(dist_transform, dtype=np.uint8)
    if np.max(dist_transform) > 0:
        cv2.normalize(dist_transform, roof_gradient, 160, 255, cv2.NORM_MINMAX)

    depth_map_2d = np.where(structure_mask > 0, roof_gradient, 40).astype(np.uint8)
    depth_blurred = cv2.GaussianBlur(depth_map_2d, (7, 7), 0)
    depth_rgb = cv2.cvtColor(depth_blurred, cv2.COLOR_GRAY2RGB)

    os.makedirs(os.path.dirname(os.path.abspath(output_depth_path)), exist_ok=True)
    cv2.imwrite(output_depth_path, cv2.cvtColor(depth_rgb, cv2.COLOR_RGB2BGR))

# ═════════════════════════════════════════════════════════════════════════════
# 4. CRÉATION DU PLAN STRUCTURAL PROPRE DE HAUTE PRÉCISION (_clean_plan.png)
# ═════════════════════════════════════════════════════════════════════════════

def apply_soft_shadow(canvas: Image.Image, mask_img: Image.Image, opacity: int = 120, offset: tuple = (6, 6)) -> Image.Image:
    w, h = canvas.size
    alpha_ch = mask_img.convert("L")
    
    shadow_base = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    shadow_base.putalpha(alpha_ch.point(lambda p: int(p * opacity / 255)))
    shadow_base = shadow_base.filter(ImageFilter.GaussianBlur(6))
    
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
    shadow_draw.ellipse([x + int(w*0.05), y + int(h*0.80), x + int(w*0.95), y + int(h*1.02)], fill=(0, 0, 0, 70))
    shadow = shadow.filter(ImageFilter.GaussianBlur(8))
    
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
    shadow_draw.rectangle([x + 4, y + h, x + w + 4, y + h + 8], fill=(0, 0, 0, 50))
    shadow_layer = shadow_layer.filter(ImageFilter.GaussianBlur(4))
    
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

        # 1. Véhicule (dans la zone carport en bas à gauche)
        if x < width * 0.35 and y > height * 0.55 and area > 12000:
            canvas = render_car_sprite(canvas, x, y, w, h)
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

        # 3.5 2ème Table Console Basse avec Pot de Fleurs (sous la SAM à droite près du meuble TV)
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

def generate_clean_plan(bgr_img: np.ndarray, proc_result: dict, output_clean_path: str):
    width, height = proc_result["width"], proc_result["height"]
    sealed_walls = proc_result["structural_walls"]
    furniture_mask = proc_result["furniture_mask"]
    img_area = width * height

    # 1. Canvas fond gris architectural neutre pro (#DCDFE6 / 220, 223, 230)
    canvas_base = Image.new("RGBA", (width, height), (220, 223, 230, 255))
    layer1_floors = canvas_base.copy()

    cartouche_y_limit = int(height * 0.77)

    # 2. Zone Carport / Driveway (Pavés brique rouge #A84838)
    carport_mask = np.zeros((height, width), dtype=np.uint8)
    cv2.rectangle(
        carport_mask,
        (int(width * 0.04), int(height * 0.58)),
        (int(width * 0.32), cartouche_y_limit - 10),
        255,
        -1
    )
    carport_mask_pil = Image.fromarray(carport_mask)
    tex_cobble = _CATALOG.get_texture("cobblestone", width, height)
    layer1_floors.paste(tex_cobble, (0, 0), mask=carport_mask_pil)

    # 3. Zone Véranda / Entrée (Béton lissé clair #C8CECF)
    veranda_mask = np.zeros((height, width), dtype=np.uint8)
    cv2.rectangle(
        veranda_mask,
        (int(width * 0.33), int(height * 0.65)),
        (int(width * 0.62), cartouche_y_limit - 10),
        255,
        -1
    )
    veranda_mask_pil = Image.fromarray(veranda_mask)
    tex_veranda = _CATALOG.get_texture("veranda", width, height)
    layer1_floors.paste(tex_veranda, (0, 0), mask=veranda_mask_pil)

    # 4. Texturage intérieur pièce par pièce
    inv_sealed = cv2.bitwise_not(sealed_walls)
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

        # SUBTRACTION DU MOBILIER : Le parquet s'applique UNIQUEMENT sur le sol et NE RECOUVRE PAS le mobilier !
        floor_only_mask = cv2.bitwise_and(room_mask, cv2.bitwise_not(furniture_mask))
        room_mask_pil = Image.fromarray(floor_only_mask)

        is_annex = (x < width * 0.32)

        if area < 3500:
            tex_img = _CATALOG.get_texture("patterned_tile", width, height)
        elif is_annex:
            tex_img = _CATALOG.get_texture("parquet", width, height) if area > 5000 else _CATALOG.get_texture("light_tile", width, height)
        elif area > 12000:
            tex_img = _CATALOG.get_texture("parquet", width, height)
        elif valid_room_count % 2 == 1:
            tex_img = _CATALOG.get_texture("parquet", width, height)
        else:
            tex_img = _CATALOG.get_texture("light_tile", width, height)

        layer1_floors.paste(tex_img, (0, 0), mask=room_mask_pil)

    # 5. Rendu du Mobilier et du Véhicule en calque superposé
    render_furniture_layer(layer1_floors, furniture_mask, width, height)

    # 6. Ajout des plantes décoratives en pot
    add_plants_to_canvas(layer1_floors)

    # 7. Poché des murs Dark Slate (#1E293B) + Ombre 3D ambiante
    layer2_walls = apply_soft_shadow(layer1_floors, Image.fromarray(sealed_walls), opacity=130, offset=(6, 6))
    wall_pil = Image.fromarray(sealed_walls)
    layer2_walls.paste(Image.new("RGBA", (width, height), (30, 41, 59, 255)), (0, 0), mask=wall_pil)
    
    wall_outline = Image.fromarray(cv2.Canny(sealed_walls, 100, 200))
    layer2_walls.paste(Image.new("RGBA", (width, height), (15, 23, 42, 255)), (0, 0), mask=wall_outline)

    os.makedirs(os.path.dirname(os.path.abspath(output_clean_path)), exist_ok=True)
    layer2_walls.convert("RGB").save(output_clean_path, "PNG")

# ═════════════════════════════════════════════════════════════════════════════
# 5. CLI & MAIN PIPELINE EXECUTION
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
    print("🏛️ ARCHI CAM AI — ENGINE DE PRÉTRAITEMENT OPENCV V6 (NIVEAU AVANCÉ)")
    print("=" * 65)
    print(f"📁 Entrée source : {input_path}")
    print(f"🎯 Sortie de base : {output_base_path}")

    try:
        bgr_img = load_input_image(input_path)
        h, w = bgr_img.shape[:2]
        print(f"📐 Résolution rasterisée : {w} x {h} px")

        # Protection OOM : Redimensionnement si dimension > 4096px
        if max(h, w) > 4096:
            scale = 4096.0 / float(max(h, w))
            new_w, new_h = int(w * scale), int(h * scale)
            bgr_img = cv2.resize(bgr_img, (new_w, new_h), interpolation=cv2.INTER_AREA)
            print(f"📐 Image haute résolution ajustée à max 4096px : {new_w} x {new_h} px")

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

        print("🎨 Génération du plan de précision avancée (bâtiment + mobilier + véhicules)...")
        generate_clean_plan(bgr_img, proc_result, output_clean_plan)
        generate_controlnet_maps(proc_result["structural_walls"], output_canny, output_depth)

        proc_result["text_layer_rgba"].save(output_text, "PNG")

        user_plan = os.environ.get("USER_PLAN", "free")
        try:
            clean_img_rgba = Image.open(output_clean_plan).convert("RGBA")
            clean_img_watermarked = apply_plan_watermark(clean_img_rgba, user_plan)
            clean_img_watermarked.save(output_clean_plan, "PNG")
        except Exception:
            pass

        if output_base_path.lower().endswith(".png"):
            layer_clean_bgr = cv2.imread(output_clean_plan)
            if layer_clean_bgr is not None:
                cv2.imwrite(output_base_path, layer_clean_bgr)

        print("-" * 65)
        print("✨ SUCCÈS ! Les 4 fichiers de sortie ont été générés avec précision :")
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
