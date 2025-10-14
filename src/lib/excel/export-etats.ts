import ExcelJS from 'exceljs';
import { 
  createWorkbook, 
  formatHeaderRow, 
  formatDataRow, 
  formatCurrencyCell, 
  addTotalRow,
  generateFilename,
  type ChantierInfo,
  type EtatAvancementInfo,
  type LigneEtatInfo
} from './excel-utils';

export interface ExportEtatOptions {
  chantierInfo: ChantierInfo;
  etatInfo: EtatAvancementInfo;
  lignesEtat: LigneEtatInfo[];
}

/**
 * Exporte un état d'avancement en fichier Excel
 */
export async function exportEtatToExcel(options: ExportEtatOptions): Promise<Buffer> {
  const { chantierInfo, etatInfo, lignesEtat } = options;
  
  // Créer le workbook
  const workbook = createWorkbook({
    filename: generateFilename('Etat', chantierInfo.chantierId, etatInfo.numeroEtat),
    title: `État d'avancement ${etatInfo.numeroEtat}`,
    subtitle: `Chantier: ${chantierInfo.nomChantier}`
  });

  // Onglet 1: Informations générales
  const infoSheet = workbook.addWorksheet('Informations');
  await createInfoSheet(infoSheet, chantierInfo, etatInfo);

  // Onglet 2: Lignes d'avancement
  const lignesSheet = workbook.addWorksheet('Lignes d\'avancement');
  await createLignesSheet(lignesSheet, lignesEtat, etatInfo.total);

  // Générer le buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

/**
 * Crée l'onglet des informations générales
 */
async function createInfoSheet(
  worksheet: ExcelJS.Worksheet, 
  chantierInfo: ChantierInfo, 
  etatInfo: EtatAvancementInfo
) {
  // Titre
  worksheet.getCell('A1').value = 'INFORMATIONS DE L\'ÉTAT D\'AVANCEMENT';
  worksheet.getCell('A1').font = { bold: true, size: 16 };
  worksheet.getCell('A1').fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF8B5CF6' } // Violet
  };
  worksheet.getCell('A1').font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
  worksheet.mergeCells('A1:B1');

  let currentRow = 3;

  // Informations chantier
  worksheet.getCell(`A${currentRow}`).value = 'CHANTIER';
  worksheet.getCell(`A${currentRow}`).font = { bold: true };
  worksheet.getCell(`A${currentRow}`).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF3F4F6' }
  };
  currentRow++;

  const chantierData = [
    ['Nom du chantier', chantierInfo.nomChantier],
    ['ID Chantier', chantierInfo.chantierId],
    ['Client', chantierInfo.clientNom || 'Non spécifié'],
    ['Adresse', chantierInfo.adresse || 'Non spécifiée']
  ];

  chantierData.forEach(([label, value]) => {
    worksheet.getCell(`A${currentRow}`).value = label;
    worksheet.getCell(`A${currentRow}`).font = { bold: true };
    worksheet.getCell(`B${currentRow}`).value = value;
    currentRow++;
  });

  currentRow += 2;

  // Informations état
  worksheet.getCell(`A${currentRow}`).value = 'ÉTAT D\'AVANCEMENT';
  worksheet.getCell(`A${currentRow}`).font = { bold: true };
  worksheet.getCell(`A${currentRow}`).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF3F4F6' }
  };
  currentRow++;

  const etatData = [
    ['Numéro d\'état', etatInfo.numeroEtat],
    ['ID État', etatInfo.id.toString()],
    ['Date de création', new Date(etatInfo.dateCreation).toLocaleDateString('fr-FR')],
    ['Date de validation', etatInfo.dateValidation ? new Date(etatInfo.dateValidation).toLocaleDateString('fr-FR') : 'Non validé'],
    ['Statut', etatInfo.statut],
    ['Sous-traitant', etatInfo.soustraitantNom || 'Non spécifié'],
    ['Description', etatInfo.description || 'Non spécifiée'],
    ['Montant total', etatInfo.total]
  ];

  etatData.forEach(([label, value]) => {
    worksheet.getCell(`A${currentRow}`).value = label;
    worksheet.getCell(`A${currentRow}`).font = { bold: true };
    
    if (label === 'Montant total') {
      formatCurrencyCell(worksheet.getCell(`B${currentRow}`), value as number);
    } else {
      worksheet.getCell(`B${currentRow}`).value = value;
    }
    currentRow++;
  });

  // Ajuster les largeurs
  worksheet.getColumn('A').width = 20;
  worksheet.getColumn('B').width = 40;
}

/**
 * Crée l'onglet des lignes d'avancement
 */
async function createLignesSheet(
  worksheet: ExcelJS.Worksheet, 
  lignesEtat: LigneEtatInfo[], 
  totalEtat: number
) {
  // En-têtes
  const headers = ['Poste', 'Description', 'Quantité', 'Unité', 'Prix Unitaire', 'Total'];
  
  headers.forEach((header, index) => {
    worksheet.getCell(1, index + 1).value = header;
  });
  
  formatHeaderRow(worksheet, 1, headers);

  // Données
  let currentRow = 2;
  let totalCalculé = 0;

  lignesEtat.forEach((ligne) => {
    const row = worksheet.getRow(currentRow);
    
    row.getCell(1).value = ligne.poste || '';
    row.getCell(2).value = ligne.description;
    row.getCell(3).value = ligne.quantite;
    row.getCell(4).value = ligne.unite || '';
    formatCurrencyCell(row.getCell(5), ligne.prixUnitaire);
    formatCurrencyCell(row.getCell(6), ligne.total);
    
    formatDataRow(worksheet, currentRow, headers.length);
    
    totalCalculé += ligne.total;
    currentRow++;
  });

  // Ligne de total
  addTotalRow(worksheet, currentRow, headers.length, totalCalculé, 6);

  // Vérification du total
  if (Math.abs(totalCalculé - totalEtat) > 0.01) {
    // Ajouter une note si les totaux ne correspondent pas
    currentRow += 2;
    worksheet.getCell(`A${currentRow}`).value = `⚠️ ATTENTION: Total calculé (${totalCalculé.toFixed(2)}€) différent du total de l'état (${totalEtat.toFixed(2)}€)`;
    worksheet.getCell(`A${currentRow}`).font = { bold: true, color: { argb: 'FFFF0000' } };
  }
}
