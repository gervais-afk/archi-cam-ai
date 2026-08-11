"use client";

import React, { useState } from "react";
import { 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Layers, 
  Maximize2, 
  Eye, 
  Compass, 
  Sparkles,
  Info,
  Sliders
} from "lucide-react";

export type InputType = "digital_clean" | "sketch_paper" | "photo_unusable";

export interface ProcessingMetadata {
  input_type?: InputType | string;
  processing_time_seconds?: number;
  resolution_input?: string;
  room_count?: number;
  status?: string;
  artifacts?: {
    source_inpainted?: boolean;
    wall_mask?: boolean;
    canny_edges?: boolean;
    depth_map?: boolean;
    stair_mask?: boolean;
    furniture_anchors_map?: boolean;
  };
  outdoor_zones?: Array<{
    type: string;
    area_m2: number;
  }>;
  staircase_zones?: Array<{
    bbox: number[];
  }>;
}

interface UploadFeedbackProps {
  metadata?: ProcessingMetadata | null;
  anchorsMapUrl?: string;
  cleanPlanUrl?: string;
  onPreviewToggle?: (layer: "clean" | "anchors" | "both") => void;
  className?: string;
}

export const UploadFeedback: React.FC<UploadFeedbackProps> = ({
  metadata,
  anchorsMapUrl,
  cleanPlanUrl,
  onPreviewToggle,
  className = "",
}) => {
  const [activeTab, setActiveTab] = useState<"clean" | "anchors" | "both">("anchors");
  const [showDetails, setShowDetails] = useState(false);

  if (!metadata) return null;

  const inputType = (metadata.input_type || "digital_clean") as InputType;

  // Configuration dynamique selon le type détecté
  const config = {
    digital_clean: {
      label: "Plan Numérique / CAD (Type A)",
      description: "Plan vectoriel net avec murs droits. Pipeline déterministe haute fidélité activé.",
      badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
      icon: CheckCircle2,
      recommendation: "Idéal pour une génération de textures ultra-précise et cotations exactes."
    },
    sketch_paper: {
      label: "Croquis Papier / Scan (Type B)",
      description: "Scan à main levée détecté. Débruitage morphologique et fermeture automatique des contours appliqués.",
      badgeColor: "bg-amber-500/10 text-amber-400 border-amber-500/30",
      icon: AlertTriangle,
      recommendation: "Les murs ont été squelettisés et redressés pour ancrer le mobilier géométriquement."
    },
    photo_unusable: {
      label: "Image Dégradée / Sombre (Type C)",
      description: "Luminosité faible ou contraste insuffisant. La géométrie risque d'être imprécise.",
      badgeColor: "bg-rose-500/10 text-rose-400 border-rose-500/30",
      icon: XCircle,
      recommendation: "Conseil : Photographiez le plan bien à plat, de face, sous un éclairage uniforme."
    }
  }[inputType] || {
    label: "Plan Architecte",
    description: "Analyse sémantique effectuée.",
    badgeColor: "bg-blue-500/10 text-blue-400 border-blue-500/30",
    icon: Info,
    recommendation: ""
  };

  const IconComponent = config.icon;

  const handleTabChange = (tab: "clean" | "anchors" | "both") => {
    setActiveTab(tab);
    if (onPreviewToggle) {
      onPreviewToggle(tab);
    }
  };

  return (
    <div className={`w-full rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur-xl p-5 shadow-2xl transition-all duration-300 ${className}`}>
      {/* Header avec Statut et Badge */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800/80">
        <div className="flex items-center space-x-3">
          <div className={`p-2.5 rounded-xl border ${config.badgeColor}`}>
            <IconComponent className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-semibold text-slate-100 tracking-wide">
                {config.label}
              </h3>
              <span className={`text-xs px-2.5 py-0.5 rounded-full border font-medium ${config.badgeColor}`}>
                {inputType.toUpperCase()}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {config.description}
            </p>
          </div>
        </div>

        {/* Métadonnées rapides */}
        <div className="flex items-center space-x-3 text-xs text-slate-400 bg-slate-950/60 px-3.5 py-1.5 rounded-xl border border-slate-800">
          {metadata.processing_time_seconds && (
            <div>
              <span className="text-slate-500">Temps : </span>
              <span className="text-emerald-400 font-mono font-medium">{metadata.processing_time_seconds}s</span>
            </div>
          )}
          {metadata.resolution_input && (
            <div>
              <span className="text-slate-500">Résolution : </span>
              <span className="text-slate-200 font-mono font-medium">{metadata.resolution_input}</span>
            </div>
          )}
        </div>
      </div>

      {/* Recommandation Métier & Conseils */}
      {config.recommendation && (
        <div className="mt-3.5 flex items-start space-x-2.5 bg-slate-950/40 border border-slate-800/50 rounded-xl p-3 text-xs text-slate-300">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <span>{config.recommendation}</span>
        </div>
      )}

      {/* Sélecteur de Calques Déterministes */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-1.5 bg-slate-950/70 p-1 rounded-xl border border-slate-800/80">
          <button
            onClick={() => handleTabChange("clean")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === "clean"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Plan Nettoyé
          </button>
          <button
            onClick={() => handleTabChange("anchors")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-all ${
              activeTab === "anchors"
                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-500/20"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Ancrages Mobilier (V8)</span>
          </button>
          <button
            onClick={() => handleTabChange("both")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === "both"
                ? "bg-purple-600 text-white shadow-lg shadow-purple-500/20"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Superposition
          </button>
        </div>

        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-xs text-slate-400 hover:text-slate-200 flex items-center space-x-1 transition-colors"
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>{showDetails ? "Masquer détails" : "Détails géométrie"}</span>
        </button>
      </div>

      {/* Panneau des détails géométriques avancés */}
      {showDetails && (
        <div className="mt-4 pt-3 border-t border-slate-800/60 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-2.5 rounded-xl bg-slate-950/50 border border-slate-800">
            <span className="text-slate-500 block">Escaliers Détectés</span>
            <span className="text-amber-400 font-semibold mt-0.5 block">
              {metadata.staircase_zones?.length || 0} zone(s)
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-950/50 border border-slate-800">
            <span className="text-slate-500 block">Espaces Extérieurs</span>
            <span className="text-blue-400 font-semibold mt-0.5 block">
              {metadata.outdoor_zones?.length || 0} balcon/terrasse
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-950/50 border border-slate-800">
            <span className="text-slate-500 block">Masque Mobilier</span>
            <span className="text-emerald-400 font-semibold mt-0.5 block">
              {metadata.artifacts?.furniture_anchors_map ? "Actif (Gris 200-235)" : "Inactif"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadFeedback;
