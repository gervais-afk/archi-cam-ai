"""
AUTO ANNOTATOR — ARCHI CAM AI
═══════════════════════════════════════════════════════════════════════════════
Générateur d'Annotations Architecturales Professionnelles v1.0

Intervient APRÈS Fal.ai (image texturée) et AVANT Sharp (watermark final).
Ajoute sur l'image :
  1. Cotations extérieures (lignes de cote avec tirets aux extrémités)
  2. Surfaces des pièces (issues du VIM TopologyBuilder)
  3. Cartouche professionnel bas de page (style grand cabinet)

Polices : Arial Narrow (Windows) → Calibri → Arial → PIL par défaut
"""

import os
import io
import sys
import math
import json
import requests
import tempfile
from pathlib import Path
from typing import Optional, List, Dict, Any, Tuple

try:
    from PIL import Image, ImageDraw, ImageFont
    import numpy as np
except ImportError:
    print("[AutoAnnotator] ERREUR: pip install Pillow numpy")
    sys.exit(1)

# ─── Résolution des polices (Windows-first) ──────────────────────────────────
WINDOWS_FONTS = "C:/Windows/Fonts"

def _load_font(size: int, bold: bool = False, narrow: bool = False) -> ImageFont.FreeTypeFont:
    """Charge la meilleure police disponible avec le fallback approprié."""
    candidates = []
    if narrow:
        candidates += [
            f"{WINDOWS_FONTS}/ARIALN{'B' if bold else ''}.TTF",
            f"{WINDOWS_FONTS}/calibri{'b' if bold else ''}.ttf",
        ]
    if bold:
        candidates += [
            f"{WINDOWS_FONTS}/arialbd.ttf",
            f"{WINDOWS_FONTS}/calibrib.ttf",
            f"{WINDOWS_FONTS}/segoeuib.ttf",
        ]
    candidates += [
        f"{WINDOWS_FONTS}/arial.ttf",
        f"{WINDOWS_FONTS}/calibri.ttf",
        f"{WINDOWS_FONTS}/segoeui.ttf",
    ]
    for path in candidates:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except Exception:
                continue
    # Fallback absolu (PIL bitmap)
    return ImageFont.load_default()


