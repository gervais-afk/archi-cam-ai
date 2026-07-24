from ...engineer.ifc_parser import IFCParser
from datetime import datetime, timedelta

def calculate_construction_timeline(ifc_file_path: str, start_date_str: str = None) -> str:
    """
    Calcule un planning prévisionnel basé sur les quantités IFC et les rendements locaux.
    """
    try:
        parser = IFCParser(ifc_file_path)
        quantities = parser.extract_quantities()
        vol = quantities['concrete_volume']
        
        # 1. Calcul des durées (en heures) selon les spécifications PLANNING_SPECS.md
        # Hypothèse : 60% fondations/dalles (1h/m3) et 40% poteaux/murs (2h/m3)
        hours_foundations = (vol * 0.6) * 1.0
        hours_elevations = (vol * 0.4) * 2.0
        total_hours = hours_foundations + hours_elevations
        
        # Conversion en jours (8h/jour)
        days = round(total_hours / 8)
        if days < 5: days = 5 # Minimum pour un petit projet
        
        # 2. Gestion de la saisonnalité (Cameroun)
        start_date = datetime.strptime(start_date_str, "%Y-%m-%d") if start_date_str else datetime.now()
        is_rainy_season = 6 <= start_date.month <= 10 # Juin à Octobre
        
        rain_buffer = 0
        if is_rainy_season:
            rain_buffer = round(days * 0.3) # +30% de temps en saison de pluies
            
        final_duration = days + rain_buffer
        end_date = start_date + timedelta(days=final_duration)
        
        report = f"--- Rapport de Planification IA (Project Manager) ---\n\n"
        report += f"Volume à mettre en œuvre : {vol:.2f} m3\n"
        report += f"Durée technique estimée : {days} jours ouvrés\n"
        
        if is_rainy_season:
            report += f"⚠️ Alerte Saison des Pluies : Buffer de {rain_buffer} jours ajouté.\n"
        
        report += f"Durée totale planifiée : {final_duration} jours.\n"
        report += f"Date de fin estimée : {end_date.strftime('%d/%m/%Y')}\n\n"
        
        report += "Jalons de paiement suggérés :\n"
        report += f"- 30% à la signature : Mobilisation\n"
        report += f"- 40% après {round(days*0.4)} jours : Fin du Gros Œuvre\n"
        report += f"- 30% à la livraison : {end_date.strftime('%B %Y')}\n"
        
        return report
        
    except Exception as e:
        return f"Erreur lors de la génération du planning : {str(e)}"
