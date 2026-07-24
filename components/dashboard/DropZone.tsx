"use client";

/**
 * PREMIUM DROPZONE COMPONENT — ARCHI CAM AI
 * ──────────────────────────────────────────
 * Une interface d'upload cinématique avec validation intelligente.
 * 
 * Architecture des interactions :
 * 1. État Initial : Zone glassmorphism avec bordures dashed.
 * 2. État DragActive : Transition vers bordures Cyan lumineuses + Magnetic Pulse.
 * 3. État FileReady : Transition AnimatePresence vers une "File Card" premium.
 * 4. Bouton Action : Effet de brillance (shimmer) pour lancer le scan.
 */

import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import { 
  UploadCloud, 
  FileIcon, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Zap,
  FileCode2
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DropZoneProps {
  file: File | null;
  onFileAccepted: (file: File) => void;
  onFileRemoved: () => void;
  mode: "b2c" | "b2b";
}

export default function DropZone({ file, onFileAccepted, onFileRemoved, mode }: DropZoneProps) {
  const [error, setInternalError] = useState<string | null>(null);

  // Configuration des types de fichiers selon le mode
  const accept: import("react-dropzone").Accept = mode === "b2b" 
    ? { "application/octet-stream": [".ifc"], "text/plain": [".ifc"] } 
    : { "application/pdf": [".pdf"], "image/png": [".png"], "image/jpeg": [".jpg", ".jpeg"] };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      onFileAccepted(acceptedFiles[0]);
      setInternalError(null);
    }
  }, [onFileAccepted]);

  const onDropRejected = useCallback(() => {
    setInternalError(
      mode === "b2b" 
        ? "Seuls les fichiers IFC sont acceptés en mode Pro." 
        : "Format non supporté (PDF ou Image requis)."
    );
  }, [mode]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDropRejected,
    accept,
    multiple: false,
    maxSize: 50 * 1024 * 1024, // 50 Mo
  });

  const removeFile = () => {
    onFileRemoved();
    setInternalError(null);
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      <AnimatePresence mode="wait">
        {!file ? (
          // ── ÉTAT : ZONE DE DROP ──────────────────────────────────────────
          <motion.div
            key="dropzone"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
          >
            <div
              {...getRootProps()}
              className={cn(
                "relative group cursor-pointer overflow-hidden rounded-[2.5rem] border-2 border-dashed transition-all duration-500",
                "bg-white/[0.02] backdrop-blur-sm p-12 min-h-[340px] flex flex-col items-center justify-center text-center",
                isDragActive 
                  ? "border-ai-glow bg-ai-glow/5 shadow-[0_0_40px_rgba(0,240,255,0.1)] scale-[1.02]" 
                  : "border-white/10 hover:border-white/20 hover:bg-white/[0.04]"
              )}
            >
              <input {...getInputProps()} />

            {/* Aura de fond subtile */}
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-white/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

            {/* Icône Pulsante */}
            <motion.div
              animate={isDragActive ? { scale: 1.1, y: -5 } : { scale: 1, y: 0 }}
              className={cn(
                "w-20 h-20 rounded-3xl flex items-center justify-center mb-6 transition-all duration-500",
                isDragActive ? "bg-ai-glow/20 text-ai-glow shadow-[0_0_20px_rgba(0,240,255,0.4)]" : "bg-white/5 text-anthracite-500 group-hover:text-white"
              )}
            >
              {mode === "b2b" ? <FileCode2 strokeWidth={1} size={40} /> : <UploadCloud strokeWidth={1} size={40} />}
            </motion.div>

            {/* Textes */}
            <div className="space-y-3 relative z-10">
              <h3 className="text-white text-xl font-black tracking-tight">
                {isDragActive 
                  ? "Déposez pour analyser" 
                  : mode === "b2b" 
                    ? "Importez votre maquette BIM (.ifc)" 
                    : "Importez votre plan (.pdf)"}
              </h3>
              <p className="text-anthracite-500 text-sm max-w-sm mx-auto font-medium">
                {isDragActive 
                  ? "Relâchez le fichier pour lancer l'intelligence Archi Cam." 
                  : "Glissez-déposez ou cliquez pour parcourir vos fichiers."}
              </p>
              
              <div className="flex items-center justify-center gap-4 mt-6">
                <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[9px] font-black text-anthracite-500 uppercase tracking-widest">
                  Max 50 Mo
                </span>
                <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[9px] font-black text-anthracite-500 uppercase tracking-widest">
                  Chiffré AES-256
                </span>
              </div>
            </div>

            {/* Message d'erreur Néon */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="absolute bottom-6 left-0 right-0 flex items-center justify-center gap-2 text-red-400"
                >
                  <AlertCircle className="w-4 h-4 shadow-[0_0_10px_rgba(248,113,113,0.5)]" />
                  <span className="text-[10px] font-black uppercase tracking-wider">{error}</span>
                </motion.div>
              )}
            </AnimatePresence>
            </div>
          </motion.div>
        ) : (
          // ── ÉTAT : FILE CARD (Fichier prêt) ─────────────────────────────
          <motion.div
            key="file-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="relative bg-anthracite-900 border border-white/10 rounded-[2.5rem] p-10 overflow-hidden"
          >
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-ai-glow/5 blur-[80px] rounded-full" />
            
            <div className="relative z-10 flex flex-col items-center">
              {/* File Icon Card */}
              <div className="w-24 h-24 rounded-[2rem] bg-white/5 border border-white/10 flex items-center justify-center mb-6 relative">
                <FileIcon size={40} className={mode === "b2b" ? "text-ai-glow" : "text-wood-ocre"} strokeWidth={1.5} />
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-2 -right-2 bg-green-500 text-white p-1.5 rounded-full shadow-lg"
                >
                  <CheckCircle2 size={16} />
                </motion.div>
              </div>

              {/* File Meta */}
              <div className="text-center mb-10">
                <h4 className="text-white font-black text-lg truncate max-w-xs">{file.name}</h4>
                <p className="text-anthracite-500 text-[10px] font-bold uppercase tracking-widest mt-1">
                  {(file.size / (1024 * 1024)).toFixed(2)} Mo • Fichier {mode === "b2b" ? "BIM" : "Architectural"}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-center w-full">
                <button
                  onClick={removeFile}
                  className="w-full sm:w-auto px-8 py-4 rounded-2xl border border-white/10 text-anthracite-400 font-black text-[10px] uppercase tracking-widest hover:bg-white/5 hover:text-white hover:border-red-500/30 hover:text-red-400 transition-all flex items-center justify-center gap-2"
                >
                  <X size={14} /> Annuler / Supprimer le fichier
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
