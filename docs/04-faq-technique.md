# 04 - Questions Fréquentes Techniques (FAQ)

### **Q1 : Mon fichier Revit contient 3 variantes de conception. Comment les gérer ?**

**R :** Exportez chaque variante en IFC séparé depuis Revit :
1. Fichier → Exporter → IFC
2. Options → Créer 3 fichiers distincts :
   * `villa_variante_A.ifc`
   * `villa_variante_B.ifc`
   * `villa_variante_C.ifc`
3. Importez-les dans Archi Cam AI comme 3 projets distincts pour comparer les devis automatiquement.

---

### **Q2 : Pourquoi mon fichier SketchUp ne contient pas les quantités extraites ?**

**R :** SketchUp Free ne stocke pas les métadonnées BIM (épaisseur murs, matériaux). Solutions :

*   **Option A (Recommandée)** : Utilisez SketchUp Pro + plugin IFC Manager pour enrichir votre modèle avec des Property Sets avant export.
*   **Option B** : Exportez votre modèle en PNG 2D plan et utilisez le pipeline Vision IA qui déduira les quantités par analyse sémantique.

---

### **Q3 : J'ai modifié 2 murs dans mon fichier Revit. Dois-je tout re-convertir ?**

**R :** Oui et non :
*   **Oui** : Une nouvelle conversion est nécessaire (le hash SHA-256 du fichier a changé).
*   **Non** : Le cache de la 1ère version reste disponible.
*   *Astuce* : Utilisez notre **Comparateur de Versions IFC** pour voir uniquement les différences.

---

### **Q4 : Mon fichier IFC fait 800 MB. Va-t-il planter le serveur ?**

**R :** Non, grâce au `FastIFCExtractor` qui court-circuite le moteur 3D :
*   Limite théorique : 2 GB (mémoire serveur).
*   Temps d'extraction : Linéaire (~0.01s par 100 éléments).
*   800 MB ≈ 50 000 éléments ≈ **5 secondes d'extraction**.

Si votre fichier dépasse 1 GB, contactez le support pour une extraction optimisée en batch.

---

### **Q5 : Les prix MINMAP sont-ils à jour ?**

**R :** Oui, la Mercuriale MINMAP 2026 est intégrée et mise à jour trimestriellement. Dernière mise à jour : **Janvier 2025**.

Vous pouvez ajuster les prix manuellement via le **Widget Devis Interactif** si vous avez des tarifs négociés spécifiques.