# ─── Classe principale ────────────────────────────────────────────────────────
class ProfessionalAnnotator:
    """
    Annotateur post-rendu pour plans architecturaux.
    Conçu pour s'intégrer dans le pipeline :
      Fal.ai → ProfessionalAnnotator → Sharp (watermark) → Client
    """

    COLOR_INK       = (30,  30,  30)   # Trait architectural quasi-noir
    COLOR_SURFACE   = (20, 100,  20)   # Vert forêt pour les surfaces (lisible sur fond clair)
    COLOR_CARTOUCHE = (10,  10,  10)   # Noir cartouche
    COLOR_BG_LABEL  = (255, 255, 255, 200)  # Fond blanc semi-transparent pour labels
    COLOR_BG_CART   = (245, 240, 228)  # Parchemin pour cartouche
    TICK_SIZE       = 10               # Longueur des tirets de cotation (px)

    def __init__(self, dpi: int = 150):
        self.dpi = dpi
        # Polices calibrées pour une image 1024px (HD = 2048px)
        self.font_title  = _load_font(36, bold=True,  narrow=False)
        self.font_room   = _load_font(22, bold=True,  narrow=True)
        self.font_area   = _load_font(18, bold=False, narrow=True)
        self.font_cote   = _load_font(16, bold=False, narrow=True)
        self.font_caption= _load_font(13, bold=False, narrow=False)

    # ── API publique ──────────────────────────────────────────────────────────

    def annotate_from_url(
        self,
        image_url: str,
        vim_rooms: List[Dict],
        project_name: str = "RÉSIDENCE",
        total_area_m2: float = 0.0,
        scale: str = "Éch. 1:100",
        output_path: Optional[str] = None,
    ) -> str:
        """
        Télécharge l'image Fal.ai depuis son URL et l'annote.
        Retourne le chemin vers l'image annotée.
        """
        resp = requests.get(image_url, timeout=30)
        resp.raise_for_status()
        img = Image.open(io.BytesIO(resp.content)).convert("RGBA")
        return self._annotate(img, vim_rooms, project_name, total_area_m2, scale, output_path)

    def annotate_from_path(
        self,
        image_path: str,
        vim_rooms: List[Dict],
        project_name: str = "RÉSIDENCE",
        total_area_m2: float = 0.0,
        scale: str = "Éch. 1:100",
        output_path: Optional[str] = None,
    ) -> str:
        """Charge l'image depuis un chemin local et l'annote."""
        img = Image.open(image_path).convert("RGBA")
        return self._annotate(img, vim_rooms, project_name, total_area_m2, scale, output_path)

    # ── Moteur d'annotation ───────────────────────────────────────────────────

    def _annotate(
        self,
        img: Image.Image,
        vim_rooms: List[Dict],
        project_name: str,
        total_area_m2: float,
        scale: str,
        output_path: Optional[str],
    ) -> str:
        W, H = img.size
        draw = ImageDraw.Draw(img, "RGBA")

        # Facteur d'échelle pour adapter tailles de texte à la résolution réelle
        scale_f = W / 1024.0

        # ── 1. Cotations extérieures ─────────────────────────────────────────
        margin = int(50 * scale_f)
        self._draw_cotation(draw, margin, margin, W - margin, margin,
                             f"{W // 100:.1f}m", scale_f, horizontal=True, above=True)
        self._draw_cotation(draw, margin, margin, margin, H - margin,
                             f"{H // 100:.1f}m", scale_f, horizontal=False, left=True)

        # ── 2. Labels de pièces (depuis VIM TopologyBuilder) ─────────────────
        room_total = total_area_m2
        for room in vim_rooms:
            label   = room.get("label", "").upper()
            area    = room.get("area_m2", 0)
            centroid= room.get("centroid", {})
            room_total = room_total or 0

            if not centroid:
                continue

            # Conversion coordonnées métier → pixels
            # On suppose que les coordonnées VIM sont normalisées 0→1
            # ou en mètres avec une emprise connue.
            # Pour la robustesse, on les traite comme des ratios si < 2, sinon en px bruts.
            cx_raw = centroid.get("x", 0.5)
            cy_raw = centroid.get("y", 0.5)

            if cx_raw <= 1.0 and cy_raw <= 1.0:
                # Coordonnées normalisées [0,1]
                cx = int(cx_raw * W)
                cy = int(cy_raw * H)
            else:
                # Coordonnées en mètres — mise à l'échelle approximative
                cx = int((cx_raw / 20.0) * W)   # Supposons emprise max 20m
                cy = int((cy_raw / 15.0) * H)   # Supposons emprise max 15m

            cx = max(margin + 5, min(cx, W - margin - 5))
            cy = max(margin + 5, min(cy, H - margin - 5))

            line1 = label[:18]           # Nom de pièce (tronqué si trop long)
            line2 = f"{area:.2f} m²"

            self._draw_room_label(draw, cx, cy, line1, line2, scale_f)

        # ── 3. Cartouche professionnel (bas de page) ──────────────────────────
        cartouche_h = int(100 * scale_f)
        self._draw_cartouche(draw, W, H, cartouche_h, project_name,
                              total_area_m2 or room_total, scale, scale_f)

        # ── Sauvegarde ────────────────────────────────────────────────────────
        if not output_path:
            tmp = tempfile.mktemp(suffix="_annotated.png")
            output_path = tmp

        final = img.convert("RGB")
        final.save(output_path, format="PNG", optimize=True, dpi=(self.dpi, self.dpi))
        print(f"[AutoAnnotator] ✅ Plan annoté sauvegardé → {output_path}")
        return output_path

    # ── Primitives graphiques ─────────────────────────────────────────────────

    def _draw_cotation(
        self, draw, x1, y1, x2, y2, text, scale_f,
        horizontal=True, above=False, left=False
    ):
        """Ligne de cotation architecturale avec tirets aux extrémités."""
        offset = int(25 * scale_f)
        if horizontal:
            ly = y1 - offset if above else y1 + offset
            draw.line([(x1, ly), (x2, ly)], fill=self.COLOR_INK, width=max(1, int(1.5 * scale_f)))
            draw.line([(x1, ly - self.TICK_SIZE), (x1, ly + self.TICK_SIZE)], fill=self.COLOR_INK, width=max(1, int(1.5 * scale_f)))
            draw.line([(x2, ly - self.TICK_SIZE), (x2, ly + self.TICK_SIZE)], fill=self.COLOR_INK, width=max(1, int(1.5 * scale_f)))
            mx = (x1 + x2) // 2
            self._draw_text_with_bg(draw, (mx, ly - int(14 * scale_f)), text, self.font_cote, anchor="mm")
        else:
            lx = x1 - offset if left else x1 + offset
            draw.line([(lx, y1), (lx, y2)], fill=self.COLOR_INK, width=max(1, int(1.5 * scale_f)))
            draw.line([(lx - self.TICK_SIZE, y1), (lx + self.TICK_SIZE, y1)], fill=self.COLOR_INK, width=max(1, int(1.5 * scale_f)))
            draw.line([(lx - self.TICK_SIZE, y2), (lx + self.TICK_SIZE, y2)], fill=self.COLOR_INK, width=max(1, int(1.5 * scale_f)))
            my = (y1 + y2) // 2
            self._draw_text_with_bg(draw, (lx - int(14 * scale_f), my), text, self.font_cote, anchor="mm")

    def _draw_room_label(self, draw, cx, cy, line1, line2, scale_f):
        """Étiquette de pièce avec fond semi-transparent et texte bicolore."""
        pad = int(8 * scale_f)
        # Mesurer l'espace total nécessaire
        try:
            bb1 = draw.textbbox((0, 0), line1, font=self.font_room)
            bb2 = draw.textbbox((0, 0), line2, font=self.font_area)
            w1, h1 = bb1[2] - bb1[0], bb1[3] - bb1[1]
            w2, h2 = bb2[2] - bb2[0], bb2[3] - bb2[1]
        except Exception:
            w1, h1, w2, h2 = 80, 20, 60, 16

        total_w = max(w1, w2) + 2 * pad
        total_h = h1 + h2 + 3 * pad
        rx1 = cx - total_w // 2
        ry1 = cy - total_h // 2
        rx2 = cx + total_w // 2
        ry2 = cy + total_h // 2

        # Fond blanc semi-transparent
        draw.rounded_rectangle([rx1, ry1, rx2, ry2], radius=4,
                                fill=(255, 255, 255, 190), outline=(200, 200, 200, 150))
        # Ligne 1 : Nom de pièce (gras, noir)
        draw.text((cx, ry1 + pad + h1 // 2), line1, fill=self.COLOR_INK,
                  font=self.font_room, anchor="mm")
        # Ligne 2 : Surface (vert, italique)
        draw.text((cx, ry2 - pad - h2 // 2), line2, fill=self.COLOR_SURFACE,
                  font=self.font_area, anchor="mm")

    def _draw_cartouche(self, draw, W, H, cart_h, project_name, total_area, scale, scale_f):
        """Cartouche professionnel sur fond parchemin en bas de l'image."""
        cx = W // 2
        y_top = H - cart_h
        y_bot = H - int(8 * scale_f)
        half_w = int(320 * scale_f)

        # Fond parchemin
        draw.rectangle([cx - half_w, y_top, cx + half_w, y_bot],
                        fill=(*self.COLOR_BG_CART, 230), outline=self.COLOR_INK)
        # Ligne de titre
        draw.line([cx - half_w, y_top + int(38 * scale_f), cx + half_w, y_top + int(38 * scale_f)],
                   fill=self.COLOR_INK, width=max(1, int(1.5 * scale_f)))

        title_text = f"PROJET DE CONSTRUCTION — {project_name.upper()}"
        draw.text((cx, y_top + int(18 * scale_f)), title_text,
                  fill=self.COLOR_CARTOUCHE, font=self.font_title, anchor="mm")

        sub_text = f"Maître d'œuvre : ARCHI CAM AI  |  Surface totale : {total_area:.2f} m²  |  {scale}"
        draw.text((cx, y_top + int(58 * scale_f)), sub_text,
                  fill=(60, 60, 60), font=self.font_caption, anchor="mm")

        legal_text = "Document généré par IA — À valider par un architecte agréé ONAC Cameroun"
        draw.text((cx, y_top + int(80 * scale_f)), legal_text,
                  fill=(120, 120, 120), font=self.font_caption, anchor="mm")

    def _draw_text_with_bg(self, draw, pos, text, font, anchor="mm"):
        """Texte avec fond blanc minimal pour lisibilité sur image colorée."""
        try:
            bb = draw.textbbox(pos, text, font=font, anchor=anchor)
            draw.rectangle([bb[0]-3, bb[1]-2, bb[2]+3, bb[3]+2], fill=(255, 255, 255, 200))
            draw.text(pos, text, fill=self.COLOR_INK, font=font, anchor=anchor)
        except Exception:
            draw.text(pos, text, fill=self.COLOR_INK, font=font)


# ── Test local ──────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("=" * 60)
    print("  TEST AutoAnnotator — Archi Cam AI")
    print("=" * 60)

    annotator = ProfessionalAnnotator()

    # Données de test simulant la sortie du VIM TopologyBuilder
    mock_rooms = [
        {"label": "Salon",           "area_m2": 28.50, "centroid": {"x": 0.25, "y": 0.40}},
        {"label": "Chambre Parent",  "area_m2": 18.22, "centroid": {"x": 0.70, "y": 0.35}},
        {"label": "Chambre 2",       "area_m2": 12.40, "centroid": {"x": 0.70, "y": 0.70}},
        {"label": "Cuisine",         "area_m2": 9.80,  "centroid": {"x": 0.25, "y": 0.75}},
        {"label": "Salle de Bain",   "area_m2": 5.60,  "centroid": {"x": 0.50, "y": 0.55}},
    ]

    # Créer une image de test blanche (1024x1024)
    test_img_path = "test_render_fal.png"
    img = Image.new("RGB", (1024, 1024), color=(245, 245, 240))
    draw = ImageDraw.Draw(img)
    # Simuler quelques murs
    for rect in [(100,100,900,900), (100,100,500,500), (500,100,900,500), (500,500,900,900)]:
        draw.rectangle(rect, outline=(20,20,20), width=8)
    img.save(test_img_path)

    output = annotator.annotate_from_path(
        image_path=test_img_path,
        vim_rooms=mock_rooms,
        project_name="Famille Ekani",
        total_area_m2=74.52,
        scale="Éch. 1:100",
        output_path="test_plan_annote.png"
    )

    print(f"\n✅ Fichier généré : {output}")
    print("   Ouvrez 'test_plan_annote.png' pour visualiser le résultat.")
    print("=" * 60)
