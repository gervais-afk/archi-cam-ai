import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { verifyFirebaseToken } from "@/lib/firebase-server";

// Parse month string to integer (e.g. "Mois 1" -> 1)
function parseMonthNumber(monthStr: string): number {
  const match = monthStr?.match(/\d+/);
  return match ? parseInt(match[0], 10) : 999;
}

// Order Roman numerals for sections
const ROMAN_ORDER = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];

async function getFullDevis(devisId: string) {
  // 1. Fetch main devis details
  const devisRes = await query("SELECT * FROM devis WHERE id = $1", [devisId]);
  if (devisRes.rows.length === 0) return null;
  const devis = devisRes.rows[0];

  // 2. Fetch phases
  const phasesRes = await query("SELECT * FROM devis_phases WHERE devis_id = $1 ORDER BY numero", [devisId]);
  const phases = phasesRes.rows;

  if (phases.length > 0) {
    const phaseIds = phases.map(p => p.id);
    // Fetch sections for all these phases
    const sectionsRes = await query("SELECT * FROM devis_sections WHERE phase_id = ANY($1)", [phaseIds]);
    const sections = sectionsRes.rows;

    if (sections.length > 0) {
      const sectionIds = sections.map(s => s.id);
      // Fetch items for all these sections
      const itemsRes = await query("SELECT * FROM devis_items WHERE section_id = ANY($1)", [sectionIds]);
      const items = itemsRes.rows;

      // Group items by section
      sections.forEach((sec: any) => {
        sec.devis_items = items
          .filter(it => it.section_id === sec.id)
          .sort((a, b) => a.designation.localeCompare(b.designation));
      });
    }

    // Group sections by phase
    phases.forEach((phase: any) => {
      phase.devis_sections = sections
        .filter(sec => sec.phase_id === phase.id)
        .sort((a, b) => {
          const indexA = ROMAN_ORDER.indexOf(a.code);
          const indexB = ROMAN_ORDER.indexOf(b.code);
          return (indexA !== -1 ? indexA : 99) - (indexB !== -1 ? indexB : 99);
        });
    });
  }

  // 3. Fetch S-curve forecast echeancier
  const echeancierRes = await query("SELECT * FROM devis_echeancier WHERE devis_id = $1", [devisId]);
  const echeancier = echeancierRes.rows.sort((a, b) => parseMonthNumber(a.mois) - parseMonthNumber(b.mois));

  devis.devis_phases = phases;
  devis.devis_echeancier = echeancier;

  // Convert key formats to match client expectations if needed (postgres has lower_case columns)
  devis.margin_bet_pct = Number(devis.margin_bet_pct);
  devis.margin_hazards_pct = Number(devis.margin_hazards_pct);
  devis.total_ht = Number(devis.total_ht);
  devis.total_ttc = Number(devis.total_ttc);

  return devis;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const firebaseToken = req.cookies.get("firebaseToken")?.value;
    const user = await verifyFirebaseToken(firebaseToken || "");
    const isDev = process.env.NODE_ENV === 'development';

    if (!user && !isDev) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    if (!id) {
      return NextResponse.json({ error: "Missing devis ID" }, { status: 400 });
    }

    const devis = await getFullDevis(id);
    if (!devis) {
      return NextResponse.json({ error: "Devis not found" }, { status: 404 });
    }

    return NextResponse.json(devis);
  } catch (error: any) {
    console.error("[DEVIS API] Error fetching devis:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const firebaseToken = req.cookies.get("firebaseToken")?.value;
    const user = await verifyFirebaseToken(firebaseToken || "");
    const isDev = process.env.NODE_ENV === 'development';

    if (!user && !isDev) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: devisId } = params;
    if (!devisId) {
      return NextResponse.json({ error: "Missing devis ID" }, { status: 400 });
    }

    const body = await req.json();
    const { margin_bet_pct, margin_hazards_pct, items } = body;

    // 1. Update devis margins if provided
    if (margin_bet_pct !== undefined || margin_hazards_pct !== undefined) {
      const updates: string[] = [];
      const params: any[] = [];
      let idx = 1;

      if (margin_bet_pct !== undefined) {
        updates.push(`margin_bet_pct = $${idx++}`);
        params.push(margin_bet_pct);
      }
      if (margin_hazards_pct !== undefined) {
        updates.push(`margin_hazards_pct = $${idx++}`);
        params.push(margin_hazards_pct);
      }

      params.push(devisId);
      await query(
        `UPDATE devis SET ${updates.join(", ")}, updated_at = NOW() WHERE id = $${idx}`,
        params
      );
    }

    // 2. Update individual items in parallel if provided
    if (items && Array.isArray(items)) {
      const itemPromises = items.map(async (item) => {
        const { id: itemId, quantite, prix_unitaire } = item;
        if (!itemId) return;

        let q = quantite;
        let pu = prix_unitaire;

        // Fetch original item to fill missing update values if only one is updated
        if (q === undefined || pu === undefined) {
          const originalRes = await query("SELECT quantite, prix_unitaire FROM devis_items WHERE id = $1", [itemId]);
          if (originalRes.rows.length > 0) {
            const original = originalRes.rows[0];
            if (q === undefined) q = Number(original.quantite);
            if (pu === undefined) pu = Number(original.prix_unitaire);
          }
        }

        const pt = (q || 0) * (pu || 0);

        await query(
          `UPDATE devis_items SET quantite = $1, prix_unitaire = $2, prix_total = $3 WHERE id = $4`,
          [q, pu, pt, itemId]
        );
      });

      await Promise.all(itemPromises);
    }

    // 3. RECALCULATION PIPELINE (Section -> Phase -> Devis -> Echeancier)
    // Fetch full tree to calculate totals cleanly
    const devis = await getFullDevis(devisId);
    if (!devis) {
      return NextResponse.json({ error: "Devis not found for recalculation" }, { status: 404 });
    }

    let devisTotalHt = 0;
    const updates: Promise<any>[] = [];

    // A. Recalculate Sections and Phases totals in memory
    if (devis.devis_phases) {
      for (const phase of devis.devis_phases) {
        let phaseTotal = 0;
        
        if (phase.devis_sections) {
          for (const section of phase.devis_sections) {
            let sectionTotal = 0;
            
            if (section.devis_items) {
              sectionTotal = section.devis_items.reduce((acc: number, item: any) => acc + (Number(item.prix_total) || 0), 0);
            }

            // Update section total in DB if changed
            if (Number(section.montant_total) !== sectionTotal) {
              updates.push(
                query("UPDATE devis_sections SET montant_total = $1 WHERE id = $2", [sectionTotal, section.id])
              );
            }
            phaseTotal += sectionTotal;
          }
        }

        // Update phase total in DB if changed
        if (Number(phase.montant_total) !== phaseTotal) {
          updates.push(
            query("UPDATE devis_phases SET montant_total = $1 WHERE id = $2", [phaseTotal, phase.id])
          );
        }
        devisTotalHt += phaseTotal;
      }
    }

    // B. Calculate new Devis Total TTC
    const betMargin = Number(devis.margin_bet_pct) || 0;
    const hazardsMargin = Number(devis.margin_hazards_pct) || 0;
    const betAmount = Math.round(devisTotalHt * (betMargin / 100));
    const aleasAmount = Math.round(devisTotalHt * (hazardsMargin / 100));
    const totalHtMarges = devisTotalHt + betAmount + aleasAmount;
    const tvaAmount = Math.round(totalHtMarges * 0.1925);
    const devisTotalTtc = totalHtMarges + tvaAmount;

    // Update Devis totals in DB if changed
    if (Number(devis.total_ht) !== devisTotalHt || Number(devis.total_ttc) !== devisTotalTtc) {
      updates.push(
        query(
          "UPDATE devis SET total_ht = $1, total_ttc = $2, updated_at = NOW() WHERE id = $3",
          [devisTotalHt, devisTotalTtc, devisId]
        )
      );
    }

    // C. Recalculate Echeancier (S-Curve) payments based on the new total_ttc
    if (devis.devis_echeancier && devis.devis_echeancier.length > 0) {
      let runningCumule = 0;
      
      const sortedEcheancier = [...devis.devis_echeancier].sort(
        (a: any, b: any) => parseMonthNumber(a.mois) - parseMonthNumber(b.mois)
      );

      for (const forecast of sortedEcheancier) {
        // Compute monthly amount based on execution pct
        const pct = Number(forecast.execution_pct) || 0;
        const monthlyAmt = Math.round(devisTotalTtc * (pct / 100));
        runningCumule += monthlyAmt;

        if (Number(forecast.montant_mensuel) !== monthlyAmt || Number(forecast.montant_cumule) !== runningCumule) {
          updates.push(
            query(
              "UPDATE devis_echeancier SET montant_mensuel = $1, montant_cumule = $2 WHERE id = $3",
              [monthlyAmt, runningCumule, forecast.id]
            )
          );
        }
      }
    }

    // Wait for all database updates to complete in parallel
    if (updates.length > 0) {
      await Promise.all(updates);
    }

    // Fetch the updated devis and return it
    const updatedDevis = await getFullDevis(devisId);
    return NextResponse.json(updatedDevis);

  } catch (error: any) {
    console.error("[DEVIS API] Error updating devis:", error);
    return NextResponse.json(
      { error: "Internal server error during update", details: error.message },
      { status: 500 }
    );
  }
}
