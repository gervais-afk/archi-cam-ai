#!/usr/bin/env python3
"""
svg_to_png.py — ARCHI CAM AI
─────────────────────────────
Convertit un fichier SVG en PNG haute définition (2× la résolution native).
Moteur principal : cairosvg
Fallback        : Inkscape CLI (si disponible)

Usage :
    python svg_to_png.py <input.svg> <output.png> [--scale 2]
"""

import sys
import os
import subprocess
import argparse


def convert_with_cairosvg(svg_path: str, png_path: str, scale: float = 2.0) -> bool:
    """Conversion via cairosvg (disponible dans .venv)."""
    try:
        import cairosvg  # type: ignore
        cairosvg.svg2png(
            url=svg_path,
            write_to=png_path,
            scale=scale,
            background_color="#F0EDE8",  # Fond architecte par défaut
        )
        print(f"[svg_to_png] ✅ cairosvg → {png_path}")
        return True
    except ImportError:
        print("[svg_to_png] ⚠️  cairosvg non disponible, tentative fallback...")
        return False
    except Exception as e:
        print(f"[svg_to_png] ❌ cairosvg erreur : {e}")
        return False


def convert_with_inkscape(svg_path: str, png_path: str, dpi: int = 192) -> bool:
    """Fallback Inkscape CLI (si installé)."""
    try:
        result = subprocess.run(
            ["inkscape", svg_path, f"--export-filename={png_path}", f"--export-dpi={dpi}"],
            capture_output=True, timeout=30
        )
        if result.returncode == 0 and os.path.exists(png_path):
            print(f"[svg_to_png] ✅ Inkscape → {png_path}")
            return True
    except (FileNotFoundError, subprocess.TimeoutExpired):
        pass
    print("[svg_to_png] ⚠️  Inkscape non disponible.")
    return False


def convert_with_resvg(svg_path: str, png_path: str, width: int = 2380) -> bool:
    """Fallback resvg CLI (binaire portable)."""
    resvg_paths = [
        "resvg",
        os.path.join(os.getcwd(), "bin", "resvg.exe"),
        os.path.join(os.getcwd(), "bin", "resvg"),
    ]
    for resvg in resvg_paths:
        try:
            result = subprocess.run(
                [resvg, svg_path, png_path, "--width", str(width)],
                capture_output=True, timeout=30
            )
            if result.returncode == 0 and os.path.exists(png_path):
                print(f"[svg_to_png] ✅ resvg → {png_path}")
                return True
        except (FileNotFoundError, subprocess.TimeoutExpired):
            continue
    print("[svg_to_png] ⚠️  resvg non disponible.")
    return False


def convert_with_pillow_svglib(svg_path: str, png_path: str) -> bool:
    """Dernier fallback via svglib + Pillow (qualité réduite)."""
    try:
        from svglib.svglib import svg2rlg  # type: ignore
        from reportlab.graphics import renderPM  # type: ignore
        drawing = svg2rlg(svg_path)
        if drawing:
            renderPM.drawToFile(drawing, png_path, fmt="PNG")
            print(f"[svg_to_png] ✅ svglib+Pillow → {png_path}")
            return True
    except ImportError:
        pass
    except Exception as e:
        print(f"[svg_to_png] ❌ svglib erreur : {e}")
    return False


def main():
    parser = argparse.ArgumentParser(description="SVG → PNG HD converter pour Archi Cam AI")
    parser.add_argument("input_svg",  help="Chemin du fichier SVG source")
    parser.add_argument("output_png", help="Chemin du fichier PNG de sortie")
    parser.add_argument("--scale",    type=float, default=2.0, help="Facteur d'échelle (défaut : 2.0)")
    parser.add_argument("--dpi",      type=int,   default=192, help="DPI pour Inkscape (défaut : 192)")
    args = parser.parse_args()

    if not os.path.exists(args.input_svg):
        print(f"[svg_to_png] ❌ Fichier SVG introuvable : {args.input_svg}")
        sys.exit(1)

    print(f"[svg_to_png] 🔄 Conversion : {args.input_svg} → {args.output_png} (scale={args.scale})")

    # Chaîne de tentatives dans l'ordre de qualité
    if convert_with_cairosvg(args.input_svg, args.output_png, args.scale):
        sys.exit(0)
    if convert_with_inkscape(args.input_svg, args.output_png, args.dpi):
        sys.exit(0)
    if convert_with_resvg(args.input_svg, args.output_png):
        sys.exit(0)
    if convert_with_pillow_svglib(args.input_svg, args.output_png):
        sys.exit(0)

    print("[svg_to_png] ❌ Tous les moteurs de conversion ont échoué.")
    sys.exit(1)


if __name__ == "__main__":
    main()
