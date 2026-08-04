"use client";

import { useState, useCallback, useEffect } from "react";

export interface ToastMessage {
  id: string;
  type: "success" | "error" | "info" | "cache";
  title: string;
  description?: string;
}

type ToastListener = (toasts: ToastMessage[]) => void;

let toastsMemory: ToastMessage[] = [];
const listeners = new Set<ToastListener>();

function notifyListeners() {
  listeners.forEach((listener) => listener([...toastsMemory]));
}

export function toast(options: {
  type?: "success" | "error" | "info" | "cache";
  title: string;
  description?: string;
}) {
  const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const newToast: ToastMessage = {
    id,
    type: options.type || "info",
    title: options.title,
    description: options.description,
  };

  toastsMemory = [newToast, ...toastsMemory].slice(0, 5);
  notifyListeners();

  // Auto-dismiss après 4 secondes
  setTimeout(() => {
    toastsMemory = toastsMemory.filter((t) => t.id !== id);
    notifyListeners();
  }, 4000);

  return id;
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>(toastsMemory);

  useEffect(() => {
    const handleUpdate = (updatedToasts: ToastMessage[]) => {
      setToasts(updatedToasts);
    };

    listeners.add(handleUpdate);
    return () => {
      listeners.delete(handleUpdate);
    };
  }, []);

  const dismiss = useCallback((id: string) => {
    toastsMemory = toastsMemory.filter((t) => t.id !== id);
    notifyListeners();
  }, []);

  return {
    toasts,
    toast,
    dismiss,
    showCacheToast: () => toast({ type: "cache", title: "⚡ Rendu récupéré depuis le cache !", description: "Temps de réponse instantané (<100ms)" }),
    showSuccessToast: () => toast({ type: "success", title: "✨ Votre rendu HD a été généré avec succès.", description: "Calcul du devis et conformité OKF terminés." }),
    showErrorToast: (msg?: string) => toast({ type: "error", title: "❌ Erreur lors de la génération.", description: msg || "Veuillez réessayer ou vérifier le plan source." }),
  };
}
