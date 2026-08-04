# scripts/render_from_lm_json.py
# ═══════════════════════════════════════════════════════════════
# MOTEUR DE RENDU GRAPHIQUE HD
# Entrée  : JSON LM Studio + image raster du plan
# Sortie  : plan_rendered_XXXX.png photoréaliste
# ═══════════════════════════════════════════════════════════════

import os
import sys
import io
import json
import math
import cv2
import numpy as np
from pathlib import Path
from PIL import Image, ImageEnhance, ImageFilter, ImageDraw, ImageFont

if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(
        sys.stdout.buffer, encoding="utf-8", errors="replace"
    )
    sys.stderr = io.TextIOWrapper(
        sys.stderr.buffer, encoding="utf-8", errors="replace"
    )

# ─── Chemins ──────────────────────────────────────────────────
_ROOT      = Path(__file__).parent.parent.resolve()
_ASSETS    = _ROOT / "public" / "assets"
_TEX_DIR   = _ASSETS / "textures"
_FUR_DIR   = _ASSETS / "furniture"
_PUBLIC    = _ROOT / "public"

# Import du prompt et asset mapping
sys.path.append(str(_ROOT / "lib" / "prompts"))
try:
    from lm_studio_vision_prompt import FURNITURE_ASSET_MAP, TEXTURE_ASSET_MAP
except ImportError:
    FURNITURE_ASSET_MAP = {
        "bed_double": "bed_double.png", "bed_single": "bed_single.png",
        "sofa_3seat": "sofa_3seat.png", "sofa_2seat": "sofa_2seat.png",
        "dining_table_6": "dining_table_6.png", "dining_table_8": "dining_table_8p.png",
        "car_sedan": "car_red_sedan.png", "car_suv": "car_red_sedan.png"
    }
    TEXTURE_ASSET_MAP = {
        "parquet": "parquet.jpg", "marble_tile": "marble_tile.jpg",
        "cobblestone": "cobblestone.jpg", "concrete": "concrete.jpg",
        "azulejo_tile": "azulejo_tile.jpg", "garden": None
    }

# ─── Cache global ─────────────────────────────────────────────
_TEX_CACHE = {}
_SPR_CACHE = {}


# ═══════════════════════════════════════════════════════════════
# 1. CHARGEMENT ET CACHE DES ASSETS
# ═══════════════════════════════════════════════════════════════

def load_texture(
    filename: str,
    dest_w: int,
    dest_h: int,
    scale: float = 0.30,
    brightness: float = 1.1
) -> Image.Image:
    """
    Charge et pavillonne une texture JPG.
    Fallback procédural si fichier absent.
    """
    cache_key = f"{filename}_{dest_w}_{dest_h}"
    if cache_key in _TEX_CACHE:
        return _TEX_CACHE[cache_key]

    path = _TEX_DIR / filename

    if path.exists():
        try:
            src = Image.open(path).convert("RGBA")
            src = ImageEnhance.Brightness(src).enhance(brightness)
            tw = max(64, int(src.width  * scale))
            th = max(64, int(src.height * scale))
            tile = src.resize((tw, th), Image.LANCZOS)

            canvas = Image.new("RGBA", (dest_w, dest_h))
            for y in range(0, dest_h, th):
                for x in range(0, dest_w, tw):
                    canvas.paste(tile, (x, y))

            _TEX_CACHE[cache_key] = canvas
            return canvas
        except Exception as e:
            print(f"[Texture] ⚠️ Erreur {filename}: {e}", file=sys.stderr)

    # Fallback procédural
    fallback = _procedural_texture(filename, dest_w, dest_h)
    _TEX_CACHE[cache_key] = fallback
    return fallback


