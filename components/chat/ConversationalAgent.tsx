"use client";

import React, { useState } from "react";

export interface RenderVersion {
  version: number;
  label: string;
  thumbnail: string;
  costTotalFCFA: number;
  timestamp: string;
}

export interface ConversationalAgentProps {
  projectId: string;
  initialRenderUrl: string;
  initialQuoteFCFA: number;
  onVersionSelect?: (version: RenderVersion) => void;
}

export default function ConversationalAgent({
  projectId,
  initialRenderUrl,
  initialQuoteFCFA,
  onVersionSelect,
}: ConversationalAgentProps) {
  const [messages, setMessages] = useState<
    Array<{ sender: "bot" | "user"; text: string; time?: number; impactFcfa?: number }>
  >([
    {
      sender: "bot",
      text: "👋 Votre rendu initial est prêt ! Que souhaitez-vous modifier ou ajuster ?",
    },
  ]);
  const [inputMsg, setInputMsg] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [estimatedSec, setEstimatedSec] = useState<number | null>(null);

  const [history, setHistory] = useState<RenderVersion[]>([
    {
      version: 1,
      label: "Rendu initial 2D/3D",
      thumbnail: initialRenderUrl,
      costTotalFCFA: initialQuoteFCFA,
      timestamp: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [activeVersionIndex, setActiveVersionIndex] = useState(0);

  const quickSuggestions = [
    "🪵 Parquet séjour",
    "🛋️ Ajouter canapé",
    "🎨 Style moderne",
    "📐 Agrandir séjour (+10m²)",
    "🏠 Tôle Bac Alu",
  ];

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputMsg).trim();
    if (!text || isProcessing) return;

    setInputMsg("");
    setMessages((prev) => [...prev, { sender: "user", text }]);
    setIsProcessing(true);

    try {
      const res = await fetch("/api/agent/modify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          message: text,
          currentRender: history[activeVersionIndex]?.thumbnail || initialRenderUrl,
          currentQuote: { total_ttc: history[activeVersionIndex]?.costTotalFCFA || initialQuoteFCFA },
        }),
      });

      if (!res.ok) throw new Error("Erreur de modification");

      const data = await res.json();
      setEstimatedSec(data.estimatedTime_s);

      const resultData = data.result;
      const newVersionNum = history.length + 1;
      const newVersion: RenderVersion = {
        version: newVersionNum,
        label: resultData.versionLabel || `Version ${newVersionNum}`,
        thumbnail: resultData.imagePath || initialRenderUrl,
        costTotalFCFA: resultData.quoteImpact?.new_total_fcfa || initialQuoteFCFA,
        timestamp: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
      };

      setHistory((prev) => [...prev, newVersion]);
      setActiveVersionIndex(history.length);

      if (onVersionSelect) onVersionSelect(newVersion);

      const impactText = resultData.quoteImpact?.delta_fcfa
        ? ` (Impact devis: +${resultData.quoteImpact.delta_fcfa.toLocaleString()} FCFA)`
        : " (Impact devis: 0 FCFA)";

      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: `✅ ${resultData.versionLabel} appliquée avec succès en ${data.estimatedTime_s}s !${impactText}`,
          time: data.estimatedTime_s,
          impactFcfa: resultData.quoteImpact?.delta_fcfa,
        },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: "❌ Une erreur s'est produite lors de la modification. Veuillez réessayer." },
      ]);
    } finally {
      setIsProcessing(false);
      setEstimatedSec(null);
    }
  };

  const handleUndo = () => {
    if (activeVersionIndex > 0) {
      const prevIdx = activeVersionIndex - 1;
      setActiveVersionIndex(prevIdx);
      const prevVer = history[prevIdx];
      if (onVersionSelect) onVersionSelect(prevVer);
      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: `↩️ Retour à la version ${prevVer.version} : ${prevVer.label}` },
      ]);
    }
  };

  return (
    <div className="flex flex-col h-[550px] bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
      {/* En-tête avec navigation d'historique */}
      <div className="p-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
          <h3 className="text-sm font-semibold text-white">💬 Agent Architecte Conversational</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleUndo}
            disabled={activeVersionIndex === 0}
            className="px-2 py-1 text-xs bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 rounded transition"
          >
            ↩️ Annuler
          </button>
          <span className="text-xs text-slate-400 font-mono">
            V{history[activeVersionIndex]?.version || 1}/{history.length}
          </span>
        </div>
      </div>

      {/* Carrousel d'historique des versions */}
      <div className="flex items-center gap-2 p-2 bg-slate-950/60 border-b border-slate-800/80 overflow-x-auto">
        {history.map((ver, idx) => (
          <button
            key={ver.version}
            onClick={() => {
              setActiveVersionIndex(idx);
              if (onVersionSelect) onVersionSelect(ver);
            }}
            className={`flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs transition ${
              idx === activeVersionIndex
                ? "bg-amber-500/20 border-amber-500/80 text-amber-300 font-medium"
                : "bg-slate-800/50 border-slate-700/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            }`}
          >
            <span>v{ver.version}</span>
            <span className="truncate max-w-[100px]">{ver.label}</span>
          </button>
        ))}
      </div>

      {/* Zone de discussion */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3 font-sans">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                m.sender === "user"
                  ? "bg-amber-600 text-white rounded-br-none"
                  : "bg-slate-800 border border-slate-700 text-slate-100 rounded-bl-none"
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}

        {isProcessing && (
          <div className="flex justify-start">
            <div className="bg-slate-800 border border-amber-500/30 rounded-2xl rounded-bl-none px-4 py-3 text-sm text-amber-300 flex items-center gap-3">
              <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
              <span>Modification en cours... ({estimatedSec ? `~${estimatedSec}s` : "Analyse..."})</span>
            </div>
          </div>
        )}
      </div>

      {/* Suggestions rapides */}
      <div className="p-2 bg-slate-950/40 border-t border-slate-800/50 flex gap-1.5 overflow-x-auto">
        {quickSuggestions.map((sug, i) => (
          <button
            key={i}
            onClick={() => handleSend(sug.replace(/^[^\s]+\s/, ""))}
            className="flex-shrink-0 px-2.5 py-1 text-xs bg-slate-800 hover:bg-amber-500/20 hover:border-amber-500/40 border border-slate-700 text-slate-300 rounded-full transition"
          >
            {sug}
          </button>
        ))}
      </div>

      {/* Zone d'entrée de texte */}
      <div className="p-3 bg-slate-950 border-t border-slate-800 flex gap-2">
        <input
          type="text"
          value={inputMsg}
          onChange={(e) => setInputMsg(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Ex: 'Mets du parquet au salon', 'Agrandis la cuisine'..."
          className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
        />
        <button
          onClick={() => handleSend()}
          disabled={!inputMsg.trim() || isProcessing}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-semibold text-sm rounded-lg transition"
        >
          Envoyer
        </button>
      </div>
    </div>
  );
}
