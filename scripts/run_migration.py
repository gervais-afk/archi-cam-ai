import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv(".env.local")

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not all([SUPABASE_URL, SUPABASE_KEY]):
    print("❌ Erreur : Variables d'environnement manquantes dans .env.local")
    exit(1)

def run_migration():
    print("🔌 Connexion à Supabase...")
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    with open("scripts/migrations/migration_cache.sql", "r", encoding="utf-8") as f:
        sql = f.read()

    print("🚀 Exécution de la migration de cache (image_cache, render_jobs, match_cached_prompts)...")
    try:
        res = supabase.rpc("run_sql", {"query": sql}).execute()
        print("✅ Migration exécutée avec succès !")
    except Exception as e:
        print(f"❌ Erreur lors de l'exécution de la migration : {e}")
        print("💡 Si la fonction RPC 'run_sql' n'existe pas, vous pouvez copier-coller le contenu de scripts/migrations/migration_cache.sql directement dans l'éditeur SQL de Supabase.")

if __name__ == "__main__":
    run_migration()
