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
  { id: 1, label: "Analyse structurelle du plan (YOLO + OpenCV)...",    duration: 4000 },
  { id: 2, label: "Reconstruction topologique des murs (Shapely)...",    duration: 4500 },
  { id: 3, label: "Validation géométrique des pièces fermées...",        duration: 3000 },
  { id: 4, label: "Raisonnement spatial SCoT (Règles BTP Cameroun)...", duration: 4000 },
  { id: 5, label: "Génération du rendu réaliste (Fal.ai ControlNet)...", duration: 8000 },
  { id: 6, label: "Post-compositing : textes, cotations & filigrane...", duration: 3000 },
];


export const MOCK_RENDER_RESULT: RenderResult = {
  id:          "render-duplex-r1-001",
  imageUrl:    "/output_2d_etage_plan.png",
  generatedAt: new Date(),
  style:       "luxe-tropical",
  hasWatermark: false,
  analysis: {
    surfaceArea: 245,
    wallPerimeter: 128,
    openingsCount: {
      doors: 8,
      windows: 16,
    },
    compliance: {
      status: "safe",
      message: "Projet 100% Conforme ONAC & Urbanisme. Hauteur sous plafond 2.80m et surfaces pièces >= 9.0m² respectées.",
      rulesChecked: 142,
    },
    confidence: 0.99,
  },
  ifcMetadata: {
    concreteVolume: 145.0,
    steelWeight: 13050,
    wallArea: 165,
    elementCount: 128,
    clashes: 0,
    complianceScore: 100,
    elements: [
       { id: "wall-1", type: "IfcWall", name: "Mur Porteur Façade Nord", material: "Béton Armé", quantities: { volume: 35.5 }, estimations: { ferraillage_kg: 3195 } },
       { id: "slab-1", type: "IfcSlab", name: "Dalle R+1", material: "Béton Armé BAEL 91", quantities: { volume: 55.0 }, estimations: { ferraillage_kg: 4950 } },
       { id: "col-1", type: "IfcColumn", name: "Poteau Structurel", material: "Béton Armé", quantities: { volume: 14.5 }, estimations: { ferraillage_kg: 1305 } }
    ]
  },
  estimate: {
    totalAmount: 12136500,
    currency: "FCFA",
    lines: [
      { code: "GO-1", category: "Gros Œuvre", label: "Béton Armé Structure (145 m³)", quantity: 145, unit: "m³", unitPrice: 55000, totalPrice: 7975000 },
      { code: "GO-2", category: "Gros Œuvre", label: "Acier HA BAEL 91 (13 050 kg)", quantity: 13050, unit: "kg", unitPrice: 318, totalPrice: 4161500 },
      { code: "SO-1", category: "Second Œuvre", label: "Menuiserie Bois Iroko & Persiennes", quantity: 48, unit: "m²", unitPrice: 85000, totalPrice: 4080000 },
      { code: "SO-2", category: "Second Œuvre", label: "Parement Pierre Volcanique d'Edéa", quantity: 120, unit: "m²", unitPrice: 15000, totalPrice: 1800000 }
    ],
    generatedAt: new Date(),
  },
  reportText: `## Rapport Technique — Duplex R+1 Contemporain #render-duplex-r1-001

**Structure du Projet :** Duplex R+1 (Rez-de-chaussée + 1 Étage)  
**Résolution Rendu :** 4096 × 2160 px (4K Ultra HD)  
**Indice de Qualité Rendu :** 99.2 / 100  
**Attestation Cryptographique :** \`synthid_sha256_2770273727407725911\` (OKF v0.2)

---

### Analyse Structurelle & Matériaux
La structure présente une ossature en béton armé de type Duplex R+1 conforme aux recommandations BAEL 91 ($145.0\text{ m}^3$ de béton net pour $13\ 050\text{ kg}$ d'acier). Les façades principales intègrent un soubassement en pierre volcanique d'Edéa et des ventelles inclinées en bois Iroko local.

### Recommandations Bioclimatiques
- **Ventilation traversante** : Alignement des baies vitrées sur l'axe Est-Ouest pour capter la brise tropicale.
- **Protection solaire** : Débord de toiture de 1.20m sur la façade Ouest.
- **Conformité ONAC** : 100% des pièces principales dépassent le seuil de $9.0\text{ m}^2$ (Salon 24.5 m², Chambre 18 m²).

### Planning & Trésorerie (MoneyGantt)
- **Durée de chantier** : 12 jours ouvrés + 4 jours de buffer saison des pluies (Total 16 jours).
- **Échéancier de paiement** : 30% Mobilisation / 40% Fin Gros Œuvre / 30% Livraison.`,
};

export const ARCHITECTURAL_STYLES = [
  { value: "luxe-tropical",         label: "🌿 Luxe Tropical"           },
  { value: "moderne-minimaliste",   label: "◼ Moderne Minimaliste"      },
  { value: "industriel",            label: "⚙ Industriel Urbain"        },
  { value: "africain-contemporain", label: "🏛 Africain Contemporain"   },
  { value: "TROPICAL_MOODY",        label: "⛈ Tropical Moody (Edéa/Iroko)" },
] as const;

export const RENDER_MODES = [
  { value: "3D_PHOTOREALISTE",      label: "📸 Rendu 3D Photoréaliste"  },
  { value: "PLAN_2D_PHOTOSHOP",     label: "🎨 Plan 2D Photoshop"       },
  { value: "MAQUETTE_BLANCHE",      label: "🏢 Maquette Blanche"        },
] as const;
