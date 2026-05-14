"use client";

import { useState }         from "react";
import type {
  GenerationOptions,
  RenderResult,
  PlanStatus,
} from "@/types";
import { MOCK_RENDER_RESULT } from "@/lib/mock-data";

export function useGenerateRender() {
  const [status, setStatus] = useState<PlanStatus>("idle");
  const [result, setResult] = useState<RenderResult | null>(null);
  const [error,  setError]  = useState<string | null>(null);

  const generate = async (
    _file:    File,
    _options: GenerationOptions
  ): Promise<void> => {
    setStatus("generating");
    setError(null);

    try {
      // TODO: 1. Upload file to Firebase Storage
      // TODO: 2. Call Cloud Function / external AI API
      // TODO: 3. Poll Firestore for result

      // Mock: simulate async generation
      await new Promise((r) => setTimeout(r, 15_000));

      setResult(MOCK_RENDER_RESULT);
      setStatus("completed");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Une erreur est survenue lors de la génération."
      );
      setStatus("error");
    }
  };

  const reset = () => {
    setStatus("idle");
    setResult(null);
    setError(null);
  };

  return { status, result, error, generate, reset };
}
