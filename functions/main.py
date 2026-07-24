# Fichier : functions/main.py
import os
import tempfile
import requests
import difflib
from firebase_functions import storage_fn
from firebase_admin import initialize_app, storage

# Initialisation de l'application Firebase Admin
initialize_app()

# Configuration de Data Connect (GraphQL REST API)
DATA_CONNECT_URL = os.environ.get(
    "DATA_CONNECT_URL", 
    # Émulateur local par défaut, à remplacer par l'URL de prod en production
    "http://127.0.0.1:9399/v1beta/projects/emulator/locations/emulator/services/archi-cameroun-ai/connectors/example"
)

# Ratios et coefficients DQE
TAUX_MO = 1.20          # +20 % Main-d'Œuvre
TAUX_IMPREVUS = 1.03    # +3 % Imprévus
COEFF_TOTAL = round(TAUX_MO * TAUX_IMPREVUS, 4)

def appliquer_majorations(quantite_brute: float) -> float:
    return round(quantite_brute * COEFF_TOTAL, 4)

def appeler_data_connect(operation_name: str, variables: dict, is_mutation: bool = True) -> dict:
    """Envoie une requête HTTP POST à l'API Data Connect (REST)."""
    endpoint = ":executeMutation" if is_mutation else ":executeQuery"
    url = f"{DATA_CONNECT_URL}{endpoint}"
    payload = {
        "operationName": operation_name,
        "variables": variables
    }
    headers = {"Content-Type": "application/json"}
    
    response = requests.post(url, json=payload, headers=headers)
    response.raise_for_status()
    return response.json()

def calculate_mesh_volume_and_area(verts, faces):
    """Calcul du volume et de la surface par la méthode du maillage 3D (fallback)."""
    volume = 0.0
    area = 0.0
    for i in range(0, len(faces), 3):
        try:
            i1, i2, i3 = faces[i], faces[i + 1], faces[i + 2]
            x1, y1, z1 = verts[3*i1], verts[3*i1+1], verts[3*i1+2]
            x2, y2, z2 = verts[3*i2], verts[3*i2+1], verts[3*i2+2]
            x3, y3, z3 = verts[3*i3], verts[3*i3+1], verts[3*i3+2]
            # Volume signé du tétraèdre avec l'origine
            v = (x1*y2*z3 - x1*y3*z2 - x2*y1*z3 + x2*y3*z1 + x3*y1*z2 - x3*y2*z1) / 6.0
            volume += v
            # Aire du triangle (magnitude du produit vectoriel)
            ux, uy, uz = x2-x1, y2-y1, z2-z1
            vx, vy, vz = x3-x1, y3-y1, z3-z1
            cx = uy*vz - uz*vy
            cy = uz*vx - ux*vz
            cz = ux*vy - uy*vx
            area += (cx**2 + cy**2 + cz**2)**0.5
        except Exception:
            pass
    return abs(volume), area / 2.0

def resoudre_article_mercuriale(nom_mat: str, mapping_mercuriale: dict) -> tuple:
    """Résolution intelligente et floue des noms de matériaux de l'IFC vers la Mercuriale.
    Retourne (code_article, unite, prix_u, statut_prix).
    """
    nom_lower = nom_mat.strip().lower()
    
    # Dictionnaire de normalisation de domaine (synonymes connus)
    nom_normalise = nom_lower
    if any(k in nom_lower for k in ["crépis", "crepis", "enduit", "finition", "plâtre", "platre"]):
        nom_normalise = "enduit ciment"
    elif any(k in nom_lower for k in ["parpaing", "agglo", "brique", "maçonnerie", "maconnerie"]):
        nom_normalise = "agglos 20"
    elif any(k in nom_lower for k in ["béton", "beton", "concrete", "structure", "poteau", "poutre", "dalle"]):
        nom_normalise = "béton armé"
    elif any(k in nom_lower for k in ["acier", "fer", "armature", "ha", "metal"]):
        nom_normalise = "acier ha"
    elif any(k in nom_lower for k in ["coffrage", "bois", "planche"]):
        nom_normalise = "bois de coffrage"

    # 1. Correspondance exacte après normalisation
    if nom_normalise in mapping_mercuriale:
        code_article, unite, prix_u = mapping_mercuriale[nom_normalise]
        return code_article, unite, prix_u, "VALIDÉ"

    # 2. Recherche du meilleur match flou par rapport au catalogue
    meilleur_score = 0.0
    meilleure_cle = None
    
    for cle in mapping_mercuriale.keys():
        score = difflib.SequenceMatcher(None, nom_normalise, cle).ratio()
        if score > meilleur_score:
            meilleur_score = score
            meilleure_cle = cle

    # 3. Validation selon le seuil de confiance de 85%
    if meilleur_score >= 0.85 and meilleure_cle is not None:
        code_article, unite, prix_u = mapping_mercuriale[meilleure_cle]
        return code_article, unite, prix_u, "VALIDÉ"
    else:
        # Seuil non atteint : pas de liaison de code_article, prix unitaire = 0, à chiffrer
        return None, "m3", 0.0, "À CHIFFRER"

