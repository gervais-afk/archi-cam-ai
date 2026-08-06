# 08 - Checklist : Préparer Votre Fichier pour un Résultat Optimal

### Avant d'Exporter depuis Revit ou ArchiCAD

- [ ] **Nettoyer le modèle** : Supprimer les variantes de conception non utilisées.
- [ ] **Purger les éléments inutilisés** : (Revit : `Gérer → Purger les éléments non utilisés`).
- [ ] **Vérifier les Property Sets** :
  * Tous les murs ont une épaisseur définie.
  * Les matériaux sont assignés (béton, brique, etc.).
  * Les poutres/poteaux ont des sections définies.
- [ ] **Configurer l'export IFC** (Fichier → Exporter → Options IFC) :
  * Version : **IFC4** ou **IFC2x3 Coordination View**.
  * Niveau de détail : **Medium**.
  * Inclure : **Property Sets** (Psets) ✅.
  * Inclure : **Quantités de base** (Base Quantities) ✅.
- [ ] **Nommer clairement le fichier** : `projet_client_version_date.ifc`
  * ✅ Bon : `villa_dupont_v2_2025-01-15.ifc`
  * ❌ Mauvais : `Copie de Nouveau projet1 final (3).ifc`

---

### Avant d'Uploader sur Archi Cam AI

- [ ] **Vérifier la taille** : < 500 MB recommandé.
- [ ] **Tester l'intégrité** : Ouvrir avec un viewer IFC gratuit (BIM Vision, FreeCAD) et vérifier que les éléments s'affichent correctement.
- [ ] **Préparer les informations projet** :
  * Localisation (ville, quartier).
  * Type de bâtiment (résidentiel, commercial).
  * Contrainte du sol si connue (kPa).

---

### Après Upload

- [ ] **Vérifier les quantités extraites** : Cohérence générale avec vos estimations manuelles.
- [ ] **Lire le rapport d'audit** : Corriger les non-conformités critiques.
- [ ] **Ajuster le devis** : Appliquer vos tarifs négociés si différents de la Mercuriale MINMAP.
