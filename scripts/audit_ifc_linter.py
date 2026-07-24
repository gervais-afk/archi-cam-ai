import os
import sys

try:
    import ifcopenshell
    import ifcopenshell.util.element
except ImportError:
    print("❌ Erreur : Le module 'ifcopenshell' n'est pas installé.")
    print("👉 Exécutez : pip install ifcopenshell")
    sys.exit(1)

def audit_mapping_ifc(ifc_file_path: str):
    """
    Scanner (Linter BIM) pour auditer la maquette IFC selon la Charte BIM Standard d'Entreprise.
    """
    if not os.path.exists(ifc_file_path):
        print(f"❌ Erreur : Le fichier '{ifc_file_path}' est introuvable.")
        return

    print("=" * 60)
    print(f"🏗️ AUDIT BIM EN COURS : {os.path.basename(ifc_file_path)}")
    print("=" * 60)

    try:
        ifc_file = ifcopenshell.open(ifc_file_path)
    except Exception as e:
        print(f"❌ Erreur lors de l'ouverture du fichier IFC : {e}")
        return

    # 1. Cibles de l'audit
    target_classes = ['IfcWall', 'IfcSlab', 'IfcColumn', 'IfcBeam', 'IfcSite', 'IfcGeographicElement', 'IfcSpace']
    
    elements_to_audit = []
    for cls in target_classes:
        elements_to_audit.extend(ifc_file.by_type(cls))

    print(f"🔍 Nombre total d'éléments à auditer : {len(elements_to_audit)}\n")

    # Statistiques
    missing_codes = []
    missing_hierarchy = []
    code_occurrences = {}

    for element in elements_to_audit:
        # ---------------------------------------------------------
        # A. Vérification de la Hiérarchie Spatiale (Règle N°1)
        # ---------------------------------------------------------
        # Les IfcSite/GeographicElement ne sont pas toujours dans un étage, on peut les tolérer
        if not element.is_a('IfcSite') and not element.is_a('IfcGeographicElement'):
            container = None
            if hasattr(element, 'ContainedInStructure'):
                for rel in element.ContainedInStructure:
                    if rel.is_a('IfcRelContainedInSpatialStructure'):
                        container = rel.RelatingStructure
                        break
            if not container or not container.is_a('IfcBuildingStorey'):
                missing_hierarchy.append(element)

        # ---------------------------------------------------------
        # B. Vérification du Code_Article (Règle N°3)
        # ---------------------------------------------------------
        psets = ifcopenshell.util.element.get_psets(element)
        code_trouve = None

        # Chercher dans Pset_Custom ou 00_IA_BIM
        for pset_name in ['Pset_Custom', '00_IA_BIM', '00_IA_BIM ']: # Traitement des espaces accidentels
            if pset_name in psets:
                props = psets[pset_name]
                # Le nom de la propriété peut varier légèrement selon l'exporteur
                code_trouve = props.get('Code_Article') or props.get('Macro_Code')
                if code_trouve:
                    break
        
        # Si non trouvé dans les psets spécifiques, on fait une recherche globale tolérante (fallback)
        if not code_trouve:
            for pset_name, props in psets.items():
                if isinstance(props, dict):
                    code_trouve = props.get('Code_Article') or props.get('Macro_Code')
                    if code_trouve:
                        break

        if code_trouve:
            code_str = str(code_trouve).strip().upper()
            code_occurrences[code_str] = code_occurrences.get(code_str, 0) + 1
        else:
            missing_codes.append(element)

    # ==========================================
    # 📝 IMPRESSION DU RAPPORT D'AUDIT
    # ==========================================
    
    print("📊 RÉCAPITULATIF DES CODES TROUVÉS (Dictionnaire) :")
    if code_occurrences:
        print(code_occurrences)
    else:
        print("   ⚠️ Aucun Code_Article trouvé dans la maquette !")
    print("\n" + "-" * 60)

    # Rapport Hiérarchie
    print("\n🏗️ VÉRIFICATION DE LA HIÉRARCHIE (IfcBuildingStorey) :")
    if not missing_hierarchy:
        print("   ✅ Parfait ! Tous les éléments sont correctement liés à un étage.")
    else:
        print(f"   ❌ {len(missing_hierarchy)} éléments orphelins (non liés à un étage). Exemples :")
        for el in missing_hierarchy[:5]:
            print(f"      - {el.is_a()} (ID: {el.GlobalId}) - {el.Name or 'Sans Nom'}")
        if len(missing_hierarchy) > 5:
            print("      ... et autres.")

    # Rapport Codes Manquants
    print("\n🏷️ VÉRIFICATION DES CODES ARTICLES :")
    if not missing_codes:
        print("   ✅ Parfait ! Tous les éléments audités possèdent un Code_Article valide.")
    else:
        print(f"   ❌ {len(missing_codes)} éléments géométriques SANS Code_Article. À corriger dans Archicad :")
        for el in missing_codes[:10]: # Afficher les 10 premiers pour ne pas polluer l'écran
            print(f"      - Type: {el.is_a().ljust(15)} | ID: {el.GlobalId} | Nom: {el.Name or 'Sans Nom'}")
        if len(missing_codes) > 10:
            print(f"      ... et {len(missing_codes) - 10} autres éléments.")

    print("\n" + "=" * 60)
    score_code = ((len(elements_to_audit) - len(missing_codes)) / len(elements_to_audit)) * 100 if elements_to_audit else 0
    print(f"🎯 SCORE DE CONFORMITÉ BIM : {score_code:.1f}%")
    
    if score_code == 100.0 and not missing_hierarchy:
        print("🏆 MAQUETTE VALIDE : Prête pour l'intégration base de données !")
    else:
        print("🛑 MAQUETTE NON-CONFORME : Veuillez corriger les erreurs dans Archicad et ré-exporter.")
    print("=" * 60 + "\n")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Utilisation : python audit_ifc_linter.py <chemin_vers_fichier.ifc>")
    else:
        audit_mapping_ifc(sys.argv[1])
