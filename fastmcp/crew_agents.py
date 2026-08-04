import os
import json
import urllib.request
import pg8000.dbapi
from typing import List, Dict, Any
from crewai import Agent, Task, Crew, Process, LLM
from crewai.tools import tool
from dotenv import load_dotenv


# Charger les variables depuis .env.local
load_dotenv(".env.local")

# --- CONFIGURATION DU LLM GEMINI (Agents créatifs / économiques) ---
gemini_api_key = os.environ.get("GEMINI_API_KEY")
if not gemini_api_key:
    raise ValueError("GEMINI_API_KEY manquante dans l'environnement. Veuillez la configurer dans .env.local")

llm = LLM(
    model="gemini/gemini-2.5-flash",  # Fallback cloud + agents créatifs/économiques
    api_key=gemini_api_key,
    temperature=0.1
)

# --- CONFIGURATION DU LLM GEMMA 4 LOCAL (Souverain / Edge AI pour @agent-structure) ---
# LM Studio expose un endpoint OpenAI-compatible sur http://127.0.0.1:1234/v1
# Modèle chargé : google/gemma-4-12b-qat
LOCAL_LLM_URL = os.environ.get("LOCAL_LLM_URL", "http://127.0.0.1:1234/v1")
LOCAL_LLM_MODEL = os.environ.get("LOCAL_LLM_MODEL", "google/gemma-4-12b-qat")

try:
    llm_gemma4_local = LLM(
        model=f"openai/{LOCAL_LLM_MODEL}",
        base_url=LOCAL_LLM_URL,
        api_key="lm-studio",  # LM Studio n'a pas de vraie clé API
        temperature=0.0  # Zéro température pour les calculs structuraux déterministes
    )
    print(f"[CrewAI] ✅ Gemma 4 local (souverain) branché sur {LOCAL_LLM_URL} avec modèle '{LOCAL_LLM_MODEL}'")
except Exception as e:
    print(f"[CrewAI] ⚠️  Gemma 4 local non disponible ({e}). Fallback sur Gemini Flash pour l'agent structure.")
    llm_gemma4_local = llm  # Fallback gracieux sur Gemini si LM Studio est éteint

DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://postgres:ArchiCamAI_2025_Secure_BIM!@127.0.0.1:5433/fdcdb")

def get_gemini_embedding(text: str) -> list:
    """Génère un vecteur d'embedding de 1536 dimensions via l'API Google GenAI gemini-embedding-001."""
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key={gemini_api_key}"
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
        print(f"❌ Erreur RAG embedding: {e}")
        return []


# --- OUTILS POUR LES AGENTS ---
@tool("Lire les règles OKF")
def read_okf_rules_tool() -> str:
    """Permet de lire les ratios de dosage, les formules de calcul et les coûts unitaires de la base OKF (Gros/Second Œuvre)."""
    try:
        okf_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../knowledge_base/okf_gros_second_oeuvre.md"))
        if not os.path.exists(okf_path):
            okf_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "knowledge_base/okf_gros_second_oeuvre.md"))
        with open(okf_path, "r", encoding="utf-8") as f:
            return f.read()
    except Exception as e:
        return f"Erreur lors de la lecture de l'OKF : {str(e)}"

