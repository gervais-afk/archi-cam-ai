"use client";

import React, { useState } from "react";
import { Mic, MicOff, Volume2, Sparkles, Loader2 } from "lucide-react";

interface VoiceAssistantWidgetProps {
  projectId?: string;
}

export default function VoiceAssistantWidget({ projectId = "demo-project" }: VoiceAssistantWidgetProps) {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState<string | null>(null);

  const handleMicClick = async () => {
    if (isListening) {
      setIsListening(false);
      return;
    }

    setIsListening(true);
    setTranscript("Quel est le budget recommandé pour le carrelage et les portes Iroko ?");

    // Simuler capture vocale puis appel API
    setTimeout(async () => {
      setIsListening(false);
      setIsProcessing(true);

      try {
        const res = await fetch("/api/voice/assistant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: "Quel est le budget recommandé pour le carrelage et les portes Iroko ?",
            projectId,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          setResponse(data.answerText || "Réponse non disponible.");
        } else {
          setResponse("Pour les portes en bois massif Iroko et le carrelage, prévoyez un budget moyen de 2 450 000 FCFA.");
        }
      } catch (err) {
        setResponse("Budget estimé : 2 450 000 FCFA pour menuiseries Iroko et revêtements.");
      } finally {
        setIsProcessing(false);
      }
    }, 2000);
  };

  return (
    <div className="card-premium p-6 border-wood-ocre/20 bg-anthracite-900/90 shadow-xl backdrop-blur-md">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-wood-gradient flex items-center justify-center shadow-lg shadow-wood-ocre/20">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h4 className="text-white font-bold text-sm">Assistant Vocal BTP</h4>
            <p className="text-anthracite-500 text-[10px] uppercase font-semibold">Posez vos questions par la voix</p>
          </div>
        </div>

        <button
          onClick={handleMicClick}
          disabled={isProcessing}
          className={`p-3 rounded-2xl transition-all duration-300 flex items-center justify-center shadow-lg ${
            isListening
              ? "bg-red-500 text-white animate-bounce shadow-red-500/40"
              : isProcessing
              ? "bg-wood-ocre/20 text-wood-ocre border border-wood-ocre/40"
              : "bg-wood-gradient text-white hover:scale-105 active:scale-95 shadow-wood-ocre/20"
          }`}
          title={isListening ? "Écoute en cours..." : "Cliquer pour parler"}
        >
          {isProcessing ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : isListening ? (
            <MicOff className="w-5 h-5" />
          ) : (
            <Mic className="w-5 h-5" />
          )}
        </button>
      </div>

      {isListening && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2 animate-pulse">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
          <span>Écoute en cours... &quot;{transcript}&quot;</span>
        </div>
      )}

      {response && !isListening && (
        <div className="mt-3 p-4 rounded-xl bg-white/[0.03] border border-white/10 text-white/90 text-xs leading-relaxed flex items-start gap-2.5">
          <Volume2 className="w-4 h-4 text-wood-ocre shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-wood-light uppercase text-[9px] block mb-1">Réponse IA Vocale :</span>
            <p>{response}</p>
          </div>
        </div>
      )}
    </div>
  );
}
