"use client";

import React, { useState } from "react";

export interface ZoneConfig {
  city: string;
  quarter: string;
  posZone: string;
  soilType: string;
  foundationType: string;
  referenceMercuriale: string;
}

export interface CityZoneSelectorProps {
  onZoneChange?: (config: ZoneConfig) => void;
}

const CITY_QUARTERS: Record<string, Array<{ name: string; zone: string; soil: string; fdn: string }>> = {
  "Yaoundé": [
    { name: "Bastos", zone: "Zone R1 (Résidentiel Standing)", soil: "Ferrallitique compact", fdn: "Semelles isolées" },
    { name: "Biyem-Assi", zone: "Zone R2 (Résidentiel Densifié)", soil: "Argileux moyennement gonflant", fdn: "Semelles filantes renforcées" },
    { name: "Mvan", zone: "Zone R2 (Résidentiel)", soil: "Latéritique", fdn: "Semelles filantes" },
    { name: "Nkolbisson", zone: "Zone I1 (Industrielle / Artisanale)", soil: "Rocheux / Latéritique", fdn: "Radier général" },
    { name: "Mvog-Mbi", zone: "Zone R3 (Urbain Populaire)", soil: "Argilo-sableux", fdn: "Semelles filantes" },
  ],
  "Douala": [
    { name: "Bonapriso", zone: "Zone R1 (Standing Littoral)", soil: "Sédimentaire marin / Sableux", fdn: "Pieux / Radier général" },
    { name: "Akwa", zone: "Zone C1 (Commerciale Centre)", soil: "Sédimentaire marin", fdn: "Radier général armé" },
    { name: "Bonanjo", zone: "Zone A1 (Administrative)", soil: "Alluvionnaire littoral", fdn: "Pieux béton armé" },
    { name: "Makepe", zone: "Zone R2 (Résidentiel)", soil: "Argile gonflante littorale", fdn: "Radier général d'égalisation" },
    { name: "Bapenda", zone: "Zone R3 (Densifié)", soil: "Marécageux / Hydraulique", fdn: "Radier spécial sur pieux" },
  ],
  "Kribi": [
    { name: "Centre-Ville", zone: "Zone T1 (Balnéaire & Touristique)", soil: "Sable côtier / Marécageux", fdn: "Pieux anti-corrosion" },
    { name: "Grand Batanga", zone: "Zone R1 (Villa Littorale)", soil: "Sable de plage rocheux", fdn: "Semelles isolées ancrées" },
  ],
  "Bafoussam": [
    { name: "Djeleng", zone: "Zone R1 (Résidentiel Hauts Plateaux)", soil: "Volcanique / Basaltique", fdn: "Semelles isolées légères" },
    { name: "Tamdja", zone: "Zone C1 (Commerciale)", soil: "Lateritique compact", fdn: "Semelles filantes" },
  ],
};

export default function CityZoneSelector({ onZoneChange }: CityZoneSelectorProps) {
  const [selectedCity, setSelectedCity] = useState("Yaoundé");
  const [selectedQuarter, setSelectedQuarter] = useState("Bastos");
  const [gpsCoords, setGpsCoords] = useState("");

  const currentQuarters = CITY_QUARTERS[selectedCity] || CITY_QUARTERS["Yaoundé"];
  const activeQuarterObj = currentQuarters.find((q) => q.name === selectedQuarter) || currentQuarters[0];

  const handleCityChange = (city: string) => {
    setSelectedCity(city);
    const newQuarter = CITY_QUARTERS[city]?.[0]?.name || "";
    setSelectedQuarter(newQuarter);
    triggerChange(city, newQuarter);
  };

  const handleQuarterChange = (quarter: string) => {
    setSelectedQuarter(quarter);
    triggerChange(selectedCity, quarter);
  };

  const triggerChange = (city: string, quarter: string) => {
    const qObj = (CITY_QUARTERS[city] || []).find((q) => q.name === quarter) || CITY_QUARTERS[city]?.[0];
    if (onZoneChange && qObj) {
      onZoneChange({
        city,
        quarter,
        posZone: qObj.zone,
        soilType: qObj.soil,
        foundationType: qObj.fdn,
        referenceMercuriale: `Mercuriale Officielle ${city} 2026`,
      });
    }
  };

  return (
    <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-lg">📍</span>
        <h4 className="text-sm font-semibold text-white">Localisation du Projet BTP (Optionnel)</h4>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-slate-400 mb-1">Ville du Cameroun</label>
          <select
            value={selectedCity}
            onChange={(e) => handleCityChange(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-lg p-2 focus:border-amber-500"
          >
            {Object.keys(CITY_QUARTERS).map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1">Quartier</label>
          <select
            value={selectedQuarter}
            onChange={(e) => handleQuarterChange(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-lg p-2 focus:border-amber-500"
          >
            {currentQuarters.map((q) => (
              <option key={q.name} value={q.name}>
                {q.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs text-slate-400 mb-1">OU Coordonnées GPS (Latitude, Longitude)</label>
        <input
          type="text"
          value={gpsCoords}
          onChange={(e) => setGpsCoords(e.target.value)}
          placeholder="Ex: 3.8667, 11.5167"
          className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-lg p-2 focus:border-amber-500"
        />
      </div>

      {/* Résumé de détection POS / LABOGENIE / MINMAP */}
      <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-lg text-xs space-y-1.5 font-mono">
        <div className="flex justify-between text-amber-400">
          <span>Zone POS Détectée :</span>
          <span className="font-semibold">{activeQuarterObj.zone}</span>
        </div>
        <div className="flex justify-between text-slate-300">
          <span>Sol LABOGENIE :</span>
          <span>{activeQuarterObj.soil}</span>
        </div>
        <div className="flex justify-between text-slate-300">
          <span>Fondation Recommandée :</span>
          <span className="text-emerald-400 font-semibold">{activeQuarterObj.fdn}</span>
        </div>
        <div className="flex justify-between text-slate-400">
          <span>Prix de Référence :</span>
          <span>Mercuriale {selectedCity} 2026</span>
        </div>
      </div>
    </div>
  );
}