def _procedural_texture(name: str, w: int, h: int) -> Image.Image:
    """Textures procédurales si fichier absent."""
    colors = {
        "parquet.jpg"      : (184, 119,  57, 255),
        "marble_tile.jpg"  : (241, 245, 249, 255),
        "cobblestone.jpg"  : (168,  72,  56, 255),
        "concrete.jpg"     : (200, 206, 207, 255),
        "azulejo_tile.jpg" : (208, 215, 222, 255),
    }
    color = colors.get(name, (220, 220, 220, 255))
    arr = np.full((h, w, 4), color, dtype=np.uint8)

    # Grille de joints
    if "parquet" in name:
        for y in range(0, h, 48):
            arr[y:y+1, :, :3] = (
                np.array(color[:3]) * 0.82
            ).astype(np.uint8)
        for x in range(0, w, 180):
            arr[:, x:x+1, :3] = (
                np.array(color[:3]) * 0.85
            ).astype(np.uint8)
    elif "tile" in name or "azulejo" in name or "marble" in name:
        step = 60 if "marble" in name else 36
        for y in range(0, h, step):
            arr[y:y+1, :, :3] = 200
        for x in range(0, w, step):
            arr[:, x:x+1, :3] = 200
    elif "cobblestone" in name:
        for y in range(0, h, 28):
            arr[y:y+1, :, :3] = 120
        for x in range(0, w, 56):
            arr[:, x:x+1, :3] = 120

    return Image.fromarray(arr, "RGBA")


def load_sprite(filename: str) -> Image.Image | None:
    """Charge un sprite PNG avec cache."""
    if filename in _SPR_CACHE:
        return _SPR_CACHE[filename]

    path = _FUR_DIR / filename
    if not path.exists():
        print(f"[Sprite] ⚠️ Manquant: {filename}", file=sys.stderr)
        _SPR_CACHE[filename] = None
        return None

    try:
        sprite = Image.open(path).convert("RGBA")
        _SPR_CACHE[filename] = sprite
        return sprite
    except Exception as e:
        print(f"[Sprite] ❌ Erreur {filename}: {e}", file=sys.stderr)
        _SPR_CACHE[filename] = None
        return None


# ═══════════════════════════════════════════════════════════════
# 2. RENDU DES TEXTURES SOL PAR PIÈCE
# ═══════════════════════════════════════════════════════════════

def render_room_textures(
    canvas: Image.Image,
    rooms: list,
    wall_mask: np.ndarray,
    img_w: int,
    img_h: int
) -> Image.Image:
    """
    Applique la texture sol correcte dans chaque pièce.
    Utilise le masque de murs pour ne texturer que l'intérieur.
    """
    print(f"[Render] 🎨 Texturage de {len(rooms)} pièces...")

    for room in rooms:
        texture_type = room.get("texture", "parquet")
        texture_file = TEXTURE_ASSET_MAP.get(texture_type, f"{texture_type}.jpg")
        bbox = room.get("bbox", {})

        x = int(bbox.get("x", 0))
        y = int(bbox.get("y", 0))
        w = int(bbox.get("w", 50))
        h = int(bbox.get("h", 50))

        # Jardin → couleur procédurale verte
        if texture_file is None or texture_type == "garden":
            garden_layer = Image.new("RGBA", (img_w, img_h), (229, 239, 226, 255))
            room_mask = Image.new("L", (img_w, img_h), 0)
            ImageDraw.Draw(room_mask).rectangle([x, y, x+w, y+h], fill=255)
            canvas.paste(garden_layer, (0, 0), mask=room_mask)
            continue

        # Chargement texture
        tex = load_texture(texture_file, img_w, img_h)

        # Masque de la pièce (bbox)
        room_mask = Image.new("L", (img_w, img_h), 0)
        ImageDraw.Draw(room_mask).rectangle([x, y, x+w, y+h], fill=255)

        # Exclure les murs du masque
        wall_pil = Image.fromarray(wall_mask).convert("L")
        wall_inv = wall_pil.point(lambda p: 0 if p > 128 else 255)

        combined_arr = np.minimum(np.array(room_mask), np.array(wall_inv))
        combined_mask = Image.fromarray(combined_arr)

        canvas.paste(tex, (0, 0), mask=combined_mask)
        print(f"  ✅ {room.get('name', '?')} → {texture_type} ({texture_file})")

    return canvas


# ═══════════════════════════════════════════════════════════════
# 3. PLACEMENT DES SPRITES MOBILIER
# ═══════════════════════════════════════════════════════════════

