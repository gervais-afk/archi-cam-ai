import os
import json
import glob
from supabase import create_client, Client
from dotenv import load_dotenv

# Charger les variables depuis .env.local
load_dotenv(".env.local")

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
# Utilise la clé service_role de préférence pour passer outre RLS
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")

# Initialisation du client Supabase
if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("Veuillez configurer NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY dans .env.local")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def get_gemini_embedding(text: str) -> list:
    """
    Génère un vecteur d'embedding de 1536 dimensions en utilisant l'API gemini-embedding-001 de Google.
    """
    import urllib.request
    
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
        print(f"Erreur lors de la génération de l'embedding : {e}")
        return []

def chunk_text(text: str, max_words: int = 150, overlap: int = 30) -> list:
    """
    Découpe un texte brut en blocs (chunks) de mots cohérents avec chevauchement pour le RAG.
    """
    words = text.split()
    chunks = []
    i = 0
    while i < len(words):
        chunk = words[i:i + max_words]
        chunks.append(" ".join(chunk))
        i += max_words - overlap
    return chunks

def extract_text_from_pdf(pdf_path: str) -> str:
    """
    Extrait le texte d'un fichier PDF en utilisant la bibliothèque pypdf.
    """
    try:
        from pypdf import PdfReader
        reader = PdfReader(pdf_path)
        text = ""
        for i, page in enumerate(reader.pages):
            page_text = page.extract_text()
            if page_text:
                text += f"\n--- PAGE {i+1} ---\n" + page_text
        return text
    except ImportError:
        print("⚠️ [pypdf manquant] Pour traiter les fichiers PDF directements, veuillez d'abord installer pypdf.")
        return ""

def ingest_document(file_path: str):
    """
    Lit un document (TXT, JSON ou PDF), le découpe, génère les embeddings et l'insère dans Supabase.
    """
    filename = os.path.basename(file_path)
    print(f"📖 Ingestion de : {filename}...")
    
    ext = os.path.splitext(filename)[1].lower()
    
    if ext == ".pdf":
        content = extract_text_from_pdf(file_path)
        if not content:
            print(f"❌ Impossible de traiter le PDF : {filename} (pypdf manquant ou fichier vide)")
            return
    elif ext in [".txt", ".json"]:
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()
        except Exception as e:
            print(f"❌ Impossible de lire le fichier {filename} : {e}")
            return
    else:
        print(f"⚠️ Extension non supportée pour {filename}")
        return

    # Découpage du texte en fragments d'environ 150 mots
    chunks = chunk_text(content)
    print(f"   -> Découpé en {len(chunks)} fragments.")
    
    for idx, chunk in enumerate(chunks):
        if not chunk.strip():
            continue
            
        print(f"   -> Vectorisation du fragment {idx + 1}/{len(chunks)}...")
        embedding = get_gemini_embedding(chunk)
        
        if not embedding:
            print("   ⚠️ Embedding vide, saut de cette ligne.")
            continue
            
        # Données à insérer
        data = {
            "content": chunk,
            "metadata": {
                "source": filename,
                "document_name": filename,
                "chunk_index": idx,
                "length": len(chunk)
            },
            "embedding": embedding
        }
        
        # Insertion dans Supabase
        try:
            supabase.table("knowledge_base").insert(data).execute()
        except Exception as e:
            print(f"   ❌ Erreur d'insertion Supabase : {e}")
            
    print(f"✅ Ingestion de {filename} terminée avec succès !\n")

def main():
    knowledge_dir = os.path.join("data", "knowledge")
    os.makedirs(knowledge_dir, exist_ok=True)
    
    # Recherche de tous les fichiers texte, JSON et PDF
    files = []
    for ext in ["*.txt", "*.json", "*.pdf"]:
        files.extend(glob.glob(os.path.join(knowledge_dir, ext)))
    
    if not files:
        print(f"ℹ️ Aucun fichier trouvé dans '{knowledge_dir}'.")
        return

    for file_path in files:
        ingest_document(file_path)

if __name__ == "__main__":
    if not GEMINI_API_KEY:
        print("❌ Veuillez configurer GEMINI_API_KEY dans votre environnement (.env.local).")
    else:
        main()