@tool("Rechercher Projets Historiques Similaires")
def search_similar_projects_tool(query: str) -> str:
    """Recherche des projets de construction similaires dans la base de connaissances (RAG) à partir d'une description.
    Utile pour adapter les coûts de fondation, les ratios d'acier ou de béton en fonction des précédents réels.
    """
    embedding = get_gemini_embedding(query)
    if not embedding:
        return "Impossible de générer l'embedding pour la recherche."
    try:
        host = os.environ.get("DB_HOST", "127.0.0.1")
        port = int(os.environ.get("DB_PORT", 5432))
        user = os.environ.get("DB_USER", "postgres")
        password = os.environ.get("DB_PASSWORD", "ArchiCamAI_2025_Secure_BIM!")
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
            SELECT project_name, summary, zone_climatique, type_de_sol, accessibilite,
                   1 - (embedding <=> %s::vector) AS similarity
            FROM project_memory
            ORDER BY embedding <=> %s::vector
            LIMIT 3;
            """,
            (vector_str, vector_str)
        )
        rows = cur.fetchall()
        cur.close()
        conn.close()
        
        if not rows:
            return "Aucun projet similaire trouvé dans l'historique."
            
        res = "### Projets Historiques Similaires Trouvés :\n"
        for row in rows:
            name, summary, zone, sol, access, similarity = row
            res += f"- **{name}** (Pertinence: {similarity*100:.1f}%)\n"
            res += f"  Zone: {zone} | Sol: {sol} | Accès: {access}\n"
            res += f"  Résumé: {summary}\n\n"
        return res
    except Exception as e:
        return f"Erreur de recherche RAG (base de données locale) : {str(e)}"

# --- DÉFINITION DES AGENTS ---
# 🟠 designer  → Gemini 1.5 Flash (créativité, bioclimat)
# 🔒 technique → Gemma 4 local Souverain (calculs BAEL 91 — données sensibles HORS cloud)
# 💼 commercial→ Gemini 1.5 Flash (chiffrage Mercuriale, RAG)
# 🏗️ conducteur→ Gemini 1.5 Flash (planning, synthèse JSON)

designer = Agent(
    role="Architecte Designer Bioclimatique",
    goal="""Déterminer le standing architectural (économique, moyen, luxe) 
    et proposer les orientations esthétiques et bioclimatiques adaptées au Cameroun.""",
    backstory="""Tu es un architecte réputé en Afrique Centrale. Tu sais marier design moderne, 
    matériaux locaux (BTC, latérite, bois d'Iroko) et confort thermique (ventilation croisée, brise-soleil).
    Tu adaptes ton design à la zone climatique indiquée pour minimiser la consommation énergétique.""",
    verbose=True,
    allow_delegation=False,
    llm=llm  # Gemini 1.5 Flash
)

technique = Agent(
    role="Ingénieur Structure & Métrés BTP — Auditeur BAEL 91 Souverain",
    goal="""Traduire les volumes bruts de béton (extraits de la maquette IFC) en quantitatifs exacts 
    de ressources avec coefficients de pertes en appliquant les dosages de l'OKF et en ajustant 
    le dimensionnement selon la nature du sol. Vérifier la conformité BAEL 91 et Eurocodes.""",
    backstory="""Tu es un ingénieur structure chevronné formé en Europe et expert du BTP africain. 
    Tu maîtrises l'Eurocode 2, la norme BAEL 91 et les dosages de ressources (ciment, sable, gravier, acier).
    Tu travailles en LOCAL SOUVERAIN : les plans de bâtiments gouvernementaux ou privés ne quittent JAMAIS 
    les serveurs locaux. Si le sol est marécageux ou instable, tu imposes des fondations renforcées 
    (longrines ou radier) et tu augmentes le ratio d'acier de 20% par précaution géotechnique.""",
    verbose=True,
    allow_delegation=False,
    llm=llm_gemma4_local,  # 🔒 GEMMA 4 LOCAL (google/gemma-4-12b-qat via LM Studio) — 100% Souverain
    tools=[read_okf_rules_tool]
)

commercial = Agent(
    role="Économiste de la Construction & Acheteur",
    goal="""Calculer le chiffrage en cascade en appliquant la Mercuriale de l'OKF, les remises fournisseurs 
    sur volume, et en vérifiant l'historique RAG pour fiabiliser le coût.""",
    backstory="""Tu es le gardien du budget. Tu connais par cœur les prix réels de la Mercuriale (ciment, 
    sable, gravier, acier) et tu calcules les prix PVHT et TTC. Tu interroges toujours l'historique RAG pour voir 
    si un projet sur sol similaire a nécessité des coûts supplémentaires ou bénéficié de tarifs négociés.""",
    verbose=True,
    allow_delegation=False,
    llm=llm,
    tools=[read_okf_rules_tool, search_similar_projects_tool]
)

