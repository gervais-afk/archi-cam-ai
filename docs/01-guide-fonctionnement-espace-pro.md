# 01 - Guide de Fonctionnement de l'Espace Pro

L'Espace Pro d'Archi Cam AI est une plateforme cloud d'ingénierie et d'architecture optimisée pour traiter de manière hybride les plans 2D (images/PDF) et les maquettes numériques 3D complexes (BIM/CAO).

Voici le parcours complet d'un fichier, étape par étape, de son envoi à l'obtention des résultats d'audit et de quantités.

---

## ⚙️ Les Étapes Techniques Détaillées

### 1. Envoi & Validation Binaire (Pre-Flight)
*   **Action** : Le cabinet d'architecture envoie un fichier (ex: `villa.rvt` ou `plan.pdf`) via l'interface web.
*   **Technique** : La classe `FileValidator` intercepte le fichier et inspecte ses **Magic Bytes** (les premiers octets signatures du fichier).
    *   *Intérêt* : Si un utilisateur renomme manuellement un fichier `.txt` en `.rvt` pour tenter de tromper l'application, le validateur le rejette instantanément (Erreur `400`) sans lancer de coûteux calculs de conversion.

### 2. Le Système de Cache de Conversion (`ConversionCache`)
*   **Action** : L'empreinte numérique SHA-256 unique du fichier est calculée.
*   **Technique** : La classe `ConversionCache` interroge la table PostgreSQL `IFCConversionCache`.
    *   *Si existant (Hit)* : L'IFC précédemment converti est immédiatement réutilisé.
    *   *Si inexistant (Miss)* : Le fichier passe à l'étape d'aiguillage.
    *   *Intérêt* : Évite de payer et d'attendre pour reconvertir plusieurs fois le même fichier lors de modifications mineures.

### 3. L'Aiguillage Intelligent (`SmartRouter`)
*   **Action** : Le routeur classe le fichier pour exécuter le bon pipeline de calcul.
*   **Technique** : La classe `SmartRouter` analyse l'extension :
    *   **2D Plan Pipeline** (`.pdf`, `.png`, `.jpg`) : Aiguillé vers l'analyse d'image OpenCV + Vision Gemini pour dessiner le plan et lancer le rendu 3D.
    *   **Direct IFC Pipeline** (`.ifc`) : Envoyé directement pour l'extraction de quantités.
    *   **BIM Cloud Converter** (`.rvt`, `.pln`, `.skp`, `.dwg`) : Soumis à l'API de conversion cloud d'Antygravity.

### 4. Le Convertisseur BIM sémantique (`AntygravityConverter`)
*   **Action** : Conversion asynchrone des formats CAO en IFC standardisé.
*   **Technique** : La classe `AntygravityConverter` téléverse le fichier propriétaire vers l'API sécurisée d'Antygravity BIM Cloud.
    *   *Intérêt* : Contrairement aux convertisseurs de maillages classiques (qui détruisent les informations d'ingénierie), ce convertisseur préserve les **Property Sets** (les caractéristiques physiques des matériaux, les volumes réels, et les fonctions porteuses).

### 5. L'Extracteur Rapide de Quantités (`FastIFCExtractor`)
*   **Action** : Extraction des quantités en moins de 10 millisecondes.
*   **Technique** : Le script Python `fast_extract_quantities.py` lit le fichier IFC à l'aide de la bibliothèque `ifcopenshell`.
    *   *Optimisation* : Au lieu de charger en mémoire le moteur de rendu 3D lourd (Open CASCADE `ifcopenshell.geom`) pour redessiner géométriquement chaque mur, l'extracteur interroge directement les tables de propriétés du fichier.
    *   *Résultat* : Extraction instantanée du volume de béton, poids d'acier estimé (ratio BAEL), et surfaces de planchers sans aucun risque de fuite de mémoire ou de crash serveur sur les maquettes de plus de 50 Mo.

### 6. Le Superviseur Structurel (Audit BAEL & POS)
*   **Action** : Vérification de la conformité réglementaire locale.
*   **Technique** : Les quantités extraites sont confrontées :
    *   Aux règles de béton armé **BAEL 91** (vérification des ratios de ferraillage minimum pour les dalles et les poteaux).
    *   Aux règles du **Plan d'Occupation des Sols (POS)** camerounais (calcul du coefficient d'emprise au sol CES, hauteur maximale autorisée, et reculs par rapport à la voirie).

### 7. Journalisation & Monitoring des Coûts
*   **Action** : Suivi des statistiques d'utilisation administrative.
*   **Technique** : Chaque conversion réussie ou échouée est journalisée dans la table `IFCConversionLog` avec calcul automatique du coût API ($0.008 par fichier propriétaire converti, gratuit pour les IFC natifs).
