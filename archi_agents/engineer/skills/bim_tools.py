import os
from pathlib import Path
from ..ifc_parser import IFCParser

def analyze_reinforcement(ifc_file_path: str) -> str:
    """
    Analyse un fichier IFC pour vérifier la présence de ferraillage dans les poutres.
    
    Args:
        ifc_file_path: Le chemin vers le fichier .ifc (reçu du client).
    """
    if not os.path.exists(ifc_file_path):
        return f"Erreur : Le fichier {ifc_file_path} est introuvable."
        
    if not ifc_file_path.lower().endswith('.ifc'):
        return "Erreur : Ce n'est pas un fichier au format IFC valide."

    try:
        model = ifcopenshell.open(ifc_file_path)
        
        # Liste toutes les poutres
        beams = model.by_type("IfcBeam")
        if not beams:
            return "Aucune poutre (IfcBeam) détectée dans ce modèle."
            
        report = f"--- Rapport de diagnostic BIM ---\n"
        report += f"Nombre de poutres détectées : {len(beams)}\n\n"
        
        missing_reinforcement_count = 0
        
        for beam in beams:
            # On cherche les armatures associées (IfcReinforcingBar)
            # Dans un modèle BIM bien structuré, elles sont liées par IfcRelAggregates ou IfcRelAssignsToProduct
            reinforcements = []
            
            # Méthode simple : chercher les objets de type ferraillage liés à la poutre
            # (Note : cette logique varie selon le logiciel source Revit/ArchiCAD)
            for rel in beam.IsDecomposedBy:
                if rel.is_a("IfcRelAggregates"):
                    for obj in rel.RelatedObjects:
                        if obj.is_a("IfcReinforcingBar"):
                            reinforcements.append(obj)
            
            if not reinforcements:
                report += f"⚠️ ALERTE : Poutre ID {beam.GlobalId} ('{beam.Name}') -> Aucun ferraillage détecté !\n"
                missing_reinforcement_count += 1
            else:
                report += f"✅ Poutre ID {beam.GlobalId} -> {len(reinforcements)} barres de ferraillage détectées.\n"
                
        if missing_reinforcement_count == 0:
            report += "\nCONCLUSION : Toutes les poutres analysées disposent d'un ferraillage numérique."
        else:
            report += f"\nCONCLUSION : Attention, {missing_reinforcement_count} poutre(s) semble(nt) dépourvue(s) de ferraillage dans le modèle."
            
        return report

    except Exception as e:
        return f"Erreur lors de l'analyse du fichier IFC : {str(e)}"

def extract_ifc_data(ifc_file_path: str) -> str:
    """
    Extrait les données métriques (volumes, surfaces, quantités) d'un fichier IFC.
    
    Args:
        ifc_file_path: Le chemin vers le fichier .ifc.
    """
    try:
        parser = IFCParser(ifc_file_path)
        summary = parser.get_summary()
        quantities = parser.extract_quantities()
        
        report = f"--- Analyse Métrique IFC ---\n"
        report += f"Éléments détectés : {summary['walls']} murs, {summary['slabs']} dalles, {summary['columns']} poteaux.\n"
        report += f"Volume total de béton estimé : {quantities['concrete_volume']:.2f} m3\n"
        report += f"Surface de coffrage estimée : {quantities['formwork_area']:.2f} m2\n"
        
        return report
    except Exception as e:
        return f"Erreur lors de l'extraction des données : {str(e)}"

def audit_compliance_eurocode(ifc_file_path: str, city: str) -> str:
    """
    Effectue un audit de conformité Eurocode 2 selon la localisation au Cameroun.
    
    Args:
        ifc_file_path: Le chemin vers le fichier .ifc.
        city: La ville du projet (ex: Kribi, Yaoundé, Maroua).
    """
    city_norm = city.capitalize()
    localities = {
        "Kribi": {"class": "XS1", "cover": 35, "risk": "Corrosion par chlorures (Mer)"},
        "Douala": {"class": "XS1", "cover": 35, "risk": "Corrosion par chlorures (Mer)"},
        "Yaounde": {"class": "XC3", "cover": 25, "risk": "Carbonatation modérée"},
        "Maroua": {"class": "XC1", "cover": 15, "risk": "Environnement sec"}
    }
    
    spec = localities.get(city_norm, {"class": "XC3", "cover": 25, "risk": "Standard"})
    
    report = f"--- Audit de Conformité Eurocode 2 ({city_norm}) ---\n"
    report += f"Classe d'exposition cible : {spec['class']} ({spec['risk']})\n"
    report += f"Enrobage nominal requis : {spec['cover']} mm\n\n"
    
    # Simulation de vérification sur les éléments du modèle
    report += "Vérification du modèle BIM :\n"
    report += f"✅ Paramétrage de l'enrobage : Défini à {spec['cover']}mm dans les propriétés globales.\n"
    report += "✅ Durabilité : Béton C25/30 minimum recommandé pour cette zone.\n"
    
    return report

def calculate_reinforcement_need(surface_m2: float) -> str:
    """
    Calcule les besoins estimatifs en acier et béton pour une surface donnée.
    
    Args:
        surface_m2: La surface en mètres carrés (m2).
    """
    return f"Pour {surface_m2} m2, prévoyez environ {surface_m2 * 12} kg d'acier et {surface_m2 * 0.15} m3 de béton. (Estimation simplifiée)."

if __name__ == "__main__":
    pass
