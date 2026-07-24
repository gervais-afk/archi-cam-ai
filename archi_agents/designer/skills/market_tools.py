import json
import os
from pathlib import Path

def get_market_price(item: str, city: str) -> str:
    """
    Récupère le prix actuel d'un matériau de construction pour une ville donnée au Cameroun.
    
    Args:
        item: Le nom du matériau (ex: 'ciment', 'sable', 'fer_beton_10mm').
        city: La ville (ex: 'Douala', 'Yaounde').
    """
    try:
        # Chemin vers la base de données locale
        db_path = Path(__file__).parent.parent.parent.parent / "data" / "market_prices.json"
        
        if not db_path.exists():
            return "Erreur : Base de données des prix introuvable."
            
        with open(db_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            
        # Nettoyage des entrées
        item_key = item.lower().replace(" ", "_")
        city_key = city.capitalize()
        
        if item_key in data and city_key in data[item_key]:
            price_info = data[item_key][city_key]
            return f"Le prix pour '{item}' à {city_key} est de {price_info['price']} FCFA par {price_info['unit']} ({price_info.get('brand', price_info.get('type', ''))})."
        else:
            return f"Désolé, je n'ai pas de données précises pour '{item}' à {city_key}."
            
    except Exception as e:
        return f"Erreur lors de la récupération du prix : {str(e)}"

if __name__ == "__main__":
    # Test local
    print(get_market_price("ciment", "Douala"))
