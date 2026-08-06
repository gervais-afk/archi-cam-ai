"use client";

import React from "react";
import { DevisTableWidget } from "./widgets/DevisTableWidget";
import { StructuralSchemaWidget } from "./widgets/StructuralSchemaWidget";
import { LegalRadarWidget } from "./widgets/LegalRadarWidget";

export interface ChatMessageData {
  id: string;
  sender: "Router" | "Designer" | "Engineer" | "Metreur" | "Legal" | "User";
  text: string;
  widgetType?: "DEVIS_TABLE" | "STRUCTURAL_SCHEMA" | "LEGAL_RADAR" | null;
  widgetData?: any;
  createdAt: string | Date;
}

interface AgentMessageProps {
  message: ChatMessageData;
}

export function AgentMessage({ message }: AgentMessageProps) {
  const senderStyles = {
    Router: { name: "🧭 Navigateur Archi", color: "bg-slate-900/60 border-slate-800 text-slate-100 shadow-[0_4px_15px_rgba(30,41,59,0.2)]" },
    Designer: { name: "🎨 Architecte Designer", color: "bg-violet-950/20 border-violet-900/40 text-violet-100 shadow-[0_4px_15px_rgba(109,40,217,0.08)]" },
    Engineer: { name: "👷 Ingénieur Structure", color: "bg-emerald-950/20 border-emerald-900/40 text-emerald-100 shadow-[0_4px_15px_rgba(4,120,87,0.08)]" },
    Metreur: { name: "📊 Métreur Économiste", color: "bg-amber-950/20 border-amber-900/40 text-amber-100 shadow-[0_4px_15px_rgba(180,83,9,0.08)]" },
    Legal: { name: "⚖️ Conseiller Juridique", color: "bg-blue-950/20 border-blue-900/40 text-blue-100 shadow-[0_4px_15px_rgba(29,78,216,0.08)]" },
    User: { name: "👤 Vous", color: "bg-slate-800/40 border-slate-700/60 text-slate-100 shadow-sm ml-auto max-w-[85%]" }
  };

  const style = senderStyles[message.sender] || senderStyles.User;
  const isUser = message.sender === "User";

  const timeString = new Date(message.createdAt).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit"
  });

  return (
    <div className={`flex w-full mb-4 ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`flex flex-col p-4 border rounded-xl transition-all duration-300 w-full max-w-xl ${style.color}`}>
        <div className="flex justify-between items-center mb-1.5 pb-1 border-b border-slate-800/40 w-full">
          <span className="font-bold text-xs tracking-wide">{style.name}</span>
          <span className="text-[10px] text-slate-500 font-mono">{timeString}</span>
        </div>

        <p className="text-xs leading-relaxed whitespace-pre-wrap text-slate-300">
          {message.text}
        </p>

        {/* Generative UI Components rendering based on widgetType metadata */}
        {message.widgetType === "DEVIS_TABLE" && message.widgetData && (
          <DevisTableWidget data={message.widgetData} />
        )}
        {message.widgetType === "STRUCTURAL_SCHEMA" && message.widgetData && (
          <StructuralSchemaWidget data={message.widgetData} />
        )}
        {message.widgetType === "LEGAL_RADAR" && message.widgetData && (
          <LegalRadarWidget data={message.widgetData} />
        )}
      </div>
    </div>
  );
}
