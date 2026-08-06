"use client";

import React, { useState } from "react";

interface RenderFeedbackProps {
  projectId: string;
  renderId?: string;
}

export function RenderFeedback({ projectId, renderId }: RenderFeedbackProps) {
  const [rating, setRating] = useState<number | null>(null);
  const [feedbackText, setFeedbackText] = useState<string>("");
  const [selectedIssues, setSelectedIssues] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  const issuesOptions = [
    { key: "geometry", label: "Les murs ne correspondent pas au croquis" },
    { key: "furniture", label: "Le mobilier est mal placé / incohérent" },
    { key: "colors", label: "Les couleurs ou l'ambiance ne me plaisent pas" },
    { key: "details", label: "Manque de détails ou de réalisme" }
  ];

  const handleIssueToggle = (key: string) => {
    if (selectedIssues.includes(key)) {
      setSelectedIssues(selectedIssues.filter((i) => i !== key));
    } else {
      setSelectedIssues([...selectedIssues, key]);
    }
  };

  const handleSubmit = async () => {
    if (!rating) return;
    try {
      const res = await fetch("/api/feedback/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          renderId,
          rating,
          feedback: feedbackText,
          metadata: {
            issues: selectedIssues,
            submittedAt: new Date().toISOString()
          }
        }),
      });

      if (res.ok) {
        setSubmitted(true);
      }
    } catch (err) {
      console.error("Failed to submit feedback:", err);
    }
  };

  if (submitted) {
    return (
      <div className="bg-emerald-950/20 border border-emerald-900/60 rounded-xl p-5 text-center font-sans">
        <span className="text-2xl">✅</span>
        <h4 className="text-emerald-400 font-bold mt-2 text-sm">Merci pour votre retour !</h4>
        <p className="text-slate-400 text-xs mt-1 leading-relaxed">
          Vos commentaires nous aident à optimiser le pipeline d'IA générative d'Archi Cam AI.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-950/80 border border-slate-900 rounded-xl p-5 font-sans space-y-4 max-w-md shadow-lg">
      <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400">
        💭 Évaluez la qualité de ce rendu
      </h4>

      {/* Star Selector */}
      <div className="flex gap-2 justify-center py-1">
        {[1, 2, 3, 4, 5].map((star) => {
          const isActive = (hoverRating !== null ? star <= hoverRating : rating !== null && star <= rating);
          return (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(null)}
              className={`text-2xl transition-all duration-150 transform hover:scale-125 ${
                isActive ? "text-amber-400" : "text-slate-700"
              }`}
            >
              ★
            </button>
          );
        })}
      </div>

      {/* Issues Checklist if rating is low (<= 3) */}
      {rating !== null && rating <= 3 && (
        <div className="space-y-2 border-t border-slate-900 pt-3 animate-fadeIn">
          <p className="text-xs font-semibold text-slate-300">Qu'est-ce qui ne va pas ?</p>
          <div className="space-y-1.5">
            {issuesOptions.map((opt) => (
              <label key={opt.key} className="flex items-start gap-2.5 text-xs cursor-pointer text-slate-400 hover:text-slate-300">
                <input
                  type="checkbox"
                  checked={selectedIssues.includes(opt.key)}
                  onChange={() => handleIssueToggle(opt.key)}
                  className="mt-0.5 rounded border-slate-800 bg-slate-950 text-amber-500 focus:ring-amber-500/40 focus:ring-offset-slate-950"
                />
                <span>{opt.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Comment text box */}
      <div className="space-y-1">
        <textarea
          placeholder="Commentaires ou suggestions (facultatif)..."
          value={feedbackText}
          onChange={(e) => setFeedbackText(e.target.value)}
          className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 placeholder-slate-500 focus:border-slate-700 focus:ring-1 focus:ring-slate-700 outline-none"
          rows={3}
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={rating === null}
        className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-2 rounded-lg text-xs transition-all tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
      >
        📨 Envoyer mon évaluation
      </button>
    </div>
  );
}
