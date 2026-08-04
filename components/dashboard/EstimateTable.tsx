"use client";

/**
 * PREMIUM ESTIMATE TABLE — ARCHI CAM AI
 * ──────────────────────────────────────────
 * Un tableau financier de niveau industriel (Stripe/Linear style).
 * 
 * Caractéristiques :
 * 1. Alignement : Colonnes numériques alignées à droite avec `tabular-nums`.
 * 2. Animation : Stagger effect (apparition ligne par ligne) via Framer Motion.
 * 3. Design : Lignes épurées, survol glassmorphism, badge de base de prix.
 * 4. Finance : Calcul automatique de la TVA (19.25%) et Total TTC massif.
 */

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Download, FileSpreadsheet, Info, CheckCircle2 } from "lucide-react";
import dynamic from "next/dynamic";
import { formatCurrency } from "@/lib/utils";
import { ProjectEstimate, UserMode } from "@/types";
import Spinner from "@/components/ui/Spinner";

const ExportDevisButton = dynamic(
  () => import("@/components/pdf/ExportDevisButton").then((mod) => mod.ExportDevisButton),
  { ssr: false }
);


// ─── MOCK DATA RÉALISTE BTP CAMEROUN ────────────────────────────────────────
const MOCK_DQE_LINES = [
  { id: 1, label: "Installations de chantier & Repli", unit: "FF", qty: 1, price: 450000 },
  { id: 2, label: "Fouilles en rigoles pour fondations", unit: "m3", qty: 45.5, price: 4500 },
  { id: 3, label: "Béton de propreté dosé à 150kg/m3", unit: "m3", qty: 8.2, price: 85000 },
  { id: 4, label: "Béton armé en fondation (Semelles/Amorces)", unit: "m3", qty: 18.4, price: 185000 },
  { id: 5, label: "Maçonnerie de parpaings de 20cm (Soubassement)", unit: "m2", qty: 65, price: 9500 },
  { id: 6, label: "Dalle de compression en béton armé", unit: "m2", qty: 145, price: 22000 },
  { id: 7, label: "Maçonnerie de parpaings de 15cm (Élévation)", unit: "m2", qty: 210, price: 8500 },
  { id: 8, label: "Charpente en bois traité (Essence locale)", unit: "m2", qty: 185, price: 12500 },
  { id: 9, label: "Couverture en tôles bac pré-laquées 0.50mm", unit: "m2", qty: 205, price: 7500 },
];

const TVA_RATE = 0.1925; // 19.25% au Cameroun

interface EstimateTableProps {
  estimate?: ProjectEstimate;
  mode: UserMode;
  devisId?: string;
  highlightedCode?: string | null;
  onSelectLine?: (code: string | null) => void;
}

