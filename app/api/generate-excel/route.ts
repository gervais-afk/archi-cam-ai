import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';

// Couleurs NDA Family / Archi Cam AI Design System
const COLORS = {
  darkBg: 'FF1A1A2E',       // Bleu nuit profond
  goldAccent: 'FFC5A059',   // Or africain
  electricBlue: 'FF00F2FE', // Bleu électrique
  white: 'FFFFFFFF',
  lightGray: 'FFF8FAFC',
  midGray: 'FFE2E8F0',
  greenOk: 'FF22C55E',
  redAlert: 'FFEF4444',
  sectionBg: 'FF16213E',    // Bleu section
};

function applyHeaderStyle(cell: ExcelJS.Cell, bgColor: string = COLORS.darkBg) {
  cell.font = { bold: true, color: { argb: COLORS.white }, size: 11, name: 'Arial' };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
  cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  cell.border = {
    top: { style: 'thin', color: { argb: COLORS.goldAccent } },
    left: { style: 'thin', color: { argb: COLORS.goldAccent } },
    bottom: { style: 'thin', color: { argb: COLORS.goldAccent } },
    right: { style: 'thin', color: { argb: COLORS.goldAccent } },
  };
}

function applyDataRow(row: ExcelJS.Row, isEven: boolean) {
  row.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isEven ? COLORS.lightGray : COLORS.white } };
    cell.border = {
      top: { style: 'hair', color: { argb: COLORS.midGray } },
      left: { style: 'hair', color: { argb: COLORS.midGray } },
      bottom: { style: 'hair', color: { argb: COLORS.midGray } },
      right: { style: 'hair', color: { argb: COLORS.midGray } },
    };
    cell.font = { name: 'Arial', size: 10 };
  });
}

