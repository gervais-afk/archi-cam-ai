# 06 - Exemple Complet : Projet Villa R+1 à Bastos

### Contexte Client
*   **Cabinet** : Archi Design Cameroun  
*   **Projet** : Villa 4 chambres R+1 à Bastos, Yaoundé  
*   **Fichier source** : `villa_bastos_v3.rvt` (Revit 2023, 22 MB)  
*   **Objectif** : Obtenir le DQE certifié + vérification conformité POS

---

### 📁 Étape 1 : Upload du Fichier
*   **Informations détectées automatiquement** :
    *   Nom : `villa_bastos_v3.rvt`
    *   Taille : `22.4 MB`
    *   Format : `Autodesk Revit 2023`
    *   Estimation temps : `60-90 secondes`
    *   Estimation coût : `5 FCFA (0.008 USD)`

---

### 🔄 Étape 2 : Conversion Automatique
*   **Progression** : `[████████████████████████] 100%`
*   **Résultat** :
    *   Conversion réussie en **67 secondes**.
    *   Fichier IFC généré : `villa_bastos_v3.ifc` (18.2 MB).
    *   Enregistré en cache (SHA-256: `a3f2b9c...`).

---

### ⚡ Étape 3 : Extraction des Quantités
*   **Résultats de l'extracteur rapide** :
    ```json
    {
      "summary": {
        "total_concrete_volume": 45.80,
        "total_steel_weight": 5496,
        "total_floor_area": 185.5,
        "total_wall_area": 420.3,
        "element_counts": {
          "walls": 32,
          "slabs": 8,
          "beams": 18,
          "columns": 12,
          "doors": 9,
          "windows": 14
        }
      }
    }
    ```

---

### ⚖️ Étape 4 : Audit de Conformité
*   **Audit BAEL 91** : ✅ **95/100**
    *   ✅ Tous les murs porteurs ≥ 15cm
    *   ✅ Aucune poutre > 6.5m sans poteau
    *   ⚠️ Avertissement : Dalle étage 14cm (recommandé 15cm)
*   **Audit POS Bastos** : ✅ **100/100**
    *   ✅ CES : 38% (max 40% autorisé)
    *   ✅ Hauteur : 9.2m (max 12m autorisé)
    *   ✅ Recul route : 5.5m (min 5.0m requis)

---

### 💰 Étape 5 : Devis DQE Interactif
*   **Total Gros Œuvre** : **18 450 000 FCFA**

| Lot | Quantité | Prix Unitaire | Montant |
| :--- | :--- | :--- | :--- |
| **Béton CPJ 42.5** | 45.8 m³ | 105 000 FCFA | 4 809 000 FCFA |
| **Acier FeE500** | 5496 kg | 650 FCFA | 3 572 400 FCFA |
| **Coffrage bois** | 380 m² | 8 500 FCFA | 3 230 000 FCFA |
| **Main d'œuvre GO** | Forfait | - | 6 838 600 FCFA |

*   **Temps total du workflow** : **72 secondes**.
