from duckduckgo_search import DDGS
import json

def search_market_prices(material: str, city: str) -> str:
    """
    Recherche en temps réel sur le web les prix des matériaux de construction au Cameroun.
    Utile pour actualiser la base de connaissances ou quand une donnée est manquante.
    
    Args:
        material: Le matériau à chercher (ex: 'ciment', 'tôle', 'gravier').
        city: La ville concernée (ex: 'Douala', 'Yaoundé').
    """
    query = f"prix actuel {material} {city} Cameroun 2026"
    results_str = ""
    
    try:
        with DDGS() as ddgs:
            results = ddgs.text(query, max_results=3)
            
            if not results:
                return f"Aucun résultat web trouvé pour {material} à {city}."
                
            for i, r in enumerate(results, 1):
                results_str += f"\nSource {i}: {r['title']}\nExtraits: {r['body']}\nLien: {r['href']}\n"
                
        return f"Voici les dernières informations trouvées sur le web pour {material} à {city} :\n{results_str}"
        
    except Exception as e:
        return f"Erreur lors de la recherche web : {str(e)}"

if __name__ == "__main__":
    # Test local
    print(search_market_prices("ciment", "Douala"))
