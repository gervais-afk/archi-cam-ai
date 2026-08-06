"use client";

import React, { useState } from "react";

interface POSRules {
  zone: string;
  city: string;
  quartier: string;
  cos: number;
  shon: number;
  maxHeight: number;
  maxFloors: number;
  setbacks: {
    street: number;
    side: number;
    rear: number;
  };
  restrictions: string[];
}

export function ParcelSelector() {
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [posRules, setPosRules] = useState<POSRules | null>(null);
  const [loading, setLoading] = useState(false);

  // Project specs to validate
  const [parcelArea, setParcelArea] = useState(800);
  const [footprint, setFootprint] = useState(400); // 50% COS (triggers warning in Bastos (40%))
  const [floorArea, setFloorArea] = useState(1200); // Triggers warning in Bastos (1000)
  const [height, setHeight] = useState(10);
  const [floors, setFloors] = useState(3); // Triggers warning in Bastos (2 floors)
  const [streetSetback, setStreetSetback] = useState(4); // Triggers warning in Bastos (5m)

  const [validationResult, setValidationResult] = useState<{
    isCompliant: boolean;
    violations: Array<{ rule: string; current: string; required: string; severity: string }>;
  } | null>(null);

  const locations = [
    { name: "📍 Yaoundé - Bastos (ZR1)", coords: { lat: 3.89, lng: 11.51 } },
    { name: "📍 Douala - Akwa (ZC)", coords: { lat: 4.05, lng: 9.70 } },
    { name: "📍 Kribi - Bord de Mer (ZL)", coords: { lat: 2.94, lng: 9.91 } }
  ];

  const handleSelectLocation = async (coords: { lat: number; lng: number }) => {
    setSelectedCoords(coords);
    setLoading(true);
    setValidationResult(null);

    try {
      const res = await fetch("/api/pro/pos/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coords })
      });
      if (res.ok) {
        const data = await res.json();
        setPosRules(data.rules);
      }
    } catch (err) {
      console.error("Failed to load POS rules:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleValidate = () => {
    if (!posRules) return;

    const violations: any[] = [];
    const actualCOS = footprint / parcelArea;

    if (actualCOS > posRules.cos) {
      violations.push({
        rule: "Coefficient d'Occupation du Sol (COS)",
        current: `${Math.round(actualCOS * 100)}%`,
        required: `${Math.round(posRules.cos * 100)}%`,
        severity: "ERROR"
      });
    }

    if (floorArea > posRules.shon) {
      violations.push({
        rule: "Surface Hors Œuvre Nette (SHON)",
        current: `${floorArea}m²`,
        required: `${posRules.shon}m²`,
        severity: "ERROR"
      });
    }

    if (height > posRules.maxHeight) {
      violations.push({
        rule: "Hauteur maximale",
        current: `${height}m`,
        required: `${posRules.maxHeight}m`,
        severity: "ERROR"
      });
    }

    if (floors > posRules.maxFloors) {
      violations.push({
        rule: "Nombre d'étages maximum",
        current: `R+${floors}`,
        required: `R+${posRules.maxFloors}`,
        severity: "ERROR"
      });
    }

    if (streetSetback < posRules.setbacks.street) {
      violations.push({
        rule: "Recul par rapport à la route",
        current: `${streetSetback}m`,
        required: `${posRules.setbacks.street}m`,
        severity: "ERROR"
      });
    }

    setValidationResult({
      isCompliant: violations.length === 0,
      violations
    });
  };

  return (
    <div className="bg-slate-950 border border-slate-900 rounded-xl p-5 font-sans text-slate-100 max-w-2xl shadow-lg space-y-6">
      <div className="bg-blue-950/20 border border-blue-900/40 rounded-lg p-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-blue-400 mb-1">
          📍 Sélection de parcelle et chargement POS
        </h3>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          Choisissez l'emplacement de votre projet au Cameroun pour charger dynamiquement les contraintes locales d'urbanisme.
        </p>
      </div>

      {/* Simulated map location selector */}
      <div className="space-y-2">
        <span className="text-xs font-semibold text-slate-300 block">
          Emplacement du terrain :
        </span>
        <div className="grid grid-cols-3 gap-2">
          {locations.map((loc, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelectLocation(loc.coords)}
              className={`text-xs p-2.5 rounded-lg border transition-all text-center ${
                selectedCoords && selectedCoords.lat === loc.coords.lat
                  ? "bg-amber-950/40 border-amber-500 text-amber-400"
                  : "bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-300"
              }`}
            >
              {loc.name}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="text-center py-4">
          <span className="animate-spin inline-block text-xl">⚙️</span>
          <p className="text-[11px] text-slate-400 mt-1">Chargement des règles POS d'urbanisme...</p>
        </div>
      )}

      {posRules && (
        <div className="space-y-6 animate-fadeIn">
          {/* POS Rules Info cards */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 space-y-3">
            <h4 className="text-xs font-bold text-slate-200 border-b border-slate-850 pb-1">
              📋 Règles POS - {posRules.quartier} ({posRules.city})
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
              <div className="bg-slate-950 p-2 rounded border border-slate-900">
                <span className="text-[10px] text-slate-500 block">Zone :</span>
                <span className="font-bold text-slate-300">{posRules.zone}</span>
              </div>
              <div className="bg-slate-950 p-2 rounded border border-slate-900">
                <span className="text-[10px] text-slate-500 block">COS Max :</span>
                <span className="font-bold text-slate-300">{Math.round(posRules.cos * 100)}%</span>
              </div>
              <div className="bg-slate-950 p-2 rounded border border-slate-900">
                <span className="text-[10px] text-slate-500 block">SHON Max :</span>
                <span className="font-bold text-slate-300">{posRules.shon} m²</span>
              </div>
              <div className="bg-slate-950 p-2 rounded border border-slate-900">
                <span className="text-[10px] text-slate-500 block">Hauteur Max :</span>
                <span className="font-bold text-slate-300">{posRules.maxHeight}m (R+{posRules.maxFloors})</span>
              </div>
            </div>

            <div className="text-xs space-y-1">
              <span className="text-[10px] text-slate-500 font-semibold block uppercase tracking-wide">Reculs minimaux obligatoires :</span>
              <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-mono">
                <div className="bg-slate-950 p-1.5 rounded border border-slate-900">Route: {posRules.setbacks.street}m</div>
                <div className="bg-slate-950 p-1.5 rounded border border-slate-900">Latéral: {posRules.setbacks.side}m</div>
                <div className="bg-slate-950 p-1.5 rounded border border-slate-900">Arrière: {posRules.setbacks.rear}m</div>
              </div>
            </div>
          </div>

          {/* User inputs to simulate project details */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-200">
              🛠️ Spécifications de votre projet :
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Terrain (m²) :</label>
                <input
                  type="number"
                  value={parcelArea}
                  onChange={(e) => setParcelArea(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-xs text-slate-200"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Emprise au sol (m²) :</label>
                <input
                  type="number"
                  value={footprint}
                  onChange={(e) => setFootprint(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-xs text-slate-200"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Surface plancher (SHON m²) :</label>
                <input
                  type="number"
                  value={floorArea}
                  onChange={(e) => setFloorArea(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-xs text-slate-200"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Hauteur (m) :</label>
                <input
                  type="number"
                  value={height}
                  onChange={(e) => setHeight(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-xs text-slate-200"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Nombre d'étages :</label>
                <input
                  type="number"
                  value={floors}
                  onChange={(e) => setFloors(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-xs text-slate-200"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Recul de voirie (m) :</label>
                <input
                  type="number"
                  value={streetSetback}
                  onChange={(e) => setStreetSetback(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-xs text-slate-200"
                />
              </div>
            </div>

            <button
              onClick={handleValidate}
              className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-2 rounded-lg text-xs transition-all tracking-wider"
            >
              ⚖️ Vérifier la conformité de mon projet
            </button>
          </div>

          {/* Validation Result */}
          {validationResult && (
            <div className={`p-4 rounded-xl border font-sans space-y-2 animate-fadeIn ${
              validationResult.isCompliant
                ? "bg-emerald-950/20 border-emerald-900/60"
                : "bg-rose-950/20 border-rose-900/60"
            }`}>
              <h5 className={`text-xs font-bold ${validationResult.isCompliant ? "text-emerald-400" : "text-rose-400"}`}>
                {validationResult.isCompliant ? "✅ Projet Conforme" : "❌ Infractions POS Détectées"}
              </h5>

              {validationResult.violations.length > 0 ? (
                <div className="space-y-1.5">
                  {validationResult.violations.map((v, idx) => (
                    <div key={idx} className="flex justify-between items-center text-[10px]">
                      <span className="text-slate-300">├─ {v.rule}</span>
                      <span className="text-rose-400 font-mono font-semibold">
                        {v.current} (Max requis : {v.required})
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[10px] text-slate-400">Toutes les limites de recul, d'emprise au sol (COS) et de hauteur sont conformes à la zone d'aménagement.</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
