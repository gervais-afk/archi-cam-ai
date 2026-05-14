"use client";

/**
 * BIM SCAN LOADING OVERLAY — ARCHI CAM AI
 * ──────────────────────────────────────────
 * Composant d'attente cinématique pour le mode Professionnel (B2B).
 *
 * Architecture des effets :
 * 1. Fond : Glassmorphism sombre (backdrop-blur + bg-black/60)
 * 2. Carte centrale : bg-[#0D0D10] avec bordure glow cyan subtile
 * 3. Scanner laser : Ligne cyan animée via framer-motion (yoyo infini)
 * 4. Icône 3D : Box de lucide-react tournant sur l'axe Y (via rotateY)
 * 5. Steps B2B & B2C : Liste différenciée selon le mode passé en prop
 * 6. Barre de progression : @radix-ui/react-progress pour l'accessibilité
 */

import { useEffect, useRef, useState } from "react";
import { motion, useAnimation, AnimatePresence } from "framer-motion";
import * as Progress from "@radix-ui/react-progress";
import { CheckCircle2, Box, Layers, Cpu, Database, FileText } from "lucide-react";
import { GENERATION_STEPS } from "@/lib/mock-data";
import type { GenerationStep } from "@/types";

// ─── Props ──────────────────────────────────────────────────────────────────
interface LoadingOverlayProps {
  onComplete: () => void;
  mode:       "b2c" | "b2b";
}

// ─── Steps B2B avec icônes dédiées ──────────────────────────────────────────
const BIM_STEPS: (GenerationStep & { icon: React.ReactNode })[] = [
  { id: 1, label: "Initialisation du moteur IfcOpenShell...",    duration: 1500, icon: <Cpu       className="w-4 h-4" /> },
  { id: 2, label: "Extraction de la géométrie (murs, dalles)...", duration: 2000, icon: <Box       className="w-4 h-4" /> },
  { id: 3, label: "Audit des matériaux et ferraillage...",         duration: 2500, icon: <Layers    className="w-4 h-4" /> },
  { id: 4, label: "Matching avec la mercuriale Postgres...",       duration: 1500, icon: <Database  className="w-4 h-4" /> },
  { id: 5, label: "Génération du DQE et du CCTP...",              duration: 2000, icon: <FileText  className="w-4 h-4" /> },
];

