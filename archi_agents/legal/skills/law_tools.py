def get_permit_checklist(project_type: str) -> str:
    """
    Fournit la liste des pièces nécessaires pour un permis de construire au Cameroun.
    
    Args:
        project_type: Type de projet ('habitation', 'commercial', 'industriel').
    """
    base_checklist = [
        "1. Demande timbrée (Timbre communal)",
        "2. Certificat de propriété (Titre foncier de moins de 3 mois)",
        "3. Certificat d'urbanisme",
        "4. Plan de situation et plan de masse",
        "5. Plans architecturaux (visés par l'ONAC)",
        "6. Devis descriptif et estimatif"
    ]
    
    if project_type.lower() == 'habitation':
        return "Pour un projet d'habitation, voici les pièces requises :\n" + "\n".join(base_checklist)
    elif project_type.lower() in ['commercial', 'industriel']:
        base_checklist.extend([
            "7. Étude d'impact environnemental (si requis)",
            "8. Plans de structure et notes de calculs (visés par l'ONIGC)",
            "9. Descriptif des dispositifs de sécurité incendie"
        ])
        return f"Pour un projet {project_type}, le dossier est plus complexe :\n" + "\n".join(base_checklist)
    else:
        return "Veuillez préciser le type de projet (Habitation, Commercial ou Industriel) pour obtenir la liste exacte."

def explain_urban_zone_rules(zone_type: str) -> str:
    """
    Explique les règles de construction selon la zone d'urbanisme.
    
    Args:
        zone_type: Type de zone (ex: 'zone résidentielle', 'zone non-aedificandi', 'bord de mer').
    """
    rules = {
        "non-aedificandi": "C'est une zone de servitude publique. Toute construction y est strictement interdite (emprise ferroviaire, lignes haute tension, etc.).",
        "residentielle": "Zone destinée à l'habitat. Le Coefficient d'Occupation des Sols (COS) y est généralement limité pour préserver le cadre de vie.",
        "industrielle": "Zone réservée aux activités économiques. Des normes strictes sur les nuisances sonores et environnementales s'appliquent.",
        "bord de mer": "Servitude de recul obligatoire (généralement 50 à 100m selon la localité) pour protéger le littoral."
    }
    
    key = zone_type.lower()
    for k in rules:
        if k in key:
            return f"Règles pour la {zone_type} : {rules[k]}"
            
    return f"Je n'ai pas de détails spécifiques sur la zone '{zone_type}'. En général, référez-vous au Plan Local d'Urbanisme (PLU) de votre mairie."

if __name__ == "__main__":
    print(get_permit_checklist("commercial"))
