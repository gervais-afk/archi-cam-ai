# REST API Reference

Ce document présente l'interface de programmation REST d'Archi Cam AI.

## Endpoints

### 1. Upload & Conversion CAO / IFC
*   **URL** : `/api/bim/upload-ifc`
*   **Méthode** : `POST`
*   **Headers** :
    *   `Content-Type: multipart/form-data`
    *   `x-user-id: <user_id>` (requis)
*   **Payload** :
    *   `file` : Fichier CAO (`.rvt`, `.pln`, `.skp`, `.dwg`) ou IFC (`.ifc`).
*   **Réponse (200 OK)** :
    ```json
    {
      "success": true,
      "pipeline": "IFC_EXTRACTION",
      "processingMethod": "CACHE_HIT",
      "processingTime": 0.05,
      "quantities": {
        "summary": {
          "total_concrete_volume": 45.8,
          "total_steel_weight": 5496,
          "total_floor_area": 185.5,
          "total_wall_area": 420.3
        }
      }
    }
    ```
