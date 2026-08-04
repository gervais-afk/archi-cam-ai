"""
SETUP_ASSETS.PY — Archi Cam AI Asset Catalog Generator
═══════════════════════════════════════════════════════
Génère et télécharge toute la bibliothèque d'assets dans public/assets/ :
  /textures  — Textures seamless 1K téléchargées (Parquet, Tissu, Béton)
  /blocks_2d — Proxy Blocks 2D PIL Haute Qualité (Lit, Canapé, Table, Sanitaire)
"""
import os
import sys
import io
import math

if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

from PIL import Image, ImageDraw, ImageFont, ImageFilter

# ── Résolution des chemins ────────────────────────────────────────────────────
SCRIPT_DIR   = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.join(SCRIPT_DIR, "..")
ASSETS_DIR   = os.path.join(PROJECT_ROOT, "public", "assets")
TEX_DIR      = os.path.join(ASSETS_DIR, "textures")
BLK_DIR      = os.path.join(ASSETS_DIR, "blocks_2d")

os.makedirs(TEX_DIR, exist_ok=True)
os.makedirs(BLK_DIR, exist_ok=True)

# ─────────────────────────────────────────────────────────────────────────────
# PHASE 1A — Téléchargement des textures seamless depuis PolyHaven (fallback local)
# ─────────────────────────────────────────────────────────────────────────────
TEXTURE_URLS = {
    # URLs exactes vérifiées via https://api.polyhaven.com/files/{slug}
    # Parquet : _diff_ fonctionne pour les textures wood
    "parquet.jpg":  "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/wood_cabinet_worn_long/wood_cabinet_worn_long_diff_1k.jpg",
    # Fabric : utilise _col1_ (pas _diff_) — vérifié via API files
    "fabric.jpg":   "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/book_pattern/book_pattern_col1_1k.jpg",
    # Concrete : _diff_ fonctionne pour concrete_floor_worn_001
    "concrete.jpg": "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/concrete_floor_worn_001/concrete_floor_worn_001_diff_1k.jpg",
}

def download_texture(filename: str, url: str) -> bool:
    """Télécharge une texture avec requests (timeout 10s). Retourne True si succès."""
    dest = os.path.join(TEX_DIR, filename)
    if os.path.exists(dest):
        print(f"  ✓ Texture déjà présente : {filename}")
        return True
    try:
        import requests
        print(f"  ↓ Téléchargement : {filename} …", end=" ", flush=True)
        r = requests.get(url, timeout=10, stream=True)
        r.raise_for_status()
        with open(dest, "wb") as f:
            for chunk in r.iter_content(8192):
                f.write(chunk)
        print("OK")
        return True
    except Exception as e:
        print(f"ÉCHEC ({e}) — Génération d'un fallback procédural.")
        return False

