import { z } from "zod";

export const RoomSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(50),
  area_m2: z.number()
    .min(1, "Superficie minimum 1m²")
    .max(500, "Superficie maximum 500m²"),
  texture: z.enum([
    "parquet", "marble_tile", "cobblestone",
    "concrete", "azulejo_tile", "garden"
  ]).default("marble_tile"),
  bbox: z.object({
    x: z.number().min(0),
    y: z.number().min(0),
    w: z.number().min(10),
    h: z.number().min(10),
  }),
  center: z.object({
    x: z.number(),
    y: z.number(),
  }),
});

export const FurnitureSchema = z.object({
  id: z.string(),
  type: z.enum([
    "bed_double", "bed_single", "sofa_3seat",
    "sofa_2seat", "dining_table_6", "dining_table_8",
    "coffee_table", "rug_round", "armchair",
    "kitchen_counter", "toilet", "sink", "shower",
    "bathtub", "desk", "wardrobe", "plant_large",
    "plant_small", "car_sedan", "car_suv",
    "staircase", "elevator"
  ]),
  room_id: z.string(),
  bbox: z.object({
    x: z.number().min(0),
    y: z.number().min(0),
    w: z.number().min(5),
    h: z.number().min(5),
  }),
  rotation_deg: z.number().min(0).max(359).default(0),
  wall_snap: z.enum([
    "top", "bottom", "left", "right", "center", "none"
  ]).default("none"),
  confidence: z.number().min(0).max(1),
});

export const LMStudioPlanAnalysisSchema = z.object({
  plan_info: z.object({
    title: z.string().default("Plan sans titre"),
    scale: z.string().optional(),
    total_area: z.number().min(9).max(10000),
    floors: z.enum(["RDC", "R+1", "R+2", "R+3"]).default("RDC"),
    image_width_px: z.number().min(100),
    image_height_px: z.number().min(100),
  }),
  rooms: z.array(RoomSchema)
    .min(1, "Au moins 1 pièce requise")
    .max(50, "Maximum 50 pièces"),
  furniture: z.array(FurnitureSchema)
    .max(100, "Maximum 100 éléments mobilier"),
  carport: z.object({
    present: z.boolean().default(false),
    vehicle_type: z.enum(["car_sedan", "car_suv", "none"]).default("none"),
    vehicle_color: z.enum(["red", "white", "black", "grey", "none"])
      .default("none"),
    bbox: z.object({
      x: z.number(), y: z.number(),
      w: z.number(), h: z.number(),
    }).optional(),
  }).default({ present: false, vehicle_type: "none", vehicle_color: "none" }),
  outdoor: z.object({
    has_garden: z.boolean().default(false),
    has_veranda: z.boolean().default(false),
    has_pool: z.boolean().default(false),
  }).default({}),
});

export type LMStudioPlanAnalysis = z.infer<typeof LMStudioPlanAnalysisSchema>;

/**
 * 🛠️ AUTO-CORRECTION DES ANALYSES SÉMANTIQUES
 * ───────────────────────────────────────────
 * Répare les JSON partiels retournés par le VLM sans faire planter l'application.
 */
export function autoCorrectAnalysis(raw: unknown): LMStudioPlanAnalysis {
  const result = LMStudioPlanAnalysisSchema.safeParse(raw);

  if (result.success) return result.data;

  console.warn(
    "[Zod Validation] ⚠️ Corrections automatiques appliquées au JSON VLM :",
    result.error.issues.map((i) => i.message)
  );

  const fallback = (raw && typeof raw === "object" ? raw : {}) as Record<string, any>;

  return LMStudioPlanAnalysisSchema.parse({
    plan_info: {
      title: fallback?.plan_info?.title ?? "Plan",
      total_area: Math.max(9, fallback?.plan_info?.total_area ?? 50),
      floors: "RDC",
      image_width_px: fallback?.plan_info?.image_width_px ?? 1024,
      image_height_px: fallback?.plan_info?.image_height_px ?? 1024,
    },
    rooms: Array.isArray(fallback?.rooms) && fallback.rooms.length > 0
      ? fallback.rooms
          .filter((r: any) => (r?.area_m2 ?? 10) >= 1)
          .map((r: any, i: number) => ({
            id: r?.id ?? `room_${i}`,
            name: r?.name ?? `Pièce ${i + 1}`,
            area_m2: Math.min(500, Math.max(1, r?.area_m2 ?? 12)),
            texture: ["parquet", "marble_tile", "cobblestone", "concrete", "azulejo_tile", "garden"].includes(r?.texture)
              ? r.texture
              : "marble_tile",
            bbox: r?.bbox ?? { x: 50, y: 50, w: 200, h: 200 },
            center: r?.center ?? { x: 150, y: 150 },
          }))
      : [
          {
            id: "room_0",
            name: "Séjour Principal",
            area_m2: 30,
            texture: "marble_tile",
            bbox: { x: 50, y: 50, w: 400, h: 300 },
            center: { x: 250, y: 200 },
          },
        ],
    furniture: (fallback?.furniture ?? []).slice(0, 100),
    carport: fallback?.carport ?? { present: false, vehicle_type: "none", vehicle_color: "none" },
    outdoor: fallback?.outdoor ?? {},
  });
}
