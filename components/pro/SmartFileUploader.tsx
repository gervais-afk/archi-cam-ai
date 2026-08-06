"use client";

import React, { useState } from "react";
import { useDropzone } from "react-dropzone";

interface SmartFileUploaderProps {
  onFileProcessed?: (ifcUrl: string, qualityScore: number) => void;
}

export function SmartFileUploader({ onFileProcessed }: SmartFileUploaderProps) {
  const [processing, setProcessing] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [qualityReport, setQualityReport] = useState<{
    score: number;
    warnings: string[];
  } | null>(null);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      "application/x-step": [".ifc"],
      "application/octet-stream": [".rvt", ".pln", ".skp"],
      "image/vnd.dwg": [".dwg"]
    },
    maxFiles: 1,
    onDrop: async (acceptedFiles) => {
      if (acceptedFiles.length === 0) return;
      const file = acceptedFiles[0];

      setProcessing(true);
      setQualityReport(null);
      
      const ext = file.name.split(".").pop()?.toLowerCase();
      setStatusText(
        ext === "ifc"
          ? "📤 Importation de votre maquette IFC..."
          : `🔄 Importation et conversion automatique ${ext?.toUpperCase()} ➔ IFC...`
      );

      const formData = new FormData();
      formData.append("file", file);

      try {
        const response = await fetch("/api/pro/ifc/convert", {
          method: "POST",
          headers: {
            "x-user-id": "test_smart_uploader_user"
          },
          body: formData
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || "Échec de conversion");
        }

        // Récupérer les en-têtes d'audit qualité
        const score = Number(response.headers.get("X-Quality-Score") || "100");
        const warningsJson = response.headers.get("X-Warnings") || "[]";
        const warnings = JSON.parse(warningsJson);

        const ifcBlob = await response.blob();
        const ifcUrl = URL.createObjectURL(ifcBlob);

        setQualityReport({ score, warnings });
        setStatusText("✅ Fichier traité et validé avec succès !");

        if (onFileProcessed) {
          onFileProcessed(ifcUrl, score);
        }
      } catch (err: any) {
        console.error(err);
        setStatusText(`❌ Erreur : ${err.message}`);
      } finally {
        setProcessing(false);
      }
    }
  });

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-400 border-emerald-900/60 bg-emerald-950/20";
    if (score >= 60) return "text-amber-400 border-amber-900/60 bg-amber-950/20";
    return "text-rose-400 border-rose-900/60 bg-rose-950/20";
  };

  return (
    <div className="bg-slate-950 border border-slate-900 rounded-xl p-5 font-sans text-slate-100 max-w-lg shadow-lg space-y-6">
      <div className="bg-blue-950/20 border border-blue-900/40 rounded-lg p-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-blue-400 mb-1">
          📂 Importateur de maquette intelligente
        </h3>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          Déposez votre fichier IFC natif ou vos fichiers de dessin (Revit, ArchiCAD, SketchUp, AutoCAD). Le convertisseur et l'auditeur s'occupent du reste.
        </p>
      </div>

      {/* Dropzone Container */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${
          isDragActive ? "border-amber-500 bg-amber-950/5" : "border-slate-800 hover:border-slate-700"
        } ${processing ? "opacity-50 pointer-events-none" : ""}`}
      >
        <input {...getInputProps()} />

        <div className="text-4xl mb-3">{processing ? "⚙️" : isDragActive ? "📥" : "📤"}</div>

        {processing ? (
          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-200">Traitement en cours...</p>
            <p className="text-[10px] text-slate-400 animate-pulse">{statusText}</p>
          </div>
        ) : (
          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-200">
              {isDragActive ? "Déposez le fichier ici..." : "Glissez-déposez un fichier de conception"}
            </p>
            <p className="text-[10px] text-slate-500">ou cliquez pour parcourir les dossiers</p>
          </div>
        )}
      </div>

      {/* Conversion & Quality Audit Report */}
      {qualityReport && (
        <div className={`p-4 rounded-xl border font-sans space-y-3 animate-fadeIn ${getScoreColor(qualityReport.score)}`}>
          <div className="flex justify-between items-center border-b border-slate-900 pb-1.5">
            <span className="text-xs font-bold uppercase tracking-wider">🎯 Audit de Qualité IFC</span>
            <span className="text-xs font-mono font-bold">Score : {qualityReport.score}/100</span>
          </div>

          {qualityReport.warnings.length > 0 ? (
            <div className="space-y-1 text-[10px] text-slate-300">
              <span className="font-semibold block text-slate-400">Avertissements d'audit :</span>
              {qualityReport.warnings.map((warn, idx) => (
                <div key={idx} className="flex items-start gap-1">
                  <span>├─</span>
                  <p className="leading-relaxed">{warn}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[10px] text-slate-300">✅ Aucun avertissement. La maquette IFC est complète et prête pour l'ingénierie.</p>
          )}
        </div>
      )}

      {/* Supported Badges */}
      <div className="grid grid-cols-5 gap-2 text-center text-[10px] font-bold">
        <div className="bg-emerald-950/40 border border-emerald-900/40 text-emerald-400 px-2 py-1.5 rounded">IFC</div>
        <div className="bg-blue-950/40 border border-blue-900/40 text-blue-400 px-2 py-1.5 rounded">Revit</div>
        <div className="bg-violet-950/40 border border-violet-900/40 text-violet-400 px-2 py-1.5 rounded">ArchiCAD</div>
        <div className="bg-amber-950/40 border border-amber-900/40 text-amber-400 px-2 py-1.5 rounded">SketchUp</div>
        <div className="bg-rose-950/40 border border-rose-900/40 text-rose-400 px-2 py-1.5 rounded">AutoCAD</div>
      </div>
    </div>
  );
}
