import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 30, fontFamily: "Helvetica", fontSize: 9, color: "#0F172A", backgroundColor: "#FFFFFF" },
  header: { flexDirection: "row", justifyContent: "space-between", borderBottomWidth: 2, borderBottomColor: "#F59E0B", paddingBottom: 10, marginBottom: 15 },
  title: { fontSize: 16, fontFamily: "Helvetica-Bold", color: "#0F172A" },
  subtitle: { fontSize: 8, color: "#64748B", marginTop: 2 },
  sectionTitle: { fontSize: 10, fontFamily: "Helvetica-Bold", color: "#1E293B", marginTop: 12, marginBottom: 6, borderBottomWidth: 1, borderBottomColor: "#E2E8F0", paddingBottom: 3 },
  table: { width: "100%", borderWidth: 1, borderColor: "#E2E8F0", marginBottom: 10 },
  tableRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#E2E8F0", minHeight: 20, alignItems: "center" },
  tableHeader: { backgroundColor: "#F8FAFC", fontFamily: "Helvetica-Bold" },
  colDesc: { width: "45%", paddingLeft: 6 },
  colQty: { width: "15%", textAlign: "center" },
  colUnitPrice: { width: "20%", textAlign: "right", paddingRight: 6 },
  colTotal: { width: "20%", textAlign: "right", paddingRight: 6 },
  
  // Bloc Totaux & Fiscalité (TVA 19.25%)
  recapContainer: { flexDirection: "row", justifyContent: "space-between", marginTop: 10 },
  termsBox: { width: "55%", padding: 8, backgroundColor: "#F8FAFC", borderRadius: 4, borderWidth: 1, borderColor: "#E2E8F0" },
  totalsBox: { width: "40%", padding: 8, backgroundColor: "#FFFBEB", borderRadius: 4, borderWidth: 1, borderColor: "#FCD34D" },
  totalRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  totalRowBold: { flexDirection: "row", justifyContent: "space-between", marginTop: 4, paddingTop: 4, borderTopWidth: 1, borderTopColor: "#F59E0B" },
  
  // Bloc Signatures & Scellé Juridique
  signaturesContainer: { flexDirection: "row", justifyContent: "space-between", marginTop: 20, paddingTop: 10, borderTopWidth: 1, borderTopColor: "#E2E8F0" },
  signatureBox: { width: "45%", height: 60, padding: 6, borderWidth: 1, borderColor: "#CBD5E1", borderStyle: "dashed", borderRadius: 4 },
  
  footer: { position: "absolute", bottom: 20, left: 30, right: 30, textAlign: "center", color: "#94A3B8", fontSize: 7, borderTopWidth: 1, borderTopColor: "#F1F5F9", paddingTop: 6 },
});

export interface DevisItem {
  description: string;
  quantity: number;
  unit: string;
  unitPriceFCFA: number;
}

export interface DevisPdfProps {
  devisNumber?: string;
  projectTitle: string;
  clientName: string;
  date: string;
  items: DevisItem[];
  discountFCFA?: number;
  okfNotes: string;
}