def compute_rotation(item: dict) -> float:
    """
    Calcule la rotation du sprite selon wall_snap et aspect ratio.
    """
    wall_snap    = item.get("wall_snap", "none")
    rotation_deg = item.get("rotation_deg", 0)
    bbox         = item.get("bbox", {})
    w = bbox.get("w", 1)
    h = bbox.get("h", 1)

    # Priorité : rotation explicite du JSON
    if rotation_deg != 0:
        return float(rotation_deg)

    # Calcul depuis wall_snap
    snap_angles = {
        "top"   : 0.0,
        "right" : 90.0,
        "bottom": 180.0,
        "left"  : 270.0,
        "center": 0.0,
        "none"  : 0.0,
    }

    angle = snap_angles.get(wall_snap, 0.0)

    # Ajustement aspect ratio
    if w > h * 1.3 and angle in (0.0, 180.0):
        angle += 90.0

    return angle % 360.0


def add_drop_shadow(
    sprite: Image.Image,
    offset: tuple = (4, 6),
    opacity: int = 75,
    blur: int = 6
) -> Image.Image:
    """Ajoute une ombre portée réaliste sous le sprite."""
    sw, sh = sprite.size
    cw = sw + abs(offset[0]) + blur * 2
    ch = sh + abs(offset[1]) + blur * 2

    canvas = Image.new("RGBA", (cw, ch), (0, 0, 0, 0))

    # Ombre
    alpha   = sprite.getchannel("A")
    shadow  = Image.new("RGBA", (sw, sh), (0, 0, 0, opacity))
    shadow.putalpha(alpha.point(lambda p: int(p * opacity / 255)))
    shadow  = shadow.filter(ImageFilter.GaussianBlur(blur))

    sx = blur + max(0, offset[0])
    sy = blur + max(0, offset[1])
    canvas.paste(shadow, (sx, sy), shadow)

    # Sprite principal
    px = blur + max(0, -offset[0])
    py = blur + max(0, -offset[1])
    canvas.paste(sprite, (px, py), sprite)

    return canvas


def render_furniture(
    canvas: Image.Image,
    furniture_list: list,
    asset_map: dict,
    img_w: int,
    img_h: int
) -> Image.Image:
    """
    Place tous les sprites mobilier sur le canvas.
    Gère rotation, redimensionnement et ombres.
    """
    print(f"\n[Render] 🪑 Placement de {len(furniture_list)} meubles...")

    placed   = 0
    fallback = 0

    for item in furniture_list:
        ftype = item.get("type", "")
        bbox  = item.get("bbox", {})

        x = int(bbox.get("x", 0))
        y = int(bbox.get("y", 0))
        w = int(bbox.get("w", 40))
        h = int(bbox.get("h", 40))

        if w < 5 or h < 5:
            continue

        sprite_file = asset_map.get(ftype)
        sprite = load_sprite(sprite_file) if sprite_file else None

        if sprite:
            # Redimensionnement proportionnel
            scale   = min(w / sprite.width, h / sprite.height) * 0.90
            new_w   = max(8, int(sprite.width  * scale))
            new_h   = max(8, int(sprite.height * scale))
            resized = sprite.resize((new_w, new_h), Image.LANCZOS)

            # Rotation wall-snap
            angle = compute_rotation(item)
            if angle != 0.0:
                resized = resized.rotate(
                    -angle, expand=True, resample=Image.BICUBIC
                )

            # Ombre portée
            resized = add_drop_shadow(
                resized, offset=(3, 5), opacity=70, blur=5
            )

            # Centrage dans la bbox
            cx = x + w // 2 - resized.width  // 2
            cy = y + h // 2 - resized.height // 2

            cx = max(0, min(cx, img_w - resized.width))
            cy = max(0, min(cy, img_h - resized.height))

            canvas.paste(resized, (cx, cy), resized)
            placed += 1
            print(f"  ✅ {ftype} @ ({x},{y}) rot={angle}°")

        else:
            _render_fallback_furniture(canvas, ftype, x, y, w, h)
            fallback += 1
            print(f"  ⚠️  {ftype} → fallback couleur (sprite manquant)")

    print(f"\n[Render] Mobilier : {placed} sprites | {fallback} fallbacks")
    return canvas