def analyser_et_sauvegarder_ifc(temp_local_filename, projet_id, mapping_mercuriale):
    """Effectue l'analyse IFC et la sauvegarde des lignes DQE dans un contexte isolé."""
    import ifcopenshell
    import ifcopenshell.util.element
    import ifcopenshell.geom

    print("📖 Ouverture du fichier IFC avec IfcOpenShell...")
    model = ifcopenshell.open(temp_local_filename)
    
    geom_settings = ifcopenshell.geom.settings()
    
    # 1. Précalculer le mapping spatial GlobalId -> Storey Name
    storeys = model.by_type("IfcBuildingStorey")
    element_to_storey = {}
    for storey in storeys:
        niveau_nom = storey.Name or "Général"
        if hasattr(storey, 'ContainsElements'):
            for rel in storey.ContainsElements:
                for el in rel.RelatedElements:
                    element_to_storey[el.GlobalId] = niveau_nom

    def get_storey(el) -> str:
        s = element_to_storey.get(el.GlobalId)
        if s:
            return s
        if hasattr(el, 'Decomposes'):
            for rel in el.Decomposes:
                parent = rel.RelatingObject
                return element_to_storey.get(parent.GlobalId, "Général")
        return "Général"

    def get_material_name(el) -> str:
        if not hasattr(el, 'HasAssociations'):
            return "Inconnu"
        for assoc in el.HasAssociations:
            if not assoc.is_a("IfcRelAssociatesMaterial"):
                continue
            mat = assoc.RelatingMaterial
            if mat.is_a("IfcMaterial"):
                return mat.Name or "Inconnu"
            elif mat.is_a("IfcMaterialConstituentSet"):
                constituents = mat.MaterialConstituents
                if constituents:
                    try:
                        return constituents[0].Material.Name or "Inconnu"
                    except Exception:
                        try:
                            return constituents[0].Name or "Inconnu"
                        except Exception:
                            return "Inconnu"
            elif mat.is_a("IfcMaterialLayerSetUsage"):
                try:
                    return mat.ForLayerSet.LayerSetName or "Composite"
                except Exception:
                    return "Composite"
            elif mat.is_a("IfcMaterialList"):
                if mat.Materials:
                    return mat.Materials[0].Name or "Inconnu"
        return "Inconnu"

    def get_native_quantities(psets: dict):
        volume_net = 0.0
        surface_nette = 0.0
        if "BaseQuantities" in psets:
            bq = psets["BaseQuantities"]
            volume_net = bq.get("NetVolume", bq.get("GrossVolume", 0.0))
            surface_nette = bq.get("NetSideArea", bq.get("NetFloorArea", bq.get("GrossArea", 0.0)))
        
        # Fallback sur d'autres property sets si BaseQuantities est manquant
        if volume_net == 0.0:
            for props in psets.values():
                if not isinstance(props, dict):
                    continue
                for k in ["NetVolume", "volume", "Volume", "GrossVolume"]:
                    if k in props and isinstance(props[k], (int, float)):
                        volume_net = props[k]
                        break
                if volume_net:
                    break
        if surface_nette == 0.0:
            for props in psets.values():
                if not isinstance(props, dict):
                    continue
                for k in ["NetArea", "NetSideArea", "NetFloorArea", "area", "Area", "GrossArea"]:
                    if k in props and isinstance(props[k], (int, float)):
                        surface_nette = props[k]
                        break
                if surface_nette:
                    break
        return volume_net, surface_nette

    # 2. Détecter les parents qui ont des parts pour éviter les doublons
    parents_avec_parts = set()
    parts = model.by_type("IfcBuildingElementPart")
    for part in parts:
        if hasattr(part, 'Decomposes'):
            for rel in part.Decomposes:
                parents_avec_parts.add(rel.RelatingObject.GlobalId)

    # 3. Collecter les éléments à quantifier
    elements_a_quantifier = []
    
    # Ajouter toutes les tranches LOD 400 (parts)
    for part in parts:
        elements_a_quantifier.append((part, "lod400_part"))
        
    # Ajouter les éléments parents n'ayant pas de parts
    classes_parentes = ["IfcWall", "IfcSlab", "IfcColumn", "IfcBeam", "IfcMember", "IfcCovering"]
    for cname in classes_parentes:
        for el in model.by_type(cname):
            if el.GlobalId not in parents_avec_parts:
                elements_a_quantifier.append((el, "parent_element"))

    print(f"📊 Extraction et traitement géométrique de {len(elements_a_quantifier)} éléments...")

    # 4. Traiter et insérer chaque élément
    count_inserted = 0
    resolution_cache = {}
    
    for el, source_type in elements_a_quantifier:
        niveau = get_storey(el)
        nom_mat = get_material_name(el)
        
        # Récupération des quantités natives
        psets = ifcopenshell.util.element.get_psets(el)
        volume_net, surface_nette = get_native_quantities(psets)
        
        # Fallback géométrique (calcul du maillage) si les quantités natives restent à 0
        if volume_net == 0.0 or surface_nette == 0.0:
            try:
                shape = ifcopenshell.geom.create_shape(geom_settings, el)
                geom_vol, geom_area = calculate_mesh_volume_and_area(
                    shape.geometry.verts, shape.geometry.faces)
                volume_net = volume_net or geom_vol
                surface_nette = surface_nette or geom_area
            except Exception:
                pass
                
        # Résolution de l'article de la mercuriale (avec cache)
        if nom_mat not in resolution_cache:
            resolution_cache[nom_mat] = resoudre_article_mercuriale(nom_mat, mapping_mercuriale)
            
        code_article, unite, prix_u, statut_prix = resolution_cache[nom_mat]
        
        # Sélection de la quantité brute selon l'unité de l'article
        quantite_brute = surface_nette if unite == "m2" else volume_net
        if quantite_brute == 0.0:
            quantite_brute = volume_net if volume_net > 0.0 else surface_nette
            
        # Si aucune quantité n'est exploitable, on ne génère pas de ligne
        if quantite_brute == 0.0:
            continue
            
        # Calculs DQE
        quantite_facturable = appliquer_majorations(quantite_brute)
        prix_total_ht = round(quantite_facturable * (prix_u or 0.0), 2)
        
        # Insertion via GraphQL
        appeler_data_connect("CreateDevisDqe", {
            "projetId": projet_id,
            "codeArticle": code_article,
            "ifcGuid": el.GlobalId,
            "niveauSpatial": niveau,
            "quantiteIfcBrute": float(quantite_brute),
            "quantiteFacturable": float(quantite_facturable),
            "prixTotalHt": float(prix_total_ht),
            "statutPrix": statut_prix
        })
        count_inserted += 1
        
    print(f"✅ Terminé : {count_inserted} lignes de devis DQE insérées.")

