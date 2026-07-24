from typing import Dict, Any

def get_material_price(material_name: str) -> str:
    """
    Génère une requête SQL pour la base de données Mercuriale afin d'obtenir le prix d'un matériau.
    L'agent utilisera ensuite l'outil mcp 'postgres-local.query' pour l'exécuter.
    
    Args:
        material_name: Nom ou partie du nom du matériau (ex: 'sable', 'ciment').
    """
    query = f"SELECT designation, prix_unitaire, unite FROM mercuriale_prix WHERE designation ILIKE '%{material_name}%' LIMIT 1;"
    return query

def get_full_mercuriale() -> str:
    """
    Génère une requête pour obtenir la liste complète des prix de base au Cameroun.
    """
    return "SELECT categorie, designation, prix_unitaire, unite FROM mercuriale_prix ORDER BY categorie;"
