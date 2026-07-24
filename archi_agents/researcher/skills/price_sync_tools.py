import os
import re
from duckduckgo_search import DDGS
import pg8000.dbapi

def get_connection():
  host = os.environ.get("DB_HOST", "127.0.0.1")
  port = int(os.environ.get("DB_PORT", 5433))
  user = os.environ.get("DB_USER", "postgres")
  password = os.environ.get("DB_PASSWORD", "ArchiCamAI_2025_Secure_BIM!")
  database = os.environ.get("DB_NAME", "fdcdb")
  
  return pg8000.dbapi.connect(
    host=host,
    port=port,
    user=user,
    password=password,
    database=database
  )

def update_market_price_from_web(material_code: str, material_name: str, city: str) -> str:
  """
  Recherche le prix d'un matériau sur le web et met à jour la base de données PostgreSQL.
  
  Args:
    material_code: Le code dans la mercuriale (ex: 'GO-CIM').
    material_name: Le nom complet (ex: 'Ciment CPJ 42.5').
    city: La ville (Douala, Yaoundé).
  """
  # 1. Recherche Web
  query_str = f"prix actuel {material_name} {city} Cameroun 2026 FCFA"
  try:
    with DDGS() as ddgs:
      results = ddgs.text(query_str, max_results=3)
      if not results:
        return f"Aucune info web trouvée pour {material_name}."
      
      text_body = " ".join([r['body'] for r in results])
      prices = re.findall(r'(\d[\d\s]+)\s?(?:FCFA|F|CFA)', text_body)
      
      if not prices:
        return f"Info trouvée mais aucun prix numérique extrait pour {material_name}."
      
      new_price = int(prices[0].replace(" ", ""))
      
      # 2. Mise à jour PostgreSQL
      conn = get_connection()
      cursor = conn.cursor()
      
      # Met à jour prix_unitaire_fourniture dans mercuriale_prix
      cursor.execute(
        "UPDATE mercuriale_prix SET prix_unitaire_fourniture = %s, derniere_maj = NOW() WHERE code_article = %s",
        (new_price, material_code)
      )
      conn.commit()
      cursor.close()
      conn.close()
      
      return f"✅ Succès : {material_name} à {city} mis à jour à {new_price} FCFA dans PostgreSQL (Source Web)."

  except Exception as e:
    return f"Erreur lors de la synchronisation : {str(e)}"
