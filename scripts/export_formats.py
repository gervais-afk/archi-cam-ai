#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
EXPORT FORMATS — ARCHI CAM AI V8
════════════════════════════════════════════════════════════════════════════════
Export des résultats d'Archi Cam AI en formats professionnels :

1. AutoCAD DXF (R2010) — Calques multi-couches :
   0_WALLS, 1_DOORS, 2_FURNITURE, 3_STAIRS, 4_DIMENSIONS, 0_FLOOR, ROOMS, TEXT_LABELS

2. PDF Annoté — Plan haute résolution avec :
   - Rendu colorisé ou nettoyé
   - Table des surfaces et décompte mobilier
   - Cartouche récapitulatif
   - QR code avec métadonnées JSON encodées
"""

import os
import json
import math
import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple
import numpy as np
import logging

logger = logging.getLogger(__name__)

# ── ezdxf (DXF AutoCAD) ──────────────────────────────────────────────────────
HAS_EZDXF = False
try:
    import ezdxf
    from ezdxf import units
    from ezdxf.enums import TextEntityAlignment
    HAS_EZDXF = True
except ImportError:
    pass

# ── ReportLab (PDF) ───────────────────────────────────────────────────────────
HAS_REPORTLAB = False
try:
    from reportlab.pdfgen import canvas as rl_canvas
    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors as rl_colors
    from reportlab.lib.units import mm
    from reportlab.platypus import Table, TableStyle
    HAS_REPORTLAB = True
except ImportError:
    pass

# ── Pillow (Images dans PDF) ──────────────────────────────────────────────────
HAS_PIL = False
try:
    from PIL import Image as PilImage
    HAS_PIL = True
except ImportError:
    pass

# ── qrcode (QR Code métadonnées) ─────────────────────────────────────────────
HAS_QRCODE = False
try:
    import qrcode
    HAS_QRCODE = True
except ImportError:
    pass


class DXFExporter:
    """
    Export AutoCAD DXF avec calques professionnels
    """
    LAYER_MAPPING = {
        0: ('0_WALLS', 1),        # Rouge
        50: ('0_WALLS', 1),
        100: ('1_DOORS', 5),      # Bleu
        150: ('1_DOORS', 5),
        165: ('3_STAIRS', 6),     # Magenta
        185: ('2_FURNITURE', 3),  # Vert
        200: ('2_FURNITURE', 3),
        205: ('2_FURNITURE', 3),
        210: ('2_FURNITURE', 3),
        215: ('2_FURNITURE', 3),
        220: ('2_FURNITURE', 3),
        225: ('2_FURNITURE', 3),
        230: ('2_FURNITURE', 3),
        235: ('2_FURNITURE', 3),
        240: ('0_FLOOR', 8),      # Gris
        250: ('3_STAIRS', 6)
    }

    def __init__(self, pixels_per_cm: float = 10.0):
        self.pixels_per_cm = pixels_per_cm
        self.scale_factor = 100.0 / pixels_per_cm if pixels_per_cm > 0 else 10.0

    def create_dxf_from_mask(
        self,
        mask_path: str,
        placement_logic: Dict,
        output_path: str,
        include_dimensions: bool = True
    ):
        if not HAS_EZDXF:
            raise ImportError("ezdxf requis pour l'export DXF. Installez : pip install ezdxf")

        import cv2
        doc = ezdxf.new('R2010', setup=True)
        doc.units = units.CM
        msp = doc.modelspace()

        # Création des calques
        for layer_name, color in set(self.LAYER_MAPPING.values()):
            doc.layers.new(name=layer_name, dxfattribs={'color': color})
        doc.layers.new(name='4_DIMENSIONS', dxfattribs={'color': 4})

        mask = cv2.imread(mask_path, cv2.IMREAD_GRAYSCALE)
        if mask is None:
            mask = np.ones((1000, 1000), dtype=np.uint8) * 240
        h, w = mask.shape

        for mask_value, (layer_name, _) in self.LAYER_MAPPING.items():
            zone_mask = (mask == mask_value).astype(np.uint8) * 255
            if np.sum(zone_mask) == 0:
                continue

            contours, _ = cv2.findContours(zone_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            for contour in contours:
                if cv2.contourArea(contour) < 100:
                    continue
                points = [
                    (float(pt[0][0]) * self.scale_factor, float(h - pt[0][1]) * self.scale_factor)
                    for pt in contour
                ]
                if len(points) >= 3:
                    points.append(points[0])
                    msp.add_lwpolyline(points, close=True, dxfattribs={'layer': layer_name})

        # Mobilier et textes
        for room_id, furniture_data in placement_logic.items():
            if isinstance(furniture_data, dict):
                for item_name, item_info in furniture_data.items():
                    if not isinstance(item_info, dict) or 'center' not in item_info:
                        continue
                    center_px = item_info['center']
                    center_cm = (
                        float(center_px[0]) * self.scale_factor,
                        float(h - center_px[1]) * self.scale_factor
                    )
                    size = item_info.get('size', (0, 0))
                    label = f"{item_name}\n{size[0]}x{size[1]}cm"
                    msp.add_text(
                        label,
                        dxfattribs={'layer': '4_DIMENSIONS', 'height': 15, 'insert': center_cm}
                    )

        doc.saveas(output_path)
        logger.info(f"✅ Export DXF terminé: {output_path}")
        return output_path


class PDFAnnotator:
    """
    Export PDF annoté haute résolution avec table des surfaces et QR code
    """
    def create_annotated_pdf(
        self,
        render_image_path: str,
        placement_logic: Dict,
        yolo_result: Dict,
        output_path: str,
        project_name: str = "Plan Architectural 2D - Archi Cam AI"
    ):
        if not HAS_REPORTLAB:
            raise ImportError("reportlab requis pour l'export PDF. Installez : pip install reportlab")

        c = rl_canvas.Canvas(output_path, pagesize=A4)
        page_width, page_height = A4

        # Titre
        c.setFont("Helvetica-Bold", 18)
        c.drawString(30, page_height - 40, project_name)

        c.setFont("Helvetica", 9)
        c.setFillColor(rl_colors.grey)
        c.drawString(30, page_height - 55, f"Généré le {datetime.datetime.now().strftime('%d/%m/%Y à %H:%M')}")

        # Image de rendu
        img_width = page_width * 0.8
        img_height = img_width * 0.65

        if os.path.exists(render_image_path):
            try:
                c.drawImage(
                    render_image_path,
                    x=(page_width - img_width) / 2,
                    y=page_height - 75 - img_height,
                    width=img_width,
                    height=img_height,
                    preserveAspectRatio=True
                )
            except Exception as e:
                logger.warning(f"Image non insérée : {e}")

        # Table des surfaces
        y_position = page_height - 95 - img_height
        c.setFont("Helvetica-Bold", 11)
        c.setFillColor(rl_colors.black)
        c.drawString(30, y_position, "Récapitulatif des Surfaces")

        rooms = yolo_result.get('rooms', []) if isinstance(yolo_result, dict) else []
        table_data = [['Pièce', 'Type', 'Surface (m²)', 'Mobilier']]
        total_area = 0.0

        for r in rooms:
            r_type = r.get('type', 'Unknown')
            r_area = float(r.get('area_m2', 0))
            total_area += r_area
            r_id = r.get('id', '')
            f_count = len(placement_logic.get(r_id, {})) if isinstance(placement_logic.get(r_id), dict) else 0
            table_data.append([r.get('label', r.get('name', r_id)), r_type, f"{r_area:.1f}", str(f_count)])

        table_data.append(['TOTAL', '', f"{total_area:.1f}", ''])

        t = Table(table_data, colWidths=[150, 100, 80, 80])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), rl_colors.HexColor('#2c3e50')),
            ('TEXTCOLOR', (0, 0), (-1, 0), rl_colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 9),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 6),
            ('BACKGROUND', (0, 1), (-1, -2), rl_colors.whitesmoke),
            ('BACKGROUND', (0, -1), (-1, -1), rl_colors.lightgrey),
            ('GRID', (0, 0), (-1, -1), 0.5, rl_colors.grey)
        ]))

        t_h = len(table_data) * 18
        t.wrapOn(c, page_width, page_height)
        t.drawOn(c, 30, max(20, y_position - t_h - 10))

        # QR Code
        if HAS_QRCODE:
            try:
                qr_data = json.dumps({
                    'project': project_name,
                    'total_area_m2': round(total_area, 1),
                    'rooms_count': len(rooms),
                    'generated_at': datetime.datetime.now().isoformat()
                })
                qr = qrcode.QRCode(version=1, box_size=3, border=1)
                qr.add_data(qr_data)
                qr.make(fit=True)
                qr_img = qr.make_image(fill_color="black", back_color="white")
                qr_tmp = str(Path(output_path).parent / "temp_qr.png")
                qr_img.save(qr_tmp)
                c.drawImage(qr_tmp, page_width - 100, 30, width=65, height=65)
                c.setFont("Helvetica", 7)
                c.drawString(page_width - 100, 20, "Métadonnées JSON")
                try:
                    os.remove(qr_tmp)
                except Exception:
                    pass
            except Exception as e:
                logger.warning(f"QR code ignoré : {e}")

        c.save()
        logger.info(f"✅ PDF annoté généré: {output_path}")
        return output_path


# ── FONCTIONS WRAPPERS ───────────────────────────────────────────────────────

def export_plan_to_dxf(mask_path: str, placement_logic: Dict, output_path: str, pixels_per_cm: float = 10.0) -> str:
    """Wrapper simplifié pour export DXF."""
    exporter = DXFExporter(pixels_per_cm=pixels_per_cm)
    return exporter.create_dxf_from_mask(mask_path, placement_logic, output_path)


def export_plan_to_pdf(render_path: str, placement_logic: Dict, yolo_result: Dict, output_path: str) -> str:
    """Wrapper simplifié pour export PDF."""
    annotator = PDFAnnotator()
    return annotator.create_annotated_pdf(render_path, placement_logic, yolo_result, output_path)


def export_to_dxf(placement_logic: Dict, rooms_list: List[Dict], staircase_zones: List, outdoor_zones: List, output_path: str, project_name: str = "Plan", scale_px_per_m: float = 40.0) -> str:
    """Export DXF direct avec géométrie de pièces."""
    if not HAS_EZDXF:
        raise ImportError("ezdxf requis.")
    exporter = DXFExporter(pixels_per_cm=scale_px_per_m / 100.0 * 10.0)
    # Création du document DXF directement
    doc = ezdxf.new('R2010', setup=True)
    msp = doc.modelspace()
    doc.layers.new(name='0_WALLS', dxfattribs={'color': 1})
    doc.layers.new(name='ROOMS', dxfattribs={'color': 8})
    doc.layers.new(name='2_FURNITURE', dxfattribs={'color': 3})
    doc.layers.new(name='TEXT_LABELS', dxfattribs={'color': 6})

    for r in rooms_list:
        poly = r.get('polygon', [])
        if len(poly) >= 3:
            pts = [(float(p[0]), float(p[1])) for p in poly]
            pts.append(pts[0])
            msp.add_lwpolyline(pts, close=True, dxfattribs={'layer': 'ROOMS'})
            centroid = r.get('centroid', [0, 0])
            label = f"{r.get('name', 'Room')}\n{r.get('area_m2', 0):.1f}m2"
            msp.add_text(label, dxfattribs={'layer': 'TEXT_LABELS', 'height': 15, 'insert': (float(centroid[0]), float(centroid[1]))})

    doc.saveas(output_path)
    return output_path


def export_to_pdf_annotated(render_image_path: str, placement_logic: Dict, rooms_list: List[Dict], metadata: Dict, output_path: str, project_name: str = "Archi Cam AI") -> str:
    return export_plan_to_pdf(render_image_path, placement_logic, {'rooms': rooms_list}, output_path)


def export_all(output_dir: str, placement_logic: Dict, rooms_list: List[Dict], staircase_zones: List, outdoor_zones: List, metadata: Dict, render_image_path: Optional[str] = None, project_name: str = "Archi Cam AI", scale_px_per_m: float = 40.0) -> Dict[str, str]:
    os.makedirs(output_dir, exist_ok=True)
    dxf_path = os.path.join(output_dir, f"{project_name.replace(' ', '_')}.dxf")
    pdf_path = os.path.join(output_dir, f"{project_name.replace(' ', '_')}_annote.pdf")
    results = {}
    try:
        results['dxf'] = export_to_dxf(placement_logic, rooms_list, staircase_zones, outdoor_zones, dxf_path, project_name, scale_px_per_m)
    except Exception:
        results['dxf'] = None
    try:
        render_p = render_image_path or os.path.join(output_dir, 'source_inpainted.png')
        results['pdf'] = export_to_pdf_annotated(render_p, placement_logic, rooms_list, metadata, pdf_path, project_name)
    except Exception:
        results['pdf'] = None
    return results


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser(description='Archi Cam AI — Export DXF / PDF')
    parser.add_argument('--mask', required=True, help='Chemin masque png')
    parser.add_argument('--output', required=True, help='Fichier sortie (.dxf ou .pdf)')
    args = parser.parse_args()
    if args.output.endswith('.dxf'):
        export_plan_to_dxf(args.mask, {}, args.output)
    else:
        export_plan_to_pdf(args.mask, {}, {}, args.output)
