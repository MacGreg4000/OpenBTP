import ExcelJS from 'exceljs';
import { 
  createWorkbook, 
  formatHeaderRow, 
  formatDataRow, 
  formatCurrencyCell, 
  addTotalRow,
  generateFilename,
  type ChantierInfo,
  type CommandeInfo,
  type LigneCommandeInfo
} from './excel-utils';

export interface ExportCommandeOptions {
  chantierInfo: ChantierInfo;
  commandeInfo: CommandeInfo;
  lignesCommande: LigneCommandeInfo[];
}

/**
 * Exporte une commande en fichier Excel
 */
export async function exportCommandeToExcel(options: ExportCommandeOptions): Promise<Buffer> {
  try {
    console.log('📊 exportCommandeToExcel - Début')
    const { chantierInfo, commandeInfo, lignesCommande } = options;
    
    console.log(`📋 Données: ${lignesCommande.length} lignes, total: ${commandeInfo.total}€`)
    
    // Créer le workbook
    console.log('📝 Création du workbook...')
    const workbook = createWorkbook({
      filename: generateFilename('Commande', chantierInfo.chantierId, commandeInfo.reference || commandeInfo.id.toString()),
      title: `Commande ${commandeInfo.reference || commandeInfo.id}`,
      subtitle: `Chantier: ${chantierInfo.nomChantier}`
    });
    console.log('✅ Workbook créé')

    // Onglet 1: Informations générales
    console.log('📄 Création de l\'onglet Informations...')
    const infoSheet = workbook.addWorksheet('Informations');
    await createInfoSheet(infoSheet, chantierInfo, commandeInfo);
    console.log('✅ Onglet Informations créé')

    // Onglet 2: Lignes de commande
    console.log('📄 Création de l\'onglet Lignes de commande...')
    const lignesSheet = workbook.addWorksheet('Lignes de commande');
    await createLignesSheet(lignesSheet, lignesCommande, commandeInfo.total);
    console.log('✅ Onglet Lignes créé')

    // Générer le buffer
    console.log('💾 Génération du buffer...')
    const buffer = await workbook.xlsx.writeBuffer();
    console.log(`✅ Buffer généré: ${buffer.byteLength} bytes`)
    
    return Buffer.from(buffer);
  } catch (error) {
    console.error('❌ Erreur dans exportCommandeToExcel:', error)
    console.error('Stack:', error instanceof Error ? error.stack : 'N/A')
    throw error
  }
}

/**
 * Crée l'onglet des informations générales
 */