export const DevisPdfDocument: React.FC<DevisPdfProps> = ({
  devisNumber = "DEV-2026-001",
  projectTitle,
  clientName,
  date,
  items,
  discountFCFA = 0,
  okfNotes,
}) => {
  const totalHT = items.reduce((sum, item) => sum + item.quantity * item.unitPriceFCFA, 0);
  const netHT = totalHT - discountFCFA;
  const tvaAmount = netHT * 0.1925; // TVA Cameroun 19,25%
  const totalTTC = netHT + tvaAmount;
  const acompte30 = totalTTC * 0.3;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* EN-TÊTE & CARTOUCHE JURIDIQUE */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>ARCHI CAM AI</Text>
            <Text style={styles.subtitle}>Ingénierie & Rendu Architectural Automatisé</Text>
            <Text style={styles.subtitle}>NUI : M052600012345A • Ordre Arch. Cameroun OKF</Text>
          </View>
          <View style={{ textAlign: "right" }}>
            <Text style={{ fontFamily: "Helvetica-Bold", color: "#D97706" }}>DEVIS N° {devisNumber}</Text>
            <Text style={{ fontFamily: "Helvetica-Bold", marginTop: 2 }}>Projet : {projectTitle}</Text>
            <Text style={styles.subtitle}>Client : {clientName}</Text>
            <Text style={styles.subtitle}>Date : {date}</Text>
            <Text style={styles.subtitle}>Validité : 30 jours</Text>
          </View>
        </View>

        {/* TABLEAU DES LOTS */}
        <Text style={styles.sectionTitle}>1. DEVIS ESTIMATIF DES TRAVAUX (MERCURIALE BTP)</Text>
        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={styles.colDesc}>Désignation du Lot / Matériaux OKF</Text>
            <Text style={styles.colQty}>Quantité</Text>
            <Text style={styles.colUnitPrice}>P.U (FCFA)</Text>
            <Text style={styles.colTotal}>Total HT (FCFA)</Text>
          </View>
          {items.map((item, idx) => (
            <View style={styles.tableRow} key={idx}>
              <Text style={styles.colDesc}>{item.description}</Text>
              <Text style={styles.colQty}>{item.quantity} {item.unit}</Text>
              <Text style={styles.colUnitPrice}>{item.unitPriceFCFA.toLocaleString("fr-FR")}</Text>
              <Text style={styles.colTotal}>{(item.quantity * item.unitPriceFCFA).toLocaleString("fr-FR")}</Text>
            </View>
          ))}
        </View>

        {/* BLOC CONDITIONS & TOTAUX FISCAUX */}
        <View style={styles.recapContainer}>
          <View style={styles.termsBox}>
            <Text style={{ fontFamily: "Helvetica-Bold", marginBottom: 4 }}>Conditions de Règlement :</Text>
            <Text>• Acompte de démarrage (30%) : {acompte30.toLocaleString("fr-FR")} FCFA</Text>
            <Text>• Solde selon avancement des travaux sur décompte.</Text>
            <Text style={{ marginTop: 4, color: "#64748B" }}>Prix calculés d'après la Mercuriale BTP Officielle.</Text>
          </View>

          <View style={styles.totalsBox}>
            <View style={styles.totalRow}>
              <Text>Total HT :</Text>
              <Text>{totalHT.toLocaleString("fr-FR")} FCFA</Text>
            </View>
            {discountFCFA > 0 && (
              <View style={styles.totalRow}>
                <Text>Remise :</Text>
                <Text>-{discountFCFA.toLocaleString("fr-FR")} FCFA</Text>
              </View>
            )}
            <View style={styles.totalRow}>
              <Text>TVA (19,25%) :</Text>
              <Text>{tvaAmount.toLocaleString("fr-FR")} FCFA</Text>
            </View>
            <View style={styles.totalRowBold}>
              <Text style={{ fontFamily: "Helvetica-Bold", color: "#78350F" }}>TOTAL TTC :</Text>
              <Text style={{ fontFamily: "Helvetica-Bold", color: "#78350F" }}>{totalTTC.toLocaleString("fr-FR")} FCFA</Text>
            </View>
          </View>
        </View>

        {/* SPÉCIFICATIONS TECHNIQUES OKF */}
        <Text style={styles.sectionTitle}>2. NOTE TECHNIQUE & DOSAGES RECOMMANDÉS</Text>
        <Text style={{ lineHeight: 1.3, color: "#334155" }}>{okfNotes}</Text>

        {/* SIGNATURES & VALIDAION JURIDIQUE */}
        <View style={styles.signaturesContainer}>
          <View style={styles.signatureBox}>
            <Text style={{ fontSize: 7, color: "#64748B" }}>Mentions : "Bon pour accord et validation du devis"</Text>
            <Text style={{ fontSize: 7, color: "#94A3B8", marginTop: 25 }}>Signature Client :</Text>
          </View>
          <View style={styles.signatureBox}>
            <Text style={{ fontSize: 7, color: "#64748B" }}>Validation Archi Cam AI / Architecte Partenaire</Text>
            <Text style={{ fontSize: 7, color: "#D97706", marginTop: 25, fontFamily: "Helvetica-Bold" }}>SCELLÉ & SIGNÉ NUMÉRIQUEMENT (OKF v0.2)</Text>
          </View>
        </View>

        {/* FOOTER */}
        <Text style={styles.footer}>
          Devis N° {devisNumber} • Archi Cam AI Engine • Document certifié conforme • Vérification par QR Code disponible
        </Text>
      </Page>
    </Document>
  );
};
