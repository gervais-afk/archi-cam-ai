import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv(".env.local")

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not all([SUPABASE_URL, SUPABASE_KEY]):
    print("❌ Erreur : Variables d'environnement manquantes dans .env.local")
    exit(1)

def run_schema():
    print("🔌 Connexion à Supabase...")
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    with open("supabase_schema.sql", "r", encoding="utf-8") as f:
        sql = f.read()

    print("🚀 Exécution du script SQL...")
    try:
        res = supabase.rpc("run_sql", {"query": sql}).execute()
        print("✅ Tables créées avec succès !")
    except Exception as e:
        print(f"❌ Erreur lors de l'exécution du SQL. Assurez-vous que la fonction RPC 'run_sql' existe. Erreur : {e}")
        print("💡 Vous pouvez également copier-coller le contenu de supabase_schema.sql directement dans l'éditeur SQL de Supabase.")

if __name__ == "__main__":
    run_schema()
