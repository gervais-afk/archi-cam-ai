"use client";

import { ARCHITECTURAL_STYLES, RENDER_MODES } from "@/lib/mock-data";
import type { GenerationOptions } from "@/types";
import { ChevronDown, Video, Leaf, MapPin, Lock, Crown, Info } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import LandSelector from "./LandSelector";

interface StyleSelectorProps {
  options:   GenerationOptions;
  onChange:  (opts: GenerationOptions) => void;
  mode?:     "b2c" | "b2b";
  file?:     File | null;
}

const PREMIUM_OPTIONS = [
  {
    key:         "cinematicVideo" as keyof GenerationOptions,
    icon:        Video,
    label:       "Vidéo cinématique",
    description: "Visite virtuelle 4K générée par Veo 3",
    descriptionIfc: "Survol drone 3D du modèle BIM (Veo 3)",
    badge:       "Pro",
  },
  {
    key:         "bioclimaticAudit" as keyof GenerationOptions,
    icon:        Leaf,
    label:       "Rapport bioclimatique",
    description: "Analyse des performances énergétiques",
    descriptionIfc: "Audit thermique & masques solaires du volume BIM",
    badge:       "Pro",
  },
  {
    key:         "googleMapsIntegration" as keyof GenerationOptions,
    icon:        MapPin,
    label:       "Intégration Google Maps",
    description: "Positionnement en contexte réel",
    descriptionIfc: "Implantation GeoBIM sur coordonnées réelles",
    badge:       "Pro",
  },
];

