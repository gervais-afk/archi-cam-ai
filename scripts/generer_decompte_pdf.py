import os
import io
import sys
from datetime import datetime
from dotenv import load_dotenv

# Importations ReportLab sécurisées avec gestion d'erreurs
try:
    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image, KeepTogether
    from reportlab.pdfgen import canvas
except ImportError:
    print("❌ Erreur : ReportLab n'est pas installé. Lancez 'pip install reportlab'.")
    exit(1)

# Importation psycopg2 pour connexion PostgreSQL directe
try:
    import psycopg2
    from psycopg2.extras import RealDictCursor
except ImportError:
    print("❌ Erreur : psycopg2 n'est pas installé. Lancez 'pip install psycopg2-binary'.")
    exit(1)

# Chargement des variables d'environnement
load_dotenv(".env.local")

# ── CONFIGURATION DE LA BASE DE DONNÉES CLOUD SQL (PSQL) ───────────────────
def get_db_connection():
    conn_str = os.environ.get("DATABASE_URL")
    if not conn_str:
        # Reconstruction à partir des variables d'environnement individuelles
        db_host = os.environ.get("DB_HOST", "db.idgnmgrdhgwxmrmujhmv.supabase.co")
        db_user = os.environ.get("DB_USER", "postgres")
        db_pass = os.environ.get("DB_PASSWORD", "ArchiCamAI_2025_Secure_BIM!")
        db_name = os.environ.get("DB_NAME", "postgres")
        db_port = os.environ.get("DB_PORT", "5432")
        conn_str = f"postgresql://{db_user}:{db_pass}@{db_host}:{db_port}/{db_name}"
    
    # Mode SSL requis pour Supabase / Cloud SQL GCP en production
    ssl_mode = "?sslmode=require" if "supabase.co" in conn_str and "?sslmode=" not in conn_str else ""
    return psycopg2.connect(conn_str + ssl_mode, cursor_factory=RealDictCursor)


# ── DESIGN SYSTEM : ANTHRACITE / OCRE ────────────────────────────────────────
COLOR_ANTHRACITE = colors.HexColor("#121212") # Couleur primaire
COLOR_OCRE = colors.HexColor("#C5A059")       # Couleur secondaire accentuée
COLOR_LIGHT_GREY = colors.HexColor("#F8F9FA") # Lignes alternées
COLOR_BORDER_GREY = colors.HexColor("#E2E8F0")# Bordures de cellules
COLOR_TEXT_MAIN = colors.HexColor("#2D3748")  # Texte principal
COLOR_VALIDATED = colors.HexColor("#48BB78")   # Vert réussite
COLOR_ERROR = colors.HexColor("#E53E3E")       # Rouge d'alerte


# ── CLASSE NUMBEREDCANVAS (PAGES FLUIDES ET NUMÉROTATION PRO) ───────────────
class NumberedCanvas(canvas.Canvas):
    """
    Canvas personnalisé pour gérer une numérotation professionnelle de type 'Page X sur Y'
    ainsi qu'un en-tête et pied de page récurrents et fluides.
    """
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
        
        # En-tête récurrent à partir de la page 2
        if self._pageNumber > 1:
            self.setFont("Helvetica-Bold", 8)
            self.setFillColor(COLOR_ANTHRACITE)
            self.drawString(30, 815, "DÉTAIL QUANTITATIF ESTIMATIF (DQE)")
            self.setFont("Helvetica", 8)
            self.setFillColor(colors.HexColor("#718096"))
            self.drawRightString(565, 815, "ARCHI CAM AI - STUDIO")
            self.setStrokeColor(COLOR_OCRE)
            self.setLineWidth(0.75)
            self.line(30, 807, 565, 807)

        # Pied de page récurrent sur toutes les pages
        self.setFont("Helvetica", 7.5)
        self.setFillColor(colors.HexColor("#718096"))
        self.drawString(30, 20, "Document officiel généré par l'IA Archi Cam AI — Confidentiel & Propriété BET")
        self.drawRightString(565, 20, f"Page {self._pageNumber} sur {page_count}")
        self.setStrokeColor(COLOR_BORDER_GREY)
        self.setLineWidth(0.5)
        self.line(30, 32, 565, 32)
        
        self.restoreState()


