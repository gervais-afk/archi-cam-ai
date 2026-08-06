# 05 - Guide de Dépannage (Troubleshooting)

### ❌ Erreur : "Conversion échouée : Unsupported Revit version"

*   **Cause** : Votre fichier Revit est trop récent (ex: Revit 2025) et le moteur de conversion ne le supporte pas encore.
*   **Solutions** :
    1. **Dans Revit** : Enregistrer sous une version antérieure (Fichier → Enregistrer sous → Options → Version : Revit 2023).
    2. **Alternative** : Exporter directement en IFC depuis Revit (Fichier → Exporter → IFC (IFC4)).

---

### ⚠️ Avertissement : "Géométrie 3D non trouvée pour certains murs"

*   **Cause** : Votre modèle contient des éléments 2D purs (lignes CAO) sans volume 3D.
*   **Impact** : Les quantités seront partielles.
*   **Solution** : Dans votre logiciel source, convertir les lignes en murs 3D avec épaisseur définie.

---

### 🐢 Performance : "L'extraction prend plus de 30 secondes"

*   **Cause probable** : Le fichier IFC contient des géométries NURBS complexes ou des tessellations lourdes.
*   **Diagnostic** :
    ```python
    # Vérifier la complexité du fichier
    python scripts/ifc_stats.py votre_fichier.ifc
    # Résultat attendu :
    # - Éléments totaux : < 100 000 ✅
    # - Triangles totaux : < 5 000 000 ✅
    ```
*   **Solution** : Simplifier la géométrie dans votre outil source (réduire la précision des courbes).

---

### 🔴 Erreur : "Cache hit mais fichier IFC introuvable"

*   **Cause** : Le fichier en cache a été supprimé du stockage serveur.
*   **Solution** : Le système re-convertira automatiquement le fichier d'origine et reconstruira le cache.
