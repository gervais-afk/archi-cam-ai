"use client";

import React, { useState } from "react";
import { Box, Layers, Eye, RefreshCw } from "lucide-react";

interface DigitalTwinViewerProps {
  buildingName?: string;
  totalRooms?: number;
  totalAreaM2?: number;
}

export function DigitalTwinViewer({
  buildingName = "Villa Duplex R+1 Bastos",
  totalRooms = 6,
  totalAreaM2 = 185,
}: DigitalTwinViewerProps) {
  const [activeFloor, setActiveFloor] = useState<"RDC" | "R+1" | "TOIT">("RDC");
  const [selectedRoom, setSelectedRoom] = useState<string | null>("Salon Princpal (32m²)");

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden text-white shadow-2xl flex flex-col h-[520px]">
      {/* Header bar */}
      <div className="bg-slate-950 border-b border-slate-800 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-400">
            <Box className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
              Jumeau Numérique 3D Interactif
              <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full font-mono">
                Three.js GeoBIM
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              {buildingName} • {totalRooms} pièces • {totalAreaM2} m²
            </p>
          </div>
        </div>

        {/* Floor selectors */}
        <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-lg border border-slate-800">
          {(["RDC", "R+1", "TOIT"] as const).map((floor) => (
            <button
              key={floor}
              onClick={() => setActiveFloor(floor)}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition ${
                activeFloor === floor
                  ? "bg-amber-500 text-slate-950 shadow"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              {floor}
            </button>
          ))}
        </div>
      </div>

      {/* 3D Interactive Canvas Container */}
      <div className="relative flex-1 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center overflow-hidden">
        {/* Grid Floor Representation */}
        <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-40" />

        {/* 3D Building Mock Object */}
        <div className="relative z-10 flex flex-col items-center justify-center p-8 transition-all transform hover:scale-105">
          <div className="w-64 h-48 bg-slate-800/90 border-2 border-amber-500/60 rounded-xl shadow-[0_0_50px_rgba(197,160,89,0.15)] p-4 relative flex flex-col justify-between cursor-pointer">
            <div className="flex justify-between items-center border-b border-slate-700 pb-2">
              <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5" /> Niveau : {activeFloor}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Hauteur : 2.80m</span>
            </div>

            <div className="grid grid-cols-2 gap-2 my-2">
              <div
                onClick={() => setSelectedRoom("Salon Principal (32m²)")}
                className="bg-amber-500/10 border border-amber-500/30 rounded p-2 text-center hover:bg-amber-500/20 transition"
              >
                <span className="text-[11px] block font-semibold text-slate-200">Salon</span>
                <span className="text-[9px] text-amber-400 font-mono">32.0 m²</span>
              </div>
              <div
                onClick={() => setSelectedRoom("Cuisine Équipée (14m²)")}
                className="bg-blue-500/10 border border-blue-500/30 rounded p-2 text-center hover:bg-blue-500/20 transition"
              >
                <span className="text-[11px] block font-semibold text-slate-200">Cuisine</span>
                <span className="text-[9px] text-blue-400 font-mono">14.5 m²</span>
              </div>
            </div>

            <div className="text-center pt-1 border-t border-slate-800">
              <span className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
                <Eye className="w-3 h-3 text-cyan-400" /> Cliquez sur une pièce pour auditer
              </span>
            </div>
          </div>
        </div>

        {/* Selected Room Overlay Panel */}
        {selectedRoom && (
          <div className="absolute bottom-4 left-4 right-4 bg-slate-900/90 border border-slate-800 backdrop-blur-md p-3 rounded-lg flex items-center justify-between text-xs">
            <span className="text-slate-300">
              Pièce sélectionnée : <strong className="text-amber-400">{selectedRoom}</strong>
            </span>
            <span className="text-emerald-400 font-mono flex items-center gap-1">
              Confort thermiquement certifié ✓
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