async function createInfoSheet(
  worksheet: ExcelJS.Worksheet, 
  chantierInfo: ChantierInfo, 
  commandeInfo: CommandeInfo
) {
  try {
    console.log('📋 createInfoSheet - Début')
    
    // Titre
    worksheet.getCell('A1').value = 'INFORMATIONS DE LA COMMANDE';
    worksheet.getCell('A1').font = { bold: true, size: 16 };
    worksheet.getCell('A1').fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF3B82F6' } // Bleu
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

    // Informations commande
    worksheet.getCell(`A${currentRow}`).value = 'COMMANDE';
    worksheet.getCell(`A${currentRow}`).font = { bold: true };
    worksheet.getCell(`A${currentRow}`).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF3F4F6' }
    };
    currentRow++;

    const commandeData = [
      ['Référence', commandeInfo.reference || 'Non spécifiée'],
      ['ID Commande', commandeInfo.id.toString()],
      ['Date de commande', new Date(commandeInfo.dateCommande).toLocaleDateString('fr-FR')],
      ['Statut', commandeInfo.statut],
      ['Sous-traitant', commandeInfo.soustraitantNom || 'Non spécifié'],
      ['Description', commandeInfo.description || 'Non spécifiée'],
      ['Montant total', commandeInfo.total]
    ];

    commandeData.forEach(([label, value]) => {
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
    
    console.log('✅ createInfoSheet - Terminé')
  } catch (error) {
    console.error('❌ Erreur dans createInfoSheet:', error)
    throw error
  }
}

/**
 * Crée l'onglet des lignes de commande
 */
async function createLignesSheet(
  worksheet: ExcelJS.Worksheet, 
  lignesCommande: LigneCommandeInfo[], 
  totalCommande: number
) {
  try {
    console.log('📋 createLignesSheet - Début')
    
    // En-têtes
    const headers = ['Article', 'Description', 'Quantité', 'Unité', 'Prix Unitaire', 'Total'];
    
    console.log('📝 Ajout des en-têtes...')
    headers.forEach((header, index) => {
      worksheet.getCell(1, index + 1).value = header;
    });
    
    formatHeaderRow(worksheet, 1, headers);
    console.log('✅ En-têtes formatés')

    // Données
    let currentRow = 2;
    let totalCalculé = 0;

    console.log(`📊 Traitement de ${lignesCommande.length} lignes...`)
    lignesCommande.forEach((ligne, index) => {
      try {
        const row = worksheet.getRow(currentRow);
        
        if (ligne.type === 'TITRE') {
          // Ligne de titre
          row.getCell(1).value = '';
          row.getCell(2).value = ligne.description;
          row.getCell(3).value = '';
          row.getCell(4).value = '';
          row.getCell(5).value = '';
          row.getCell(6).value = '';
          
          // Style pour le titre (gras + souligné)
          row.font = { bold: true, size: 14 };
          row.getCell(2).font = { bold: true, size: 14 };
          row.getCell(2).alignment = { horizontal: 'left' };
          
          // Fond légèrement coloré
          row.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE3F2FD' } // Bleu très clair
          };
          
          // Pas de total pour les titres
          
        } else if (ligne.type === 'SOUS_TITRE') {
          // Ligne de sous-titre
          row.getCell(1).value = '';
          row.getCell(2).value = ligne.description;
          row.getCell(3).value = '';
          row.getCell(4).value = '';
          row.getCell(5).value = '';
          row.getCell(6).value = '';
          
          // Style pour le sous-titre (souligné)
          row.font = { size: 12 };
          row.getCell(2).font = { size: 12 };
          row.getCell(2).alignment = { horizontal: 'left' };
          
          // Fond légèrement grisé
          row.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF5F5F5' } // Gris très clair
          };
          
          // Pas de total pour les sous-titres
          
        } else {
          // Ligne normale
          row.getCell(1).value = ligne.article || '';
          row.getCell(2).value = ligne.description || '';
          row.getCell(3).value = ligne.quantite || 0;
          row.getCell(4).value = ligne.unite || '';
          formatCurrencyCell(row.getCell(5), ligne.prixUnitaire || 0);
          formatCurrencyCell(row.getCell(6), ligne.total || 0);
          
          formatDataRow(worksheet, currentRow, headers.length);
          
          totalCalculé += (ligne.total || 0);
        }
        
        currentRow++;
      } catch (ligneError) {
        console.error(`❌ Erreur ligne ${index}:`, ligneError)
        console.error('Données de la ligne:', ligne)
        throw ligneError
      }
    });

    console.log(`✅ Lignes traitées, total calculé: ${totalCalculé}€`)

    // Ligne de total
    console.log('💰 Ajout de la ligne de total...')
    addTotalRow(worksheet, currentRow, headers.length, totalCalculé, 6);

    // Vérification du total
    if (Math.abs(totalCalculé - totalCommande) > 0.01) {
      // Ajouter une note si les totaux ne correspondent pas
      currentRow += 2;
      worksheet.getCell(`A${currentRow}`).value = `⚠️ ATTENTION: Total calculé (${totalCalculé.toFixed(2)}€) différent du total de la commande (${totalCommande.toFixed(2)}€)`;
      worksheet.getCell(`A${currentRow}`).font = { bold: true, color: { argb: 'FFFF0000' } };
    }
    
    console.log('✅ createLignesSheet - Terminé')
  } catch (error) {
    console.error('❌ Erreur dans createLignesSheet:', error)
    throw error
  }
}
