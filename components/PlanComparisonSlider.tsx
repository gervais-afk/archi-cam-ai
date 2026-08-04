"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { MoveHorizontal, Eye } from "lucide-react";

interface PlanComparisonSliderProps {
  originalImageUrl: string;
  renderedImageUrl: string;
  className?: string;
}

export default function PlanComparisonSlider({
  originalImageUrl,
  renderedImageUrl,
  className = "",
}: PlanComparisonSliderProps) {
  const [sliderPosition, setSliderPosition] = useState<number>(50); // Pourcentage 0 à 100
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = useCallback(
    (clientX: number) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = clientX - rect.left;
      let pos = (x / rect.width) * 100;
      if (pos < 0) pos = 0;
      if (pos > 100) pos = 100;
      setSliderPosition(pos);
    },
    []
  );

  const handleMouseDown = () => setIsDragging(true);
  const handleMouseUp = () => setIsDragging(false);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;
      handleMove(e.clientX);
    },
    [isDragging, handleMove]
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!isDragging || !e.touches[0]) return;
      handleMove(e.touches[0].clientX);
    },
    [isDragging, handleMove]
  );

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      window.addEventListener("touchmove", handleTouchMove);
      window.addEventListener("touchend", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleTouchMove]);

  return (
    <div className={`w-full max-w-4xl mx-auto my-6 ${className}`}>
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <Eye className="w-5 h-5 text-cyan-400" />
          <h3 className="text-sm font-semibold text-slate-100">
            Comparateur Interactif Avant / Après
          </h3>
        </div>
        <span className="text-xs text-slate-400 font-mono">
          Glissez pour comparer
        </span>
      </div>

      <div
        ref={containerRef}
        className="relative w-full h-[420px] md:h-[520px] rounded-2xl overflow-hidden shadow-2xl border border-slate-700/80 bg-slate-900 select-none cursor-ew-resize"
        onMouseDown={handleMouseDown}
        onTouchStart={handleMouseDown}
      >
        {/* Image Après (Rendu 3D HD - Fond complet) */}
        <img
          src={renderedImageUrl}
          alt="Rendu 3D HD Final"
          className="absolute inset-0 w-full h-full object-contain pointer-events-none bg-slate-950"
        />

        {/* Image Avant (Plan 2D Brut - Découpée par le slider) */}
        <div
          className="absolute inset-0 overflow-hidden pointer-events-none"
          style={{ width: `${sliderPosition}%` }}
        >
          <img
            src={originalImageUrl}
            alt="Plan 2D Brut d'Origine"
            className="absolute inset-0 w-full h-full object-contain bg-white"
            style={{ width: containerRef.current?.offsetWidth || "100%" }}
          />
        </div>

        {/* Ligne de séparation verticale et curseur */}
        <div
          className="absolute top-0 bottom-0 w-1 bg-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.8)] cursor-ew-resize z-20 pointer-events-none"
          style={{ left: `${sliderPosition}%` }}
        >
          <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-10 h-10 bg-slate-900 border-2 border-cyan-400 rounded-full flex items-center justify-center shadow-lg shadow-cyan-500/40 text-cyan-400">
            <MoveHorizontal className="w-5 h-5" />
          </div>
        </div>

        {/* Badges d'état (AVANT / APRÈS) */}
        <div className="absolute top-4 left-4 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700 text-xs font-semibold text-slate-200 z-10 shadow-md">
          📄 Plan 2D Brut
        </div>
        <div className="absolute top-4 right-4 bg-cyan-950/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-cyan-500/50 text-xs font-semibold text-cyan-300 z-10 shadow-md">
          ✨ Rendu 3D HD
        </div>
      </div>
    </div>
  );
}
