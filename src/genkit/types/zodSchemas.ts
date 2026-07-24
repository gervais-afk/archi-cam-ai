import { z } from 'zod';

export const MetadataSchema = z.object({
  projectName: z.string().default('Projet Archi Cam AI'),
  sourceId: z.string().uuid(),
  schemaVersion: z.literal('2.0'),
});
export type Metadata = z.infer<typeof MetadataSchema>;

export const MetreurDataSchema = z.object({
  schemaVersion: z.literal('2.0'),
  sourceId: z.string().uuid(),
  volume_beton_m3: z.number().nonnegative(),
  surface_coffrage_m2: z.number().nonnegative(),
  ratio_parois: z.number().nonnegative().optional().nullable(),
  isUnreliable: z.boolean().optional().nullable(),
});
export type MetreurData = z.infer<typeof MetreurDataSchema>;

export const CoefficientsSecuriteSchema = z.object({
  gamma_b: z.number(),
  gamma_s: z.number(),
});

export const StructureDataSchema = z.object({
  schemaVersion: z.literal('2.0'),
  sourceId: z.string().uuid(),
  typeSol: z.string(),
  contrainteAdmise_MPa: z.number().nonnegative(),
  typeFondation: z.string(),
  ancrageMinimal_cm: z.number().nonnegative(),
  enrobageMinimal_mm: z.number().nonnegative(),
  coefficientsSecurite: CoefficientsSecuriteSchema,
  steelRequired_kg_per_m3: z.number().nonnegative().optional().nullable(),
  steelRequired_kg: z.number().nonnegative().optional().nullable(),
  concreteRequired_m3: z.number().nonnegative().optional().nullable(),
});
export type StructureData = z.infer<typeof StructureDataSchema>;

export const CostItemSchema = z.object({
  description: z.string(),
  quantity: z.number().nonnegative(),
  unit: z.string(),
  unitPrice_FCFA: z.number().nonnegative(),
  totalPrice_FCFA: z.number().nonnegative(),
});

export const EconomisteDataSchema = z.object({
  schemaVersion: z.literal('2.0'),
  sourceId: z.string().uuid(),
  debourse_sec_FCFA: z.number().nonnegative(),
  temps_unitaire_heures: z.number().nonnegative(),
  creditHeuresTotal: z.number().nonnegative(),
  cout_materiaux_FCFA: z.number().nonnegative(),
  pv_ht_FCFA: z.number().nonnegative(),
  pv_ttc_FCFA: z.number().nonnegative(),
  breakdown: z.array(CostItemSchema),
  varianteMateriauxLocaux_FCFA: z.number().nonnegative().optional().nullable(),
});
export type EconomisteData = z.infer<typeof EconomisteDataSchema>;

export const GanttTaskSchema = z.object({
  tacheId: z.string(),
  debutPlusTot: z.number(),
  finPlusTot: z.number(),
  margeTotale: z.number(),
  delaiAttente_jours: z.number().nonnegative().default(0),
});

export const ConducteurDataSchema = z.object({
  schemaVersion: z.literal('2.0'),
  sourceId: z.string().uuid(),
  effectifMoyen_ouvriers: z.number().int().positive(),
  dureeChantier_jours: z.number().nonnegative(),
  ganttTaches: z.array(GanttTaskSchema),
});
export type ConducteurData = z.infer<typeof ConducteurDataSchema>;

export const SuperviseurDataSchema = z.object({
  schemaVersion: z.literal('2.0'),
  sourceId: z.string().uuid(),
  totalCost_FCFA: z.number().nonnegative(),
  overallDuration_days: z.number().nonnegative(),
  riskLevel: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  approvalStatus: z.boolean(),
  comments: z.string().optional().nullable(),
});
export type SuperviseurData = z.infer<typeof SuperviseurDataSchema>;

// --- CONTEXTE D'ÉTAT ACCUMULATEUR GLOBAL V2 ---
export const PipelineContextSchema = z.object({
  metadata: MetadataSchema,
  titreFoncierValide: z.boolean().default(false),
  permisConstruireObtenu: z.boolean().default(false),
  typeMarche: z.enum(['PRIVE', 'PUBLIC']).default('PRIVE'),
  saison: z.enum(['saison_seche', 'saison_pluies_legere', 'saison_pluies_forte']).default('saison_seche'),
  metreur: MetreurDataSchema.optional().nullable(),
  structure: StructureDataSchema.optional().nullable(),
  economiste: EconomisteDataSchema.optional().nullable(),
  conducteur: ConducteurDataSchema.optional().nullable(),
  superviseur: SuperviseurDataSchema.optional().nullable(),
});
export type PipelineContext = z.infer<typeof PipelineContextSchema>;
