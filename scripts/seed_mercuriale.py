import os
import sys
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv(".env.local")

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not all([SUPABASE_URL, SUPABASE_KEY]):
    print("❌ Variables d'environnement manquantes dans .env.local")
    sys.exit(1)

def seed_mercuriale():
    print("🔌 Connexion à Supabase...")
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    # Catalogue des prix de la Mercuriale calibré pour le duplex NDA FAMILY (prix FCFA)
    catalogue = [
        {"code_article": "BDP-FON-08", "designation": "Béton de propreté dosé à 150kg/m3", "unite": "m3", "prix_unitaire_fourniture": 60000.0, "prix_unitaire_main_oeuvre": 15000.0, "categorie_lot": "Gros Œuvre - Fondation"},
        {"code_article": "SEM-FON-ISOL", "designation": "Béton armé pour semelles isolées dosé à 350kg/m3", "unite": "m3", "prix_unitaire_fourniture": 120000.0, "prix_unitaire_main_oeuvre": 30000.0, "categorie_lot": "Gros Œuvre - Fondation"},
        {"code_article": "AMO-FON-20X25", "designation": "Béton armé pour amorces poteaux 20x25 dosé à 350kg/m3", "unite": "m3", "prix_unitaire_fourniture": 130000.0, "prix_unitaire_main_oeuvre": 40000.0, "categorie_lot": "Gros Œuvre - Fondation"},
        {"code_article": "LON-FON-01", "designation": "Béton armé pour longrines de fondation dosé à 350kg/m3", "unite": "m3", "prix_unitaire_fourniture": 125000.0, "prix_unitaire_main_oeuvre": 35000.0, "categorie_lot": "Gros Œuvre - Fondation"},
        {"code_article": "DAL-RDC-10", "designation": "Béton armé pour dallage RDC ep 10cm dosé à 350kg/m3", "unite": "m3", "prix_unitaire_fourniture": 95000.0, "prix_unitaire_main_oeuvre": 25000.0, "categorie_lot": "Gros Œuvre - Structure"},
        {"code_article": "POT-RDC-15X25", "designation": "Béton armé pour poteaux RDC 15x25 dosé à 350kg/m3", "unite": "m3", "prix_unitaire_fourniture": 140000.0, "prix_unitaire_main_oeuvre": 45000.0, "categorie_lot": "Gros Œuvre - Structure"},
        {"code_article": "POT-ETG-15X25", "designation": "Béton armé pour poteaux étage 15x25 dosé à 350kg/m3", "unite": "m3", "prix_unitaire_fourniture": 140000.0, "prix_unitaire_main_oeuvre": 45000.0, "categorie_lot": "Gros Œuvre - Structure"},
        {"code_article": "POU-RDC-15X35", "designation": "Béton armé pour poutres RDC 15x35 dosé à 350kg/m3", "unite": "m3", "prix_unitaire_fourniture": 135000.0, "prix_unitaire_main_oeuvre": 40000.0, "categorie_lot": "Gros Œuvre - Structure"},
        {"code_article": "LINT-RDC-15X20", "designation": "Béton armé pour linteaux RDC 15x20 dosé à 350kg/m3", "unite": "m3", "prix_unitaire_fourniture": 125000.0, "prix_unitaire_main_oeuvre": 35000.0, "categorie_lot": "Gros Œuvre - Structure"},
        {"code_article": "LINT-ETAG-15X20", "designation": "Béton armé pour linteaux étage 15x20 dosé à 350kg/m3", "unite": "m3", "prix_unitaire_fourniture": 125000.0, "prix_unitaire_main_oeuvre": 35000.0, "categorie_lot": "Gros Œuvre - Structure"},
        {"code_article": "CHAIN-ETAG-15X20", "designation": "Béton armé pour chaînages étage 15x20 dosé à 350kg/m3", "unite": "m3", "prix_unitaire_fourniture": 120000.0, "prix_unitaire_main_oeuvre": 30000.0, "categorie_lot": "Gros Œuvre - Structure"},
        {"code_article": "POT_AVANT", "designation": "Béton armé pour poteaux avant dosé à 350kg/m3", "unite": "m3", "prix_unitaire_fourniture": 140000.0, "prix_unitaire_main_oeuvre": 45000.0, "categorie_lot": "Gros Œuvre - Structure"},
        {"code_article": "SOUB-FON-20", "designation": "Murs de soubassement en agglos lourds de 20x20x40 remplis", "unite": "m2", "prix_unitaire_fourniture": 6500.0, "prix_unitaire_main_oeuvre": 2000.0, "categorie_lot": "Gros Œuvre - Maçonnerie"},
        {"code_article": "MUR-RDC-15", "designation": "Murs de façade RDC en agglos creux de 15x20x40", "unite": "m2", "prix_unitaire_fourniture": 4500.0, "prix_unitaire_main_oeuvre": 1500.0, "categorie_lot": "Gros Œuvre - Maçonnerie"},
        {"code_article": "MUR-ETG-15", "designation": "Murs de façade Étage en agglos creux de 15x20x40", "unite": "m2", "prix_unitaire_fourniture": 4500.0, "prix_unitaire_main_oeuvre": 1500.0, "categorie_lot": "Gros Œuvre - Maçonnerie"},
        {"code_article": "MUR-INT-RDC-01", "designation": "Murs de cloisonnement intérieur RDC en agglos de 10x20x40", "unite": "m2", "prix_unitaire_fourniture": 4000.0, "prix_unitaire_main_oeuvre": 1500.0, "categorie_lot": "Gros Œuvre - Maçonnerie"},
        {"code_article": "MUR-INT-ETG-01", "designation": "Murs de cloisonnement intérieur Étage en agglos de 10x20x40", "unite": "m2", "prix_unitaire_fourniture": 4000.0, "prix_unitaire_main_oeuvre": 1500.0, "categorie_lot": "Gros Œuvre - Maçonnerie"},
        {"code_article": "PIGNON-01", "designation": "Maçonnerie de pignons en agglos de 15x20x40", "unite": "m2", "prix_unitaire_fourniture": 4800.0, "prix_unitaire_main_oeuvre": 1700.0, "categorie_lot": "Gros Œuvre - Maçonnerie"},
        {"code_article": "DAL-ETG-16+4", "designation": "Plancher corps creux 16+4 pour dalle étage", "unite": "m2", "prix_unitaire_fourniture": 21000.0, "prix_unitaire_main_oeuvre": 6000.0, "categorie_lot": "Gros Œuvre - Plancher"},

        {"code_article": "FEN-RDC-70X60", "designation": "Châssis vitré coulissant en aluminium 70x60 pour pièces d'eau", "unite": "u", "prix_unitaire_fourniture": 38000.0, "prix_unitaire_main_oeuvre": 7000.0, "categorie_lot": "Menuiseries - Aluminium"},
        {"code_article": "BOIS-RIVE_0,02X20", "designation": "Bois rive 0,02x20", "unite": "ml", "prix_unitaire_fourniture": 0.0, "prix_unitaire_main_oeuvre": 0.0, "categorie_lot": "Bois"},
        {"code_article": "FEN-ETAG-120X120", "designation": "Fenêtre étage 120x120", "unite": "u", "prix_unitaire_fourniture": 0.0, "prix_unitaire_main_oeuvre": 0.0, "categorie_lot": "Menuiseries - Aluminium"},
        {"code_article": "FEN-ETAG-70X60", "designation": "Fenêtre étage 70x60", "unite": "u", "prix_unitaire_fourniture": 0.0, "prix_unitaire_main_oeuvre": 0.0, "categorie_lot": "Menuiseries - Aluminium"},
        {"code_article": "FEN-RDC-120X120", "designation": "Fenêtre RDC 120x120", "unite": "u", "prix_unitaire_fourniture": 0.0, "prix_unitaire_main_oeuvre": 0.0, "categorie_lot": "Menuiseries - Aluminium"},
        {"code_article": "GDC-ETG", "designation": "Garde-corps étage", "unite": "ml", "prix_unitaire_fourniture": 0.0, "prix_unitaire_main_oeuvre": 0.0, "categorie_lot": "Serrurerie - Garde-corps"},
        {"code_article": "GDC-RDC", "designation": "Garde-corps RDC", "unite": "ml", "prix_unitaire_fourniture": 0.0, "prix_unitaire_main_oeuvre": 0.0, "categorie_lot": "Serrurerie - Garde-corps"},
        {"code_article": "NON_RENSEIGNE", "designation": "Non renseigné", "unite": "u", "prix_unitaire_fourniture": 0.0, "prix_unitaire_main_oeuvre": 0.0, "categorie_lot": "Divers"},
        {"code_article": "POR-ETAG-70X220", "designation": "Portes étage 70x220", "unite": "u", "prix_unitaire_fourniture": 0.0, "prix_unitaire_main_oeuvre": 0.0, "categorie_lot": "Menuiseries - Portes"},
        {"code_article": "POR-ETAG-90X220", "designation": "Portes étage 90x220", "unite": "u", "prix_unitaire_fourniture": 0.0, "prix_unitaire_main_oeuvre": 0.0, "categorie_lot": "Menuiseries - Portes"},
        {"code_article": "POR-ETAGE 120X220", "designation": "Portes étage 120x220", "unite": "u", "prix_unitaire_fourniture": 0.0, "prix_unitaire_main_oeuvre": 0.0, "categorie_lot": "Menuiseries - Portes"},
        {"code_article": "POR-RDC-120X220", "designation": "Portes RDC 120x220", "unite": "u", "prix_unitaire_fourniture": 0.0, "prix_unitaire_main_oeuvre": 0.0, "categorie_lot": "Menuiseries - Portes"},
        {"code_article": "POR-RDC-70X220", "designation": "Portes RDC 70x220", "unite": "u", "prix_unitaire_fourniture": 0.0, "prix_unitaire_main_oeuvre": 0.0, "categorie_lot": "Menuiseries - Portes"},
        {"code_article": "POR-RDC-90X220", "designation": "Portes RDC 90x220", "unite": "u", "prix_unitaire_fourniture": 0.0, "prix_unitaire_main_oeuvre": 0.0, "categorie_lot": "Menuiseries - Portes"},
        {"code_article": "POR_COUL 125X220", "designation": "Portes coulissante 125x220", "unite": "u", "prix_unitaire_fourniture": 0.0, "prix_unitaire_main_oeuvre": 0.0, "categorie_lot": "Menuiseries - Portes"},
        {"code_article": "TOI-CHEVRON-BOIS-5X7", "designation": "Toiture chevron bois 5x7", "unite": "ml", "prix_unitaire_fourniture": 0.0, "prix_unitaire_main_oeuvre": 0.0, "categorie_lot": "Charpente"},
        {"code_article": "TOI-PANNE-BOIS-8X15", "designation": "Toiture panne bois 8X15", "unite": "ml", "prix_unitaire_fourniture": 0.0, "prix_unitaire_main_oeuvre": 0.0, "categorie_lot": "Charpente"}
    ]
    
    # Correction d'un typo potentiel dans les clés d'import
    for item in catalogue:
        if "prix_uniture_fourniture" in item:
            item["prix_unitaire_fourniture"] = item.pop("prix_uniture_fourniture")

    print(f"🚀 Injection de {len(catalogue)} articles dans la table 'mercuriale_prix'...")
    try:
        supabase.table("mercuriale_prix").upsert(catalogue).execute()
        print("✅ Mercuriale de base initialisée avec succès !")
    except Exception as e:
        print(f"❌ Erreur lors de l'initialisation de la Mercuriale : {e}")

if __name__ == "__main__":
    seed_mercuriale()
