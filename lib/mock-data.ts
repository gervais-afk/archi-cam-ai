import type { GenerationStep, RenderResult, UserProfile } from "@/types";

export const MOCK_USER: UserProfile = {
  uid:        "mock-uid-001",
  email:      "contact@agence-batir.cm",
  agencyName: "Agence Bâtir Cameroun",
  logoUrl:    undefined,
  credits:    12,
  tier:       "agency-pro",
  createdAt:  new Date("2024-01-15"),
};

export const GENERATION_STEPS: GenerationStep[] = [
  { id: 1, label: "Analyse structurelle du plan...",     duration: 2000 },
  { id: 2, label: "Détection des volumes et façades...", duration: 2500 },
  { id: 3, label: "Application des textures BTP...",     duration: 3000 },
  { id: 4, label: "Calcul de l'éclairage naturel...",    duration: 2000 },
  { id: 5, label: "Rendu 4K en cours (IA)...",           duration: 3500 },
  { id: 6, label: "Génération du rapport technique...",  duration: 1500 },
];

export const MOCK_RENDER_RESULT: RenderResult = {
  id:          "render-mock-001",
  imageUrl:    "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=80",
  generatedAt: new Date(),
  style:       "luxe-tropical",
  hasWatermark: false,
  analysis: {
    surfaceArea: 350,
    wallPerimeter: 184,
    openingsCount: {
      doors: 12,
      windows: 24,
    },
    compliance: {
      status: "warning",
      message: "Attention : Le débord de toiture sur la façade Sud est insuffisant (0.8m mesuré vs 1.2m recommandé pour le climat équatorial). Risque de surchauffe en après-midi.",
      rulesChecked: 142,
    },
    confidence: 0.96,
  },
  ifcMetadata: {
    concreteVolume: 42.5,
    steelWeight: 3825,
    wallArea: 185,
    elementCount: 154,
    clashes: 0,
    complianceScore: 98,
    elements: [
       { id: "wall-1", type: "IfcWall", name: "Mur Façade Nord", material: "Parpaing", quantities: { volume: 12.5 }, estimations: { ferraillage_kg: 1125 } },
       { id: "slab-1", type: "IfcSlab", name: "Dalle RDC", material: "Béton", quantities: { volume: 30.0 }, estimations: { ferraillage_kg: 2700 } }
    ]
  },
  estimate: {
    totalAmount: 42500000,
    currency: "FCFA",
    lines: [
      { code: "GO-1", category: "Gros Œuvre", label: "Fondations et Soubassements", quantity: 1, unit: "Ens", unitPrice: 8500000, totalPrice: 8500000 },
      { code: "GO-2", category: "Gros Œuvre", label: "Élévations Parpaings 15x20x40", quantity: 3200, unit: "U", unitPrice: 550, totalPrice: 1760000 },
      { code: "SO-1", category: "Second Œuvre", label: "Carrelage Grès Cérame 60x60", quantity: 350, unit: "m²", unitPrice: 12500, totalPrice: 4375000 },
      { code: "SO-2", category: "Second Œuvre", label: "Menuiserie Aluminium Noir", quantity: 64, unit: "m²", unitPrice: 85000, totalPrice: 5440000 },
      { code: "TO-1", category: "Toiture", label: "Charpente Bois et Bac Alu 0.50", quantity: 410, unit: "m²", unitPrice: 18000, totalPrice: 7380000 },
    ],
    generatedAt: new Date(),
  },
  reportText: `## Rapport Technique — Rendu IA #render-mock-001

**Style Architectural :** Luxe Tropical Camerounais  
**Résolution :** 4096 × 2160 px (4K Ultra HD)  
**Indice de Qualité Rendu :** 97.4 / 100

---

### Analyse Structurelle
La structure présente une ossature béton armé de type R+2 avec débordements de toiture caractéristiques de l'architecture tropicale. Les façades exposées Sud-Ouest captent un ensoleillement optimal entre 10h et 16h.

### Recommandations Bioclimatiques
- **Ventilation naturelle** : Privilégier des ouvertures traversantes sur l'axe Est-Ouest.
- **Protection solaire** : Brise-soleils horizontaux recommandés sur façade Nord (surplomb ≥ 1.2m).
- **Matériaux** : Enduit pierre locale associé à bardage bois Iroko pour intégration contextuelle.

### Performance Énergétique Estimée
Classe **B** selon référentiel RT-Tropicale. Potentiel d'optimisation vers classe A avec installation de brasseurs de plafond et isolation toiture 10cm.`,
};

export const ARCHITECTURAL_STYLES = [
  { value: "luxe-tropical",         label: "🌿 Luxe Tropical"           },
  { value: "moderne-minimaliste",   label: "◼ Moderne Minimaliste"      },
  { value: "industriel",            label: "⚙ Industriel Urbain"        },
  { value: "africain-contemporain", label: "🏛 Africain Contemporain"   },
  { value: "3D_PHOTOREALISTE",      label: "📸 Rendu 3D Photoréaliste"  },
  { value: "PLAN_2D_PHOTOSHOP",     label: "🎨 Plan 2D Photoshop"       },
  { value: "MAQUETTE_BLANCHE",      label: "🏢 Maquette Blanche"        },
  { value: "TROPICAL_MOODY",        label: "⛈ Tropical Moody (Edéa/Iroko)" },
] as const;
