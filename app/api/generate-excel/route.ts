import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { MOCK_RENDER_RESULT } from '@/lib/mock-data';

export async function POST(request: Request) {
  try {
    const { projectId, lines } = await request.json();

    // En vrai, vous feriez une recherche en base avec projectId
    // Ici on utilise lines s'il est fourni, sinon on fallback sur un mock
    const dqeLines = lines || MOCK_RENDER_RESULT.estimate?.lines || [];

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Archi Cam AI';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Détail Quantitatif Estimatif', {
      properties: { tabColor: { argb: 'FFC5A059' } },
      pageSetup: { paperSize: 9, orientation: 'landscape' }
    });

    // --- Header NDA Family Style ---
    sheet.mergeCells('A1:G2');
    const titleCell = sheet.getCell('A1');
    titleCell.value = 'DEVIS QUANTITATIF ESTIMATIF (DQE)';
    titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2A2A2A' } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };

    sheet.mergeCells('A3:G3');
    const subtitleCell = sheet.getCell('A3');
    subtitleCell.value = `Projet: ${projectId || 'PROJET RESIDENTIEL'} - Généré par Archi Cam AI`;
    subtitleCell.font = { name: 'Arial', size: 11, italic: true };
    subtitleCell.alignment = { horizontal: 'center' };

    // Espace
    sheet.addRow([]);

    // --- Colonnes ---
    const headers = ['Code', 'Catégorie', 'Désignation des Ouvrages', 'Unité', 'Quantité', 'Prix Unitaire (FCFA)', 'Prix Total (FCFA)'];
    const headerRow = sheet.addRow(headers);
    
    sheet.columns = [
      { key: 'code', width: 10 },
      { key: 'category', width: 20 },
      { key: 'label', width: 45 },
      { key: 'unit', width: 10 },
      { key: 'quantity', width: 15 },
      { key: 'unitPrice', width: 20 },
      { key: 'totalPrice', width: 25 }
    ];

    headerRow.eachCell((cell, colNumber) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC5A059' } }; // Wood Ocre
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}
      };
    });

    // --- Lignes de données ---
    let startRow = 6;
    dqeLines.forEach((item: any, index: number) => {
      const rowNum = startRow + index;
      const row = sheet.addRow([
        item.code || `L-${index + 1}`,
        item.category || 'Ouvrage',
        item.label,
        item.unit,
        item.quantity,
        item.unitPrice,
        // On ne met PAS item.totalPrice en dur, on met une FORMULE !
        { formula: `E${rowNum}*F${rowNum}`, result: item.quantity * item.unitPrice }
      ]);

      // Formatting
      row.getCell(5).numFmt = '#,##0.00'; // Quantité
      row.getCell(6).numFmt = '#,##0 "FCFA"'; // Prix Unitaire
      row.getCell(7).numFmt = '#,##0 "FCFA"'; // Prix Total

      row.eachCell((cell) => {
        cell.border = {
          top: {style:'thin', color: {argb:'FFE2E8F0'}}, 
          left: {style:'thin', color: {argb:'FFE2E8F0'}}, 
          bottom: {style:'thin', color: {argb:'FFE2E8F0'}}, 
          right: {style:'thin', color: {argb:'FFE2E8F0'}}
        };
      });
      // Alternance de couleur
      if (index % 2 !== 0) {
        row.eachCell((cell) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
        });
      }
    });

    // --- Footer avec Total ---
    const lastRow = startRow + dqeLines.length;
    
    // Total HT
    const totalHtRow = sheet.addRow(['', '', '', '', '', 'Total Travaux HT', { formula: `SUM(G6:G${lastRow - 1})` }]);
    totalHtRow.getCell(6).font = { bold: true };
    totalHtRow.getCell(7).font = { bold: true };
    totalHtRow.getCell(7).numFmt = '#,##0 "FCFA"';

    // TVA (Ex: 19.25%)
    const tvaRow = sheet.addRow(['', '', '', '', '', 'TVA (19.25%)', { formula: `G${lastRow}*0.1925` }]);
    tvaRow.getCell(6).font = { italic: true };
    tvaRow.getCell(7).font = { italic: true };
    tvaRow.getCell(7).numFmt = '#,##0 "FCFA"';

    // Total TTC
    const totalTtcRow = sheet.addRow(['', '', '', '', '', 'TOTAL TTC', { formula: `G${lastRow}+G${lastRow + 1}` }]);
    totalTtcRow.getCell(6).font = { bold: true, size: 12, color: { argb: 'FFC5A059' } };
    totalTtcRow.getCell(7).font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
    totalTtcRow.getCell(7).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2A2A2A' } };
    totalTtcRow.getCell(7).numFmt = '#,##0 "FCFA"';

    // Export en buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // Retourner le fichier
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="Devis_NDA_${projectId || 'Export'}.xlsx"`
      }
    });

  } catch (error) {
    console.error('Erreur lors de la génération Excel:', error);
    return NextResponse.json({ error: 'Failed to generate Excel' }, { status: 500 });
  }
}
