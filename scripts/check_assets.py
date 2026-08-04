# scripts/check_assets.py
# ═══════════════════════════════════════════════════════════════
# AUDIT LOCAL ET VÉRIFICATION DES ASSETS DU PIPELINE ARCHI CAM AI
# ═══════════════════════════════════════════════════════════════

import os
import sys
import io
from pathlib import Path

if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

_ROOT = Path(__file__).parent.parent.resolve()
_ASSETS = _ROOT / "public" / "assets"
_TEX_DIR = _ASSETS / "textures"
_FUR_DIR = _ASSETS / "furniture"

REQUIRED_TEXTURES = [
    "parquet.jpg",
    "marble_tile.jpg",
    "cobblestone.jpg",
    "concrete.jpg",
    "azulejo_tile.jpg",
]

MINIMUM_FURNITURE = [
    "bed_double.png",
    "bed_single.png",
    "dining_table_8p.png",
    "dining_table_6.png",
    "sofa_3seat.png",
    "sofa_2seat.png",
    "car_red_sedan.png",
    "plant_large.png",
    "plant_small.png",
    "bathtub.png",
    "wardrobe.png",
    "desk.png",
    "staircase.png",
    "elevator.png",
    "toilet.png",
    "sink.png",
]

def check_assets():
    print("\n" + "═" * 60)
    print("  🔍 AUDIT DES ASSETS ARCHI CAM AI")
    print("═" * 60)

    _TEX_DIR.mkdir(parents=True, exist_ok=True)
    _FUR_DIR.mkdir(parents=True, exist_ok=True)

    tex_missing = []
    for tex in REQUIRED_TEXTURES:
        p = _TEX_DIR / tex
        if p.exists() and p.stat().st_size > 300:
            print(f"  ✅ Texture OK : {tex}")
        else:
            tex_missing.append(tex)
            print(f"  ⚠️ Texture Manquante : {tex}")

    fur_missing = []
    for fur in MINIMUM_FURNITURE:
        p = _FUR_DIR / fur
        if p.exists() and p.stat().st_size > 300:
            print(f"  ✅ Sprite OK  : {fur}")
        else:
            fur_missing.append(fur)
            print(f"  ⚠️ Sprite Manquant  : {fur}")

    print("-" * 60)
    print(f"  Textures  : {len(REQUIRED_TEXTURES) - len(tex_missing)}/{len(REQUIRED_TEXTURES)} présent(e)s")
    print(f"  Mobilier  : {len(MINIMUM_FURNITURE) - len(fur_missing)}/{len(MINIMUM_FURNITURE)} présent(e)s")

    if tex_missing or fur_missing:
        print("\n  💡 Note : Les fallbacks procéduraux du moteur Python prendront le relais si un asset est manquant.")
    else:
        print("\n  🏆 TOUS LES ASSETS REQUIS SONT PRÉSENTS ET VALIDES !")

    print("═" * 60 + "\n")
    return 0

if __name__ == "__main__":
    sys.exit(check_assets())
