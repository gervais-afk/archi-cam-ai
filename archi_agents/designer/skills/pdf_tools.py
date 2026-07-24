import pdfplumber
import re
from typing import Dict, Any, List

def analyze_pdf_plan(file_path: str) -> Dict[str, Any]:
    """
    Analyse approfondie d'un plan architectural PDF. 
    Extrait le texte, les surfaces et tente de structurer les pièces.
    """
    analysis_results = {
        "text_content": "",
        "rooms": [],
        "total_estimated_surface": 0.0,
        "metadata": {}
    }
    
    try:
        with pdfplumber.open(file_path) as pdf:
            analysis_results["metadata"] = pdf.metadata
            full_text = ""
            
            for page in pdf.pages:
                text = page.extract_text()
                if text:
                    full_text += text + "\n"
                    
                # Tentative d'extraction de tableaux (souvent utilisés pour les surfaces)
                tables = page.extract_tables()
                for table in tables:
                    for row in table:
                        # On cherche des lignes type ["Chambre", "15 m2"]
                        row_str = " | ".join([str(cell) for cell in row if cell])
                        if any(keyword in row_str.lower() for keyword in ["m2", "m²", "surface"]):
                            analysis_results["rooms"].append(row_str)

            # Nettoyage et détection par Regex des surfaces
            # Cherche des nombres suivis de m2 ou m²
            surfaces = re.findall(r'(\d+(?:[.,]\d+)?)\s*(?:m2|m²)', full_text, re.IGNORECASE)
            if surfaces:
                # On prend la plus grande surface comme surface totale probable
                floats = [float(s.replace(',', '.')) for s in surfaces]
                analysis_results["total_estimated_surface"] = max(floats)
            
            analysis_results["text_content"] = full_text[:2000] # Limite pour l'IA
            
        return analysis_results
        
    except Exception as e:
        return {"error": f"Erreur lecture PDF : {str(e)}"}

def get_designer_recommendation(pdf_data: Dict[str, Any], style: str) -> str:
    """
    Utilise les données du PDF pour formuler une recommandation de design personnalisée.
    """
    surface = pdf_data.get("total_estimated_surface", 0)
    rooms = len(pdf_data.get("rooms", []))
    
    recommendation = f"Basé sur le plan PDF (Surface approx: {surface}m2) :\n"
    if style == "luxe-tropical":
        recommendation += "- Intégration de brise-soleil en bois Iroko sur les grandes ouvertures détectées.\n"
        recommendation += "- Utilisation de pierre de Volcan (Edea) pour les soubassements.\n"
        recommendation += "- Toiture à larges débords pour protéger les façades de la pluie équatoriale."
        
    return recommendation
