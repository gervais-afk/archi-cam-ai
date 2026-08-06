"use client";

import React, { useState, useEffect } from "react";

interface RenderVersion {
  id: string;
  projectId: string;
  versionNumber: number;
  imageUrl: string;
  renderMode: string;
  stylePreset: string;
  createdAt: string;
}

interface VersionHistoryProps {
  projectId: string;
  onRollbackComplete?: (imageUrl: string) => void;
}

export function VersionHistory({ projectId, onRollbackComplete }: VersionHistoryProps) {
  const [versions, setVersions] = useState<RenderVersion[]>([]);
  const [currentVersionNumber, setCurrentVersionNumber] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchHistory = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/versions`);
      if (res.ok) {
        const data = await res.json();
        setVersions(data.versions || []);
        setCurrentVersionNumber(data.currentVersionNumber || null);
      }
    } catch (err) {
      console.error("Failed to load versions history:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [projectId]);

  const handleRollback = async (versionId: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/rollback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ versionId }),
      });
      if (res.ok) {
        const data = await res.json();
        if (onRollbackComplete) {
          onRollbackComplete(data.imageUrl);
        }
        // Refresh local history list
        fetchHistory();
      }
    } catch (err) {
      console.error("Rollback failed:", err);
    }
  };

  if (loading) {
    return <div className="text-slate-400 text-xs font-mono animate-pulse">Chargement de l'historique...</div>;
  }

  if (versions.length === 0) {
    return (
      <div className="text-slate-500 text-xs italic bg-slate-950/40 p-4 rounded-xl border border-slate-900">
        Aucune version antérieure enregistrée pour ce projet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold uppercase tracking-wider text-amber-400">
        📜 Historique des Rendus
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {versions.map((version) => {
          const isCurrent = version.versionNumber === currentVersionNumber;
          return (
            <div
              key={version.id}
              className={`relative border rounded-xl overflow-hidden bg-slate-950/80 transition-all duration-300 ${
                isCurrent
                  ? "border-amber-500 ring-2 ring-amber-500/20"
                  : "border-slate-800 hover:border-slate-700"
              }`}
            >
              {/* Image Preview */}
              <div className="relative h-40 bg-slate-900 flex items-center justify-center overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={version.imageUrl}
                  alt={`Version ${version.versionNumber}`}
                  className="object-cover w-full h-full hover:scale-105 transition-all duration-500"
                />
                {isCurrent && (
                  <div className="absolute top-2 right-2 bg-amber-500 text-slate-950 font-bold px-2 py-0.5 rounded text-[10px] uppercase tracking-wide shadow-md">
                    Actuelle
                  </div>
                )}
              </div>

              {/* Version details */}
              <div className="p-3 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-200">v{version.versionNumber}</span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {new Date(version.createdAt).toLocaleDateString("fr-FR")}
                  </span>
                </div>

                <div className="text-[10px] text-slate-400 space-y-0.5">
                  <p>🎨 Style : <strong className="text-slate-300">{version.stylePreset}</strong></p>
                  <p>📐 Mode : <strong className="text-slate-300">{version.renderMode}</strong></p>
                </div>

                {!isCurrent && (
                  <button
                    onClick={() => handleRollback(version.id)}
                    className="w-full mt-2 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 hover:border-slate-700 rounded-lg text-xs font-bold transition-all"
                  >
                    🔄 Restaurer v{version.versionNumber}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
