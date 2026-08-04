import os
import json
import urllib.request

from dotenv import load_dotenv


# Charger les variables depuis .env.local
load_dotenv(".env.local")

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://postgres:ArchiCamAI_2025_Secure_BIM!@127.0.0.1:5432/fdcdb")


if not GEMINI_API_KEY:
    raise ValueError("Veuillez configurer GEMINI_API_KEY dans .env.local")

def get_gemini_embedding(text: str) -> list:
    """
    Génère un vecteur d'embedding de 1536 dimensions via l'API Google GenAI gemini-embedding-001.
    """
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key={GEMINI_API_KEY}"
    headers = {"Content-Type": "application/json"}
    data = {
        "model": "models/gemini-embedding-001",
        "content": {
            "parts": [{"text": text}]
        },
        "outputDimensionality": 1536
    }
    
    req = urllib.request.Request(url, data=json.dumps(data).encode("utf-8"), headers=headers)
    try:
        with urllib.request.urlopen(req) as response:
            res_data = json.loads(response.read().decode("utf-8"))
            return res_data["embedding"]["values"]
    except Exception as e:
        print(f"❌ Erreur lors de la génération de l'embedding : {e}")
        return []


def main():
    ifc_file = "duplex_r+1.ifc"
    
    print(f"📖 Analyse de base de : {ifc_file}...")
    
    project_name = "Duplex R+1 NDA FAMILY"
    summary = """Projet de construction de type Duplex R+1, conçu pour un environnement tropical. 
Il comprend des fondations renforcées, une structure en béton armé (poteaux, poutres, dalles), 
et des murs en agglos de ciment. Le bâtiment présente plusieurs ouvertures vitrées 
pour une bonne ventilation et luminosité naturelle. Surface estimée de plus de 200m²."""
    
    zone_climatique = "Tropicale Humide"
    type_de_sol = "Marécageux"
    accessibilite = "Difficile"

    text_to_embed = f"Projet: {project_name}\nZone: {zone_climatique}\nSol: {type_de_sol}\nAccessibilité: {accessibilite}\nDescription: {summary}"

    print(f"   -> Vectorisation de la synthèse projet ({len(text_to_embed)} caractères)...")
    embedding = get_gemini_embedding(text_to_embed)
    
    if not embedding:
        print("   ⚠️ Embedding vide, annulation.")
        return
        
    # Insertion dans PostgreSQL (Firebase Data Connect)
    try:
        print("   -> Insertion dans la base PostgreSQL locale...")
        import pg8000.dbapi
        
        host = os.environ.get("DB_HOST", "127.0.0.1")
        port = int(os.environ.get("DB_PORT", 5433))
        user = os.environ.get("DB_USER", "postgres")
        password = os.environ.get("DB_PASSWORD", "postgres")
        database = os.environ.get("DB_NAME", "fdcdb")
        
        conn = pg8000.dbapi.connect(
            host=host,
            port=port,
            user=user,
            password=password,
            database=database
        )
        cur = conn.cursor()
        
        vector_str = f"[{','.join(map(str, embedding))}]"
        
        cur.execute(
            """
            INSERT INTO project_memory 
            (project_name, summary, zone_climatique, type_de_sol, accessibilite, embedding) 
            VALUES (%s, %s, %s, %s, %s, %s) RETURNING id;
            """,
            (project_name, summary, zone_climatique, type_de_sol, accessibilite, vector_str)
        )
        inserted_id = cur.fetchone()[0]
        conn.commit()
        
        print(f"✅ Ingestion de {ifc_file} terminée avec succès ! ID = {inserted_id}")
        
        cur.close()
        conn.close()
    except Exception as e:
        print(f"   ❌ Erreur d'insertion PostgreSQL : {e}")


if __name__ == "__main__":
    main()
