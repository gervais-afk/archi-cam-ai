import { useState, useEffect, useRef, useCallback } from "react";

export interface DevisItem {
  id: string;
  section_id: string;
  designation: string;
  quantite: number;
  unite: string;
  prix_unitaire: number;
  prix_total: number;
  mercuriale_code: string | null;
}

export interface DevisSection {
  id: string;
  phase_id: string;
  code: string;
  titre: string;
  montant_total: number;
  devis_items?: DevisItem[];
}

export interface DevisPhase {
  id: string;
  devis_id: string;
  numero: number;
  titre: string;
  montant_total: number;
  devis_sections?: DevisSection[];
}

export interface DevisEcheancier {
  id: string;
  devis_id: string;
  mois: string;
  execution_pct: number;
  montant_mensuel: number;
  montant_cumule: number;
}

export interface DevisData {
  id: string;
  project_id: string;
  version: number;
  status: string;
  total_ht: number;
  tva_rate: number;
  total_ttc: number;
  margin_bet_pct: number;
  margin_hazards_pct: number;
  devis_phases?: DevisPhase[];
  devis_echeancier?: DevisEcheancier[];
  created_at?: string;
}

export function useDevis(devisId: string | null) {
  const [devis, setDevis] = useState<DevisData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Ref to store pending updates for debouncing
  const pendingUpdatesRef = useRef<{
    margin_bet_pct?: number;
    margin_hazards_pct?: number;
    items?: { id: string; quantite?: number; prix_unitaire?: number }[];
  }>({});

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch Devis from API
  const fetchDevis = useCallback(async (idToFetch: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/devis/${idToFetch}`);
      if (!res.ok) {
        throw new Error(`Failed to load devis: ${res.statusText}`);
      }
      const data = await res.json();
      setDevis(data);
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (devisId) {
      fetchDevis(devisId);
    } else {
      setDevis(null);
    }
  }, [devisId, fetchDevis]);

  // Flush updates to database via API
  const flushUpdates = useCallback(async () => {
    if (!devisId || Object.keys(pendingUpdatesRef.current).length === 0) return;

    setSaving(true);
    const body = { ...pendingUpdatesRef.current };
    pendingUpdatesRef.current = {}; // clear buffer

    try {
      const res = await fetch(`/api/devis/${devisId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        throw new Error("Failed to save changes");
      }

      const updatedData = await res.json();
      setDevis(updatedData); // Sync with exact backend state
    } catch (err: any) {
      console.error("Error saving devis changes:", err);
      // Reload on error to restore database values
      if (devisId) {
        fetchDevis(devisId);
      }
    } finally {
      setSaving(false);
    }
  }, [devisId, fetchDevis]);

  // Trigger patch with debounce
  const queueUpdate = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      flushUpdates();
    }, 1000); // 1s debounce
  }, [flushUpdates]);

  // Clean timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Recalculates all totals in memory for instantaneous rendering (Optimistic update)
  const computeStateInPlace = useCallback((
    currentDevis: DevisData,
    newBetPct?: number,
    newHazardsPct?: number,
    updatedItems?: { id: string; quantite?: number; prix_unitaire?: number }[]
  ): DevisData => {
    const updated = { ...currentDevis };
    
    // Apply new margins if specified
    const betMargin = newBetPct !== undefined ? newBetPct : updated.margin_bet_pct;
    const hazardsMargin = newHazardsPct !== undefined ? newHazardsPct : updated.margin_hazards_pct;
    
    updated.margin_bet_pct = betMargin;
    updated.margin_hazards_pct = hazardsMargin;

    // Build lookup map for updated items
    const itemUpdatesMap = new Map<string, { quantite?: number; prix_unitaire?: number }>();
    if (updatedItems) {
      updatedItems.forEach(u => itemUpdatesMap.set(u.id, u));
    }

    let devisTotalHt = 0;

    // Traverse and update items & sections
    if (updated.devis_phases) {
      updated.devis_phases = updated.devis_phases.map(phase => {
        let phaseTotal = 0;
        const sections = phase.devis_sections ? phase.devis_sections.map(section => {
          let sectionTotal = 0;
          const items = section.devis_items ? section.devis_items.map(item => {
            let q = item.quantite;
            let pu = item.prix_unitaire;

            if (itemUpdatesMap.has(item.id)) {
              const u = itemUpdatesMap.get(item.id)!;
              if (u.quantite !== undefined) q = u.quantite;
              if (u.prix_unitaire !== undefined) pu = u.prix_unitaire;
            }

            const pt = q * pu;
            sectionTotal += pt;

            return { ...item, quantite: q, prix_unitaire: pu, prix_total: pt };
          }) : [];

          phaseTotal += sectionTotal;
          return { ...section, devis_items: items, montant_total: sectionTotal };
        }) : [];

        devisTotalHt += phaseTotal;
        return { ...phase, devis_sections: sections, montant_total: phaseTotal };
      });
    }

    updated.total_ht = devisTotalHt;
    
    const betAmount = Math.round(devisTotalHt * (betMargin / 100));
    const aleasAmount = Math.round(devisTotalHt * (hazardsMargin / 100));
    const devisTotalTtc = devisTotalHt + betAmount + aleasAmount;
    
    updated.total_ttc = devisTotalTtc;

    // Recalculate Echeancier
    if (updated.devis_echeancier) {
      let runningCumule = 0;
      updated.devis_echeancier = updated.devis_echeancier.map(forecast => {
        const pct = forecast.execution_pct || 0;
        const monthlyAmt = Math.round(devisTotalTtc * (pct / 100));
        runningCumule += monthlyAmt;
        return {
          ...forecast,
          montant_mensuel: monthlyAmt,
          montant_cumule: runningCumule
        };
      });
    }

    return updated;
  }, []);

  // Update margins in UI and queue API call
  const updateMargins = useCallback((betPct: number, hazardsPct: number) => {
    if (!devis) return;

    // Store in buffer
    pendingUpdatesRef.current.margin_bet_pct = betPct;
    pendingUpdatesRef.current.margin_hazards_pct = hazardsPct;

    // Optimistic state calculation
    const nextState = computeStateInPlace(devis, betPct, hazardsPct, undefined);
    setDevis(nextState);

    queueUpdate();
  }, [devis, computeStateInPlace, queueUpdate]);

  // Update single item values in UI and queue API call
  const updateItem = useCallback((itemId: string, quantite: number, prix_unitaire: number) => {
    if (!devis) return;

    // Store in buffer
    if (!pendingUpdatesRef.current.items) {
      pendingUpdatesRef.current.items = [];
    }

    // Filter existing update for this item
    pendingUpdatesRef.current.items = pendingUpdatesRef.current.items.filter(it => it.id !== itemId);
    pendingUpdatesRef.current.items.push({ id: itemId, quantite, prix_unitaire });

    // Optimistic state calculation
    const nextState = computeStateInPlace(devis, undefined, undefined, pendingUpdatesRef.current.items);
    setDevis(nextState);

    queueUpdate();
  }, [devis, computeStateInPlace, queueUpdate]);

  return {
    devis,
    loading,
    saving,
    error,
    updateMargins,
    updateItem,
    refresh: () => devisId && fetchDevis(devisId)
  };
}