def _render_fallback_furniture(
    canvas: Image.Image,
    ftype: str,
    x: int, y: int, w: int, h: int
):
    """Rendu fallback couleur plate si sprite absent."""
    colors = {
        "bed_double"     : (248, 250, 252, 220),
        "bed_single"     : (248, 250, 252, 220),
        "sofa_3seat"     : (100, 116, 139, 220),
        "sofa_2seat"     : (100, 116, 139, 220),
        "armchair"       : (211,  47,  47, 220),
        "dining_table_6" : (122,  67,  29, 220),
        "dining_table_8" : (122,  67,  29, 220),
        "coffee_table"   : (180, 140,  80, 220),
        "kitchen_counter": ( 64,  64,  64, 220),
        "toilet"         : (255, 255, 255, 220),
        "sink"           : (255, 255, 255, 220),
        "shower"         : (200, 230, 255, 180),
        "car_sedan"      : (211,  47,  47, 255),
        "car_suv"        : (211,  47,  47, 255),
        "plant_large"    : ( 45, 106,  79, 220),
        "plant_small"    : ( 45, 106,  79, 200),
        "staircase"      : (160, 140, 120, 220),
    }
    color = colors.get(ftype, (200, 200, 200, 180))

    draw = ImageDraw.Draw(canvas, "RGBA")
    draw.rectangle([x, y, x+w, y+h], fill=color, outline=(50, 50, 50, 200))


# ═══════════════════════════════════════════════════════════════
# 4. RENDU DES MURS ET OMBRES
# ═══════════════════════════════════════════════════════════════

def render_walls(
    canvas: Image.Image,
    wall_mask: np.ndarray
) -> Image.Image:
    """Murs anthracite avec ombre portée AO."""
    img_w, img_h = canvas.size

    # Ombre sous les murs
    shadow_layer = Image.new("RGBA", (img_w, img_h), (0, 0, 0, 0))
    wall_pil     = Image.fromarray(wall_mask).convert("L")
    shadow_rgba  = Image.new("RGBA", (img_w, img_h), (0, 0, 0, 110))
    shadow_rgba.putalpha(wall_pil)
    shadow_blur  = shadow_rgba.filter(ImageFilter.GaussianBlur(8))
    shadow_full  = Image.new("RGBA", (img_w, img_h), (0, 0, 0, 0))
    shadow_full.paste(shadow_blur, (6, 6))
    canvas       = Image.alpha_composite(canvas, shadow_full)

    # Murs anthracite
    wall_fill = Image.new("RGBA", (img_w, img_h), (30, 41, 59, 255))
    canvas.paste(wall_fill, (0, 0), mask=wall_pil)

    # Contour fin des murs
    edges      = cv2.Canny(wall_mask, 100, 200)
    edge_layer = Image.new("RGBA", (img_w, img_h), (15, 23, 42, 255))
    canvas.paste(edge_layer, (0, 0), mask=Image.fromarray(edges))

    return canvas


# ═══════════════════════════════════════════════════════════════
# 5. WATERMARK ET CARTOUCHE
# ═══════════════════════════════════════════════════════════════

