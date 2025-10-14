import ExcelJS from 'exceljs';

export interface ExcelExportOptions {
  filename: string;
  title: string;
  subtitle?: string;
}

export interface ChantierInfo {
  nomChantier: string;
  chantierId: string;
  clientNom?: string;
  adresse?: string;
}

export interface CommandeInfo {
  id: string | number;
  reference?: string;
  dateCommande: string;
  total: number;
  statut: string;
  soustraitantNom?: string;
  description?: string;
}

export interface LigneCommandeInfo {
  id: number;
  article?: string;
  description: string;
  quantite: number;
  prixUnitaire: number;
  total: number;
  unite?: string;
  type: string;
}

export interface EtatAvancementInfo {
  id: string | number;
  numeroEtat: string;
  dateCreation: string;
  dateValidation?: string;
  statut: string;
  total: number;
  description?: string;
  soustraitantNom?: string;
}

export interface LigneEtatInfo {
  id: number;
  poste?: string;
  description: string;
  quantite: number;
  prixUnitaire: number;
  total: number;
  unite?: string;
}

/**
 * Crée un workbook Excel avec mise en forme de base
 */
export function createWorkbook(_options: ExcelExportOptions): ExcelJS.Workbook {
  const workbook = new ExcelJS.Workbook();
  
  // Métadonnées
  workbook.creator = 'SecoTech';
  workbook.lastModifiedBy = 'SecoTech';
  workbook.created = new Date();
  workbook.modified = new Date();
  
  return workbook;
}

/**
 * Applique la mise en forme d'en-tête à une ligne
 */
export function formatHeaderRow(worksheet: ExcelJS.Worksheet, rowNumber: number, columns: string[]) {
  const row = worksheet.getRow(rowNumber);
  
  // Style de l'en-tête
  row.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  row.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1F2937' } // Gris foncé
  };
  row.alignment = { horizontal: 'center', vertical: 'middle' };
  row.height = 30;
  
  // Bordures
  row.eachCell((cell, _colNumber) => {
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF000000' } },
      left: { style: 'thin', color: { argb: 'FF000000' } },
      bottom: { style: 'thin', color: { argb: 'FF000000' } },
      right: { style: 'thin', color: { argb: 'FF000000' } }
    };
  });
  
  // Largeur des colonnes
  columns.forEach((_, index) => {
    const col = worksheet.getColumn(index + 1);
    col.width = Math.max(15, columns[index].length + 5);
  });
}

/**
 * Applique la mise en forme aux données
 */
export function formatDataRow(worksheet: ExcelJS.Worksheet, rowNumber: number, columnCount: number) {
  const row = worksheet.getRow(rowNumber);
  
  // Bordures
  row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    if (colNumber <= columnCount) {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
      };
    }
  });
  
  // Alternance de couleurs pour les lignes
  if (rowNumber % 2 === 0) {
    row.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF9FAFB' } // Gris très clair
    };
  }
}

/**
 * Formate une cellule de montant
 */
export function formatCurrencyCell(cell: ExcelJS.Cell, value: number) {
  cell.value = value;
  cell.numFmt = '#,##0.00 €';
  cell.alignment = { horizontal: 'right' };
}

/**
 * Ajoute une ligne de total avec mise en forme spéciale
 */
export function addTotalRow(worksheet: ExcelJS.Worksheet, rowNumber: number, columnCount: number, totalValue: number, totalColumn: number) {
  const row = worksheet.getRow(rowNumber);
  
  // Cellule vide avant le total
  row.getCell(totalColumn - 1).value = 'TOTAL';
  row.getCell(totalColumn - 1).font = { bold: true };
  row.getCell(totalColumn - 1).alignment = { horizontal: 'right' };
  
  // Cellule du total
  formatCurrencyCell(row.getCell(totalColumn), totalValue);
  row.getCell(totalColumn).font = { bold: true };
  
  // Mise en forme de la ligne
  row.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFEFF6FF' } // Bleu très clair
  };
  
  // Bordures épaisses
  row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    if (colNumber <= columnCount) {
      cell.border = {
        top: { style: 'medium', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'medium', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } }
      };
    }
  });
}

/**
 * Génère le nom de fichier avec timestamp
 */
export function generateFilename(prefix: string, chantierId: string, suffix?: string): string {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
  const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS
  
  let filename = `${prefix}_${chantierId}_${dateStr}_${timeStr}`;
  if (suffix) {
    filename += `_${suffix}`;
  }
  filename += '.xlsx';
  
  return filename;
}
