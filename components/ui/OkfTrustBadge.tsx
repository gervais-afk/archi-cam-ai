"use client";

import React from "react";
import { ShieldCheck, ShieldAlert, CheckCircle2, FileCode } from "lucide-react";

export type TrustTier = "unverified" | "machine-confirmed" | "human-reviewed";

interface OkfTrustBadgeProps {
  tier?: TrustTier;
  isStale?: boolean;
  attested?: boolean;
}

export const OkfTrustBadge: React.FC<OkfTrustBadgeProps> = ({
  tier = "machine-confirmed",
  isStale = false,
  attested = true,
}) => {
  if (isStale) {
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold">
        <ShieldAlert className="w-3.5 h-3.5" />
        <span>Donnée Périmée (OKF v0.2)</span>
      </div>
    );
  }

  if (tier === "human-reviewed") {
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold shadow-sm">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
        <span>Certifié Ingénieur (Bankable)</span>
      </div>
    );
  }

  if (tier === "machine-confirmed" && attested) {
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-semibold">
        <FileCode className="w-3.5 h-3.5 text-cyan-400" />
        <span>Attesté Machine (OKF v0.2)</span>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-medium">
      <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
      <span>Brouillon IA (Unverified)</span>
    </div>
  );
};

export default OkfTrustBadge;
