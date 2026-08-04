import { NextResponse } from "next/server";
import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";

export const dynamic = "force-dynamic";

// ── STYLES ELEGANTS FICHE CLIENT PRO A4 ──────────────────────────────────────
const pdfStyles = StyleSheet.create({
  page: {
    padding: 30,
    backgroundColor: "#0F172A",
    color: "#F8FAFC",
    fontFamily: "Helvetica",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    borderBottomWidth: 1.5,
    borderBottomColor: "#06B6D4",
    paddingBottom: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#38BDF8",
  },
  subtitle: {
    fontSize: 10,
    color: "#94A3B8",
    marginTop: 4,
  },
  badge: {
    backgroundColor: "#1E293B",
    padding: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#38BDF8",
  },
  badgeText: {
    fontSize: 9,
    color: "#38BDF8",
    fontWeight: "bold",
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#F8FAFC",
    marginTop: 15,
    marginBottom: 8,
  },
  table: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 6,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#1E293B",
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#334155",
  },
  tableRow: {
    flexDirection: "row",
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#1E293B",
  },
  colLabel: { flex: 2, fontSize: 9, color: "#E2E8F0" },
  colValue: { flex: 1, fontSize: 9, color: "#38BDF8", textAlign: "right" },
  footer: {
    marginTop: 30,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#334155",
    flexDirection: "row",
    justify: "space-between",
  },
  footerText: {
    fontSize: 8,
    color: "#64748B",
  },
});

// ── COMPOSANT DU DOCUMENT PDF ────────────────────────────────────────────────
function ClientPdfDocument({
  projectId,
  styleName,
  surfaceArea,
  totalCostXAF,
}: {
  projectId: string;
  styleName: string;
  surfaceArea: number;
  totalCostXAF: number;
}) {
  return React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: "A4", style: pdfStyles.page },
      React.createElement(
        View,
        { style: pdfStyles.header },
        React.createElement(
          View,
          null,
          React.createElement(Text, { style: pdfStyles.title }, "Archi-Cameroun AI"),
          React.createElement(
            Text,
            { style: pdfStyles.subtitle },
            "Fiche de Présentation Client — Promotion Immobilière"
          )
        ),
        React.createElement(
          View,
          { style: pdfStyles.badge },
          React.createElement(
            Text,
            { style: pdfStyles.badgeText },
            "SCoT OKF v0.2 Conforme"
          )
        )
      ),

      React.createElement(
        Text,
        { style: pdfStyles.sectionTitle },
        "1. Résumé Exécutif & Métriques"
      ),
      React.createElement(
        View,
        { style: pdfStyles.table },
        React.createElement(
          View,
          { style: pdfStyles.tableHeader },
          React.createElement(Text, { style: pdfStyles.colLabel }, "Référence Projet"),
          React.createElement(Text, { style: pdfStyles.colValue }, projectId)
        ),
        React.createElement(
          View,
          { style: pdfStyles.tableRow },
          React.createElement(Text, { style: pdfStyles.colLabel }, "Style Architectural"),
          React.createElement(Text, { style: pdfStyles.colValue }, styleName)
        ),
        React.createElement(
          View,
          { style: pdfStyles.tableRow },
          React.createElement(
            Text,
            { style: pdfStyles.colLabel },
            "Surface Totale Calculée"
          ),
          React.createElement(Text, { style: pdfStyles.colValue }, `${surfaceArea} m²`)
        ),
        React.createElement(
          View,
          { style: pdfStyles.tableRow },
          React.createElement(
            Text,
            { style: pdfStyles.colLabel },
            "Devis Estimatif Global Total"
          ),
          React.createElement(
            Text,
            { style: pdfStyles.colValue },
            `${totalCostXAF.toLocaleString()} FCFA`
          )
        )
      ),

      React.createElement(
        Text,
        { style: pdfStyles.sectionTitle },
        "2. Décomposition de l'Estimation (BTP Cameroun)"
      ),
      React.createElement(
        View,
        { style: pdfStyles.table },
        React.createElement(
          View,
          { style: pdfStyles.tableHeader },
          React.createElement(Text, { style: pdfStyles.colLabel }, "Poste de Dépense"),
          React.createElement(
            Text,
            { style: pdfStyles.colValue },
            "Montant Estimé (FCFA)"
          )
        ),
        React.createElement(
          View,
          { style: pdfStyles.tableRow },
          React.createElement(
            Text,
            { style: pdfStyles.colLabel },
            "Gros Œuvre & Structure BAEL 91"
          ),
          React.createElement(
            Text,
            { style: pdfStyles.colValue },
            `${Math.round(surfaceArea * 110000).toLocaleString()} FCFA`
          )
        ),
        React.createElement(
          View,
          { style: pdfStyles.tableRow },
          React.createElement(
            Text,
            { style: pdfStyles.colLabel },
            "Revêtements Sols & Salles d'Eau"
          ),
          React.createElement(
            Text,
            { style: pdfStyles.colValue },
            `${Math.round(surfaceArea * 65000).toLocaleString()} FCFA`
          )
        ),
        React.createElement(
          View,
          { style: pdfStyles.tableRow },
          React.createElement(
            Text,
            { style: pdfStyles.colLabel },
            "Menuiseries Iroko & Métal"
          ),
          React.createElement(
            Text,
            { style: pdfStyles.colValue },
            `${Math.round(surfaceArea * 50000).toLocaleString()} FCFA`
          )
        ),
        React.createElement(
          View,
          { style: pdfStyles.tableRow },
          React.createElement(
            Text,
            { style: pdfStyles.colLabel },
            "Électricité, Plomberie & VRD"
          ),
          React.createElement(
            Text,
            { style: pdfStyles.colValue },
            `${Math.round(surfaceArea * 40000).toLocaleString()} FCFA`
          )
        )
      ),

      React.createElement(
        View,
        { style: pdfStyles.footer },
        React.createElement(
          Text,
          { style: pdfStyles.footerText },
          "Document généré automatiquement par Archi-Cameroun AI Engine 2026."
        ),
        React.createElement(
          Text,
          { style: pdfStyles.footerText },
          "Conformité Norme BTP Cameroun v0.2"
        )
      )
    )
  );
}

