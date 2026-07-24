# Architecture du SaaS Archi Cam AI 🏛️🚀

Ce document définit la structure fonctionnelle et technique pour l'industrialisation de la plateforme Archi Cam AI, alliant simplicité pour le grand public et rigueur pour les professionnels du bâtiment (ConTech).

## 1. Services de Localisation & Urbanisme 🌍📍
Point d'entrée obligatoire pour garantir la faisabilité d'un projet.
- **Sélection du Terrain** : Interface interactive (Google Maps) pour pointer une parcelle au Cameroun (Yaoundé, Douala, etc.).
- **Analyse Automatique** : 
  - Extraction des coordonnées GPS et données d'élévation.
  - Vérification de la constructibilité (POS, zones inondables) via l'**Agent Legal**.
  - Proximité des réseaux (VRD).

## 2. Niveaux de Services (Modèle Économique) 💰

### 🆓 Service "Auto-Constructeur" (Gratuit / B2C)
*Démocratiser l'accès à l'architecture de qualité.*
- **Consultation Mercuriale** : Prix des matériaux en temps réel (Cimencam, Dangote, sable).
- **Simulateur de Budget** : Estimation rapide du coût de gros œuvre.
- **Bibliothèque de Plans Types** : Modèles optimisés pour le climat tropical.
- **Checklist Administrative** : Guide pour le permis de bâtir local.

### 💎 Service "Professionnel" (Premium / Indépendants)
*Outils de productivité pour architectes et ingénieurs.*
- **Sketch-to-Plan (IA Vision)** : Conversion de croquis main levée en plans 2D cotés.
- **Rendus 3D Photoréalistes** : Génération d'images via Imagen 3 pour la vente au client.
- **Export BIM (IFC)** : Génération de maquettes numériques exportables vers Revit/Archicad.
- **RAG Urbanisme** : Interrogation directe des codes de l'urbanisme avec citations de loi.

### 🚀 Pack "Enterprise & Gouvernance" (B2B / Grands Comptes)
*Plateforme collaborative de gestion de projets complexes.*
- **Dashboard ROI & Maturité** : Pilotage stratégique pour la direction (temps gagné, réduction d'erreurs).
- **Gestionnaire de Workspace (CDE)** : Environnement de Données Commun conforme ISO 19650.
- **Model Checking Automatisé** : Validation technique (LOD/LOI) des maquettes importées.
- **Traçabilité Immuable** : Audit logs complets et signature numérique de chaque décision IA.

## 3. Gouvernance BIM & Collaboration 🤝🏢
Le système agit comme un **BIM Manager augmenté**.
- **Common Data Environment (CDE)** : Flux de travail structuré (Work in Progress -> Shared -> Published).
- **Générateur de PEB** : L'Agent Legal génère dynamiquement le Plan d'Exécution BIM et les clauses de responsabilité.
- **Contrôle Qualité (Model Checker)** : L'Agent Engineer audite les fichiers IFC pour vérifier la conformité des données techniques (Psets).

## 4. Les Moteurs (Agents IA spécialisés) ⚙️
- **RouterAgent** : Dispatcher et interface utilisateur.
- **DesignerAgent** : Création esthétique, optimisation d'espace et bioclimatisme.
- **EngineerAgent** : Rigueur technique et audit structurel.
  - **Calcul Eurocode 2** : Dimensionnement automatisé du béton armé (Briques de calcul : Flèches, Fissuration, Écrêtage).
  - **Adaptation Locale** : Gestion des classes d'exposition selon la ville (Kribi, Yaoundé, Maroua).
  - **Optimisation Matière** : Réduction du gaspillage d'acier via le calcul précis des ancrages et des moments.
- **ProjectManagerAgent** : Planification temporelle et logistique.
  - **Gantt IA** : Génération automatique de plannings basés sur les rendements réels.
  - **Météo-Conscience** : Ajustement des travaux selon la saisonnalité camerounaise.
  - **Suivi Financier** : Gestion des jalons de paiement liés à l'avancement physique du chantier.
- **LegalAgent** : Sécurité juridique et administrative.
  - **Compliance Engine** : Vérification automatique des seuils d'hygiène (9m², 2.80m) et d'assainissement.
  - **Matrice des Lignes Rouges** : Détection des risques de démolition (domaine public, zones inondables).
  - **Dossier Permis de Bâtir** : Génération de documents conformes ONAC / Sapeurs-Pompiers / ANOR.
- **ResearcherAgent** : Veille économique et mise à jour des prix du marché.

## 5. Infrastructure & Sécurité 🔒
- **Gestion des Accès (RBAC)** : Droits granulaires selon les rôles (Architecte, Client, BET).
- **Confidentialité** : Chiffrement des données sensibles et conformité RGPD/Législation locale.
- **Stabilité** : Architecture basée sur Supabase (DB) et Gemini 1.5 Flash (Raisonnement) pour un équilibre coût/performance optimal.

---
*Dernière mise à jour : 16 Mai 2026 - Focus B2B Industrialisation*
