"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, CheckCircle2, AlertCircle, Eye, RefreshCw, ArrowRight } from "lucide-react";

interface DetectedElement {
  id: string;
  type: "WALL" | "DOOR" | "WINDOW";
  label: string;
  confidence: number;
}

interface PlanValidationOverlayProps {
  isOpen: boolean;
  onConfirm: () => void;
  onClose: () => void;
  planImageUrl?: string;
  elements?: DetectedElement[];
}

const DEFAULT_ELEMENTS: DetectedElement[] = [
  { id: "1", type: "WALL", label: "Murs Porteurs (Poché Anthracite #0F172A)", confidence: 99 },
  { id: "2", type: "DOOR", label: "Porte d'Entrée & Battants Séjour (0.90m)", confidence: 96 },
  { id: "3", type: "WINDOW", label: "Baies Vitrées Coulissantes & Fenêtres SDB", confidence: 94 },
  { id: "4", type: "DOOR", label: "Accès Annexe Externe (3 Chambres)", confidence: 92 },
];

export const PlanValidationOverlay: React.FC<PlanValidationOverlayProps> = ({
  isOpen,
  onConfirm,
  onClose,
  planImageUrl = "/output_2d_etage_plan.png",
  elements = DEFAULT_ELEMENTS,
}) => {
  const [isValidating, setIsValidating] = useState(false);

  const handleConfirm = () => {
    setIsValidating(true);
    setTimeout(() => {
      setIsValidating(false);
      onConfirm();
    }, 800);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="w-full max-w-2xl overflow-hidden rounded-3xl border border-white/10 bg-slate-900 shadow-2xl"
          >
            {/* Header Bar */}
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 bg-slate-900/50">
              <div className="flex items-center space-x-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Validation Visuelle Anti-Hallucination (3s)</h3>
                  <p className="text-xs text-slate-400">Vérification automatique OpenCV & Gemini Vision 2.5</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white transition"
              >
                ✕
              </button>
            </div>

            {/* Content Body */}
            <div className="p-6 space-y-6">
              {/* Pre-visualization map */}
              <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl border border-white/10 bg-slate-950">
                <img
                  src={planImageUrl}
                  alt="Prévisualisation Vectorielle"
                  className="h-full w-full object-contain p-2 opacity-90"
                />
                
                {/* Overlay Badges */}
                <div className="absolute top-3 left-3 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-500/20 px-2.5 py-1 text-[11px] font-semibold text-blue-400 border border-blue-500/30 backdrop-blur-md">
                    <span className="h-2 w-2 rounded-full bg-blue-400"></span>
                    Murs (Bleu)
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/20 px-2.5 py-1 text-[11px] font-semibold text-emerald-400 border border-emerald-500/30 backdrop-blur-md">
                    <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
                    Portes (Vert)
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500/20 px-2.5 py-1 text-[11px] font-semibold text-amber-400 border border-amber-500/30 backdrop-blur-md">
                    <span className="h-2 w-2 rounded-full bg-amber-400"></span>
                    Fenêtres (Orange)
                  </span>
                </div>

                <div className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-lg bg-slate-900/80 px-3 py-1.5 text-xs text-slate-300 border border-white/10 backdrop-blur-md">
                  <Eye className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Lineart Pure 200 DPI</span>
                </div>
              </div>

              {/* Elements Detection List */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Éléments Anatomiques Détectés :
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {elements.map((el) => (
                    <div
                      key={el.id}
                      className="flex items-center justify-between rounded-xl bg-white/[0.03] p-3 border border-white/5"
                    >
                      <div className="flex items-center space-x-2.5">
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                        <span className="text-xs font-medium text-slate-200">{el.label}</span>
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 bg-white/5 px-2 py-0.5 rounded-md">
                        {el.confidence}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-between border-t border-white/10 px-6 py-4 bg-slate-900/50">
              <button
                onClick={onClose}
                className="flex items-center space-x-2 text-xs font-semibold text-slate-400 hover:text-white transition"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Re-scanner le plan</span>
              </button>

              <button
                onClick={handleConfirm}
                disabled={isValidating}
                className="flex items-center space-x-2 rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-bold text-slate-950 transition hover:bg-amber-400 disabled:opacity-50"
              >
                {isValidating ? (
                  <span>Validation & Lancement 3D...</span>
                ) : (
                  <>
                    <span>Valider & Générer le Rendu 3D</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
