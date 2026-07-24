import os
import time
import json
import urllib.request
from supabase import create_client, Client
from dotenv import load_dotenv
from google import genai
from google.genai import types

# Importer le module de génération PDF
try:
    from generer_decompte_pdf import generer_decompte
except ImportError:
    generer_decompte = None

# Charger les variables d'environnement
load_dotenv(".env.local")

# ==========================================
# 1. CONFIGURATION DES API
# ==========================================
SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")

if not all([SUPABASE_URL, SUPABASE_KEY, GEMINI_API_KEY]):
    print("❌ Erreur : Variables d'environnement manquantes dans .env.local")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
client = genai.Client(api_key=GEMINI_API_KEY)

# ==========================================
# 2. OUTILS (implémentations Python)
# ==========================================
def get_gemini_embedding(text: str) -> list:
    """Génère un vecteur embedding via l'API Gemini."""
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key={GEMINI_API_KEY}"
    data = {
        "model": "models/gemini-embedding-001",
        "content": {"parts": [{"text": text}]},
        "outputDimensionality": 1536
    }
    req = urllib.request.Request(url, data=json.dumps(data).encode("utf-8"),
                                  headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req) as response:
            return json.loads(response.read().decode("utf-8"))["embedding"]["values"]
    except Exception as e:
        print(f"   ⚠️ Erreur embedding : {e}")
        return []

def _consulter_dqe_niveau(niveau_spatial: str) -> str:
    print(f"   ⚙️ [Outil] Consultation DQE pour le niveau : {niveau_spatial}...")
    try:
        res = supabase.table("devis_dqe").select("code_article, quantite_ifc_brute").eq("niveau_spatial", niveau_spatial).execute()
        if not res.data:
            return f"Aucune donnée trouvée pour le niveau '{niveau_spatial}' dans la base."
        lignes = [f"- {r['code_article']} | Quantité prévue : {r['quantite_ifc_brute']}" for r in res.data]
        return f"DQE prévu pour le niveau {niveau_spatial} :\n" + "\n".join(lignes)
    except Exception as e:
        return f"Erreur de lecture Supabase : {e}"

def _rechercher_lignes_dqe(mots_cles: str, niveau_spatial: str) -> str:
    print(f"   ⚙️ [Outil] Recherche de '{mots_cles}' au niveau '{niveau_spatial}'...")
    try:
        terme = f"%{mots_cles}%"
        res = supabase.table("devis_dqe") \
            .select("id, element_constructif, nom_materiau, quantite_majoree, quantite_executee") \
            .eq("niveau_spatial", niveau_spatial) \
            .or_(f"element_constructif.ilike.{terme},nom_materiau.ilike.{terme}") \
            .execute()
            
        if not res.data:
            return f"Aucune ligne DQE trouvée pour '{mots_cles}' au niveau '{niveau_spatial}'."
            
        lignes = []
        for r in res.data:
            lignes.append(f"ID: {r['id']} | Élément: {r['element_constructif']} | Matériau: {r['nom_materiau']} | Prévu: {r['quantite_majoree']} | Exécuté: {r['quantite_executee']}")
        
        return "Lignes trouvées :\n" + "\n".join(lignes) + "\n\n⚠️ INSTRUCTION POUR L'IA : Demande confirmation à l'utilisateur de la ligne exacte, ou si tu es sûr, utilise l'outil 'mettre_a_jour_avancement_par_id' avec l'ID correspondant."
    except Exception as e:
        return f"Erreur de recherche : {e}"

def _mettre_a_jour_avancement_par_id(id_ligne: str, quantite_realisee: float) -> str:
    print(f"   ⚙️ [Outil] Mise à jour ligne ID {id_ligne[:8]}... → {quantite_realisee}")
    try:
        # Vérification optionnelle de l'existence
        verif = supabase.table("devis_dqe").select("id").eq("id", id_ligne).execute()
        if not verif.data:
            return f"Erreur : L'ID {id_ligne} n'existe pas dans la base."
            
        supabase.table("devis_dqe").update({"quantite_executee": quantite_realisee}).eq("id", id_ligne).execute()
        return f"✅ Enregistré : La ligne {id_ligne} est maintenant à {quantite_realisee} unités exécutées."
    except Exception as e:
        return f"Erreur de mise à jour Supabase : {e}"