// ─── Composant principal ─────────────────────────────────────────────────────
export default function LoadingOverlay({ onComplete, mode }: LoadingOverlayProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedSteps,   setCompletedSteps]   = useState<number[]>([]);
  const [progress,         setProgress]         = useState(0);
  const laserControls = useAnimation();

  // Sélection des étapes selon le mode
  const steps = mode === "b2b" ? BIM_STEPS : GENERATION_STEPS.map(s => ({ ...s, icon: null }));

  // ── Animation du scanner laser (aller-retour infini) ──────────────────────
  useEffect(() => {
    laserControls.start({
      y: ["0%", "100%", "0%"],
      transition: {
        duration:   2.4,
        ease:       "easeInOut",
        repeat:     Infinity,
        repeatType: "loop",
      },
    });
  }, [laserControls]);

  // ── Progression des étapes ────────────────────────────────────────────────
  useEffect(() => {
    let stepIdx = 0;
    let elapsed = 0;
    const totalDuration = steps.reduce((s, st) => s + st.duration, 0);

    const runStep = (index: number) => {
      if (index >= steps.length) {
        setProgress(100);
        setTimeout(onComplete, 800);
        return;
      }
      setCurrentStepIndex(index);

      const stepEnd = elapsed + steps[index].duration;
      const tick = setInterval(() => {
        elapsed = Math.min(elapsed + 50, stepEnd);
        setProgress(Math.round((elapsed / totalDuration) * 100));
        if (elapsed >= stepEnd) {
          clearInterval(tick);
          setCompletedSteps(p => [...p, index]);
          stepIdx++;
          setTimeout(() => runStep(stepIdx), 200);
        }
      }, 50);
    };

    runStep(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  return (
    <AnimatePresence>
      {/* ── Backdrop glassmorphism ──────────────────────────────────────── */}
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center"
        style={{ background: "rgba(0,0,0,0.75)" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Fond flou avec micro-grain */}
        <div className="absolute inset-0 backdrop-blur-xl" />

        {/* Halo ambient derrière la carte */}
        <div className="absolute w-[600px] h-[600px] rounded-full"
          style={{
            background: mode === "b2b"
              ? "radial-gradient(circle, rgba(0,240,255,0.06) 0%, transparent 70%)"
              : "radial-gradient(circle, rgba(197,160,89,0.08) 0%, transparent 70%)",
          }}
        />

        {/* ── Carte principale ───────────────────────────────────────────── */}
        <motion.div
          className="relative w-full max-w-md mx-4 rounded-3xl overflow-hidden"
          style={{
            background: "linear-gradient(145deg, #0D0D10 0%, #12121A 100%)",
            border:     mode === "b2b" ? "1px solid rgba(0,240,255,0.15)" : "1px solid rgba(197,160,89,0.2)",
            boxShadow:  mode === "b2b"
              ? "0 0 60px rgba(0,240,255,0.08), 0 40px 80px rgba(0,0,0,0.6)"
              : "0 0 60px rgba(197,160,89,0.08), 0 40px 80px rgba(0,0,0,0.6)",
          }}
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0,  scale: 1    }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >

          {/* ── Zone scanner laser (uniquement en mode B2B) ─────────────── */}
          {mode === "b2b" && (
            <div className="relative h-40 overflow-hidden border-b"
              style={{ borderColor: "rgba(0,240,255,0.08)" }}
            >
              {/* Grille isométrique de fond */}
              <div className="absolute inset-0 opacity-10"
                style={{
                  backgroundImage: `
                    linear-gradient(rgba(0,240,255,0.4) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(0,240,255,0.4) 1px, transparent 1px)
                  `,
                  backgroundSize: "32px 32px",
                }}
              />

              {/* Icône Box tournante sur l'axe Y */}
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.div
                  animate={{ rotateY: 360 }}
                  transition={{ duration: 4, ease: "linear", repeat: Infinity }}
                  style={{ perspective: 800, transformStyle: "preserve-3d" }}
                >
                  <div className="p-5 rounded-2xl"
                    style={{
                      background:  "rgba(0,240,255,0.05)",
                      border:      "1px solid rgba(0,240,255,0.2)",
                      boxShadow:   "0 0 20px rgba(0,240,255,0.15)",
                    }}
                  >
                    <Box className="w-12 h-12" style={{ color: "#00F0FF" }} />
                  </div>
                </motion.div>
              </div>

              {/* ── Laser scanner line ────────────────────────────────────── */}
              <motion.div
                className="absolute left-0 right-0 pointer-events-none"
                animate={laserControls}
                style={{ top: 0 }}
              >
                {/* Ligne principale */}
                <div style={{
                  height:     "2px",
                  background: "linear-gradient(90deg, transparent 0%, #00F0FF 30%, #ffffff 50%, #00F0FF 70%, transparent 100%)",
                  boxShadow:  "0 0 12px 2px rgba(0,240,255,0.8), 0 0 30px 6px rgba(0,240,255,0.3)",
                }} />
                {/* Traînée de glow sous la ligne */}
                <div style={{
                  height:     "40px",
                  background: "linear-gradient(180deg, rgba(0,240,255,0.15) 0%, transparent 100%)",
                }} />
              </motion.div>

              {/* Badge mode */}
              <div className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.15em]"
                style={{ background: "rgba(0,240,255,0.08)", border: "1px solid rgba(0,240,255,0.2)", color: "#00F0FF" }}
              >
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#00F0FF" }} />
                IFC 4.0 Scan
              </div>
            </div>
          )}

          {/* ── Corps de la carte ──────────────────────────────────────────── */}
          <div className="p-8">

            {/* Titre + sous-titre */}
            <div className="text-center mb-7">
              <h3 className="text-white font-black text-xl tracking-tight">
                {mode === "b2b" ? "BIM Scan en cours" : "Génération en cours"}
              </h3>
              <p className="mt-1 text-sm" style={{ color: "#52525B" }}>
                {mode === "b2b"
                  ? "Analyse structurelle • Métré précis • DQE automatique"
                  : "Notre IA analyse et construit votre rendu 4K"}
              </p>
            </div>

            {/* ── Barre de progression Radix UI ─────────────────────────── */}
            <div className="mb-7">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: "#3F3F46" }}>
                  Progression
                </span>
                <motion.span
                  className="text-sm font-black"
                  style={{ color: mode === "b2b" ? "#00F0FF" : "#C5A059" }}
                  key={progress}
                >
                  {progress}%
                </motion.span>
              </div>

              {/* Radix Progress — accessible (role=progressbar + aria-valuenow) */}
              <Progress.Root
                value={progress}
                className="relative h-1.5 overflow-hidden rounded-full"
                style={{ background: "rgba(255,255,255,0.06)" }}
              >
                <Progress.Indicator
                  className="h-full rounded-full transition-all duration-300 ease-out"
                  style={{
                    width:      `${progress}%`,
                    background: mode === "b2b"
                      ? "linear-gradient(90deg, #0066FF 0%, #00F0FF 100%)"
                      : "linear-gradient(90deg, #C5A059 0%, #E2C48D 100%)",
                    boxShadow: mode === "b2b"
                      ? "0 0 8px rgba(0,240,255,0.6)"
                      : "0 0 8px rgba(197,160,89,0.5)",
                  }}
                />
              </Progress.Root>
            </div>

            {/* ── Liste des étapes ──────────────────────────────────────── */}
            <div className="space-y-3">
              {steps.map((step, idx) => {
                const isDone    = completedSteps.includes(idx);
                const isCurrent = currentStepIndex === idx && !isDone;
                const isPending = idx > currentStepIndex;

                return (
                  <motion.div
                    key={step.id}
                    className="flex items-center gap-3"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: isPending ? 0.25 : 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    {/* Icône d'état */}
                    <div className="shrink-0 w-6 h-6 flex items-center justify-center">
                      {isDone ? (
                        <CheckCircle2 className="w-5 h-5" style={{ color: mode === "b2b" ? "#00F0FF" : "#C5A059" }} />
                      ) : isCurrent ? (
                        <motion.div
                          className="w-4 h-4 rounded-full border-2 border-t-transparent"
                          style={{ borderColor: mode === "b2b" ? "#00F0FF" : "#C5A059" }}
                          animate={{ rotate: 360 }}
                          transition={{ duration: 0.8, ease: "linear", repeat: Infinity }}
                        />
                      ) : (
                        <div className="w-4 h-4 rounded-full" style={{ border: "2px solid #2A2A2F" }} />
                      )}
                    </div>

                    {/* Icône métier (B2B uniquement) */}
                    {mode === "b2b" && "icon" in step && step.icon && (
                      <div style={{ color: isDone ? "#00F0FF" : isCurrent ? "#00F0FF" : "#2A2A2F" }}>
                        {step.icon}
                      </div>
                    )}

                    {/* Label */}
                    <p className={`text-xs transition-colors duration-300 ${
                      isDone
                        ? "line-through"
                        : isCurrent
                          ? "font-semibold text-white"
                          : ""
                    }`}
                    style={{ color: isDone ? "#3F3F46" : isCurrent ? "#fff" : "#3F3F46" }}
                    >
                      {step.label}
                    </p>

                    {/* Dots d'activité sur la step courante */}
                    {isCurrent && (
                      <div className="ml-auto flex items-center gap-1">
                        {[0,1,2].map(i => (
                          <motion.div
                            key={i}
                            className="w-1 h-1 rounded-full"
                            style={{ background: mode === "b2b" ? "#00F0FF" : "#C5A059" }}
                            animate={{ opacity: [0.3, 1, 0.3] }}
                            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                          />
                        ))}
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* ── Footer ─────────────────────────────────────────────────────── */}
          <div className="px-8 pb-6 text-center">
            <p className="text-[9px] font-bold uppercase tracking-[0.2em]" style={{ color: "#2A2A2F" }}>
              {mode === "b2b"
                ? "Archi-Cam AI Engine v2.0 • Analyse BIM Certifiée"
                : "Ne fermez pas cette fenêtre • Rendu 4K en haute qualité"}
            </p>
          </div>

          {/* Glow border animation sur la bordure de la carte */}
          {mode === "b2b" && (
            <motion.div
              className="absolute inset-0 rounded-3xl pointer-events-none"
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 2.5, repeat: Infinity }}
              style={{ boxShadow: "inset 0 0 40px rgba(0,240,255,0.04)" }}
            />
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