export default function StyleSelector({ options, onChange, mode = "b2c", file }: StyleSelectorProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [renderModeDropdownOpen, setRenderModeDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const renderModeDropdownRef = useRef<HTMLDivElement>(null);

  const isIfc = Boolean(
    file && (file.name.toLowerCase().endsWith(".ifc") || file.name.toLowerCase().endsWith(".ifczip"))
  );

  // Filtrer les modes de rendu en fonction du type de fichier
  const availableRenderModes = isIfc
    ? RENDER_MODES.filter((m) => m.value !== "PLAN_2D_PHOTOSHOP")
    : RENDER_MODES;

  // Auto-correction : si un fichier IFC est chargé et que le mode était "PLAN_2D_PHOTOSHOP", basculer vers 3D
  useEffect(() => {
    if (isIfc && options.renderMode === "PLAN_2D_PHOTOSHOP") {
      onChange({ ...options, renderMode: "3D_PHOTOREALISTE" });
    }
  }, [isIfc, options.renderMode, onChange, options]);

  const selectedStyle = ARCHITECTURAL_STYLES.find(
    (s) => s.value === options.style
  );
  
  const selectedRenderMode = availableRenderModes.find(
    (s) => s.value === options.renderMode
  ) || availableRenderModes[0];

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
      if (renderModeDropdownRef.current && !renderModeDropdownRef.current.contains(e.target as Node)) {
        setRenderModeDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const toggleOption = (key: keyof GenerationOptions) => {
    if (mode === "b2c") return; // Option verrouillée uniquement en mode Particulier
    onChange({ ...options, [key]: !options[key] });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Style Dropdown */}
      <div>
        <label className="block text-anthracite-300 text-sm font-medium mb-2">
          {isIfc ? "Matériaux & Finitions du Modèle BIM" : "Style Architectural"}
        </label>
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-anthracite-800 border border-anthracite-700 hover:border-wood-ocre/50 text-white transition-all duration-200"
          >
            <span>{selectedStyle?.label ?? "Sélectionnez un style"}</span>
            <ChevronDown
              className={`w-4 h-4 text-anthracite-400 transition-transform duration-200 ${
                dropdownOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {dropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-2 rounded-xl bg-anthracite-800 border border-anthracite-700 shadow-2xl shadow-black/60 z-20 overflow-hidden animate-slide-up">
              {ARCHITECTURAL_STYLES.map((s) => (
                <button
                  key={s.value}
                  onClick={() => {
                    onChange({ ...options, style: s.value });
                    setDropdownOpen(false);
                  }}
                  className={`w-full flex items-center px-4 py-3 text-left text-sm transition-colors hover:bg-anthracite-700 ${
                    options.style === s.value
                      ? "text-wood-ocre bg-wood-ocre/10"
                      : "text-white"
                  }`}
                >
                  {s.label}
                  {options.style === s.value && (
                    <span className="ml-auto text-wood-ocre text-xs">✓</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Render Mode Dropdown */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-anthracite-300 text-sm font-medium">
            Mode d&apos;Extraction / Rendu
          </label>
          {isIfc && (
            <span className="text-[10px] font-bold text-ai-glow bg-ai-glow/10 px-2 py-0.5 rounded-full border border-ai-glow/20">
              Modèle BIM 3D
            </span>
          )}
        </div>
        <div className="relative" ref={renderModeDropdownRef}>
          <button
            onClick={() => setRenderModeDropdownOpen(!renderModeDropdownOpen)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-anthracite-800 border border-anthracite-700 hover:border-wood-ocre/50 text-white transition-all duration-200"
          >
            <span>{selectedRenderMode?.label ?? "Sélectionnez un mode"}</span>
            <ChevronDown
              className={`w-4 h-4 text-anthracite-400 transition-transform duration-200 ${
                renderModeDropdownOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {renderModeDropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-2 rounded-xl bg-anthracite-800 border border-anthracite-700 shadow-2xl shadow-black/60 z-20 overflow-hidden animate-slide-up">
              {availableRenderModes.map((s) => (
                <button
                  key={s.value}
                  onClick={() => {
                    onChange({ ...options, renderMode: s.value as any });
                    setRenderModeDropdownOpen(false);
                  }}
                  className={`w-full flex items-center px-4 py-3 text-left text-sm transition-colors hover:bg-anthracite-700 ${
                    options.renderMode === s.value
                      ? "text-wood-ocre bg-wood-ocre/10"
                      : "text-white"
                  }`}
                >
                  {s.label}
                  {options.renderMode === s.value && (
                    <span className="ml-auto text-wood-ocre text-xs">✓</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {isIfc && (
          <div className="mt-2.5 p-3 rounded-xl bg-ai-glow/5 border border-ai-glow/20 flex items-start gap-2.5 text-xs text-ai-glow/90 leading-relaxed">
            <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-ai-glow" />
            <span>
              <b>Maquette 3D OpenBIM reconnue</b> : Rendu 3D photoréaliste et maquette blanche volumétrique activés. Le mode <i>Plan 2D Photoshop</i> est masqué car ce fichier contient déjà une géométrie 3D exploitable.
            </span>
          </div>
        )}
      </div>

      {/* Premium Options */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-anthracite-300 text-sm font-medium">
            Options Premium
          </label>
          {mode === "b2b" ? (
            <span className="text-[10px] font-bold text-ai-glow flex items-center gap-1.5 bg-ai-glow/10 px-2.5 py-1 rounded-full border border-ai-glow/20">
              <Crown className="w-3.5 h-3.5 text-ai-glow" /> Pass Agence Pro Actif
            </span>
          ) : (
            <span className="text-[10px] font-bold text-amber-400/80 flex items-center gap-1">
              <Lock className="w-3 h-3" /> Réservé Offre Pro
            </span>
          )}
        </div>

        <div className="space-y-3">
          {PREMIUM_OPTIONS.map(({ key, icon: Icon, label, description, descriptionIfc, badge }) => {
            const checked = Boolean(options[key] && mode === "b2b");
            const isDisabled = mode === "b2c";
            const effectiveDescription = (isIfc && descriptionIfc) ? descriptionIfc : description;

            return (
              <button
                key={key}
                type="button"
                disabled={isDisabled}
                onClick={() => toggleOption(key)}
                className={`w-full flex items-center gap-4 px-4 py-4 rounded-xl border text-left transition-all duration-200 cursor-pointer ${
                  isDisabled 
                    ? "opacity-60 cursor-not-allowed border-anthracite-800 bg-anthracite-900/50" 
                    : checked
                      ? "border-ai-glow/60 bg-ai-glow/10 shadow-[0_0_20px_rgba(0,240,255,0.1)]"
                      : "border-anthracite-700 bg-anthracite-800 hover:border-ai-glow/40 hover:bg-anthracite-750"
                }`}
              >
                {/* Custom Checkbox */}
                <div
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all duration-200 ${
                    checked
                      ? "bg-ai-glow border-ai-glow"
                      : "border-anthracite-600 bg-anthracite-900"
                  }`}
                >
                  {checked && (
                    <svg
                      className="w-3 h-3 text-anthracite-950 font-black"
                      viewBox="0 0 12 12"
                      fill="none"
                    >
                      <path
                        d="M2 6l3 3 5-5"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                  {isDisabled && (
                    <Lock className="w-3 h-3 text-anthracite-500" />
                  )}
                </div>

                {/* Icon */}
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-all ${
                    checked
                      ? "bg-ai-glow/20 border border-ai-glow/40"
                      : "bg-anthracite-700 border border-anthracite-600"
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 ${
                      checked ? "text-ai-glow" : "text-anthracite-400"
                    }`}
                  />
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-sm font-medium ${
                        checked ? "text-white font-bold" : "text-anthracite-300"
                      }`}
                    >
                      {label}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-black tracking-wider uppercase ${
                      checked 
                        ? "bg-ai-glow/20 text-ai-glow border border-ai-glow/30"
                        : "bg-anthracite-700 text-anthracite-400 border border-anthracite-600"
                    }`}>
                      {badge}
                    </span>
                  </div>
                  <p className="text-anthracite-400 text-xs mt-0.5">
                    {effectiveDescription}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sélecteur de terrain (Cartographie interactive) */}
      {(mode === "b2c" || options.googleMapsIntegration) && (
        <div className="pt-6 border-t border-anthracite-700/50 space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-anthracite-300 text-sm font-medium">
              📍 Emplacement & Géolocalisation du Terrain (GeoBIM)
            </label>
            {mode === "b2b" && (
              <span className="text-[10px] font-bold text-ai-glow bg-ai-glow/10 px-2 py-0.5 rounded-full border border-ai-glow/20">
                Synchronisation BTP Active
              </span>
            )}
          </div>
          <LandSelector
            initialSelection={{
              latitude: options.latitude,
              longitude: options.longitude,
              elevation: options.elevation,
              city: options.city
            }}
            onSelect={(selection) => {
              onChange({
                ...options,
                latitude: selection.latitude,
                longitude: selection.longitude,
                elevation: selection.elevation,
                city: selection.city
              });
            }}
          />
        </div>
      )}
    </div>
  );
}