def _rechercher_base_connaissances(requete: str) -> str:
    print(f"   ⚙️ [Outil] Recherche RAG : '{requete}'...")
    embedding = get_gemini_embedding(requete)
    if not embedding:
        return "Impossible de générer l'embedding pour la recherche."
    try:
        res = supabase.rpc("match_knowledge_base", {
            "query_embedding": embedding,
            "match_threshold": 0.25,
            "match_count": 4
        }).execute()
        if not res.data:
            return f"Aucun document trouvé pour : '{requete}'."
        resultat = "Extraits de la base de connaissances :\n"
        for idx, item in enumerate(res.data):
            doc = item.get("metadata", {}).get("document_name", "Inconnu")
            sim = round(item.get("similarity", 0) * 100)
            resultat += f"\n[{idx+1}] {doc} (Confiance : {sim}%) :\n{item.get('content')}\n"
        return resultat
    except Exception as e:
        return f"Erreur RAG : {e}"

def _generer_decompte_mensuel(projet_id: str) -> str:
    print(f"   ⚙️ [Outil] Génération du décompte provisoire pour le projet : {projet_id}")
    if generer_decompte is None:
        return "L'outil de génération PDF n'est pas disponible (vérifiez generer_decompte_pdf.py)."
    return generer_decompte(projet_id)

# ==========================================
# 3. DÉCLARATIONS DES OUTILS (Schéma pour Gemini)
# ==========================================
outils_declarations = [
    types.FunctionDeclaration(
        name="consulter_dqe_niveau",
        description="Consulte la base de données pour obtenir les matériaux et quantités prévues pour un niveau du bâtiment (ex: RDC, ETG-1, FONDATION).",
        parameters=types.Schema(
            type=types.Type.OBJECT,
            properties={
                "niveau_spatial": types.Schema(type=types.Type.STRING, description="Le nom du niveau ex: 'RDC', 'ETG-1', 'FONDATION'")
            },
            required=["niveau_spatial"]
        )
    ),
    types.FunctionDeclaration(
        name="rechercher_lignes_dqe",
        description="Cherche des éléments spécifiques dans le DQE via un mot-clé (ex: 'poteau', 'semelle') pour un étage donné, avant toute mise à jour.",
        parameters=types.Schema(
            type=types.Type.OBJECT,
            properties={
                "mots_cles": types.Schema(type=types.Type.STRING, description="Le mot clé de recherche (ex: 'poteau')"),
                "niveau_spatial": types.Schema(type=types.Type.STRING, description="Le niveau ex: 'RDC'")
            },
            required=["mots_cles", "niveau_spatial"]
        )
    ),
    types.FunctionDeclaration(
        name="mettre_a_jour_avancement_par_id",
        description="Met à jour la quantité exécutée d'une ligne précise du DQE en utilisant son UUID unique (obtenu via 'rechercher_lignes_dqe').",
        parameters=types.Schema(
            type=types.Type.OBJECT,
            properties={
                "id_ligne": types.Schema(type=types.Type.STRING, description="L'UUID exact de la ligne dans la base de données"),
                "quantite_realisee": types.Schema(type=types.Type.NUMBER, description="La quantité physique réalisée")
            },
            required=["id_ligne", "quantite_realisee"]
        )
    ),
    types.FunctionDeclaration(
        name="rechercher_base_connaissances",
        description="Recherche des informations réglementaires, techniques ou méthodologiques (loi urbanisme Cameroun, géotechnique LABOGENIE, méthodes de calcul BTP) dans la base de connaissances documentaire.",
        parameters=types.Schema(
            type=types.Type.OBJECT,
            properties={
                "requete": types.Schema(type=types.Type.STRING, description="La phrase de recherche sémantique ex: 'permis de construire', 'dosage béton'")
            },
            required=["requete"]
        )
    ),
    types.FunctionDeclaration(
        name="generer_decompte_mensuel",
        description="Génère un décompte provisoire (facture mensuelle) officiel au format PDF listant toutes les quantités exécutées et valorisées financièrement. Retourne un lien de téléchargement.",
        parameters=types.Schema(
            type=types.Type.OBJECT,
            properties={
                "projet_id": types.Schema(type=types.Type.STRING, description="L'identifiant du projet. Si non spécifié, utiliser un identifiant par défaut ou demander à l'utilisateur.")
            },
            required=["projet_id"]
        )
    )
]

OUTILS_GEMINI = [types.Tool(function_declarations=outils_declarations)]

