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

## 5. Architecture Technique & Moteurs de Données 💻⚙️

Pour garantir des réponses fiables et millimétrées (zéro-hallucination), la plateforme repose sur une architecture de données hybride :

| Composant | Technologie | Rôle dans Archi Cam AI | Port |
|---|---|---|---|
| **Base Transactionnelle** | Firebase Data Connect | Stockage des projets utilisateurs, utilisateurs et workspaces | 9399 (Emulator) |
| **Mémoire Vectorielle (RAG)** | PostgreSQL + `pgvector` | Recherche sémantique de projets similaires (1536 dimensions) | 5433 (`fdcdb`) |
| **Graphe Métier (GraphRAG)** | Neo4j 5.20 (APOC + GDS) | Ontologie du bâtiment, normes BAEL 91 et mercuriale MINMAP | 7687 (Bolt) / 7474 |
| **Moteur Analytique (BI)** | DuckDB 1.5.5 | Requêtes de tendances de prix des matériaux et calculs de ROI | In-Memory (API live) |

### Certification & Sécurité
- **Standard OKF v0.2 (Object Knowledge Framework)** : Utilisé pour parser et certifier l'intégrité des formules de calcul de quantité de matériaux (Gros Œuvre / Second Œuvre) et éviter les biais d'hallucinations d'IA.
- **Filtrage ABAC (Attribute-Based Access Control)** : Le parcours de graphe Neo4j masque automatiquement les données financières sensibles (marges, coûts d'achat secrets) si l'utilisateur possède le rôle `CLIENT` au lieu d' `INGENIEUR` ou `ARCHITECTE`.

## 6. Pipeline de Rendu Architectural 2D/3D 🎨🏛️

Le moteur de rendu visuel repose sur un pipeline à 3 étages combinant vision déterministe et IA générative conditionnée :

### 6.1 Moteur 2D Sublimé (Python OpenCV + PyPDFium2)
- **Rasterisation 300 DPI** : PyPDFium2 convertit les fichiers PDF vectoriels à une échelle $x2$ ($1191 \times 1684\text{px}$).
- **Séparation Structure vs Texte** :
  - Contours de surface $< 150\text{px}$ -> Masque Texte & Cotations (`text_mask`).
  - Contours de surface $\ge 150\text{px}$ -> Masque Structurel des Murs (`structure_mask`).
- **Scellement d'Enveloppe Morphologique** : Fermeture morphologique avec une ellipse $40 \times 40$ (`kernel_seal`) pour boucher les baies vitrées et portes. Garantit une étanchéité à 100% de la texture de gazon extérieur.
- **Composition 3-Calques PIL** :
  1. *Calque 1 (Sols)* : Distribution des textures procédurales (Parquet Chêne, Marbre Carrara, Céramique Ardoise, Teck Marin, Gazon).
  2. *Calque 2 (Ombres 45°)* : Relief des murs avec un flou gaussien ($r=7$).
  3. *Calque 3 (Murs & Texte)* : Murs pochés en anthracite `#0F172A`, contours Canny et ré-incrustation nette de la typographie d'origine en surimpression vectorielle.

### 6.2 Moteur 3D Photoréaliste (Dual ControlNet SDXL / FAL.ai)
### 6.3 Moteur Multi-Étage Topographique (Z-Index Stacking)
- **Empilement d'Altitudes (`merge_multi_story_depth_map`)** :
  - *RDC (Niveau 0m)* : Masque `mask_rdc` à l'intensité `100` (Gris foncé).
  - *R+1 (Niveau +3.20m)* : Masque `mask_etage` à l'intensité `170` (Gris moyen).
  - *Toiture Procédurale* : Gradient `cv2.distanceTransform` de `170` à `255` (Blanc pur au faîtage).
  - *Blending Max* : `np.maximum(depth_rdc, depth_etage)` & `np.maximum(..., depth_roof)` (Conserve les terrasses RDC non recouvertes).
- **Déformation Isométrique Synchrone** : Transformation matricielle $45^\circ$ (`cv2.warpPerspective`) appliquée simultanément sur la Depth Map et le masque Canny fusionné (`merged_canny_mask`).

### 6.4 Module "Sketch-to-Pro" (Croquis Papier Manuscrit)
- **Nettoyage OpenCV Anti-Quadrillage (`clean_hand_drawn_sketch`)** :
  - *Filtrage HSV* : Suppression des lignes de cahier bleu/cyan (`H 85-135`) et rouges.
  - *Égalisation CLAHE* : Correction adaptative de l'exposition et des ombres d'appareil photo.
  - *Binarisation Adaptative Gaussienne* : Extraction pure du tracé au stylo bille/feutre.
- **Bascule Dynamique ControlNet Scribble** : Permutation automatique vers `controlnet-scribble-sdxl-1.0` (`conditioning_scale: 0.65`) pour interpréter avec souplesse les traits dessinés à la main.

---

## 7. Moteur Vidéo Cinématique (Image-to-Video Drone 4K) 🚁🎬
- **Modèle I2V** : **FAL.ai Luma Dream Machine (`fal-ai/luma-dream-machine`)** pour des survols 360° fluides sans déformation géométrique des murs.
- **Architecture Webhook Asynchrone (`/api/webhooks/fal-video`)** :
  - Traitement non-bloquant résistant aux timeouts Serverless (45 à 90s).
  - Enregistrement du fichier MP4 4K dans `render_jobs` (`status = 'completed'`).
- **Remboursement Automatique UX** : En cas d'échec de génération, la route Webhook remet instantanément **+10 crédits** au solde de l'utilisateur (`UPDATE user_credits SET balance = balance + 10`).

---

## 8. Passerelle de Paiement Mobile Money & Monétisation 💳📱
- **Intégration Locale Cameroun** : Support de **MTN Mobile Money** et **Orange Money** via la passerelle **Campay**.
- **Initialisation USSD Push (`/api/payments/initiate`)** :
  - Déclenchement de la demande de paiement en FCFA directement sur le mobile du client (`*126#` MTN / `#150#` Orange).
- **Packs de Crédits** :
  - *Pack Découverte* : 2 500 FCFA ➔ 50 Crédits.
  - *Pack Pro Cabinet* : 10 000 FCFA ➔ 270 Crédits (+20 crédits offerts).
  - *Pack Bureau d'Études* : 25 000 FCFA ➔ 850 Crédits (+100 crédits offerts).
- **Webhook de Rechargement Instantané (`/api/webhooks/payment`)** :
  - Confirmation atomique PostgreSQL et incrémentation automatique de `user_credits`.

## 9. Infrastructure & Sécurité 🔒
- **Gestion des Accès (RBAC/ABAC)** : Droits granulaires selon me rôles (Architecte, Client, BET).
- **Confidentialité** : Chiffrement des données sensibles et conformité RGPD/Législation locale.
- **Stabilité** : Architecture basée sur PostgreSQL local pour la souveraineté des données, et Gemini 2.5 Flash pour le raisonnement.

---

## 10. Cadrage Produit & Feuille de Route d'Indépendance GPU 🛡️🚀

### 10.1 Positionnement Produit (Périmètre Fonctionnel)
- **Outil de Visualisation Commerciale & Devisage Instantané** : Archi Cam AI est optimisé pour transformer des plans CAD/croquis 2D en plans sublimés Photoshop, perspectives 3D isométriques 8K, teasers vidéo cinématiques drone 4K et devis DQE/CCTP certifiés OKF v0.2.
- **Distinguer de la Modélisation CAD/BIM 3D** : La plateforme n'exporte pas directement de fichiers `.OBJ`, `.SKP` ou `.IFC` géométriques modifiables par l'architecte dans Revit/Archicad (bien qu'elle contienne des linter-auditeurs IFC Python). Ce positionnement doit rester clair dans la promesse marketing : *Valider le projet et vendre l'idée au client final en 60 secondes*.

### 10.2 Feuille de Route d'Indépendance GPU (Souveraineté Infra)
- **Phase 1 (Actuelle / Lancement)** : Exploitation des API Serverless payantes à l'usage (**FAL.ai**, **Replicate**, **Gemini Flash**) pour maintenir des frais fixes de serveur nuls ($0.00$).
- **Phase 2 (Passage à l'Échelle > 1 000 rendus/jour)** :
  - Migration des workflows Multi-ControlNet vers des **Worker Nodes ComfyUI conteneurisés** sur **RunPod Serverless** ou instances dédiées **Vast.ai (NVIDIA RTX 4090 / A10G)**.
  - *Bénéfices* : Division du coût de génération par **5** ($< 0,001\$$ / image), suppression totale des dépendances tarifaires tierces et garanties SLA avec temps de réponse $< 3\text{s}$.

---

## 11. Piliers ConTech / PropTech Industriels (OpenBIM, XAI & Supervision) 🏢⚙️

### 11.1 Interopérabilité OpenBIM / IFC Native (`app/api/bim/upload-ifc`)
- **Parseur Geometry & Propriétés** : Intégration de `ifcopenshell 0.8.5` et `ifcopenshell.geom` côté serveur Python pour ingérer directement les maquettes 3D `.ifc` d'Archicad ou Revit.
- **Calcul Déterministe** : Extraction automatique des volumes de murs (`IfcWall`), surfaces de dalles (`IfcSlab`) et réservations de baies (`IfcOpeningElement`) pour générer le devis DQE certifié MINMAP 2026.

### 11.2 IA Explicable (XAI) & Traçabilité Plan ➔ Devis
- **Contour Bounding Boxes OpenCV** : Les scripts de binarisation exportent le dictionnaire des Bounding Boxes `[x, y, w, h]` et des surfaces de chaque pièce ($m^2$).
- **Surlignage Interactif UI** : Dans le composant React `EstimateTable.tsx`, le survol de la ligne du devis déclenche l'affichage dynamique d'un rectangle doré sur la zone géométrique correspondante du plan 2D.

### 11.3 Agent Superviseur Structurel Déterministe (`structural_sanity_checker.py`)
- **Audit de Sécurité Physique (Sans LLM)** :
  - *Épaisseur minimale des murs porteurs* : $\ge 15\text{cm}$ (Normes BAEL 91 / Eurocode 2).
  - *Portée maximale des poutres sans poteau intermédiaire* : $< 6.50\text{m}$.
  - *Ratio d'éclairage et aération* : $\ge 1/6^{\text{ème}}$ de la surface habitable.
- **Résultat** : Attribution d'un *Safety Score* sur 100 et émission d'avertissements de conformité avant validation du DQE.

### 11.4 Mode Dégradé Hors-Ligne Edge (`lib/offline-fallback.ts`)
- **Résilience Terrain** : En cas de coupure de la connexion internet au Cameroun, bascule automatique vers DuckDB in-memory local et le moteur OpenCV embarqué pour garantir 100% de disponibilité de l'application.

---
*Dernière mise à jour : Août 2026 - Intégration Complète OpenBIM IFC, XAI Canvas, Superviseur Structurel BAEL 91 & Mode Edge Offline*

