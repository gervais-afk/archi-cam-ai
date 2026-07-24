export type UserMode = "b2c" | "b2b";

export type PlanStatus =
  | "idle"
  | "uploaded"
  | "generating"
  | "completed"
  | "error";

export type ArchitecturalStyle =
  | "luxe-tropical"
  | "moderne-minimaliste"
  | "industriel"
  | "africain-contemporain"
  | "3D_PHOTOREALISTE"
  | "PLAN_2D_PHOTOSHOP"
  | "MAQUETTE_BLANCHE"
  | "TROPICAL_MOODY";

export type SubscriptionTier = "free" | "pay-per-use" | "agency-pro";

export interface GenerationOptions {
  style: ArchitecturalStyle;
  cinematicVideo: boolean;
  bioclimaticAudit: boolean;
  googleMapsIntegration: boolean;
}

export interface AIAnalysis {
  surfaceArea: number; // m2
  wallPerimeter: number; // ml
  openingsCount: {
    doors: number;
    windows: number;
  };
  compliance: {
    status: "safe" | "warning" | "error";
    message: string;
    rulesChecked: number;
  };
  confidence: number; // 0-1
}

export interface EstimateLine {
  code: string;
  category: string;
  label: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
}

export interface ProjectEstimate {
  totalAmount: number;
  currency: string; // "FCFA"
  lines: EstimateLine[];
  generatedAt: Date;
  totalHT?: number;
  margeBET?: number;
  margeAleas?: number;
  tva?: number;
  totalTTC?: number;
}

export interface RenderResult {
  id: string;
  imageUrl: string;
  videoUrl?: string | null;
  videoJobId?: string | null;
  videoStatus?: "processing" | "completed" | "failed";
  reportText: string;
  generatedAt: Date;
  style: ArchitecturalStyle;
  hasWatermark: boolean;
  analysis?: AIAnalysis;
  ifcMetadata?: any; // To be typed properly later
  estimate?: ProjectEstimate;
  superviseur?: {
    approvalStatus: boolean;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    comments?: string | null;
  };
}

export interface UserProfile {
  uid: string;
  email: string;
  agencyName: string;
  logoUrl?: string;
  credits: number;
  tier: SubscriptionTier;
  createdAt: Date;
}

export interface GenerationStep {
  id: number;
  label: string;
  duration: number; // ms
}
