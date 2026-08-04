import os
import io
import sys
from datetime import datetime
from dotenv import load_dotenv

try:
    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image, KeepTogether
    from reportlab.pdfgen import canvas
except ImportError:
    print("❌ Erreur : ReportLab n'est pas installé.")
    exit(1)

COLOR_ANTHRACITE = colors.HexColor("#121212")
COLOR_OCRE = colors.HexColor("#C5A059")
COLOR_LIGHT_GREY = colors.HexColor("#F8F9FA")
COLOR_BORDER_GREY = colors.HexColor("#E2E8F0")
COLOR_TEXT_MAIN = colors.HexColor("#2D3748")
COLOR_VALIDATED = colors.HexColor("#48BB78")
COLOR_ERROR = colors.HexColor("#E53E3E")

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica-Bold", 8)
        self.setFillColor(COLOR_OCRE)
        self.drawString(30, 810, "ARCHI CAM AI")
        
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#718096"))
        self.drawString(95, 810, "— DÉCOMPTE QUANTITATIF ESTIMATIF (DQE) CERTIFIÉ OKF v0.2")

        self.setStrokeColor(COLOR_OCRE)
        self.setLineWidth(0.75)
        self.line(30, 802, 565, 802)

        self.setStrokeColor(COLOR_BORDER_GREY)
        self.setLineWidth(0.5)
        self.line(30, 40, 565, 40)

        self.setFont("Helvetica", 7.5)
        self.setFillColor(colors.HexColor("#A0AEC0"))
        self.drawString(30, 28, "Certifié conforme au Référentiel BTP Cameroun 2026 | Document confidentiel")

        page_str = f"Page {self._pageNumber} sur {page_count}"
        self.drawRightString(565, 28, page_str)

        self.restoreState()

def format_fcfa(valeur):
    if valeur is None:
        return "0 FCFA"
    try:
        return f"{float(valeur):,.0f}".replace(",", " ") + " FCFA"
    except (ValueError, TypeError):
        return "0 FCFA"