def generate_fallback_parquet(dest: str):
    """Fallback parquet procédural si téléchargement échoue."""
    w, h = 512, 512
    img = Image.new("RGB", (w, h), (220, 185, 140))
    draw = ImageDraw.Draw(img)
    ph, pw = 32, 128
    for y in range(0, h, ph):
        offset = (y // ph % 2) * (pw // 2)
        for x in range(-pw, w + pw, pw):
            px = x + offset
            shade = int(12 * math.sin(px * 0.05 + y * 0.03))
            r = min(255, max(0, 218 + shade))
            g = min(255, max(0, 183 + shade))
            b = min(255, max(0, 138 + shade))
            draw.rectangle([px, y, px + pw - 2, y + ph - 2], fill=(r, g, b))
            draw.line([px, y + ph - 1, px + pw, y + ph - 1], fill=(160, 120, 80), width=1)
    img.save(dest)

def generate_fallback_fabric(dest: str):
    """Fallback tissu procédural."""
    w, h = 512, 512
    img = Image.new("RGB", (w, h), (230, 215, 195))
    draw = ImageDraw.Draw(img)
    for y in range(0, h, 5):
        shade = int(8 * math.sin(y * 0.4))
        draw.line([0, y, w, y], fill=(225 + shade, 210 + shade, 188 + shade), width=1)
    for x in range(0, w, 5):
        shade = int(6 * math.cos(x * 0.3))
        draw.line([x, 0, x, h], fill=(235 + shade, 220 + shade, 200 + shade), width=1)
    img.save(dest)

def generate_fallback_concrete(dest: str):
    """Fallback béton procédural."""
    import numpy as np
    w, h = 512, 512
    noise = np.random.randint(180, 220, (h, w, 3), dtype=np.uint8)
    img = Image.fromarray(noise, "RGB")
    img = img.filter(ImageFilter.GaussianBlur(1.5))
    img.save(dest)

FALLBACK_GENERATORS = {
    "parquet.jpg":  generate_fallback_parquet,
    "fabric.jpg":   generate_fallback_fabric,
    "concrete.jpg": generate_fallback_concrete,
}

print("\n📦 PHASE 1 — Textures Seamless")
print("─" * 40)
for fname, url in TEXTURE_URLS.items():
    dest = os.path.join(TEX_DIR, fname)
    ok = download_texture(fname, url)
    if not ok and not os.path.exists(dest):
        FALLBACK_GENERATORS[fname](dest)
        print(f"  ✓ Fallback procédural généré : {fname}")

# ─────────────────────────────────────────────────────────────────────────────
# PHASE 1B — Génération des Proxy Blocks 2D Haute Qualité avec PIL
# ─────────────────────────────────────────────────────────────────────────────

def get_font(size=14, bold=False):
    for name in (["arialbd.ttf", "DejaVuSans-Bold.ttf"] if bold else ["arial.ttf", "DejaVuSans.ttf"]):
        try:
            return ImageFont.truetype(name, size)
        except Exception:
            continue
    return ImageFont.load_default()

def create_proxy_block(
    filename: str,
    label: str,
    w: int,
    h: int,
    fill_color: tuple,     # RGBA de fond
    border_color: tuple,   # RGB de bordure
    icon_char: str = "■",
):
    """
    Génère un Proxy Block 2D haut de gamme :
    - fond semi-transparent avec gradient
    - ombre intérieure subtile
    - bordure fine biseautée
    - label textuel centré + icône
    Sauvegardé en PNG RGBA dans /blocks_2d.
    """
    # Marge interne
    pad = 4
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # ── Ombre portée interne sous le bloc ──
    shadow_layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow_layer)
    sd.rounded_rectangle([pad + 3, pad + 4, w - pad + 2, h - pad + 2], radius=6, fill=(0, 0, 0, 70))
    shadow_layer = shadow_layer.filter(ImageFilter.GaussianBlur(5))
    img = Image.alpha_composite(img, shadow_layer)
    draw = ImageDraw.Draw(img)

    # ── Corps du bloc avec fond semi-transparent ──
    r, g, b, a = fill_color
    draw.rounded_rectangle([pad, pad, w - pad, h - pad], radius=6, fill=(r, g, b, a))

    # ── Gradient subtil (ligne lumineuse en haut) ──
    highlight = Image.new("RGBA", (w - pad * 2, 10), (255, 255, 255, 55))
    img.paste(highlight, (pad, pad + 2), highlight)
    draw = ImageDraw.Draw(img)

    # ── Bordure biseautée ──
    br, bg, bb = border_color
    draw.rounded_rectangle(
        [pad, pad, w - pad, h - pad],
        radius=6,
        outline=(br, bg, bb, 220),
        width=2,
    )
    # Reflet bord haut gauche
    draw.rounded_rectangle(
        [pad + 1, pad + 1, w - pad - 1, h // 2],
        radius=5,
        outline=(min(255, br + 40), min(255, bg + 40), min(255, bb + 40), 80),
        width=1,
    )

    # ── Icône + Label centré ──
    font_icon  = get_font(size=max(10, h // 4), bold=False)
    font_label = get_font(size=max(8, h // 6),  bold=True)

    # Mesure du texte
    bbox_icon  = draw.textbbox((0, 0), icon_char, font=font_icon)
    bbox_label = draw.textbbox((0, 0), label,     font=font_label)
    iw, ih = bbox_icon[2] - bbox_icon[0],  bbox_icon[3]  - bbox_icon[1]
    lw, lh = bbox_label[2] - bbox_label[0], bbox_label[3] - bbox_label[1]

    cx, cy = w // 2, h // 2
    draw.text((cx - iw // 2, cy - ih // 2 - lh // 2 - 4), icon_char, fill=(br, bg, bb, 230), font=font_icon)
    draw.text((cx - lw // 2, cy + ih // 2 - lh // 2 + 2), label,     fill=(40, 40, 60, 240),  font=font_label)

    dest = os.path.join(BLK_DIR, filename)
    img.save(dest, "PNG")
    return dest


BLOCKS = [
    # (filename,            label,         w,   h,  fill_rgba,                border_rgb,        icon)
    ("lit_double.png",      "LIT",         200, 140, (180, 160, 130, 190),    (110, 85, 60),     "🛏"),
    ("lit_simple.png",      "LIT S.",      140, 100, (190, 170, 140, 185),    (120, 95, 68),     "🛏"),
    ("canape.png",          "CANAPÉ",      210, 100, (140, 160, 185, 185),    (70, 95, 125),     "🛋"),
    ("table_basse.png",     "TABLE B.",    120,  80, (200, 180, 145, 180),    (130, 105, 70),    "⬛"),
    ("table_repas.png",     "TABLE R.",    160, 100, (205, 185, 150, 180),    (140, 110, 75),    "⬛"),
    ("bureau.png",          "BUREAU",      140,  80, (185, 165, 130, 185),    (115, 88, 58),     "⬜"),
    ("wc.png",              "WC",           70,  80, (235, 240, 245, 190),    (140, 160, 175),   "🚽"),
    ("lavabo.png",          "LAVABO",       80,  60, (230, 238, 244, 190),    (130, 155, 170),   "🚿"),
    ("baignoire.png",       "BAIGNOIRE",   170,  80, (225, 235, 245, 185),    (120, 145, 165),   "🛁"),
    ("douche.png",          "DOUCHE",       90,  90, (228, 238, 248, 185),    (125, 150, 170),   "🚿"),
]

print("\n🧱 PHASE 2 — Proxy Blocks 2D")
print("─" * 40)
for params in BLOCKS:
    dest = create_proxy_block(*params)
    print(f"  ✓ {params[0]:30s} ({params[2]}×{params[3]}px)")

print(f"\n✨ Asset Catalog complet : {ASSETS_DIR}")
print(f"   Textures : {len(os.listdir(TEX_DIR))} fichiers")
print(f"   Blocks   : {len(os.listdir(BLK_DIR))} fichiers")
