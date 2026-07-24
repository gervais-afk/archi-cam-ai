import json
import os
from supabase import create_client, Client

# Config
url = os.environ.get("SUPABASE_URL", "https://idgnmgrdhgwxmrmujhmv.supabase.co")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY", ""))


def import_objects():
    json_path = "export_supabase.json"
    if not os.path.exists(json_path):
        print(f"Erreur : Le fichier {json_path} n'existe pas. Veuillez d'abord exécuter export_bim_data.py.")
        return

    # 1. Connexion Supabase
    print("Connexion à Supabase...")
    supabase: Client = create_client(url, key)

    # 2. Récupérer l'ID du projet NDA FAMILY
    project_name = "Duplex R+1 - NDA FAMILY"
    existing = supabase.table("projects").select("id").eq("name", project_name).execute()
    if not existing.data:
        # Essayer avec l'ancien nom de client
        existing = supabase.table("projects").select("id").eq("client_name", "Dennis NDA").execute()
        
    if not existing.data:
        print(f"Erreur : Le projet '{project_name}' n'a pas été trouvé dans Supabase. Veuillez d'abord lancer harmonize_ifc_excel.py.")
        return
        
    project_id = existing.data[0]['id']
    print(f"Projet trouvé en base. ID : {project_id}")

    # 3. Charger le fichier JSON
    print(f"Lecture de {json_path}...")
    with open(json_path, "r", encoding="utf-8") as f:
        payload = json.load(f)

    devis_items = payload.get("devis_items", [])
    print(f"Nombre d'objets à importer : {len(devis_items)}")

    # Nettoyage des anciens objets pour ce projet
    print("Nettoyage des anciens objets BIM du projet...")
    try:
        supabase.table("project_bim_objects").delete().eq("project_id", project_id).execute()
    except Exception as e:
        print(f"Note: Impossible de vider project_bim_objects ({e}). La table n'a peut-être pas encore été créée dans Supabase.")
        print("⚠️ ACTION REQUISE : Assurez-vous d'avoir exécuté la définition de la table 'project_bim_objects' (à la fin de supabase_schema.sql) dans le SQL Editor de Supabase.")
        return

    # 4. Insertion par lots (batching) pour éviter les surcharges de requête
    batch_size = 100
    inserted_count = 0

    for i in range(0, len(devis_items), batch_size):
        batch = devis_items[i:i+batch_size]
        rows = []
        for item in batch:
            rows.append({
                "project_id": project_id,
                "ifc_id": item["ifc_id"],
                "nom_element": item["nom_element"],
                "classe_ifc": item["classe_ifc"],
                "niveau": item["niveau"],
                "code_article": item["code_article"],
                "quantite_volume_m3": item["quantite_volume_m3"],
                "quantite_surface_m2": item["quantite_surface_m2"]
            })
        
        try:
            supabase.table("project_bim_objects").insert(rows).execute()
            inserted_count += len(rows)
            print(f" Lot de {len(rows)} objets inséré ({inserted_count}/{len(devis_items)})")
        except Exception as err:
            print(f"Erreur lors de l'insertion du lot : {err}")
            break

    print(f"\n🎉 Importation complétée ! {inserted_count} objets BIM importés dans 'project_bim_objects'.")

if __name__ == "__main__":
    import_objects()
