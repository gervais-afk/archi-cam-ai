"use client";

import React, { useState } from "react";
import { Calculator, Download, PieChart, FileText, CheckCircle } from "lucide-react";

export interface QuoteLineItem {
  id: string;
  poste: string;
  detail: string;
  unite: string;
  quantite: number;
  prix_unitaire_fcfa: number;
  total_fcfa: number;
}

interface InteractiveQuoteProps {
  projectId: string;
  projectTitle?: string;
  initialLines?: QuoteLineItem[];
  city?: string;
  totalM2?: number;
  onExportPdf?: () => void;
}

const DEFAULT_QUOTE_LINES: QuoteLineItem[] = [
  { id: "1", poste: "Gros Œuvre", detail: "Fondations filantes & béton armé 350kg/m³", unite: "m³", quantite: 18.5, prix_unitaire_fcfa: 185000, total_fcfa: 3422500 },
  { id: "2", poste: "Gros Œuvre", detail: "Murs élévation parpaings creux 20cm", unite: "m²", quantite: 145, prix_unitaire_fcfa: 52000, total_fcfa: 7540000 },
  { id: "3", poste: "Second Œuvre", detail: "Carrelage grès cérame poli pose collée", unite: "m²", quantite: 95, prix_unitaire_fcfa: 22000, total_fcfa: 2090000 },
  { id: "4", poste: "Second Œuvre", detail: "Parquet teck massif chambres", unite: "m²", quantite: 45, prix_unitaire_fcfa: 35000, total_fcfa: 1575000 },
  { id: "5", poste: "Plomberie & Sanitaires", detail: "WC monobloc & colonnes douche", unite: "U", quantite: 3, prix_unitaire_fcfa: 300000, total_fcfa: 900000 },
  { id: "6", poste: "Électricité & Éclairage", detail: "Tableau de répartition & appareillage encastré", unite: "Forfait", quantite: 1, prix_unitaire_fcfa: 1800000, total_fcfa: 1800000 },
];

export function InteractiveQuote({
  projectId,
  projectTitle = "Duplex R+1 Bastos",
  initialLines = DEFAULT_QUOTE_LINES,
  city = "Yaoundé",
  totalM2 = 140,
  onExportPdf,
}: InteractiveQuoteProps) {
  const [lines, setLines] = useState<QuoteLineItem[]>(initialLines);
  const [targetBudget, setTargetBudget] = useState<number>(20000000);

  const totalHT = lines.reduce((acc, l) => acc + l.total_fcfa, 0);
  const tva = totalHT * 0.1925;
  const imprevus = totalHT * 0.05;
  const totalTTC = totalHT + tva + imprevus;

  // Répartition par poste
  const posteBreakdown = lines.reduce((acc, l) => {
    acc[l.poste] = (acc[l.poste] || 0) + l.total_fcfa;
    return acc;
  }, {} as Record<string, number>);

  const handleQuantityChange = (id: string, newQty: number) => {
    setLines((prev) =>
      prev.map((line) => {
        if (line.id === id) {
          const qty = Math.max(0, newQty);
          return { ...line, quantite: qty, total_fcfa: qty * line.prix_unitaire_fcfa };
        }
        return line;
      })
    );
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-slate-100 space-y-6 shadow-2xl">
      {/* En-tête du devis */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <Calculator className="w-5 h-5 text-emerald-400" />
            <h3 className="text-lg font-bold text-slate-100">
              Devis DQE & DPGF Interactif — {projectTitle}
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Localisation: <span className="text-emerald-400 font-medium">{city}</span> | Surface Totale: {totalM2} m² | Référence Mercuriale MINMAP 2026
          </p>
        </div>

        <button
          onClick={onExportPdf}
          className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium text-xs transition shadow-lg"
        >
          <Download className="w-4 h-4" />
          <span>Exporter PDF Certifié FCFA</span>
        </button>
      </div>

      {/* Synthèse financière (Totaux HT, TVA, TTC) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700">
          <span className="text-xs text-slate-400">Total HT</span>
          <p className="text-base font-bold text-slate-200 mt-0.5">
            {totalHT.toLocaleString("fr-FR")} FCFA
          </p>
        </div>
        <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700">
          <span className="text-xs text-slate-400">TVA (19.25%)</span>
          <p className="text-base font-bold text-slate-300 mt-0.5">
            {Math.round(tva).toLocaleString("fr-FR")} FCFA
          </p>
        </div>
        <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700">
          <span className="text-xs text-slate-400">Imprévus (5%)</span>
          <p className="text-base font-bold text-amber-400 mt-0.5">
            {Math.round(imprevus).toLocaleString("fr-FR")} FCFA
          </p>
        </div>
        <div className="bg-emerald-950/80 p-3 rounded-lg border border-emerald-700/60">
          <span className="text-xs text-emerald-300">Total TTC Net FCFA</span>
          <p className="text-lg font-black text-emerald-400 mt-0.5">
            {Math.round(totalTTC).toLocaleString("fr-FR")} FCFA
          </p>
        </div>
      </div>

      {/* DPGF Tableau interactif */}
      <div className="overflow-x-auto border border-slate-800 rounded-lg">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-800 text-slate-300 uppercase tracking-wider text-[11px]">
            <tr>
              <th className="p-3">Poste BTP</th>
              <th className="p-3">Détail des Travaux</th>
              <th className="p-3">Unité</th>
              <th className="p-3 text-center">Quantité</th>
              <th className="p-3 text-right">Prix Unitaire FCFA</th>
              <th className="p-3 text-right">Montant Total FCFA</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 bg-slate-900/60">
            {lines.map((line) => (
              <tr key={line.id} className="hover:bg-slate-800/40 transition">
                <td className="p-3 font-medium text-emerald-400">{line.poste}</td>
                <td className="p-3 text-slate-300">{line.detail}</td>
                <td className="p-3 text-slate-400">{line.unite}</td>
                <td className="p-3 text-center">
                  <input
                    type="number"
                    value={line.quantite}
                    onChange={(e) => handleQuantityChange(line.id, parseFloat(e.target.value) || 0)}
                    className="w-16 text-center bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 font-bold text-slate-100"
                  />
                </td>
                <td className="p-3 text-right text-slate-300">
                  {line.prix_unitaire_fcfa.toLocaleString("fr-FR")}
                </td>
                <td className="p-3 text-right font-bold text-slate-100">
                  {line.total_fcfa.toLocaleString("fr-FR")} FCFA
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Ventilations par poste */}
      <div className="bg-slate-800/40 p-4 rounded-lg border border-slate-800 space-y-2">
        <div className="flex items-center space-x-2 text-xs font-semibold text-slate-300">
          <PieChart className="w-4 h-4 text-emerald-400" />
          <span>Répartition du Budget par Lot de Travaux :</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {Object.entries(posteBreakdown).map(([poste, amount]) => {
            const pct = Math.round((amount / totalHT) * 100);
            return (
              <div key={poste} className="bg-slate-800 p-2 rounded text-xs">
                <span className="text-slate-400 block text-[11px]">{poste}</span>
                <span className="font-bold text-emerald-400">{amount.toLocaleString("fr-FR")} FCFA ({pct}%)</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