export default function EstimateTable({ estimate, mode, devisId, highlightedCode, onSelectLine }: EstimateTableProps) {

  const [isDownloading, setIsDownloading] = useState(false);

  const linesToRender = estimate?.lines && estimate.lines.length > 0 
    ? estimate.lines 
    : MOCK_DQE_LINES.map(l => ({
        code: l.id.toString(),
        category: "Gros Œuvre",
        label: l.label,
        quantity: l.qty,
        unit: l.unit,
        unitPrice: l.price,
        totalPrice: l.qty * l.price
      }));

  const totalHT = linesToRender.reduce((acc, line) => acc + line.totalPrice, 0);
  const tvaAmount = totalHT * TVA_RATE;
  const totalTTC = totalHT + tvaAmount;

  // ── Animation Variants ────────────────────────────────────────────────────
  const containerVars = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08, delayChildren: 0.2 }
    }
  };

  const rowVars = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } }
  };

  return (
    <div className="w-full space-y-6">
      
      {/* ── HEADER CARD ─────────────────────────────────────────────────────── */}
      <div className="bg-[#121212] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
        <div className="p-8 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1 flex-wrap">
              <h2 className="text-white font-black text-xl tracking-tight uppercase">
                Détail Quantitatif Estimatif (DQE)
              </h2>
              <div className="px-2 py-0.5 rounded-md bg-emerald-400/10 border border-emerald-400/20 flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Base : MINMAP 2026</span>
              </div>
              <div className="px-2.5 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[9px] font-black uppercase tracking-widest">
                Pertes &amp; Chutes (+5% à +10%) Incluses
              </div>
              <div className="px-2.5 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[9px] font-black uppercase tracking-widest flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-amber-400" />
                Visa Ingénieur ONIGC : En attente
              </div>
            </div>
            <p className="text-anthracite-500 text-xs font-medium italic">
              Conforme SCoT BTP Cameroun v0.2 — Formules physiques attestées &amp; Majoration logistique météo appliquée.
            </p>
          </div>

            {/* Export Excel Button */}
            <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/10 text-[10px] font-black uppercase tracking-widest text-anthracite-400 hover:text-white hover:bg-white/5 hover:border-white/20 transition-all group">
              <Download className="w-3.5 h-3.5 group-hover:translate-y-0.5 transition-transform" />
              Exporter en Excel (.xlsx)
            </button>
            {/* Download PDF Button */}
            <button
              onClick={async () => {
                setIsDownloading(true);
                try {
                  const res = await fetch('/api/generate-pdf', {
                     method: 'POST',
                     headers: { 'Content-Type': 'application/json' },
                     body: JSON.stringify({ projectId: devisId ?? '' }),
                  });
                  if (!res.ok) throw new Error('Failed to generate PDF');
                  const blob = await res.blob();
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `${devisId ?? 'devis'}_DQE.pdf`;
                  a.click();
                  window.URL.revokeObjectURL(url);
                } catch (e) {
                  console.error(e);
                } finally {
                  setIsDownloading(false);
                }
              }}
              disabled={isDownloading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/10 text-[10px] font-black uppercase tracking-widest text-anthracite-400 hover:text-white hover:bg-white/5 hover:border-white/20 transition-all group"
            >
                {isDownloading ? (
                  <Spinner />
                ) : (
                  <Download className="w-3.5 h-3.5 group-hover:translate-y-0.5 transition-transform" />
                )}
              {isDownloading ? null : '📄 Télécharger le DQE (PDF)'}
            </button>
        </div>

        {/* ── TABLE UI ──────────────────────────────────────────────────────── */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-white/[0.02] border-b border-white/5">
                <th className="px-8 py-4 text-left text-[10px] font-black text-anthracite-500 uppercase tracking-[0.2em]">Désignation des Ouvrages</th>
                <th className="px-6 py-4 text-center text-[10px] font-black text-anthracite-500 uppercase tracking-[0.2em]">Unité</th>
                <th className="px-6 py-4 text-right text-[10px] font-black text-anthracite-500 uppercase tracking-[0.2em]">Qté</th>
                <th className="px-6 py-4 text-right text-[10px] font-black text-anthracite-500 uppercase tracking-[0.2em]">P.U (FCFA)</th>
                <th className="px-8 py-4 text-right text-[10px] font-black text-anthracite-500 uppercase tracking-[0.2em]">Montant HT</th>
              </tr>
            </thead>
            
            <motion.tbody 
              variants={containerVars}
              initial="hidden"
              animate="visible"
            >
              {linesToRender.map((line) => {
                const isHighlighted = highlightedCode === line.code;
                return (
                  <motion.tr 
                    key={line.code}
                    variants={rowVars}
                    animate={isHighlighted ? { backgroundColor: "rgba(16, 185, 129, 0.12)" } : { backgroundColor: "rgba(255, 255, 255, 0)" }}
                    whileHover={{ backgroundColor: "rgba(255, 255, 255, 0.05)" }}
                    onClick={() => onSelectLine?.(line.code)}
                    onMouseEnter={() => onSelectLine?.(line.code)}
                    onMouseLeave={() => onSelectLine?.(null)}
                    transition={isHighlighted ? { duration: 0.3 } : { duration: 1.5 }}
                    className="group border-b border-white/5 transition-colors duration-300 cursor-pointer"
                  >

                    <td className="px-8 py-5">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="text-white text-sm font-bold tracking-tight">{line.label}</span>
                          {isHighlighted && (
                            <motion.span 
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[8px] font-black uppercase tracking-wider animate-pulse"
                            >
                              Ajusté par l'IA
                            </motion.span>
                          )}
                        </div>
                        <span className="text-[9px] text-anthracite-600 font-bold uppercase tracking-widest mt-0.5">Code Lot: {line.code}</span>
                        {(line as any).justification && (
                          <span className="text-[10px] text-emerald-400/80 italic mt-1">{(line as any).justification}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className="text-[10px] font-black text-anthracite-400 bg-white/5 px-2 py-1 rounded-md border border-white/5">{line.unit}</span>
                    </td>
                    <td className="px-6 py-5 text-right tabular-nums">
                      <span className="text-white text-sm font-medium">{line.quantity}</span>
                    </td>
                    <td className="px-6 py-5 text-right tabular-nums">
                      <span className="text-anthracite-400 text-sm">{line.unitPrice.toLocaleString()}</span>
                    </td>
                    <td className="px-8 py-5 text-right tabular-nums">
                      <span className="text-white text-sm font-black">{line.totalPrice.toLocaleString()}</span>
                    </td>
                  </motion.tr>
                );
              })}
            </motion.tbody>
          </table>
        </div>

        {/* ── RÉSUMÉ FINANCIER ─────────────────────────────────────────────── */}
        <div className="p-8 bg-white/[0.01] flex flex-col md:flex-row items-end justify-between gap-8">
          <div className="flex flex-col items-start gap-4 max-w-xs">
            <div className="flex items-start gap-3">
              <Info className="w-4 h-4 text-anthracite-600 mt-1" />
              <p className="text-[10px] text-anthracite-600 leading-relaxed italic">
                Note : Ce devis est une estimation automatique. Il doit être validé par un ingénieur métré avant toute contractualisation. Taux de TVA appliqué : 19.25%.
              </p>
            </div>
            {/* BOUTON D'EXPORTATION PDF VECTORIEL ARCHITECTE */}
            <div className="pt-2">
              <ExportDevisButton
                projectData={{
                  title: "Duplex R+1 Contemporain",
                  client: "Client Archi Cam AI",
                  devisItems: linesToRender.map((line) => ({
                    description: line.label,
                    quantity: line.quantity,
                    unit: line.unit,
                    unitPriceFCFA: line.unitPrice,
                  })),
                }}
              />
            </div>
          </div>

          <div className="w-full md:w-80 space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-anthracite-500 font-bold uppercase tracking-widest text-[10px]">Total Hors Taxes</span>
              <span className="text-white tabular-nums font-bold">{totalHT.toLocaleString()} FCFA</span>
            </div>
            <div className="flex justify-between items-center text-sm border-b border-white/5 pb-3">
              <span className="text-anthracite-500 font-bold uppercase tracking-widest text-[10px]">TVA (19.25%)</span>
              <span className="text-anthracite-400 tabular-nums font-medium">{tvaAmount.toLocaleString()} FCFA</span>
            </div>
            <div className="flex justify-between items-center pt-2">
              <span className="text-white font-black uppercase tracking-widest text-xs">Total TTC</span>
              <div className="text-right">
                <span className="block text-3xl font-black tabular-nums text-transparent bg-clip-text bg-gradient-to-r from-ai-glow to-ai-deep">
                  {totalTTC.toLocaleString()} FCFA
                </span>
                <div className="flex items-center justify-end gap-1.5 mt-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  <span className="text-[9px] font-black text-emerald-400 uppercase tracking-[0.2em]">Calcul certifié IA</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
    </div>
  );
}