# ── FORMATAGE MONÉTAIRE DE PRÉCISION ────────────────────────────────────────
def format_fcfa(amount: float) -> str:
    """Formatte proprement les montants avec des espaces pour les milliers."""
    return f"{amount:,.0f}".replace(",", " ") + " FCFA"


# ── FONCTION D'UPLOAD DE PRODUCTION (COMMENTÉE) ──────────────────────────────
# def upload_to_firebase_storage(file_path: str, destination_blob_name: str) -> str:
#     """
#     Téléverse le fichier PDF généré vers Firebase Storage en utilisant le SDK firebase-admin.
#     
#     Pour l'activer en production :
#     1. Installez le package : pip install firebase-admin
#     2. Initialisez l'app Firebase :
#        import firebase_admin
#        from firebase_admin import credentials, storage
#        cred = credentials.Certificate("path/to/serviceAccountKey.json")
#        firebase_admin.initialize_app(cred, {
#            'storageBucket': 'archi-cameroun-ai.appspot.com'
#        })
#     """
#     import firebase_admin
#     from firebase_admin import storage
#     
#     bucket = storage.bucket()
#     blob = bucket.blob(destination_blob_name)
#     blob.upload_from_filename(file_path)
#     
#     # Rend le fichier public ou génère une URL signée
#     blob.make_public()
#     return blob.public_url


