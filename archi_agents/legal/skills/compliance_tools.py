from ...engineer.ifc_parser import IFCParser

def check_ifc_regulatory_compliance(ifc_file_path: str) -> str:
    """
    Analyse un fichier IFC et vérifie la conformité aux règles d'urbanisme (Décret 2008).
    
    Args:
        ifc_file_path: Chemin vers le fichier .ifc.
    """
    try:
        parser = IFCParser(ifc_file_path)
        rooms = parser.check_legal_dimensions()
        
        report = "--- Rapport d'Audit Réglementaire (Décret 2008) ---\n\n"
        infractions = 0
        
        for room in rooms:
            room_report = f"Pièce : {room['name']}\n"
            room_infractions = []
            
            # Règle 1 : Surface minimale (9m2)
            if room['surface'] < 9.0:
                room_infractions.append(f"❌ Surface insuffisante ({room['surface']:.2f}m2). Minimum requis : 9m2.")
            
            # Règle 2 : Hauteur sous plafond (2.80m)
            if room['height'] < 2.80:
                room_infractions.append(f"❌ Hauteur sous plafond trop basse ({room['height']:.2f}m). Minimum requis : 2.80m.")
                
            if room_infractions:
                report += room_report + "\n".join(room_infractions) + "\n\n"
                infractions += len(room_infractions)
            else:
                report += f"✅ {room['name']} : Conforme.\n\n"
                
        if infractions == 0:
            report += "CONCLUSION : Félicitations, aucune infraction réglementaire majeure détectée."
        else:
            report += f"CONCLUSION : {infractions} infraction(s) détectée(s). Veuillez ajuster les dimensions pour obtenir le permis de bâtir."
            
        return report
        
    except Exception as e:
        return f"Erreur lors de l'audit réglementaire : {str(e)}"


def query_technical_drawing_rag(query: str) -> str:
    """
    Interroge la base vectorielle RAG locale sur les normes de dessin technique et de lecture de plan.
    
    Args:
        query: Question ou terme technique à rechercher (ex: "hachures béton", "épaisseur minimale dalle").
    """
    try:
        import chromadb
        from sentence_transformers import SentenceTransformer
        import os

        db_path = "./archi_cam_rag_db"
        if not os.path.exists(db_path):
            # Fallback sémantique / lexique de base si la base n'est pas encore créée
            lexique = {
                "hachures béton": "Norme Foucher : Le béton armé est représenté par des hachures en traits fins interrompus ou inclinées à 45° associées à des pointillés irréguliers symbolisant les granulats.",
                "fouilles en rigoles": "Norme Foucher : Fouilles linéaires destinées à recevoir les semelles de fondations. Profondeur maximale de 1m, largeur minimale de 0.40m.",
                "dalle": "Norme Foucher : Épaisseur minimale d'une dalle de compression : 4 à 5 cm sur poutrelles, ou 12cm pour une dalle pleine coulée en place.",
                "béton de propreté": "Norme Foucher : Béton faiblement dosé (150 kg/m³ de ciment) étalé sur le fond des fouilles pour éviter le contact direct du béton de structure avec le sol. Épaisseur minimale de 5cm."
            }
            # Recherche simple par mot clé
            for k, v in lexique.items():
                if k in query.lower() or query.lower() in k:
                    return f"[Mode Fallback Lexique] {v}"
            return "[Mode Fallback] Base de données RAG non initialisée. Veuillez d'abord exécuter le script d'ingestion RAG pour indexer le manuel technique."

        # Connexion ChromaDB
        chroma_client = chromadb.PersistentClient(path=db_path)
        collection = chroma_client.get_collection(name="dessin_technique_normes")
        
        # Modèle d'embedding
        model = SentenceTransformer('BAAI/bge-m3')
        query_emb = model.encode([query])[0].tolist()
        
        # Recherche
        results = collection.query(
            query_embeddings=[query_emb],
            n_results=2
        )
        
        if not results or not results['documents'] or len(results['documents'][0]) == 0:
            return "Aucun résultat trouvé dans le manuel de dessin technique pour cette requête."
            
        report = "--- Résultats de la Recherche RAG (Manuel Foucher) ---\n\n"
        for idx, (doc, meta) in enumerate(zip(results['documents'][0], results['metadatas'][0])):
            report += f"Extrait {idx + 1} (Page {meta.get('page', 'Inconnue')} - {meta.get('source', 'Manuel')}) :\n"
            report += f"{doc}\n\n"
            
        return report
        
    except Exception as e:
        return f"Erreur lors de l'interrogation du RAG local : {str(e)}"