def add_watermark(
    canvas: Image.Image,
    plan_info: dict
) -> Image.Image:
    """Filigrane professionnel Archi Cam AI."""
    draw  = ImageDraw.Draw(canvas, "RGBA")
    w, h  = canvas.size

    # Bande cartouche en bas
    draw.rectangle(
        [0, h - 60, w, h],
        fill=(245, 247, 250, 245)
    )
    draw.line([0, h - 60, w, h - 60], fill=(30, 41, 59, 200), width=2)

    # Titre du plan
    title = plan_info.get("title", "PROPOSITION AMÉNAGEMENT — R.D.C.")
    draw.text(
        (20, h - 42),
        title,
        fill=(30, 41, 59, 255),
    )

    # Logo Archi Cam AI
    draw.text(
        (w - 180, h - 42),
        "ARCHI CAM AI ®",
        fill=(59, 130, 246, 220),
    )

    # Filigrane diagonal discret
    wm_layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    wm_draw  = ImageDraw.Draw(wm_layer)
    wm_draw.text(
        (w // 2 - 120, h // 2 - 20),
        "ARCHI CAM AI",
        fill=(100, 100, 100, 18),
    )
    wm_rotated = wm_layer.rotate(35, expand=False)
    canvas     = Image.alpha_composite(canvas, wm_rotated)

    return canvas


# ═══════════════════════════════════════════════════════════════
# 6. PIPELINE PRINCIPAL
# ═══════════════════════════════════════════════════════════════

def render_from_lm_json(
    lm_json: dict,
    wall_mask_path: str,
    output_path: str
) -> str:
    """
    Pipeline complet de rendu depuis le JSON LM Studio.
    """
    print("\n" + "═" * 65)
    print("  🏛️ ARCHI CAM AI — MOTEUR GRAPHIQUE HD v2")
    print("═" * 65)

    plan_info  = lm_json.get("plan_info",  {})
    rooms      = lm_json.get("rooms",      [])
    furniture  = lm_json.get("furniture",  [])
    carport    = lm_json.get("carport",    {})

    img_w = int(plan_info.get("image_width_px",  1786))
    img_h = int(plan_info.get("image_height_px", 2526))

    print(f"  📐 Résolution : {img_w} × {img_h} px")
    print(f"  🏠 Pièces     : {len(rooms)}")
    print(f"  🪑 Meubles    : {len(furniture)}")

    # Chargement masque murs
    if os.path.exists(wall_mask_path):
        wall_bgr = cv2.imread(wall_mask_path, cv2.IMREAD_GRAYSCALE)
    else:
        wall_bgr = np.zeros((img_h, img_w), dtype=np.uint8)

    wall_mask = wall_bgr

    # Canvas arrière-plan
    canvas = Image.new("RGBA", (img_w, img_h), (229, 239, 226, 255))
    print("\n[Render] 🌿 Fond paysager architectural...")

    # 1. Textures sol
    canvas = render_room_textures(canvas, rooms, wall_mask, img_w, img_h)

    # 2. Zone carport
    if carport.get("present"):
        cb = carport.get("bbox", {})
        if all(k in cb for k in ("x", "y", "w", "h")):
            cob_tex = load_texture("cobblestone.jpg", img_w, img_h)
            cp_mask = Image.new("L", (img_w, img_h), 0)
            ImageDraw.Draw(cp_mask).rectangle([
                cb["x"], cb["y"],
                cb["x"] + cb["w"],
                cb["y"] + cb["h"]
            ], fill=255)
            canvas.paste(cob_tex, (0, 0), mask=cp_mask)
            print("[Render] 🧱 Zone carport texturée (cobblestone)")

            if carport.get("vehicle_type") not in (None, "none"):
                furniture.append({
                    "id"        : "carport_vehicle",
                    "type"      : carport.get("vehicle_type", "car_sedan"),
                    "room_id"   : "carport",
                    "bbox"      : cb,
                    "rotation_deg": 0,
                    "wall_snap" : "bottom",
                    "confidence": 1.0,
                })

    # 3. Mobilier
    canvas = render_furniture(canvas, furniture, FURNITURE_ASSET_MAP, img_w, img_h)

    # 4. Murs
    canvas = render_walls(canvas, wall_mask)
    print("\n[Render] 🏗️ Murs anthracite + ombres AO")

    # 5. Watermark
    canvas = add_watermark(canvas, plan_info)
    print("[Render] 🔏 Watermark + cartouche")

    # 6. Export final
    out = Path(output_path)
    out.parent.mkdir(parents=True, exist_ok=True)
    canvas.convert("RGB").save(str(out), "PNG", optimize=True)

    size_kb = out.stat().st_size // 1024
    print(f"\n✨ Image finale : {out.name} ({size_kb} Ko)")
    print("═" * 65 + "\n")

    return str(out)


# ─── CLI ──────────────────────────────────────────────────────
if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Usage: python render_from_lm_json.py <lm_output.json> <wall_mask.png> <output.png>")
        sys.exit(1)

    json_path = sys.argv[1]
    mask_path = sys.argv[2]
    out_path  = sys.argv[3]

    with open(json_path, "r", encoding="utf-8") as f:
        lm_data = json.load(f)

    render_from_lm_json(lm_data, mask_path, out_path)