conducteur = Agent(
    role="Conducteur de Travaux & Planificateur",
    goal="""Calculer la durée totale estimée du chantier, planifier le calendrier sous contraintes météorologiques, 
    identifier les risques et synthétiser le devis final au format JSON.""",
    backstory="""Tu es l'homme de terrain. Tu structures le planning, coordonnes les livraisons, veilles 
    aux retenues financières (10% garantie, 2.2% AIR) et formates la sortie au format JSON strict attendu.
    Tu prends fortement en compte la saison climatique pour ajuster les délais opérationnels (saison des pluies = ralentissement).""",
    verbose=True,
    allow_delegation=False,
    llm=llm,
    tools=[read_okf_rules_tool, search_similar_projects_tool]
)

# --- DÉFINITION DES TÂCHES ---

def run_archi_project_crew(ifc_metadata: Dict[str, Any], prompt_context: str, zone_climatique: str = "Tropicale", type_sol: str = "Normal", saison: str = "saison_seche") -> str:
    """
    Lance l'équipe d'agents CrewAI pour chiffrer et optimiser le projet.
    Reçoit les volumes bruts extraits de l'IFC et le contexte environnemental.
    """
    # 1. Tâche du Designer (Analyse esthétique et bioclimatique)
    task_design = Task(
        description=f"""
        Analyse les consignes du client : "{prompt_context}".
        Le projet se situe en zone climatique : "{zone_climatique}".
        Détermine le standing du projet (économique, moyen ou luxe).
        Suggère des choix de finitions et d'aménagements bioclimatiques (ex: parements briques, ventilation naturelle) 
        particulièrement adaptés à cette zone.
        """,
        expected_output="Une note d'orientation de design avec standing cible et choix de finitions adaptés au climat.",
        agent=designer
    )

    # 2. Tâche de l'Ingénieur (Calculs stricts de l'OKF + ajustements sol)
    task_structural = Task(
        description=f"""
        Prends les volumes bruts extraits de la maquette IFC :
        - Volume de béton estimé : {ifc_metadata.get('concreteVolume', 120.5)} m3
        - Poids d'acier estimé : {ifc_metadata.get('steelWeight', 10800.0)} kg
        - Surface de parois/murs : {ifc_metadata.get('wallArea', 185.0)} m2
        
        La nature du sol pour le projet est : "{type_sol}".
        Consulte l'OKF (outil 'Lire les règles OKF').
        Calcule les quantités réelles de ressources nécessaires en appliquant les coefficients de perte du Guide de l'Ingénierie de l'Estimation au Cameroun :
        - Béton et agrégats (Ciment, Sable, Gravier) : applique un coefficient de perte de 5% (x 1.05)
        - Acier HA : applique un coefficient de perte de 10% (x 1.10) pour façonner le ferraillage
        
        Calculs théoriques de base :
        - Ciment CPJ (en sacs de 50kg) = Volume de béton × 7 × 1.05
        - Sable de Sanaga (en m³) = Volume de béton × 0.45 × 1.05
        - Gravier de carrière (en tonnes) = Volume de béton × 1.12 × 1.05
        - Murs d'élévation (nombre d'agglos de 15) : compte 10 agglos par m² de parois (inclut 5% de perte).
        
        ATTENTION : L'Acier HA de base (en kg) = Volume de béton × 80 × 1.10.
        MAIS si le type de sol est "Marécageux", applique une majoration de sécurité géotechnique de 20% sur la quantité totale d'acier nécessaire pour les fondations renforcées !
        """,
        expected_output="Un métré détaillé des ressources brutes nécessaires ajustées selon la nature géotechnique du sol et les coefficients de perte officiels.",
        agent=technique
    )

    # 3. Tâche du Commercial (Calcul de prix & RAG historique)
    task_costing = Task(
        description=f"""
        À partir des quantités fournies par l'Ingénieur :
        1. Utilise l'outil 'Rechercher Projets Historiques Similaires' avec la requête '{type_sol} {zone_climatique}' pour vérifier s'il existe des précédents et comment ils ont été chiffrés.
        2. Calcule le montant de chaque ressource en utilisant la Mercuriale de l'OKF (prends en compte la zone climatique '{zone_climatique}' pour adapter le prix du ciment s'il y a lieu : Douala/Yaoundé ≈ 5500 FCFA/sac, Grand-Nord ≈ 6800 FCFA/sac) :
           - Ciment CPJ 42.5 = 5 500 FCFA / sac (ou 6 800 si Grand-Nord)
           - Sable de Sanaga = 23 000 FCFA / m³
           - Gravier de carrière = 13 000 FCFA / tonne
           - Acier HA = 700 FCFA / kg
           - Agglos de 15 = 300 FCFA / unité (fourniture seule)
        3. Applique les remises de volume :
           - Si ciment > 200 sacs, applique une remise de 5% sur le prix unitaire du sac.
           - Si acier > 2000 kg, applique une remise de 3% sur le prix du kg.
        4. Calcule la cascade financière : Total de Base, Main-d'œuvre (+20% pour le tâcheronnat), Imprévus (+3%), Total HT, TVA (19.25%), et Total TTC.
        """,
        expected_output="Un chiffrage des prix par ressource avec déduction des remises, intégrant les enseignements du RAG et le calcul final en cascade.",
        agent=commercial
    )

    # 4. Tâche du Commentateur / Conducteur (Planning & Synthèse finale JSON)
    task_scheduling = Task(
        description=f"""
        Synthétise tout le travail.
        Intègre la saison météorologique : "{saison}". Si saison = "saison_pluies_forte", majore la durée de main-d'oeuvre de 30% en raison des intempéries de chantier.
        Rédige les contraintes logistiques et réglementaires du conducteur (cure humide de 7 jours, décoffrage vertical à 48h, décoffrage horizontal à 14 jours minimum selon l'OKF).
        Mets en garde le tâcheron sur les retenues financières réglementaires :
           - Retenue de garantie de 10% appliquée sur les acomptes.
           - Acompte sur Impôt sur le Revenu (AIR) de 2.2% (ou 5.5% si tacheron non enregistré fiscalement).
        Calcule la durée estimée du chantier en jours (compte 0.5h de main-d'œuvre par m2 de parois et 1.2h par m3 de béton, ajoute 14 jours pour le séchage incompressible de la dalle).
        
        Tu dois STRICTEMENT formater ton rapport de sortie sous forme d'un objet JSON valide respectant cette structure exacte :
        {{
            "totalAmount": 12345000,
            "currency": "FCFA",
            "lines": [
                {{
                    "code": "MAT-CIM",
                    "category": "Gros Œuvre",
                    "label": "Ciment CPJ 42.5 (sac)",
                    "quantity": 880,
                    "unit": "Sac",
                    "unitPrice": 5500,
                    "totalPrice": 4840000,
                    "justification": "Volume béton * 7 * 1.05"
                }}
            ],
            "totalHT": 10000000,
            "margeBET": 0,
            "margeAleas": 0,
            "tva": 1925000,
            "totalTTC": 11925000,
            "analysis": {{
                "standing": "standing cible",
                "duration_days": 45,
                "comments": "commentaires du conducteur (dont retenue de garantie 10%, AIR 2.2%/5.5% et cure de 7j)",
                "riskLevel": "LOW | MEDIUM | HIGH"
            }}
        }}
        """,
        expected_output="Un JSON brut valide respectant la structure spécifiée, sans aucun autre texte autour.",
        agent=conducteur
    )

    crew = Crew(
        agents=[designer, technique, commercial, conducteur],
        tasks=[task_design, task_structural, task_costing, task_scheduling],
        process=Process.sequential,
        verbose=True
    )

    result = crew.kickoff()
    return str(result)


