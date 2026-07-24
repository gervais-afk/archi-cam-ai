import os
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

def save_client_project(client_name: str, city: str, budget: float, status: str) -> str:
  """
  Enregistre les détails d'un projet client dans la base de données PostgreSQL d'Archi Cam AI.
  
  Args:
    client_name: Nom du client.
    city: Ville du projet.
    budget: Budget estimé en FCFA.
    status: Statut actuel (ex: 'En attente permis', 'Design validé').
  """
  try:
    conn = get_connection()
    cursor = conn.cursor()
    
    nom_projet = f"Projet {client_name} - {city}"
    description = f"Statut: {status}. Budget estimé: {budget} FCFA."
    
    cursor.execute(
      "INSERT INTO projets (nom_projet, localisation, description) VALUES (%s, %s, %s) RETURNING id",
      (nom_projet, city, description)
    )
    project_id = cursor.fetchone()[0]
    conn.commit()
    cursor.close()
    conn.close()
    
    return f"✅ Projet de {client_name} à {city} enregistré avec succès dans PostgreSQL (ID: {project_id}, Budget: {budget} FCFA)."
      
  except Exception as e:
    print(f"DEBUG POSTGRES ERROR: {str(e)}")
    return f"Erreur technique PostgreSQL : {str(e)}."

def list_recent_projects() -> str:
  """Récupère les 5 derniers projets enregistrés."""
  try:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
      "SELECT nom_projet, localisation, description, date_creation FROM projets ORDER BY date_creation DESC LIMIT 5"
    )
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    
    if not rows:
      return "Aucun projet trouvé dans la base."
        
    report = "--- Derniers Projets Archi Cam AI (PostgreSQL local) ---\n"
    for row in rows:
      nom_projet, localisation, description, date_creation = row
      report += f"- {nom_projet} ({localisation}): {description}\n"
    return report
  except Exception as e:
    return f"Erreur de lecture PostgreSQL : {str(e)}"
