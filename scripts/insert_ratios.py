import os
import json
from supabase import create_client, Client

# -----------------------------------------------------------------
# insert_ratios.py – insère les ratios de composition dans la table
# -----------------------------------------------------------------

# Chargement des variables d'environnement Supabase (ou .env.local)
SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")  # clé admin

if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError("Missing Supabase URL or Service Role Key in environment.")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# -----------------------------------------------------------------
# Exemple de données – vous pouvez remplacer ce dictionnaire par la
# lecture d'un fichier JSON/CSV contenant vos ratios.
# -----------------------------------------------------------------
ratios = [
    {
        "projet_id": "00000000-0000-0000-0000-000000000001",  # UUID du projet cible
        "code_article": "POR-ETAG-70X220",
        "ratio": 1.0,
        "unite": "u",
        "prix_unitaire_fourniture": 0.0,
        "prix_unitaire_main_oeuvre": 0.0,
    },
    {
        "projet_id": "00000000-0000-0000-0000-000000000001",
        "code_article": "GDC-ETG",
        "ratio": 1.0,
        "unite": "ml",
        "prix_unitaire_fourniture": 0.0,
        "prix_unitaire_main_oeuvre": 0.0,
    },
    # Ajoutez autant d'entrées que nécessaire …
]

# -----------------------------------------------------------------
# Insertion batch (max 100 lignes par requête – Supabase limite à 100)
# -----------------------------------------------------------------
BATCH_SIZE = 100
for i in range(0, len(ratios), BATCH_SIZE):
    batch = ratios[i : i + BATCH_SIZE]
    try:
        response = supabase.table("recettes_composition").insert(batch).execute()
        if response.error:
            print(f"❌ Erreur d'insertion du lot {i // BATCH_SIZE + 1}: {response.error.message}")
        else:
            print(f"✅ Lot {i // BATCH_SIZE + 1} inséré ({len(batch)} lignes).")
    except Exception as e:
        print(f"❌ Exception lors de l'insertion du lot {i // BATCH_SIZE + 1}: {e}")

print("\n✅ Insertion terminée.")
