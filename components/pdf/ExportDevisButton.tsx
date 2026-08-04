"use client";

import React, { useState, useEffect } from "react";
import { DevisPdfDocument, DevisItem } from "./DevisPdfDocument";
import { Download, Loader2 } from "lucide-react";

interface ExportDevisButtonProps {
  projectData: {
    title?: string;
    client?: string;
    devisItems?: Array<{
      description?: string;
      label?: string;
      quantity?: number;
      unit?: string;
      unitPrice?: number;
      unitPriceFCFA?: number;
    }>;
    okfNotes?: string;
    reportText?: string;
  };
}

export const ExportDevisButton: React.FC<ExportDevisButtonProps> = ({ projectData }) => {
  const [PDFDownloadLinkModule, setPDFDownloadLinkModule] = useState<any>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    import("@react-pdf/renderer").then((mod) => {
      setPDFDownloadLinkModule(() => mod.PDFDownloadLink);
    }).catch((err) => {
      console.warn("Could not load @react-pdf/renderer dynamically:", err);
    });
  }, []);

  const mappedItems: DevisItem[] = (projectData.devisItems || []).map((item) => ({
    description: item.description || item.label || "Ouvrage BTP",
    quantity: item.quantity || 1,
    unit: item.unit || "m²",
    unitPriceFCFA: item.unitPriceFCFA || item.unitPrice || 10000,
  }));

  if (!isClient || !PDFDownloadLinkModule) {
    return (
      <button
        disabled
        className="flex items-center space-x-2 rounded-xl bg-amber-500/50 px-4 py-2.5 font-semibold text-slate-950 opacity-50 cursor-not-allowed"
      >
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Préparation du PDF...</span>
      </button>
    );
  }

  const PDFDownloadLink = PDFDownloadLinkModule;

  return (
    <PDFDownloadLink
      document={
        <DevisPdfDocument
          projectTitle={projectData.title || "Maison d'Orientation — R+1 Contemporain"}
          clientName={projectData.client || "Client Archi Cam AI"}
          date={new Date().toLocaleDateString("fr-FR")}
          items={mappedItems.length > 0 ? mappedItems : [
            { description: "Béton armé structural (CPJ 42.5 @ 350kg/m³)", quantity: 24, unit: "m³", unitPriceFCFA: 280000 },
            { description: "Maçonnerie agglos creux 15x20x40", quantity: 172, unit: "m²", unitPriceFCFA: 7500 },
            { description: "Revêtement Parquet massif Chêne/Iroko", quantity: 31, unit: "m²", unitPriceFCFA: 18500 },
            { description: "Revêtement Marbre poli Carrara (60x60)", quantity: 46, unit: "m²", unitPriceFCFA: 14500 },
            { description: "Faïence céramique ardoise antidérapante", quantity: 10, unit: "m²", unitPriceFCFA: 8500 },
            { description: "Alternative Bioclimatique : BTC MIPROMALO", quantity: 120, unit: "m²", unitPriceFCFA: 5200 },
          ]}
          okfNotes={
            projectData.okfNotes ||
            projectData.reportText ||
            "Dosage béton armé 350 kg/m³. Ratios d'acier 80 kg/m³. Utilisation de BTC MIPROMALO recommandée pour l'efficacité thermique et gain de 22% sur le lot maçonnerie."
          }
        />
      }
      fileName={`Devis_ArchiCamAI_${Date.now()}.pdf`}
    >
      {({ loading }: { loading: boolean }) => (
        <button
          disabled={loading}
          className="flex items-center space-x-2 rounded-xl bg-amber-500 px-4 py-2.5 font-semibold text-slate-950 transition hover:bg-amber-400 disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Génération du PDF...</span>
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              <span>Télécharger le Rapport PDF</span>
            </>
          )}
        </button>
      )}
    </PDFDownloadLink>
  );
};