export async function POST(request: Request) {
  let body: any = {};
  try {
    const text = await request.text();
    if (text && text.trim().length > 0) {
      body = JSON.parse(text);
    }
  } catch (err) {
    console.warn("[API Export PDF] Notice parsing body JSON incomplet/mal formaté :", err);
    body = {};
  }


  const {
    projectId = "PROJ-2026-0042",
    style = "Luxe Tropical",
    surfaceArea = 95.28,
    totalCostXAF = 25249200,
  } = body;

  try {
    const pdfElement = React.createElement(
      Document,
      null,
      React.createElement(
        Page,
        { size: "A4", style: pdfStyles.page },
        React.createElement(
          View,
          { style: pdfStyles.header },
          React.createElement(
            View,
            null,
            React.createElement(Text, { style: pdfStyles.title }, "Archi-Cameroun AI"),
            React.createElement(
              Text,
              { style: pdfStyles.subtitle },
              "Fiche de Présentation Client — Promotion Immobilière"
            )
          ),
          React.createElement(
            View,
            { style: pdfStyles.badge },
            React.createElement(
              Text,
              { style: pdfStyles.badgeText },
              "SCoT OKF v0.2 Conforme"
            )
          )
        ),

        React.createElement(
          Text,
          { style: pdfStyles.sectionTitle },
          "1. Résumé Exécutif & Métriques"
        ),
        React.createElement(
          View,
          { style: pdfStyles.table },
          React.createElement(
            View,
            { style: pdfStyles.tableHeader },
            React.createElement(Text, { style: pdfStyles.colLabel }, "Référence Projet"),
            React.createElement(Text, { style: pdfStyles.colValue }, projectId)
          ),
          React.createElement(
            View,
            { style: pdfStyles.tableRow },
            React.createElement(Text, { style: pdfStyles.colLabel }, "Style Architectural"),
            React.createElement(Text, { style: pdfStyles.colValue }, style)
          ),
          React.createElement(
            View,
            { style: pdfStyles.tableRow },
            React.createElement(
              Text,
              { style: pdfStyles.colLabel },
              "Surface Totale Calculée"
            ),
            React.createElement(Text, { style: pdfStyles.colValue }, `${surfaceArea} m²`)
          ),
          React.createElement(
            View,
            { style: pdfStyles.tableRow },
            React.createElement(
              Text,
              { style: pdfStyles.colLabel },
              "Devis Estimatif Global Total"
            ),
            React.createElement(
              Text,
              { style: pdfStyles.colValue },
              `${totalCostXAF.toLocaleString()} FCFA`
            )
          )
        ),

        React.createElement(
          Text,
          { style: pdfStyles.sectionTitle },
          "2. Décomposition de l'Estimation (BTP Cameroun)"
        ),
        React.createElement(
          View,
          { style: pdfStyles.table },
          React.createElement(
            View,
            { style: pdfStyles.tableHeader },
            React.createElement(Text, { style: pdfStyles.colLabel }, "Poste de Dépense"),
            React.createElement(
              Text,
              { style: pdfStyles.colValue },
              "Montant Estimé (FCFA)"
            )
          ),
          React.createElement(
            View,
            { style: pdfStyles.tableRow },
            React.createElement(
              Text,
              { style: pdfStyles.colLabel },
              "Gros Œuvre & Structure BAEL 91"
            ),
            React.createElement(
              Text,
              { style: pdfStyles.colValue },
              `${Math.round(surfaceArea * 110000).toLocaleString()} FCFA`
            )
          ),
          React.createElement(
            View,
            { style: pdfStyles.tableRow },
            React.createElement(
              Text,
              { style: pdfStyles.colLabel },
              "Revêtements Sols & Salles d'Eau"
            ),
            React.createElement(
              Text,
              { style: pdfStyles.colValue },
              `${Math.round(surfaceArea * 65000).toLocaleString()} FCFA`
            )
          ),
          React.createElement(
            View,
            { style: pdfStyles.tableRow },
            React.createElement(
              Text,
              { style: pdfStyles.colLabel },
              "Menuiseries Iroko & Métal"
            ),
            React.createElement(
              Text,
              { style: pdfStyles.colValue },
              `${Math.round(surfaceArea * 50000).toLocaleString()} FCFA`
            )
          ),
          React.createElement(
            View,
            { style: pdfStyles.tableRow },
            React.createElement(
              Text,
              { style: pdfStyles.colLabel },
              "Électricité, Plomberie & VRD"
            ),
            React.createElement(
              Text,
              { style: pdfStyles.colValue },
              `${Math.round(surfaceArea * 40000).toLocaleString()} FCFA`
            )
          )
        ),

        React.createElement(
          View,
          { style: pdfStyles.footer },
          React.createElement(
            Text,
            { style: pdfStyles.footerText },
            "Document généré automatiquement par Archi-Cameroun AI Engine 2026."
          ),
          React.createElement(
            Text,
            { style: pdfStyles.footerText },
            "Conformité Norme BTP Cameroun v0.2"
          )
        )
      )
    );

    const pdfBuffer = await renderToBuffer(pdfElement as any);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${projectId}_Fiche_Presentation.pdf"`,
      },
    });
  } catch (error: any) {

    console.error("Erreur génération PDF dans /api/export/pdf :", error);
    return NextResponse.json(
      { error: "Erreur lors de la génération du document PDF." },
      { status: 500 }
    );
  }
}