def generer_decompte(projet_id: str, logo_path: str = None):
    print(f"🚀 Début de la génération du PDF DQE pour le projet UUID: {projet_id}")
    
    project = {
        "nom_projet": f"Duplex R+1 Contemporain ({projet_id[:8]})",
        "description": "Structure Béton Armé BAEL 91 & Menuiserie Bois Iroko",
        "date_creation": datetime.now(),
        "taux_tva": 19.25
    }

    lignes = [
        {
            "code_article": "GO-1",
            "nom_materiau": "Béton Armé Structure (145 m³)",
            "designation": "Béton armé de structure dosé à 350kg/m³ (Poteaux, Poutres, Dalle R+1)",
            "unite": "m³",
            "quantite_facturable": 145,
            "prix_total_unitaire": 55000,
            "statut_prix": "VALIDE"
        },
        {
            "code_article": "GO-2",
            "nom_materiau": "Acier HA BAEL 91 (13 050 kg)",
            "designation": "Armatures en acier Haute Adhérence pour ossature béton armé",
            "unite": "kg",
            "quantite_facturable": 13050,
            "prix_total_unitaire": 318,
            "statut_prix": "VALIDE"
        },
        {
            "code_article": "SO-1",
            "nom_materiau": "Menuiserie Bois Iroko & Persiennes",
            "designation": "Persiennes orientables en bois Iroko local pour régulation thermique",
            "unite": "m²",
            "quantite_facturable": 48,
            "prix_total_unitaire": 85000,
            "statut_prix": "VALIDE"
        },
        {
            "code_article": "SO-2",
            "nom_materiau": "Parement Pierre Volcanique d'Edéa",
            "designation": "Revêtement de soubassement en pierre naturelle taillée d'Edéa",
            "unite": "m²",
            "quantite_facturable": 120,
            "prix_total_unitaire": 15000,
            "statut_prix": "VALIDE"
        }
    ]

    os.makedirs("public/out", exist_ok=True)
    os.makedirs("out", exist_ok=True)
    
    file_name = f"{projet_id}.pdf"
    local_path = os.path.join("out", file_name)
    public_path = os.path.join("public", "out", file_name)

    doc = SimpleDocTemplate(
        local_path,
        pagesize=A4,
        rightMargin=30,
        leftMargin=30,
        topMargin=35,
        bottomMargin=45
    )

    styles = getSampleStyleSheet()
    style_normal = ParagraphStyle('DQE_Normal', parent=styles['Normal'], textColor=COLOR_TEXT_MAIN, fontSize=8, leading=10)
    style_bold = ParagraphStyle('DQE_Bold', parent=style_normal, fontName='Helvetica-Bold')
    style_title = ParagraphStyle('DQE_Title', parent=styles['Heading1'], fontName='Helvetica-Bold', fontSize=18, textColor=COLOR_ANTHRACITE, spaceAfter=6)
    style_subtitle = ParagraphStyle('DQE_Subtitle', parent=styles['Normal'], fontName='Helvetica-Oblique', fontSize=9, textColor=COLOR_OCRE, spaceAfter=20)
    
    elements = []
    header_data = []
    agence_text = "<b>BET ARCHI CAM AI</b><br/>Expertise BIM & Climatisation Bioclimatique<br/>Yaoundé, Cameroun<br/>contact@archicam.ai"
    left_p = Paragraph(agence_text, style_normal)
    right_content = Paragraph("🏛️ <b>ARCHI CAM AI</b><br/><font color='#C5A059'>STUDIO DESIGN</font>", ParagraphStyle('DefaultLogo', parent=style_bold, fontSize=11, leading=13, alignment=2))
    
    header_data.append([left_p, right_content])
    header_table = Table(header_data, colWidths=[270, 265])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ('LINEBELOW', (0, 0), (-1, -1), 1.5, COLOR_OCRE),
    ]))
    elements.append(header_table)
    elements.append(Spacer(1, 15))

    elements.append(Paragraph(project['nom_projet'].upper(), style_title))
    elements.append(Paragraph(f"Édité le {datetime.now().strftime('%d/%m/%Y à %H:%M')} | Référentiel Douala-Yaoundé 2026", style_subtitle))
    elements.append(Spacer(1, 10))

    table_data = [
        [
            Paragraph("<b>Code Lot</b>", style_bold),
            Paragraph("<b>Désignation de l'Ouvrage</b>", style_bold),
            Paragraph("<b>Unité</b>", style_bold),
            Paragraph("<b>Quantité</b>", style_bold),
            Paragraph("<b>Prix Unitaire</b>", style_bold),
            Paragraph("<b>Montant HT</b>", style_bold),
        ]
    ]

    total_ht = 0.0
    for l in lignes:
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

    t_main = Table(table_data, colWidths=[55, 215, 45, 60, 75, 85])
    t_main.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), COLOR_ANTHRACITE),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.5, COLOR_BORDER_GREY),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(t_main)
    elements.append(Spacer(1, 15))

    tva = total_ht * 0.1925
    total_ttc = total_ht + tva

    summary_data = [
        [Paragraph("<b>Total Hors Taxes (HT)</b>", style_normal), Paragraph(format_fcfa(total_ht), style_bold)],
        [Paragraph("TVA (19.25%)", style_normal), Paragraph(format_fcfa(tva), style_normal)],
        [Paragraph("<b>TOTAL TTC CERTIFIÉ</b>", style_bold), Paragraph(f"<font color='#C5A059'><b>{format_fcfa(total_ttc)}</b></font>", style_bold)]
    ]
    t_sum = Table(summary_data, colWidths=[180, 120])
    t_sum.setStyle(TableStyle([
        ('BACKGROUND', (0, -1), (-1, -1), COLOR_ANTHRACITE),
        ('TEXTCOLOR', (0, -1), (-1, -1), colors.white),
        ('GRID', (0, 0), (-1, -1), 0.5, COLOR_BORDER_GREY),
        ('PADDING', (0, 0), (-1, -1), 6),
    ]))

    elements.append(KeepTogether([t_sum]))
    doc.build(elements, canvasmaker=NumberedCanvas)
    
    # Copy to public/out as well
    with open(local_path, "rb") as rf:
        with open(public_path, "wb") as wf:
            wf.write(rf.read())

    print(f"✅ Décompte DQE PDF créé avec succès dans {local_path} et {public_path}")
    return local_path

if __name__ == "__main__":
    p_id = sys.argv[1] if len(sys.argv) > 1 else "Duplex_R1_DQE"
    generer_decompte(p_id)
