"use client";

import { ARCHITECTURAL_STYLES, RENDER_MODES } from "@/lib/mock-data";
import type { GenerationOptions } from "@/types";
import { ChevronDown, Video, Leaf, MapPin, Lock } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import LandSelector from "./LandSelector";

interface StyleSelectorProps {
  options:   GenerationOptions;
  onChange:  (opts: GenerationOptions) => void;
  mode?:     "b2c" | "b2b";
}

const PREMIUM_OPTIONS = [
  {
    key:         "cinematicVideo" as keyof GenerationOptions,
    icon:        Video,
    label:       "Vidéo cinématique",
    description: "Visite virtuelle 4K générée par Veo 3",
    badge:       "Pro",
  },
  {
    key:         "bioclimaticAudit" as keyof GenerationOptions,
    icon:        Leaf,
    label:       "Rapport bioclimatique",
    description: "Analyse des performances énergétiques",
    badge:       "Pro",
  },
  {
    key:         "googleMapsIntegration" as keyof GenerationOptions,
    icon:        MapPin,
    label:       "Intégration Google Maps",
    description: "Positionnement en contexte réel",
    badge:       "Pro",
  },
];

export default function StyleSelector({ options, onChange, mode = "b2c" }: StyleSelectorProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [renderModeDropdownOpen, setRenderModeDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const renderModeDropdownRef = useRef<HTMLDivElement>(null);

  const selectedStyle = ARCHITECTURAL_STYLES.find(
    (s) => s.value === options.style
  );
  
  const selectedRenderMode = RENDER_MODES.find(
    (s) => s.value === options.renderMode
  );

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
    if (mode === "b2c") return; // Option figée en mode Particulier
    onChange({ ...options, [key]: !options[key] });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Style Dropdown */}
      <div>
        <label className="block text-anthracite-300 text-sm font-medium mb-2">
          Style Architectural
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
        <label className="block text-anthracite-300 text-sm font-medium mb-2">
          Mode d'Extraction / Rendu
        </label>
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
              {RENDER_MODES.map((s) => (
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
      </div>

      {/* Premium Options */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-anthracite-300 text-sm font-medium">
            Options Premium
          </label>
          {mode === "b2c" && (
            <span className="text-[10px] font-bold text-amber-400/80 flex items-center gap-1">
              <Lock className="w-3 h-3" /> Réservé Offre Pro
            </span>
          )}
        </div>

        <div className="space-y-3">
          {PREMIUM_OPTIONS.map(({ key, icon: Icon, label, description, badge }) => {
            const checked = options[key] as boolean && mode === "b2b";
            const isDisabled = mode === "b2c";

            return (
              <button
                key={key}
                disabled={isDisabled}
                onClick={() => toggleOption(key)}
                className={`w-full flex items-center gap-4 px-4 py-4 rounded-xl border text-left transition-all duration-200 ${
                  isDisabled 
                    ? "opacity-60 cursor-not-allowed border-anthracite-800 bg-anthracite-900/50" 
                    : checked
                      ? "border-wood-ocre/60 bg-wood-ocre/10"
                      : "border-anthracite-700 bg-anthracite-800 hover:border-wood-ocre/30"
                }`}
              >
                {/* Custom Checkbox */}
                <div
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all duration-200 ${
                    checked
                      ? "bg-wood-ocre border-wood-ocre"
                      : "border-anthracite-600 bg-anthracite-900"
                  }`}
                >
                  {checked && (
                    <svg
                      className="w-3 h-3 text-white"
                      viewBox="0 0 12 12"
                      fill="none"
                    >
                      <path
                        d="M2 6l3 3 5-5"
                        stroke="currentColor"
                        strokeWidth="2"
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
                      ? "bg-wood-ocre/20 border border-wood-ocre/30"
                      : "bg-anthracite-700 border border-anthracite-600"
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 ${
                      checked ? "text-wood-ocre" : "text-anthracite-400"
                    }`}
                  />
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-sm font-medium ${
                        checked ? "text-white" : "text-anthracite-300"
                      }`}
                    >
                      {label}
                    </span>
                    <span className="text-xs px-1.5 py-0.5 rounded bg-wood-acajou/30 text-wood-light border border-wood-acajou/40">
                      {badge}
                    </span>
                  </div>
                  <p className="text-anthracite-500 text-xs mt-0.5">
                    {description}
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
          <label className="block text-anthracite-300 text-sm font-medium">
            📍 Emplacement & Géolocalisation du Terrain
          </label>
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
