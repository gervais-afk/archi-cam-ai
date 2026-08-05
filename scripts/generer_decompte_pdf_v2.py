import os
import io
import sys
from datetime import datetime

try:
    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image, KeepTogether
    from reportlab.pdfgen import canvas
    from reportlab.graphics.shapes import Drawing
    from reportlab.graphics.barcode import qr
except ImportError:
    print("❌ Erreur : ReportLab n'est pas installé.")
    sys.exit(1)

COLOR_GOLD = colors.HexColor("#C5A059")
COLOR_ANTHRACITE = colors.HexColor("#121212")
COLOR_LIGHT_BG = colors.HexColor("#F8F9FA")
COLOR_BORDER_GREY = colors.HexColor("#E2E8F0")
COLOR_TEXT_MAIN = colors.HexColor("#2D3748")
COLOR_SUCCESS = colors.HexColor("#28A745")

class ModernNumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        self.project_id = kwargs.pop("project_id", "PRJ-YDE-2026")
        self.fingerprint = kwargs.pop("fingerprint", "FINGERPRINT-OKF92")
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for page_idx, state in enumerate(self._saved_page_states, start=1):
            self.__dict__.update(state)
            self.draw_header(page_idx, num_pages)
            self.draw_footer(page_idx, num_pages)
            super().showPage()
        super().save()

    def draw_header(self, page_num, page_count):
        width, height = A4
        self.saveState()

        # Barre latérale dorée verticale
        self.setFillColor(COLOR_GOLD)
        self.rect(0, height - 75, 8, 75, fill=True, stroke=False)

        # Fond en-tête gris clair
        self.setFillColor(COLOR_LIGHT_BG)
        self.rect(8, height - 75, width - 8, 75, fill=True, stroke=False)

        # Logo texte
        self.setFillColor(COLOR_GOLD)
        self.setFont("Helvetica-Bold", 20)
        self.drawString(25, height - 32, "🏛️ ARCHI CAM AI")

        # Sous-titre
        self.setFillColor(COLOR_TEXT_MAIN)
        self.setFont("Helvetica-Bold", 9)
        self.drawString(25, height - 48, "DÉCOMPTE QUANTITATIF ESTIMATIF (DQE) CERTIFIÉ MINMAP 2026")

        # Certification
        self.setFillColor(COLOR_SUCCESS)
        self.setFont("Helvetica-Bold", 8)
        self.drawString(25, height - 62, "✓ VALIDÉ PAR LE MOTEUR IA & LES NORMES BAEL 91")

        # Draw QR code top right
        qr_code = qr.QrCodeWidget(f"https://archicam.cm/verify/{self.project_id}?hash={self.fingerprint}")
        bounds = qr_code.getBounds()
        qr_width = bounds[2] - bounds[0]
        qr_height = bounds[3] - bounds[1]
        d = Drawing(55, 55, transform=[55.0 / qr_width, 0, 0, 55.0 / qr_height, 0, 0])
        d.add(qr_code)
        d.drawOn(self, width - 75, height - 68)

        self.restoreState()

    def draw_footer(self, page_num, page_count):
        width, height = A4
        self.saveState()

        self.setStrokeColor(COLOR_GOLD)
        self.setLineWidth(0.5)
        self.line(30, 40, width - 30, 40)

        self.setFillColor(COLOR_TEXT_MAIN)
        self.setFont("Helvetica", 8)
        self.drawCentredString(width / 2, 25, f"Page {page_num} sur {page_count}")

        self.setFont("Helvetica-Bold", 7)
        self.drawString(30, 25, f"ID: {self.fingerprint}")

        date_str = datetime.now().strftime("%d/%m/%Y à %H:%M")
        self.drawRightString(width - 30, 25, f"Émis le {date_str}")

        self.restoreState()

def format_fcfa(amount):
    return f"{int(amount):,}".replace(",", " ") + " FCFA"

