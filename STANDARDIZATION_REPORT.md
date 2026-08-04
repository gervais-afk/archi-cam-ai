# ARCHI CAM AI — ARCHITECTURE SYSTÈME & DOCUMENTATION TECHNIQUE DE PRODUCTION

## 🏛️ Vue d'Ensemble du Pipeline Global

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        PIPELINE SOUVERAIN ARCHI CAM AI                                 │
└────────────────────────────────────────────────────────────────────────────────────────┘
  1. RÉCEPTION FICHIER (PDF Vectoriel, Scan, Croquis Stylo, Photo de chantier)
       │
       ▼
  2. DÉTECTION ADAPTATIVE (scripts/adaptive_plan_detector.py)
     • Classification : VECTOR_PDF, CLEAN_SCAN, HAND_DRAWN, PHOTO_SKETCH
     • Pipeline Stylo/Manuscrit : CLAHE + Filtre Bilatéral + Seuillage Adaptatif Local + 
       Fermeture Morphologique + Nettoyage Composants Connexes (< 30px)
       │
       ▼
  3. EXTRACTION SÉMANTIQUE LOCAL (lib/lm-studio-analyzer.ts)
     • Serveur Local LM Studio (google/gemma-4-12b-qat sur http://localhost:1234)
     • Timeout 45mn | Fallback local OpenCV déterministe
     • Sortie JSON : Pièces, surfaces (m²), cotations, bboxes, meubles & orientation wall-snap
       │
       ▼
  4. EXTRACTION GÉOMÉTRIQUE & DEVIS (scripts/wall_extractor_for_quote.py & lib/quote/geometry-to-quote.ts)
     • Étalonnage d'échelle px/m
     • HoughLinesP : extraction des mètres linéaires (mL) et épaisseurs (porteurs 20cm vs cloisons 15cm)
     • Devis FCFA Mercuriale BTP Cameroun 2025/2026 (TVA 19.25% + 5% imprévus)
       │
       ▼
  5. MOTEUR GRAPHIQUE HD (scripts/render_from_lm_json.py & scripts/generate_photoshop_2d_plan.py)
     • Textures HD réelles par pièce (parquet teck, marbre Calacatta, pavés, azulejos)
     • Masquage strict floor_only_mask (Le parquet ne recouvre JAMAIS le mobilier)
     • 16 Sprites Mobilier PNG HD orientés selon wall-snap (0°, 90°, 180°, 270°)
     • Styles supportés : Luxe Tropical, Moderne, Commercial, R+1 Duplex, R+2 Immeuble
     • Filigrane ARCHI CAM AI ® & rendu final 2.5D HD sur disque
```

---

## 📦 Cartographie des Assets (`public/assets/`)

### Textures HD (`public/assets/textures/`)
- 🪵 `parquet.jpg` (Veinage bois teck miel / Iroko)
- 🏛️ `marble_tile.jpg` (Marbre blanc Calacatta)
- 🧱 `cobblestone.jpg` (Pavés briques rouges)
- 🏢 `concrete.jpg` (Béton lissé clair)
- 🛁 `azulejo_tile.jpg` (Céramique de salle de bain)

### Sprites Mobilier PNG (`public/assets/furniture/`)
- 🛏️ `bed_double.png`, `bed_single.png` (Lits double et simple)
- 🍽️ `dining_table_8p.png`, `dining_table_6.png` (Tables à manger + chaises)
- 🛋️ `sofa_3seat.png`, `sofa_2seat.png` (Canapés 3 et 2 places)
- 🚗 `car_red_sedan.png` (Berline rouge vue du dessus)
- 🪴 `plant_large.png`, `plant_small.png` (Plantes tropicales)
- 🛁 `bathtub.png` (Baignoire)
- 🚪 `wardrobe.png` (Armoire dressing)
- 🖥️ `desk.png` (Bureau avec ordinateur et fauteuil)
- 🪜 `staircase.png` (Escalier avec flèche de montée)
- 🛗 `elevator.png` (Cabine ascenseur inox)
- 🚽 `toilet.png` & 🚰 `sink.png` (Équipements sanitaires)

---

## 🎨 Styles de Rendu Architectural (`lib/prompts/render-prompts.ts`)

1. **`luxe_tropical`** : Villa de standing, parquet teck miel, marbre blanc, terrasse pavée briques, végétation tropicale.
2. **`moderne`** : Minimaliste scandinave, parquet chêne blanchi, marbre Nero Marquina noir, mobilier gris anthracite.
3. **`commercial`** : Bureaux open-space, moquette dalles anthracite, dalles LED, cloisons vitrées, fauteuils ergonomiques.
4. **`r_plus_1`** : Villa Duplex R+1 avec vide sur séjour, escalier tournant bois/verre et suite parentale.
5. **`r_plus_2`** : Immeuble résidentiel R+2 avec appartements T3/T4, balcons et cabine d'ascenseur inox.

---

## 💵 Mercuriale BTP Cameroun 2025/2026 (`lib/quote/geometry-to-quote.ts`)

| Poste BTP | Caractéristiques | Prix Unitaire FCFA |
| :--- | :--- | :--- |
| **Maçonnerie Cloisons (15 cm)** | Parpaings creux 15x20x40 | 45 000 FCFA / m² |
| **Maçonnerie Murs Porteurs (20 cm)** | Parpaings creux 20x20x40 (BAEL 91) | 52 000 FCFA / m² |
| **Fondations Filantes** | Fouilles + béton propreté + semelles | 85 000 FCFA / mL |
| **Carrelage Grès Cérame** | Carrelage 60x60 pose collée | 22 000 FCFA / m² |
| **Parquet Stratifié Teck** | Parquet haute résistance | 35 000 FCFA / m² |
| **Portes Bois** | Portes isoplanes & pleines | 145 000 – 185 000 FCFA / u |
| **Fenêtres Aluminium** | Chassis vitré alu | 95 000 FCFA / m² |
| **Équipements Sanitaires** | WC suspension + Douche | 280 000 – 320 000 FCFA / u |
| **Charpente & Couverture** | Bac acier 50/100e + bois traité | 60 000 FCFA / m² |
| **TVA & Imprévus** | TVA légale (19.25%) + Imprévus (5%) | Calculé automatiquement |

---

## 🏆 Checklist d'Homologation

- [x] **TypeScript** (`npx tsc --noEmit`) : **0 Erreur**
- [x] **Scripts Python** (`python scripts/validate_python_scripts.py`) : **30/30 Compilés**
- [x] **Assets** (`python scripts/check_assets.py`) : **5 Textures + 16 Sprites Validés**
- [x] **Build Next.js** (`npm run build`) : **18/18 Pages compilées**
- [x] **Test Rendu API** (`npm run test:local-render`) : **HTTP 200 OK — Image HD 2.67 MB générée**
