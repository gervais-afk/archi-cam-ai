import json
from pathlib import Path

def get_building_permit_requirements(city: str, building_type: str) -> str:
    """
    Génère la liste des pièces nécessaires pour un dossier de permis de construire au Cameroun.
    
    Args:
        city: La ville ou commune (ex: 'Douala 1er', 'Yaoundé 6').
        building_type: Type de projet (ex: 'Maison Individuelle', 'Immeuble R+4', 'Commerce').
    """
    requirements = {
        "pieces_generales": [
            "Une demande timbrée au tarif en vigueur",
            "Un certificat d'urbanisme en cours de validité",
            "Un titre foncier certifié conforme de moins de 3 mois",
            "Un plan de situation et un plan de masse (échelles 1/500 ou 1/1000)",
            "Un devis descriptif et estimatif des travaux"
        ],
        "pieces_techniques": [
            "Plans d'exécution (échelles 1/50 ou 1/100)",
            "Note de calcul de structure (pour R+1 et plus)",
            "Plan d'assainissement approuvé",
            "Étude d'impact environnemental (pour les projets commerciaux/industriels)"
        ]
    }
    
    # Adaptations spécifiques
    if "Immeuble" in building_type or "R+" in building_type:
        requirements["pieces_techniques"].append("Rapport d'étude géotechnique (sols)")
        requirements["pieces_techniques"].append("Plan de sécurité incendie approuvé par les sapeurs-pompiers")
    
    if "Douala" in city:
        special_mention = "Note : Pour Douala, une autorisation spéciale d'occupation du sol peut être requise si le terrain est en zone marécageuse."
    elif "Yaoundé" in city:
        special_mention = "Note : À Yaoundé, une attention particulière est portée sur le respect des servitudes de la Communauté Urbaine (CUY)."
    else:
        special_mention = ""

    report = f"### Dossier de Permis de Construire - {building_type} ({city})\n\n"
    report += "**Pièces Générales :**\n" + "\n".join([f"- {p}" for p in requirements["pieces_generales"]]) + "\n\n"
    report += "**Pièces Techniques :**\n" + "\n".join([f"- {p}" for p in requirements["pieces_techniques"]]) + "\n\n"
    if special_mention:
        report += f"**Attention Particulière :**\n{special_mention}"
        
    return report

if __name__ == "__main__":
    print(get_building_permit_requirements("Douala 5e", "Immeuble R+3"))