@storage_fn.on_object_finalized(bucket="ifc-projects")
def process_ifc_upload(event: storage_fn.CloudEvent[storage_fn.StorageObjectData]) -> None:
    """Déclenchée lors de l'upload d'un fichier IFC dans Cloud Storage."""
    file_data = event.data
    file_name = file_data.name
    
    if not file_name.endswith(".ifc"):
        print(f"File {file_name} is not an IFC file. Skipping.")
        return

    print(f"Processing IFC file: {file_name}")

    # 1. Télécharger le fichier IFC dans un dossier temporaire
    bucket = storage.bucket(file_data.bucket)
    blob = bucket.blob(file_name)
    
    _, temp_local_filename = tempfile.mkstemp(suffix=".ifc")
    try:
        blob.download_to_filename(temp_local_filename)
        print(f"Downloaded {file_name} to local temp file: {temp_local_filename}")

        # 2. Créer un projet dans la base de données via Mutation Data Connect
        nom_projet = os.path.splitext(os.path.basename(file_name))[0]
        res_projet = appeler_data_connect("CreateProjet", {
            "nomProjet": nom_projet,
            "localisation": "Cameroun"
        })
        
        # Extraction de l'ID du projet créé
        projet_id = res_projet.get("data", {}).get("projet_insert", {}).get("id")
        if not projet_id:
            raise Exception("Failed to retrieve generated Project ID from Data Connect.")
        
        print(f"Created project '{nom_projet}' with ID: {projet_id}")

        # 3. Charger la mercuriale pour la résolution des articles
        res_merc = appeler_data_connect("GetMercuriale", {}, is_mutation=False)
        mercuriale_list = res_merc.get("data", {}).get("mercurialePrixes", [])
        
        # Dictionnaire pour résolution rapide : {nom_materiau: (code_article, unite, prix_unitaire)}
        mapping_mercuriale = {
            m["nomMateriau"].strip().lower(): (m["codeArticle"], m["unite"], m["prixTotalUnitaire"])
            for m in mercuriale_list
        }

        # 4. Lancer l'analyse et la sauvegarde
        analyser_et_sauvegarder_ifc(temp_local_filename, projet_id, mapping_mercuriale)

    finally:
        # Nettoyage du fichier temporaire
        try:
            os.remove(temp_local_filename)
            print(f"Cleaned up temp file: {temp_local_filename}")
        except Exception as e:
            print(f"Warning: Could not remove temp file {temp_local_filename}: {e}")