# ── MODULE PRINCIPAL : GÉNÉRATION DU DQE PDF ────────────────────────────────
def generer_decompte(projet_id: str, logo_path: str = None) -> str:
    print(f"🔌 Connexion à la base de données Cloud SQL (PostgreSQL)...")
    try:
        conn = get_db_connection()
        cur = conn.cursor()
    except Exception as e:
        return f"❌ Erreur critique de connexion base de données : {e}"

    # 1. Récupération des informations d'en-tête du projet
    print(f"🔍 Récupération des métadonnées du projet : {projet_id}...")
    try:
        cur.execute(
            """SELECT nom_projet, localisation, description, 
                      COALESCE(frais_generaux_pct, 20.00) AS frais_generaux_pct, 
                      COALESCE(marge_aleas_pct, 3.00) AS marge_aleas_pct
               FROM projets WHERE id = %s""",
            (projet_id,)
        )
        project = cur.fetchone()
    except Exception as e:
        conn.close()
        return f"❌ Erreur de lecture du projet : {e}"

    if not project:
        conn.close()
        return f"❌ Projet introuvable pour l'UUID : {projet_id}"

    # 2. Récupération des lignes de devis DQE avec jointures SQL strictes
    print("📊 Extraction des lignes du DQE depuis le modèle relationnel...")
    try:
        cur.execute(
            """SELECT 
                dqe.id AS dqe_id,
                dqe.ifc_id AS ifc_guid,
                dqe.niveau_spatial AS niveau_spatial,
                dqe.quantite_ifc_brute AS quantite_ifc_brute,
                COALESCE(dqe.quantite_facturable, 0.0) AS quantite_facturable,
                COALESCE(dqe.quantite_executee, 0.0) AS quantite_executee,
                dqe.statut_prix AS statut_prix,
                mp.code_article AS code_article,
                mp.nom_materiau AS nom_materiau,
                mp.designation AS designation,
                mp.unite AS unite,
                COALESCE(mp.prix_unitaire_fourniture, 0.0) AS prix_unitaire_fourniture,
                COALESCE(mp.prix_unitaire_main_oeuvre, 0.0) AS prix_unitaire_main_oeuvre,
                COALESCE(mp.prix_total_unitaire, 0.0) AS prix_total_unitaire
               FROM devis_dqe dqe
               LEFT JOIN mercuriale_prix mp ON dqe.mercuriale_prix_code_article = mp.code_article
               WHERE dqe.projet_id = %s
               ORDER BY dqe.niveau_spatial, mp.code_article""",
            (projet_id,)
        )
        lignes = cur.fetchall()
    except Exception as e:
        conn.close()
        return f"❌ Erreur d'extraction des lignes DQE : {e}"
    finally:
        cur.close()
        conn.close()

    if not lignes:
        return f"⚠️ Le projet existe mais ne contient aucune ligne de devis DQE."

    # 3. Création du fichier de sortie local (Dossier out/)
    os.makedirs("out", exist_ok=True)
    file_name = f"DQE_Projet_{projet_id[:8]}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
    local_path = os.path.join("out", file_name)

    doc = SimpleDocTemplate(
        local_path,
        pagesize=A4,
        rightMargin=30,
        leftMargin=30,
        topMargin=35,
        bottomMargin=45
    )

    styles = getSampleStyleSheet()
    
    # Custom styles
    style_normal = ParagraphStyle('DQE_Normal', parent=styles['Normal'], textColor=COLOR_TEXT_MAIN, fontSize=8, leading=10)
    style_bold = ParagraphStyle('DQE_Bold', parent=style_normal, fontName='Helvetica-Bold')
    style_title = ParagraphStyle('DQE_Title', parent=styles['Heading1'], fontName='Helvetica-Bold', fontSize=18, textColor=COLOR_ANTHRACITE, spaceAfter=6)
    style_subtitle = ParagraphStyle('DQE_Subtitle', parent=styles['Normal'], fontName='Helvetica-Oblique', fontSize=9, textColor=COLOR_OCRE, spaceAfter=20)
    
    elements = []

    # 4. En-tête Premium & Marque Blanche (Logo dynamique)
    header_data = []
    
    # Colonne gauche : Infos Agence / Promoteur
    agence_text = "<b>BET ARCHI CAM AI</b><br/>Expertise BIM & Climatisation Bioclimatique<br/>Yaoundé, Cameroun<br/>contact@archicam.ai"
    left_p = Paragraph(agence_text, style_normal)
    
    # Colonne droite : Logo promoteur (White-Label)
    if logo_path and os.path.exists(logo_path):
        try:
            logo_img = Image(logo_path, width=120, height=45)
            logo_img.hAlign = 'RIGHT'
            right_content = logo_img
        except Exception as logo_err:
            right_content = Paragraph(f"<font color='#C5A059'><b>🏛️ {project['nom_projet'].upper()}</b></font>", ParagraphStyle('LogoErr', parent=style_bold, fontSize=12, alignment=2))
    else:
        # Logo par défaut géométrique d'Archi Cam AI
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

    # Titre du Document
    elements.append(Paragraph("DÉTAIL QUANTITATIF ESTIMATIF (DQE)", style_title))
    elements.append(Paragraph(f"Projet : {project['nom_projet']} — Localisation : {project['localisation'] or 'Non spécifiée'}", style_subtitle))

    # Métadonnées Projet
    meta_text = f"<b>Identifiant Projet :</b> {projet_id}<br/>"
    meta_text += f"<b>Date d'édition :</b> {datetime.now().strftime('%d/%m/%Y à %H:%M:%S')}<br/>"
    if project['description']:
        meta_text += f"<b>Description :</b> {project['description']}"
    elements.append(Paragraph(meta_text, style_normal))
    elements.append(Spacer(1, 15))

    # 5. Remplissage des Lignes du Tableau DQE
    headers = ["Niveau", "Description Ouvrage", "Unité", "Qté Facturable", "P.U. HT", "Montant HT", "Statut"]
    table_data = [headers]

    sum_ht = 0.0
    a_chiffrer_count = 0

    for idx, l in enumerate(lignes):
        statut = l['statut_prix']
        is_valide = (statut == 'VALIDÉ' or statut == 'VALIDE') and l['code_article'] is not None
        
        # Sécurité Financière : Si non reconnu, forcer à 0.0
        if is_valide:
            pu = l['prix_total_unitaire']
            montant_ligne = l['quantite_facturable'] * pu
        else:
            pu = 0.0
            montant_ligne = 0.0
            a_chiffrer_count += 1

        sum_ht += montant_ligne

        # Libellé designation
        designation = l['nom_materiau'] or "Matériau non reconnu"
        if l['designation'] and l['designation'] != l['nom_materiau']:
            designation += f" - {l['designation']}"
        if l['ifc_guid']:
            designation += f" <font color='#718096'>(GUID: {l['ifc_guid']})</font>"

        # Statut cell style
        if is_valide:
            status_p = Paragraph(f"<font color='{COLOR_VALIDATED.hexval()}'><b>[VALIDÉ]</b></font>", style_normal)
        else:
            status_p = Paragraph(f"<font color='{COLOR_ERROR.hexval()}'><b>[À CHIFFRER]</b></font>", style_normal)

        table_data.append([
            l['niveau_spatial'] or "RDC",
            Paragraph(designation, style_normal),
            l['unite'] or "U",
            f"{l['quantite_facturable']:.2f}" if l['quantite_facturable'] > 0 else "0.00",
            format_fcfa(pu) if is_valide else "0 FCFA",
            format_fcfa(montant_ligne) if is_valide else "0 FCFA",
            status_p
        ])

    # 6. Mise en page du tableau principal
    # Largeurs de colonnes optimisées (A4 total utile ~535pt)
    t_dqe = Table(table_data, colWidths=[40, 205, 30, 75, 65, 65, 55], repeatRows=1)
    
    # Construction dynamique des styles alternés de lignes
    t_styles = [
        ('BACKGROUND', (0, 0), (-1, 0), COLOR_ANTHRACITE),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
        ('TOPPADDING', (0, 0), (-1, 0), 8),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ALIGN', (0, 0), (2, -1), 'LEFT'),
        ('ALIGN', (3, 0), (5, -1), 'RIGHT'),
        ('ALIGN', (6, 0), (6, -1), 'CENTER'),
        ('GRID', (0, 0), (-1, -1), 0.5, COLOR_BORDER_GREY),
        ('LINEBELOW', (0, 0), (-1, 0), 1.5, COLOR_OCRE),
    ]
    
    for i in range(1, len(table_data)):
        bg_color = COLOR_LIGHT_GREY if i % 2 == 0 else colors.white
        t_styles.append(('BACKGROUND', (0, i), (-1, i), bg_color))
        t_styles.append(('TOPPADDING', (0, i), (-1, i), 6))
        t_styles.append(('BOTTOMPADDING', (0, i), (-1, i), 6))

    t_dqe.setStyle(TableStyle(t_styles))
    elements.append(t_dqe)
    elements.append(Spacer(1, 20))

    # 7. Calculs Financiers Finaux (Marges, TVA, TTC)
    frais_generaux_pct = float(project['frais_generaux_pct'])
    marge_aleas_pct = float(project['marge_aleas_pct'])

    frais_generaux = sum_ht * (frais_generaux_pct / 100.0)
    marge_aleas = sum_ht * (marge_aleas_pct / 100.0)
    total_ht = sum_ht + frais_generaux + marge_aleas
    tva = total_ht * 0.1925
    total_ttc = total_ht + tva

    # 8. Tableau de synthèse financière de fin
    summary_data = [
        [Paragraph("<b>SYNTHÈSE DEVIS DQE</b>", style_bold), ""],
        ["Somme Travaux HT (Validés)", format_fcfa(sum_ht)],
        [f"Frais Généraux ({frais_generaux_pct}%)", format_fcfa(frais_generaux)],
        [f"Marge Aléas & Risques ({marge_aleas_pct}%)", format_fcfa(marge_aleas)],
        [Paragraph("<b>TOTAL DEVIS HT</b>", style_bold), format_fcfa(total_ht)],
        ["TVA (19.25% au Cameroun)", format_fcfa(tva)],
        [Paragraph("<b>TOTAL ESTIMÉ TTC</b>", ParagraphStyle('TtcBold', parent=style_bold, fontSize=11, textColor=COLOR_OCRE)), 
         Paragraph(f"<b>{format_fcfa(total_ttc)}</b>", ParagraphStyle('TtcPrice', parent=style_bold, fontSize=11, textColor=COLOR_OCRE, alignment=2))]
    ]
    
    t_summary = Table(summary_data, colWidths=[200, 150])
    t_summary.setStyle(TableStyle([
        ('SPAN', (0, 0), (1, 0)),
        ('LINEBELOW', (0, 0), (-1, 0), 1, COLOR_OCRE),
        ('ALIGN', (0, 0), (0, -1), 'LEFT'),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('GRID', (0, 0), (-1, -1), 0.5, COLOR_BORDER_GREY),
        ('BACKGROUND', (0, 4), (-1, 4), COLOR_LIGHT_GREY),
        ('BACKGROUND', (0, 6), (-1, 6), COLOR_ANTHRACITE),
        ('TEXTCOLOR', (0, 6), (-1, 6), colors.white),
    ]))
    
    # Encapsulation dans KeepTogether pour s'assurer que la synthèse ne soit pas coupée
    summary_block = []
    summary_block.append(Spacer(1, 10))
    
    # Affichage d'une alerte s'il reste des éléments à chiffrer
    if a_chiffrer_count > 0:
        alert_text = f"⚠️ <b>Attention :</b> Il reste <b>{a_chiffrer_count} matériau(x) non reconnu(s)</b> dans ce DQE. " \
                     f"Ils apparaissent avec la mention <font color='{COLOR_ERROR.hexval()}'><b>[À CHIFFRER]</b></font> " \
                     f"et sont provisionnés à 0 FCFA. Veuillez les éditer dans le Studio."
        alert_p = Paragraph(alert_text, ParagraphStyle('AlertText', parent=style_normal, textColor=COLOR_ERROR, fontSize=8.5, leading=11))
        
        t_alert = Table([[alert_p]], colWidths=[350])
        t_alert.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#FFF5F5")),
            ('BORDER', (0, 0), (-1, -1), 1, COLOR_ERROR),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('LEFTPADDING', (0, 0), (-1, -1), 10),
            ('RIGHTPADDING', (0, 0), (-1, -1), 10),
        ]))
        
        # Mettre la table de synthèse et l'alerte côte à côte ou l'un sous l'autre
        summary_block.append(Table([[t_alert, t_summary]], colWidths=[360, 175]))
    else:
        summary_block.append(Table([["", t_summary]], colWidths=[385, 150]))
        
    elements.append(KeepTogether(summary_block))

    # 9. Lancement de la génération du document PDF
    try:
        doc.build(elements, canvasmaker=NumberedCanvas)
        return f"✅ Décompte DQE généré avec succès en local !\nFichier enregistré sous : {local_path}\n" \
               f"Montant Total HT : {format_fcfa(total_ht)} | TTC : {format_fcfa(total_ttc)}"
    except Exception as build_err:
        return f"❌ Erreur lors de la génération du PDF ReportLab : {build_err}"


if __name__ == "__main__":
    if len(sys.argv) > 1:
        # Si un chemin de logo est fourni en option
        logo = sys.argv[2] if len(sys.argv) > 2 else None
        print(generer_decompte(sys.argv[1], logo))
    else:
        print("Veuillez fournir l'ID du projet. Exemple : python scripts/generer_decompte_pdf.py <PROJET_UUID>")
