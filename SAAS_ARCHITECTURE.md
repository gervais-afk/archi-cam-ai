# Architecture du SaaS Archi Cam AI 🏛️🚀
> **Version 2.0 (Août 2026) — Pipeline Hybride "Grand Cabinet"**  
> *Perception OpenCV/YOLO ➔ Topologie VIM (Shapely) ➔ SCoT ADK ➔ Rendu GPU Fal.ai (Flux 2K/8K) ➔ Post-Traitement & Annotations Pro*

---

## 1. Vue d'Ensemble & Vision Système 🌍

Archi Cam AI transforme n'importe quel document d'entrée (**croquis papier, photo smartphone, plan d'architecte 2D ou fichier PDF/CAD/IFC**) en :
1. **Un plan 2D haute définition photoréaliste** (textures réelles de parquets, carrelages, ombres portées, sans murs tordus).
2. **Un devis DQE / CCTP certifié** basé sur la Mercuriale MINMAP 2026 et les règles BAEL 91 / Eurocode 2.
3. **Un rapport de conformité réglementaire** (Code de l'Urbanisme Cameroun 2004/003, POS, ratios d'hygiène ONAC).
4. **Des livrables commerciaux avancés** (cartouche professionnel, inpainting pièce par pièce, pitch vocal MP3).

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                               FLUX UNIFIÉ DU SYSTÈME V2.0                               │
└────────────────────────────────────────────────────────────────────────────────────────┘

  [INPUT] PDF / Photo / Croquis 2D / Maquette IFC
     │
     ▼
  ┌───────────────────────────────────────────────────────────────────┐
  │ 1. PRÉ-TRAITEMENT & RASTERISATION (Next.js / Sharp / PyPDFium2)   │
  │    • Compression Lanczos3 (max 1024-2048px)                       │
  │    • Suppression des lignes de cahier (Filtre Hough adaptatif)    │
  └─────────────────────────────────┬─────────────────────────────────┘
                                    │
                                    ▼
  ┌───────────────────────────────────────────────────────────────────┐
  │ 2. PERCEPTION GÉOMÉTRIQUE & SÉMANTIQUE (Terminal 1 : Port 8000)   │
  │    • YOLOv8 / ONNX  : Détection des portes, fenêtres, sanitaires  │
  │    • OpenCV 2.5D    : Canny Edge Map, Wall Mask, Text Layer       │
  │    • PaddleOCR/VLM  : Lecture des cotations et noms de pièces     │
  └─────────────────────────────────┬─────────────────────────────────┘
                                    │
                                    ▼
  ┌───────────────────────────────────────────────────────────────────┐
  │ 3. VIM TOPOLOGY BUILDER (Shapely) (Terminal 2 : Port 8001)        │
  │    • Soudure des gaps de murs (tolérance 15 cm)                   │
  │    • Fusion colinéaire (linemerge) et snap de réseau              │
  │    • Polygonisation fermée des pièces (Zéro-mur-ouvert)           │
  │    • Calcul vérité terrain des surfaces réelles en m²             │
  │    • Sortie : Graphe JSON SCoT + Masques de pièces PNG            │
  └─────────────────────────────────┬─────────────────────────────────┘
                                    │
                                    ▼
  ┌───────────────────────────────────────────────────────────────────┐
  │ 4. ORCHESTRATION AGENTIQUE & SMART COMPOSER (T4: 8080 / Next.js)  │
  │    • DynamicRenderPrompter : Détection auto (Villa / Appart / BET) │
  │    • Règles BTP Cameroun : Matériaux Iroko, BTC Mipromalo         │
  │    • Construction du prompt maîtrisé sans hallucination           │
  └─────────────────────────────────┬─────────────────────────────────┘
                                    │
                                    ▼
  ┌───────────────────────────────────────────────────────────────────┐
  │ 5. MOTEUR DE RENDU HD FAL.AI (Flux Dev 2K + ControlNet @ 0.75)   │
  │    • Contrainte Canny/MLSD : Murs verrouillés à 100%              │
  │    • Inférence GPU < 10s : Textures réelles, ombres 45°           │
  │    • Option Clarity Upscaler : Super-Résolution 8K (A0/A1)        │
  └─────────────────────────────────┬─────────────────────────────────┘
                                    │
                                    ▼
  ┌───────────────────────────────────────────────────────────────────┐
  │ 6. HABILLAGE & POST-TRAITEMENT PRO (Terminal 3 : Port 8002)       │
  │    • ProfessionalAnnotator (PIL / Arial Narrow)                   │
  │    • Lignes de cotation extérieures avec tirets d'architecte      │
  │    • Labels de surfaces par pièce (ex: SALON 28.50 m²)            │
  │    • Cartouche officiel "PROJET DE CONSTRUCTION — Éch. 1:100"     │
  │    • Superposition du calque texte vectoriel d'origine + Sharp    │
  └─────────────────────────────────┬─────────────────────────────────┘
                                    │
                                    ▼
  [OUTPUT FINAL] Plan Sublimé 4K/8K + Devis DQE FCFA + Pitch Vocal MP3
```

---

## 2. Parcours Utilisateur par Espace

### 📐 2.1 Espace Particulier (`/dashboard/particulier`)
*Conçu pour Mme Ekani, M. Tano et tout particulier avec un projet de construction.*

1. **Upload** : Glisser-déposer d'une photo de croquis au crayon, d'un plan papier pris en photo au smartphone, ou d'un fichier PDF.
2. **Nettoyage & Sécurisation** :
   - Le système nettoie automatiquement le quadrillage de cahier (Seyès) si c'est un croquis.
   - OpenCV binarise et isole les lignes de murs structurelles.
3. **Validation & Devis Instantané** :
   - Le VIM TopologyBuilder calcule les surfaces réelles certifiées.
   - DuckDB calcule le coût estimatif global en FCFA selon la Mercuriale MINMAP 2026.
4. **Rendu Visuel 2.5D** :
   - Le *Dynamic Composer* détecte automatiquement s'il y a un parking (ajoute une voiture), un balcon (ajoute des plantes sans voiture) ou s'il s'agit d'un intérieur pur.
   - Fal.ai applique les textures photoréalistes sous contrainte stricte de la géométrie du plan.
5. **Livraison** :
   - Plan 2D annoté avec cartouche professionnel.
   - Téléchargement du DQE en PDF certifié (QR code, filigrane).
   - Possibilité de générer un pitch vocal audio WhatsApp (`/scripts/audio/generate_sales_pitch.py`).
   - Possibilité de modifier une pièce isolée via l'Inpainting (`/api/edit/room-zone`).

---

### 🏗️ 2.2 Espace Professionnel BIM (`/dashboard/pro`)
*Conçu pour les architectes, bureaux d'études techniques (BET) et promoteurs.*

1. **Ingestion Multi-Format** :
   - Plans PDF d'architecte haute résolution (300 DPI via PyPDFium2).
   - Maquettes numériques 3D au format standard **IFC 2x3 / IFC 4.0** (`ifcopenshell 0.8.5`).
2. **Extraction Quantitative Déterministe** :
   - Volumes exacts de béton ($m^3$) des semelles, poteaux et dalles.
   - Tonnage d'aciers haute adhérence (HA FeE500).
   - Linéaires de maçonneries en agglos de 15/20 ou Blocs de Terre Comprimée (BTC).
3. **Audit de Conformité & Model Checking** :
   - **Audit BAEL 91 / Eurocode 2** : Portées de poutres, ratios d'armatures, descente de charges.
   - **Audit Hygiène & POS Cameroun** : Surfaces minimales (Chambre $\ge 9m^2$, Hauteur sous plafond $\ge 2.80m$).
4. **Livrables d'Ingénierie** :
   - Export DQE décomposé en 4 lots (Gros Œuvre, Second Œuvre, Menuiseries, Électricité/Plomberie).
   - Visualiseur 3D interactif Three.js (`DigitalTwinViewer.tsx`).
   - Export du rapport CCTP prêt pour soumission aux appels d'offres publics MINMAP.

---

## 3. Rôle de Chaque Brique : Que devient YOLO et le reste ?

Rien n'a été remplacé ou supprimé : **chaque technologie occupe désormais son rôle optimal** dans la chaîne de valeur :

| Outil / Brique | Rôle précis dans l'architecture | Pourquoi il est indispensable |
|---|---|---|
| **YOLOv8 / ONNX** (Port 8000) | **Détecteur d'objets ponctuels** : portes, fenêtres, lavabos, WC, mobilier. | YOLO n'est pas fait pour tracer des murs continus, mais il est le meilleur pour localiser instantanément où se trouvent les ouvertures et équipements. |
| **OpenCV 2.5D / Canny** | **Extracteur de primitives et calques** : binarisation, suppression des réglures, séparation des calques textes et masques. | Isole les éléments en < 50ms sans coût GPU. Produit le `canny_edges.png` et le `text_layer.png`. |
| **VIM TopologyBuilder (Shapely)** (Port 8001) | **Ingénieur géomètre** : prend les lignes de murs brisées d'OpenCV/MLSD, les soude (gaps 15cm), ferme les polygones et calcule les surfaces exactes. | Empêche mathématiquement les pièces ouvertes et corrige les hallucinations d'échelle du VLM. |
| **ADK Orchestrateur SCoT** (Port 8080) | **Cerveau décisionnel** : coordonne les agents Router, Designer, Engineer, Legal et applique les règles d'urbanisme. | Fournit la logique d'analyse contextuelle et prépare les métadonnées pour le rendu. |
| **Dynamic Render Prompter** | **Miroir intelligent** : inspecte le JSON SCoT et compose dynamiquement le prompt parfait (Villa vs Appartement vs Bureau). | Évite le texte figé et garantit que chaque projet reçoit un prompt sur-mesure. |
| **Fal.ai (Flux-Dev + ControlNet)** | **Artiste photoréaliste** : injecte les textures réalistes (bois, marbre, carrelage, ombres) sous contrainte rigoureuse des lignes de murs. | Délivre un rendu commercial 2K/8K en < 10 secondes sur GPU cloud. |
| **Clarity Upscaler (Fal.ai)** | **Super-Résolveur HD** : agrandit les rendus en 4K/8K sans perte de netteté. | Permet l'impression de tirages de chantiers grand format (A0, A1, A2). |
| **Professional Annotator (PIL)** (Port 8002) | **Dessinateur projeteur** : ajoute les lignes de cotes, labels de surfaces par pièce et le cartouche officiel en bas de page. | Transforme une simple image artistique en document technique professionnel. |
| **Sharp & Post-Compositing** | **Assembleur final** : superpose le calque texte vectoriel d'origine, le filigrane sécurisé et applique la signature EXIF. | Garantit la clarté des cotations d'origine sans artefact d'IA. |
| **DuckDB 1.5.5** | **Moteur analytique BTP** : croise les surfaces du VIM avec la mercuriale des prix unitaires MINMAP 2026. | Calcul instantané et déterministe du devis en FCFA. |
| **Neo4j 5.20** | **Base de connaissances GraphRAG** : ontologie des normes camerounaises, matériaux locaux et articles de loi. | RAG juridique avec citation exacte des articles de loi lors des audits. |

---

## 4. Carte des Services & Ports Réseau

```
┌──────────────┬──────────────────────────┬────────────────────────────────────────┐
│ Port         │ Service                  │ Rôle technique                         │
├──────────────┼──────────────────────────┼────────────────────────────────────────┤
│ :3000        │ Next.js 14 App Router    │ Dashboard Client, API Routes & UI      │
│ :8000        │ YOLO FastAPI Microservice│ Détection des symboles (Portes/Fenêtres)│
│ :8001        │ VIM TopologyBuilder API  │ Reconstruction géométrique Shapely      │
│ :8002        │ Professional Annotator   │ Cotations & Cartouche PIL               │
│ :8003        │ FastMCP Python Workers   │ Outils BTP (Métré, Structure, DQE)     │
│ :8080        │ ADK Agent Orchestrator   │ SCoT Pipeline & Raisonnement           │
│ :7474 / 7687 │ Neo4j Browser / Bolt     │ Graphe des normes & Urbanisme          │
│ In-Memory    │ DuckDB Engine            │ Calculs analytiques & Devis FCFA       │
└──────────────┴──────────────────────────┴────────────────────────────────────────┘
```

---

## 5. Résilience & Tolérance aux Pannes

Le système est conçu avec un principe de **dégradation gracieuse** :

1. **Si Fal.ai est inaccessible ou hors crédit** : Le système bascule automatiquement sur Replicate, ou renvoie le plan vectoriel binarisé OpenCV local (l'utilisateur reçoit toujours son résultat en < 3 secondes).
2. **Si l'Annotateur (:8002) est éteint** : La route renvoie l'image Fal.ai brute avec superposition directe Sharp sans bloquer la requête.
3. **Si Internet est coupé** : Le mode Edge local s'active, calculant le devis DuckDB et le plan morphologique OpenCV sans aucune connexion externe requise.

---

*Archi Cam AI — Architecture ConTech & PropTech Souveraine pour le Cameroun*  
*Standard OKF BTP v0.2 • MINMAP 2026 • BAEL 91 • Eurocode 2 • Loi Urbanisme 2004/003*