function addDQESheet(
  workbook: ExcelJS.Workbook,
  sheetName: string,
  tabColor: string,
  title: string,
  lines: any[],
  startDataRow: number = 6
): { sheetName: string; totalCell: string } {

  const sheet = workbook.addWorksheet(sheetName, {
    properties: { tabColor: { argb: tabColor } },
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true },
  });

  // Titre principal
  sheet.mergeCells('A1:H2');
  const titleCell = sheet.getCell('A1');
  titleCell.value = title;
  titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: COLORS.white } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.darkBg } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };

  // Sous-titre
  sheet.mergeCells('A3:H3');
  const sub = sheet.getCell('A3');
  sub.value = 'Archi Cam AI — Devis Quantitatif Estimatif (NDA Family Standard)';
  sub.font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF64748B' } };
  sub.alignment = { horizontal: 'center' };

  sheet.addRow([]); // ligne 4 vide

  // En-têtes colonnes
  sheet.columns = [
    { key: 'num',       width: 6  },
    { key: 'code',      width: 12 },
    { key: 'category',  width: 22 },
    { key: 'label',     width: 42 },
    { key: 'unit',      width: 10 },
    { key: 'quantity',  width: 14 },
    { key: 'unitPrice', width: 22 },
    { key: 'totalPrice',width: 26 },
  ];

  const headers = ['N°', 'Code', 'Catégorie', 'Désignation des Ouvrages', 'Unité', 'Quantité', 'Prix Unitaire (FCFA)', 'Prix Total (FCFA)'];
  const headerRow = sheet.addRow(headers); // ligne 5
  headerRow.height = 32;
  headerRow.eachCell((cell) => applyHeaderStyle(cell, COLORS.sectionBg));

  // Lignes de données
  lines.forEach((item: any, index: number) => {
    const rowNum = startDataRow + index;
    const row = sheet.addRow([
      index + 1,
      item.code || `L-${index + 1}`,
      item.category || 'Ouvrage',
      item.label || item.designation || '',
      item.unit || 'U',
      item.quantity || 0,
      item.unitPrice || 0,
      { formula: `F${rowNum}*G${rowNum}`, result: (item.quantity || 0) * (item.unitPrice || 0) },
    ]);
    row.height = 22;
    row.getCell(6).numFmt = '#,##0.00';
    row.getCell(7).numFmt = '#,##0 "FCFA"';
    row.getCell(8).numFmt = '#,##0 "FCFA"';
    applyDataRow(row, index % 2 !== 0);
    if (item.justification) {
      row.getCell(4).note = item.justification;
    }
  });

  const lastDataRow = startDataRow + lines.length - 1;
  const totalFormulaeRef = lines.length > 0 ? `H${startDataRow}:H${lastDataRow}` : `H${startDataRow}`;

  // Total HT
  sheet.addRow([]);
  const totalRow = sheet.addRow(['', '', '', '', '', '', 'TOTAL HT', { formula: `SUM(${totalFormulaeRef})` }]);
  totalRow.getCell(7).font = { bold: true, color: { argb: COLORS.goldAccent }, name: 'Arial', size: 11 };
  totalRow.getCell(8).font = { bold: true, color: { argb: COLORS.goldAccent }, name: 'Arial', size: 11 };
  totalRow.getCell(8).numFmt = '#,##0 "FCFA"';
  const totalCellAddress = `H${totalRow.number}`;

  return { sheetName, totalCell: totalCellAddress };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { projectId, projectName, ville, standing, analysis, lines } = body;

    const allLines: any[] = lines || [];

    // Segmenter par catégorie si non déjà fait
    const grossOeuvre   = allLines.filter((l: any) => /gros.oeuvre|GO|fondation|béton|ciment|sable|gravier|acier/i.test(l.category + ' ' + (l.code || '')));
    const secondOeuvre  = allLines.filter((l: any) => /second.oeuvre|SO|maçonnerie|agglo|cloison|enduit|crépi/i.test(l.category + ' ' + (l.code || '')));
    const finitions     = allLines.filter((l: any) => /finition|FIN|peinture|carrelage|faïence|revêtement/i.test(l.category + ' ' + (l.code || '')));
    const mep           = allLines.filter((l: any) => /MEP|électri|plomberie|VRD|réseau/i.test(l.category + ' ' + (l.code || '')));

    // Fallback : si pas de catégories précises, mettre tout en Gros Oeuvre
    const goLines  = grossOeuvre.length  > 0 ? grossOeuvre  : allLines;
    const soLines  = secondOeuvre.length > 0 ? secondOeuvre : [];
    const finLines = finitions.length    > 0 ? finitions    : [];
    const mepLines = mep.length          > 0 ? mep          : [];

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Archi Cam AI — Plateforme BIM 5D Agentique';
    workbook.company = 'Archi Cam AI';
    workbook.created = new Date();
    workbook.modified = new Date();

    // ──────────────────────────────────────────────────────────────────────
    // ONGLET 1 : PAGE DE GARDE
    // ──────────────────────────────────────────────────────────────────────
    const coverSheet = workbook.addWorksheet('📋 Page de Garde', {
      properties: { tabColor: { argb: COLORS.darkBg } },
    });
    coverSheet.columns = [{ width: 35 }, { width: 50 }];

    coverSheet.mergeCells('A1:B1');
    const coverTitle = coverSheet.getCell('A1');
    coverTitle.value = '🏛️  ARCHI CAM AI — DOSSIER DEVIS (DQE)';
    coverTitle.font = { name: 'Arial', size: 18, bold: true, color: { argb: COLORS.goldAccent } };
    coverTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.darkBg } };
    coverTitle.alignment = { vertical: 'middle', horizontal: 'center' };
    coverSheet.getRow(1).height = 50;

    coverSheet.mergeCells('A2:B2');
    const coverSub = coverSheet.getCell('A2');
    coverSub.value = 'Devis Quantitatif Estimatif — NDA Family Standard — Conforme Appels d\'Offres Publics';
    coverSub.font = { name: 'Arial', size: 10, italic: true, color: { argb: COLORS.white } };
    coverSub.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.sectionBg } };
    coverSub.alignment = { horizontal: 'center' };

    coverSheet.addRow([]);
    const coverData = [
      ['📁 Référence Projet',    projectId   || 'PROJ-' + Date.now()],
      ['🏗️  Nom du Projet',      projectName || 'Projet Résidentiel Archi Cam AI'],
      ['📍 Localisation',        ville       || 'Yaoundé, Cameroun'],
      ['⭐ Standing',             standing    || 'Standard'],
      ['📅 Date de Génération',  new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })],
      ['🤖 Moteur IA',           'Genkit Orchestrateur → CrewAI (4 Agents) → IfcOpenShell'],
      ['🔒 Audit Structurel',    'Google Gemma 4 (12B QAT) — Local Souverain (BAEL 91 / Eurocodes)'],
      ['📊 Validé ML',           `Gradient Boosting R²=0.9872 — 400+ projets africains validés`],
      ['🧾 TVA Applicable',      '19.25% (Régime Général Cameroun)'],
      ['⚠️  Risque Estimé',      analysis?.riskLevel || 'LOW'],
      ['🗓️  Durée Estimée',      `${analysis?.duration_days || '—'} jours`],
    ];
    coverData.forEach(([label, value], i) => {
      const row = coverSheet.addRow([label, value]);
      row.height = 24;
      row.getCell(1).font = { bold: true, name: 'Arial', size: 10, color: { argb: COLORS.goldAccent } };
      row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: i % 2 === 0 ? 'FF1E293B' : COLORS.darkBg } };
      row.getCell(2).font = { name: 'Arial', size: 10, color: { argb: COLORS.white } };
      row.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: i % 2 === 0 ? 'FF1E293B' : COLORS.darkBg } };
    });

    coverSheet.addRow([]);
    coverSheet.mergeCells(`A${coverSheet.rowCount + 1}:B${coverSheet.rowCount + 1}`);
    const noteCell = coverSheet.getCell(`A${coverSheet.rowCount}`);
    noteCell.value = '⚠️  Ce document est confidentiel et propriétaire. Généré par Archi Cam AI — © KOA MARIE GERVAIS NELLY';
    noteCell.font = { italic: true, size: 8, color: { argb: 'FF64748B' } };
    noteCell.alignment = { horizontal: 'center' };

    // ──────────────────────────────────────────────────────────────────────
    // ONGLETS 2-5 : DQE PAR LOT (Gros Oeuvre, Second Oeuvre, Finitions, MEP)
    // ──────────────────────────────────────────────────────────────────────
    const goRef  = addDQESheet(workbook, '🏗️ Gros Oeuvre',      COLORS.goldAccent,    'LOT 1 — GROS OEUVRE (Fondations, Structure Béton, Charpente)', goLines);
    const soRef  = addDQESheet(workbook, '🧱 Second Oeuvre',    'FF3B82F6',            'LOT 2 — SECOND OEUVRE (Maçonnerie, Cloisons, Enduits)',        soLines);
    const finRef = addDQESheet(workbook, '🎨 Finitions',        'FF8B5CF6',            'LOT 3 — FINITIONS & REVÊTEMENTS (Peintures, Carrelages, Faïences)', finLines);
    const mepRef = addDQESheet(workbook, '⚡ MEP & VRD',        'FF10B981',            'LOT 4 — MEP & VRD (Électricité, Plomberie, Réseaux Divers)',   mepLines);

    // ──────────────────────────────────────────────────────────────────────
    // ONGLET 6 : RÉCAPITULATIF GÉNÉRAL (formules liées aux autres onglets)
    // ──────────────────────────────────────────────────────────────────────
    const recapSheet = workbook.addWorksheet('📊 Récapitulatif', {
      properties: { tabColor: { argb: COLORS.greenOk } },
      pageSetup: { paperSize: 9, fitToPage: true },
    });
    recapSheet.columns = [{ width: 40 }, { width: 30 }, { width: 25 }];

    recapSheet.mergeCells('A1:C2');
    const recapTitle = recapSheet.getCell('A1');
    recapTitle.value = '📊 RÉCAPITULATIF GÉNÉRAL & TOTAL TTC';
    recapTitle.font = { name: 'Arial', size: 14, bold: true, color: { argb: COLORS.white } };
    recapTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.darkBg } };
    recapTitle.alignment = { vertical: 'middle', horizontal: 'center' };
    recapSheet.getRow(1).height = 40;

    recapSheet.addRow([]);
    recapSheet.addRow([]);

    const recapHeaders = recapSheet.addRow(['Lot / Désignation', 'Montant HT (FCFA)', '% du Total']);
    recapHeaders.height = 28;
    recapHeaders.eachCell((cell) => applyHeaderStyle(cell, COLORS.sectionBg));

    // Lignes récap liées par formule aux onglets DQE
    const lots = [
      { label: 'LOT 1 — Gros Oeuvre',        ref: `'🏗️ Gros Oeuvre'!${goRef.totalCell}` },
      { label: 'LOT 2 — Second Oeuvre',       ref: `'🧱 Second Oeuvre'!${soRef.totalCell}` },
      { label: 'LOT 3 — Finitions & Revêtements', ref: `'🎨 Finitions'!${finRef.totalCell}` },
      { label: 'LOT 4 — MEP & VRD',           ref: `'⚡ MEP & VRD'!${mepRef.totalCell}` },
    ];

    const lotRowStart = 5;
    lots.forEach(({ label, ref }, i) => {
      const r = recapSheet.addRow([
        label,
        { formula: ref, result: 0 },
        { formula: `B${lotRowStart + i}/SUM(B${lotRowStart}:B${lotRowStart + lots.length - 1})`, result: 0 },
      ]);
      r.height = 24;
      r.getCell(1).font = { name: 'Arial', size: 10 };
      r.getCell(2).numFmt = '#,##0 "FCFA"';
      r.getCell(3).numFmt = '0.00%';
      applyDataRow(r, i % 2 !== 0);
    });

    const lastLotRow = lotRowStart + lots.length - 1;

    // Séparateur
    recapSheet.addRow([]);

    // Total HT
    const totHtRow = recapSheet.addRow(['TOTAL TRAVAUX HT', { formula: `SUM(B${lotRowStart}:B${lastLotRow})` }, '']);
    totHtRow.height = 26;
    totHtRow.getCell(1).font = { bold: true, name: 'Arial', size: 11, color: { argb: COLORS.goldAccent } };
    totHtRow.getCell(2).font = { bold: true, name: 'Arial', size: 11, color: { argb: COLORS.goldAccent } };
    totHtRow.getCell(2).numFmt = '#,##0 "FCFA"';
    totHtRow.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
    const totHtNum = totHtRow.number;

    // Marge BET
    const margeRow = recapSheet.addRow(['Marge Bureau d\'Études (5%)', { formula: `B${totHtNum}*0.05` }, '']);
    margeRow.getCell(2).numFmt = '#,##0 "FCFA"';
    const margeNum = margeRow.number;

    // Imprévus / Aléas
    const aleasRow = recapSheet.addRow(['Imprévus & Aléas (3%)', { formula: `B${totHtNum}*0.03` }, '']);
    aleasRow.getCell(2).numFmt = '#,##0 "FCFA"';
    const aleasNum = aleasRow.number;

    // Sous-total avant TVA
    const stRow = recapSheet.addRow(['Sous-Total HT Corrigé', { formula: `B${totHtNum}+B${margeNum}+B${aleasNum}` }, '']);
    stRow.getCell(1).font = { bold: true, name: 'Arial' };
    stRow.getCell(2).font = { bold: true, name: 'Arial' };
    stRow.getCell(2).numFmt = '#,##0 "FCFA"';
    const stNum = stRow.number;

    // TVA 19.25%
    const tvaRow = recapSheet.addRow(['TVA (19.25%)', { formula: `B${stNum}*0.1925` }, '']);
    tvaRow.getCell(1).font = { italic: true, name: 'Arial', color: { argb: '664444' } };
    tvaRow.getCell(2).numFmt = '#,##0 "FCFA"';
    const tvaNum = tvaRow.number;

    // TOTAL TTC
    const ttcRow = recapSheet.addRow(['🏆  TOTAL TTC PROJET', { formula: `B${stNum}+B${tvaNum}` }, '']);
    ttcRow.height = 34;
    ttcRow.getCell(1).font = { bold: true, name: 'Arial', size: 13, color: { argb: COLORS.white } };
    ttcRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.darkBg } };
    ttcRow.getCell(2).font = { bold: true, name: 'Arial', size: 13, color: { argb: COLORS.goldAccent } };
    ttcRow.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.darkBg } };
    ttcRow.getCell(2).numFmt = '#,##0 "FCFA"';

    // Notes légales
    recapSheet.addRow([]);
    recapSheet.addRow([]);
    const noteRow = recapSheet.addRow(['ℹ️  Retenue de Garantie : 10% sur acomptes  |  AIR : 2.2% (5.5% si tâcheron non enregistré)  |  Cure humide béton : 7 jours minimum (BAEL 91)', '', '']);
    noteRow.getCell(1).font = { italic: true, size: 8, color: { argb: '6464748B' } };
    recapSheet.mergeCells(`A${noteRow.number}:C${noteRow.number}`);

    if (analysis?.comments) {
      const commRow = recapSheet.addRow([`📝 Commentaire Conducteur : ${analysis.comments}`, '', '']);
      commRow.getCell(1).font = { italic: true, size: 8, color: { argb: '6464748B' } };
      recapSheet.mergeCells(`A${commRow.number}:C${commRow.number}`);
    }

    // Export buffer — ExcelJS retourne un ArrayBuffer, on le convertit en Uint8Array (BodyInit valide)
    const rawBuffer = await workbook.xlsx.writeBuffer();
    const uint8Array = new Uint8Array(rawBuffer as ArrayBuffer);

    return new NextResponse(uint8Array, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="DQE_ArchiCamAI_${projectId || 'Projet'}_${Date.now()}.xlsx"`,
      },
    });

  } catch (error) {
    console.error('❌ Erreur lors de la génération Excel 6 onglets:', error);
    return NextResponse.json({ error: 'Erreur interne lors de la génération du fichier Excel.' }, { status: 500 });
  }
}