SYSTEM_PROMPT = """
Tu es l'Ingénieur Économiste et Conducteur de Travaux principal du projet 'Duplex NDA FAMILY' au Cameroun.
Tu analyses les retours chantier (texte, photos de bordereaux ou rapports), réponds aux questions techniques/réglementaires et tiens le budget à jour.

Règles de mise à jour d'avancement (TRES IMPORTANT) :
1. Si l'utilisateur signale une avancée (ex: "On a coulé les poteaux du RDC"), tu NE PEUX PAS mettre à jour la base directement.
2. ÉTAPE 1 : Tu DOIS obligatoirement utiliser l'outil 'rechercher_lignes_dqe' avec les mots-clés appropriés (ex: 'poteau' au 'RDC').
3. ÉTAPE 2 : Une fois que tu as les résultats, si tu trouves plusieurs lignes correspondantes (ex: Béton, Acier, Coffrage pour le poteau), demande confirmation à l'utilisateur de ce qu'il a réellement terminé (juste le béton ? tout ?).
4. ÉTAPE 3 : Une fois sûr, utilise l'outil 'mettre_a_jour_avancement_par_id' avec l'UUID exact de chaque ligne concernée. Ne devine jamais un UUID.

Génération de Facture / Décompte :
- Si l'utilisateur demande à générer un décompte (facture, état d'avancement mensuel), utilise 'generer_decompte_mensuel' et fournis-lui le lien PDF généré. Le projet_id par défaut est 'projet_test_01' si non précisé.

Pour les questions réglementaires ou techniques, utilise toujours 'rechercher_base_connaissances'.
Réponds en français, de manière professionnelle, concise et claire.
"""

# ==========================================
# 4. DISPATCH DES APPELS DE FONCTIONS
# ==========================================
FONCTION_MAP = {
    "consulter_dqe_niveau": _consulter_dqe_niveau,
    "rechercher_lignes_dqe": _rechercher_lignes_dqe,
    "mettre_a_jour_avancement_par_id": _mettre_a_jour_avancement_par_id,
    "rechercher_base_connaissances": _rechercher_base_connaissances,
    "generer_decompte_mensuel": _generer_decompte_mensuel
}

def dispatcher(function_call) -> str:
    name = function_call.name
    args = dict(function_call.args)
    fn = FONCTION_MAP.get(name)
    if fn:
        return fn(**args)
    return f"Outil inconnu : {name}"

# ==========================================
# 5. BOUCLE DE CONVERSATION PRINCIPALE
# ==========================================
def main():
    print("=" * 60)
    print("👷 AGENT MÉTREUR ARCHI CAM AI — Prêt !")
    print("=" * 60)
    print("Tapez votre message ou le chemin d'un fichier (PDF, JPG, PNG).")
    print("Tapez 'quitter' pour arrêter.\n")

    historique = []

    while True:
        entree = input("📝 Votre message : ").strip().strip('"').strip("'")
        if not entree:
            continue
        if entree.lower() in ['quitter', 'exit', 'quit']:
            print("👋 À bientôt !")
            break

        # Ajout dans l'historique
        historique.append(types.Content(role="user", parts=[types.Part(text=entree)]))
        
        print("🤖 L'Agent réfléchit...\n")
        try:
            # Boucle d'inférence avec appel automatique des fonctions
            while True:
                response = client.models.generate_content(
                    model="gemini-2.5-flash",
                    config=types.GenerateContentConfig(
                        system_instruction=SYSTEM_PROMPT,
                        tools=OUTILS_GEMINI,
                        temperature=0.3,
                    ),
                    contents=historique
                )

                candidate = response.candidates[0]
                part = candidate.content.parts[0]

                # Cas 1 : L'IA appelle un outil
                if part.function_call:
                    fn_call = part.function_call
                    print(f"   🔧 L'IA déclenche l'outil : {fn_call.name}({dict(fn_call.args)})")
                    
                    # Exécuter la fonction Python locale
                    resultat = dispatcher(fn_call)
                    
                    # Ajouter la réponse de l'outil à l'historique
                    historique.append(types.Content(role="model", parts=[types.Part(function_call=fn_call)]))
                    historique.append(types.Content(role="user", parts=[
                        types.Part(function_response=types.FunctionResponse(
                            name=fn_call.name,
                            response={"result": resultat}
                        ))
                    ]))
                    # Continuer la boucle pour que Gemini utilise le résultat
                    continue

                # Cas 2 : L'IA donne une réponse finale en texte
                texte_final = candidate.content.parts[0].text
                historique.append(types.Content(role="model", parts=[types.Part(text=texte_final)]))
                print(f"\n✅ Réponse de l'Agent :\n{texte_final}\n")
                print("-" * 60)
                break

        except Exception as e:
            err = str(e)
            if "429" in err or "RESOURCE_EXHAUSTED" in err:
                print("\n⚠️  Quota API Gemini atteint (limite gratuite journalière).")
                print("   💡 Solutions : attendez demain, ou activez la facturation sur https://aistudio.google.com")
            elif "404" in err or "NOT_FOUND" in err:
                print(f"\n❌ Modèle introuvable : {e}")
            else:
                print(f"\n❌ Erreur de l'Agent : {e}")
            print("-" * 60)

if __name__ == "__main__":
    main()