def generate_pdf_v2(lines=None, output_filename="devis-certifie-v2.pdf"):
    width, height = A4
    doc = SimpleDocTemplate(
        output_filename,
        pagesize=A4,
        leftMargin=30,
        rightMargin=30,
        topMargin=85,
        bottomMargin=55,
    )

    styles = getSampleStyleSheet()
    style_normal = ParagraphStyle("NormalCustom", parent=styles["Normal"], fontSize=8.5, leading=11, textColor=COLOR_TEXT_MAIN)
    style_bold = ParagraphStyle("BoldCustom", parent=styles["Normal"], fontSize=9, leading=12, fontName="Helvetica-Bold", textColor=COLOR_TEXT_MAIN)

    elements = []

    if not lines:
        lines = [
            {"code_article": "1.01", "nom_materiau": "Ciment CPJ 42.5 Cimencam/Dangote", "designation": "Dosage 350kg/m3", "unite": "Sac", "quantite_facturable": 450, "prix_total_unitaire": 4900},
            {"code_article": "1.02", "nom_materiau": "Sable fin lavé de la Sanaga", "designation": "Qualité béton armé", "unite": "m3", "quantite_facturable": 35, "prix_total_unitaire": 8500},
            {"code_article": "1.03", "nom_materiau": "Gravier concassé 15/25", "designation": "Carrière de Yaoundé", "unite": "m3", "quantite_facturable": 45, "prix_total_unitaire": 18500},
            {"code_article": "1.04", "nom_materiau": "Fer à béton HA FeE500 (T10/T12)", "designation": "Armatures poteaux & dalles", "unite": "Tonne", "quantite_facturable": 3.2, "prix_total_unitaire": 620000},
        ]

    table_data = [
        [
            Paragraph("<b>RÉF.</b>", style_bold),
            Paragraph("<b>DÉSIGNATION DES OUVRAGES</b>", style_bold),
            Paragraph("<b>UNITÉ</b>", style_bold),
            Paragraph("<b>QTE</b>", style_bold),
            Paragraph("<b>P.U. (XAF)</b>", style_bold),
            Paragraph("<b>MONTANT HT</b>", style_bold),
        ]
    ]

    total_ht = 0
    for l in lines:
        qte = l["quantite_facturable"]
        pu = l["prix_total_unitaire"]
        montant = qte * pu
        total_ht += montant

        p_code = Paragraph(f"<b>{l['code_article']}</b>", style_normal)
        p_desig = Paragraph(f"<b>{l['nom_materiau']}</b><br/><font color='#718096'>{l['designation']}</font>", style_normal)
        p_unit = Paragraph(str(l["unite"]), style_normal)
        p_qte = Paragraph(f"{qte:,.2f}".replace(",", " "), style_normal)
        p_pu = Paragraph(format_fcfa(pu), style_normal)
        p_tot = Paragraph(f"<b>{format_fcfa(montant)}</b>", style_normal)

        table_data.append([p_code, p_desig, p_unit, p_qte, p_pu, p_tot])

    t_main = Table(table_data, colWidths=[45, 225, 45, 60, 75, 85], repeatRows=1)
    t_main.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), COLOR_GOLD),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, COLOR_LIGHT_BG]),
                ("GRID", (0, 0), (-1, -1), 0.5, COLOR_BORDER_GREY),
                ("BOX", (0, 0), (-1, -1), 1, COLOR_GOLD),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    elements.append(t_main)
    elements.append(Spacer(1, 15))

    tva = total_ht * 0.1925
    total_ttc = total_ht + tva

    summary_data = [
        [Paragraph("<b>Total Général HT</b>", style_normal), Paragraph(format_fcfa(total_ht), style_bold)],
        [Paragraph("TVA Réglementaire (19.25%)", style_normal), Paragraph(format_fcfa(tva), style_normal)],
        [Paragraph("<b>TOTAL GENERAL TTC CERTIFIÉ</b>", style_bold), Paragraph(f"<font color='#C5A059'><b>{format_fcfa(total_ttc)}</b></font>", style_bold)],
    ]

    t_sum = Table(summary_data, colWidths=[180, 120])
    t_sum.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, -1), (-1, -1), COLOR_ANTHRACITE),
                ("TEXTCOLOR", (0, -1), (-1, -1), colors.white),
                ("GRID", (0, 0), (-1, -1), 0.5, COLOR_BORDER_GREY),
                ("PADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )

    elements.append(KeepTogether([t_sum]))
    doc.build(elements, canvasmaker=lambda *args, **kwargs: ModernNumberedCanvas(*args, project_id="PRJ-YDE-2026", fingerprint="FINGERPRINT-OKF92", **kwargs))
    print(f"✅ PDF DQE v2 certifié généré : {output_filename}")

if __name__ == "__main__":
    generate_pdf_v2()