@storage_fn.on_object_finalized(bucket="ifc-projects")
def analyser_bordereau_livraison(event: storage_fn.CloudEvent[storage_fn.StorageObjectData]) -> None:
    """Déclenchée lors de l'upload d'un bordereau de livraison sous forme d'image."""
    file_data = event.data
    file_name = file_data.name
    
    # Format attendu : projets/{projectId}/bordereaux/{filename}
    parts = file_name.split("/")
    if len(parts) < 4 or parts[0] != "projets" or parts[2] != "bordereaux":
        # Ignorer les autres fichiers
        return

    project_id = parts[1]
    print(f"📥 Bordereau de livraison détecté pour le projet: {project_id}")
    print(f"Nom de fichier: {file_name}")

    # Vérifier l'extension de l'image
    file_ext = os.path.splitext(file_name)[1].lower()
    if file_ext not in [".png", ".jpg", ".jpeg", ".webp"]:
        print(f"Extension de fichier {file_ext} non supportée. Seules les images PNG, JPG, JPEG et WEBP sont acceptées.")
        return

    # Télécharger le bordereau en local
    bucket = storage.bucket(file_data.bucket)
    blob = bucket.blob(file_name)
    
    _, temp_local_filename = tempfile.mkstemp(suffix=file_ext)
    try:
        blob.download_to_filename(temp_local_filename)
        print(f"Fichier téléchargé temporairement : {temp_local_filename}")

        # Initialisation du client Google Gen AI
        from google import genai
        from google.genai import types
        from pydantic import BaseModel
        from PIL import Image
        from firebase_admin import messaging

        class DeliveryItem(BaseModel):
            nom_materiau: str
            quantite_livree: float
            unite: str
            fournisseur: str

        gemini_api_key = os.environ.get("GEMINI_API_KEY")
        if not gemini_api_key:
            print("Erreur : GEMINI_API_KEY non configurée dans l'environnement.")
            return

        client = genai.Client(api_key=gemini_api_key)
        image = Image.open(temp_local_filename)

        print("🔮 Analyse du bordereau par Gemini Vision (gemini-1.5-flash)...")
        response = client.models.generate_content(
            model="gemini-1.5-flash",
            contents=[
                "Analyse ce bordereau de livraison et extrait les informations suivantes en français. Assure-toi de renvoyer le JSON structuré exact correspondant au schéma fourni.",
                image
            ],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=DeliveryItem,
                temperature=0.1
            )
        )

        parsed_data = response.parsed
        if not parsed_data:
            print("Erreur : Impossible de décoder la réponse structurée de Gemini.")
            return

        nom_materiau = parsed_data.nom_materiau
        quantite_livree = parsed_data.quantite_livree
        unite_livree = parsed_data.unite
        fournisseur = parsed_data.fournisseur

        print(f"Données extraites : Matériau='{nom_materiau}', Qte={quantite_livree} {unite_livree}, Fournisseur='{fournisseur}'")

        # Rapprochement flou (Fuzzy Matching) avec la Mercuriale des prix
        res_merc = appeler_data_connect("GetMercuriale", {}, is_mutation=False)
        mercuriale_list = res_merc.get("data", {}).get("mercurialePrixes", [])
        mapping_mercuriale = {
            m["nomMateriau"].strip().lower(): (m["codeArticle"], m["unite"], m["prixTotalUnitaire"])
            for m in mercuriale_list
        }

        code_article, unite_merc, _, _ = resoudre_article_mercuriale(nom_materiau, mapping_mercuriale)

        # Récupération du DQE actuel du projet depuis Postgres
        res_dqe = appeler_data_connect("GetProjetDqe", {"id": project_id}, is_mutation=False)
        projet = res_dqe.get("data", {}).get("projet")
        if not projet:
            print(f"Erreur : Projet ID {project_id} introuvable dans la base Postgres.")
            return

        devis_dqes = projet.get("devisDqes_on_projet", [])

        # Somme des quantités prévues dans le DQE
        quantite_dqe_totale = 0.0
        nom_materiau_resolu = nom_materiau

        if code_article:
            for line in devis_dqes:
                merc = line.get("mercurialePrix")
                if merc and merc.get("codeArticle") == code_article:
                    quantite_dqe_totale += line.get("quantiteFacturable") or 0.0
                    nom_materiau_resolu = merc.get("nomMateriau")
        else:
            print(f"⚠️ Le matériau '{nom_materiau}' n'a pas été reconnu dans la Mercuriale. La quantité prévue est considérée à 0.")

        # Contrôle des dépassements (Tolérance = 5% marge d'erreur terrain)
        TOLERANCE_CHUTE = 0.05
        seuil_max = quantite_dqe_totale * (1 + TOLERANCE_CHUTE)

        print(f"Contrôle : Prévu={quantite_dqe_totale} {unite_merc} | Seuil Max (5% tolérance)={seuil_max} {unite_merc} | Livré={quantite_livree} {unite_livree}")

        if quantite_livree > seuil_max:
            # Déclenchement d'une alerte Push proactive via FCM
            topic_name = f"alertes-projet-{project_id}"
            
            # Formatage du message d'alerte explicite
            message_body = (
                f"🚨 Alerte Livraison : {quantite_livree} {unite_livree} de {nom_materiau_resolu} reçues. "
                f"Le DQE prévoyait {quantite_dqe_totale} {unite_merc} (Dépassement de tolérance détecté)"
            )
            
            print(f"📢 Dépassement détecté ! Envoi de la notification FCM sur le topic '{topic_name}'...")
            
            fcm_message = messaging.Message(
                notification=messaging.Notification(
                    title="🚨 Alerte Dépassement Budget DQE",
                    body=message_body
                ),
                topic=topic_name
            )

            fcm_response = messaging.send(fcm_message)
            print(f"✅ Notification FCM envoyée avec succès. ID : {fcm_response}")
        else:
            print("✅ Contrôle valide : La quantité livrée est conforme aux prévisions du DQE (marge de 5% comprise).")

    except Exception as e:
        print(f"❌ Erreur critique lors du traitement du bordereau : {e}")
    finally:
        # Nettoyage du fichier temporaire local
        try:
            os.remove(temp_local_filename)
            print(f"Nettoyage du fichier temporaire terminé : {temp_local_filename}")
        except Exception as e:
            print(f"Impossible de supprimer le fichier temporaire {temp_local_filename} : {e}")

