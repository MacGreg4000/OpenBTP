import { readFile, writeFile, mkdir } from 'fs/promises'
// import * as fs from 'fs'
// import * as path from 'path'
import { join } from 'path'
import { prisma } from '@/lib/prisma/client'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'

// Chemin de base pour les documents
const DOCUMENTS_BASE_PATH = join(process.cwd(), 'public', 'uploads', 'documents')

// Couleurs utilisées dans le document
const COLORS = {
  blue: rgb(0.14, 0.39, 0.93), // #2563eb
  black: rgb(0, 0, 0),
  tableHeader: rgb(0.95, 0.95, 0.95), // #f2f2f2 pour les en-têtes de tableau
  gray: rgb(0.5, 0.5, 0.5)
}

// Tailles de police pour différentes parties du document
const FONT_SIZES = {
  title: 18,
  subtitle: 16,
  heading: 14,
  subheading: 12,
  normal: 11,
  small: 10
}

// Fonction pour récupérer les informations de l'entreprise depuis la base de données
async function getCompanyInfo() {
  try {
    const settings = await prisma.companysettings.findFirst();
    
    if (!settings) {
      console.warn("Aucune information d'entreprise trouvée dans la base de données");
      return {
        nom: 'Secotech SRL',
        adresse: 'Rue Frumhy, 20, 4671 Barchon',
        ville: 'Barchon',
        telephone: '0032(0)498 32 49 49',
        email: 'info@secotech.be',
        tva: 'BE0537822042'
      };
    }
    
    return {
      nom: settings.name,
      adresse: `${settings.address}, ${settings.zipCode} ${settings.city}`,
      ville: settings.city,
      telephone: settings.phone,
      email: settings.email,
      tva: settings.tva
    };
  } catch (error) {
    console.error("Erreur lors de la récupération des informations de l'entreprise:", error);
    // Valeurs par défaut en cas d'erreur
    return {
      nom: 'Secotech SRL',
      adresse: 'Rue Frumhy, 20, 4671 Barchon',
      ville: 'Barchon',
      telephone: '0032(0)498 32 49 49',
      email: 'info@secotech.be',
      tva: 'BE0537822042'
    };
  }
}

// Interface pour les sous-traitants
// interface Soustraitant {
//   id: string;
//   nom: string;
//   poste?: string;
//   contact?: string;
// }

// Fonction utilitaire pour découper un texte en lignes selon une largeur maximale
function splitTextIntoLines(text: string, maxWidth: number, font: { widthOfTextAtSize: (t: string, s: number)=> number } | unknown, fontSize: number): string[] {
  // Gérer d'abord les sauts de ligne explicites
  const paragraphs = text.split('\n');
  const lines: string[] = [];
  
  // Traiter chaque paragraphe séparément
  for (const paragraph of paragraphs) {
    if (paragraph.trim() === '') {
      lines.push('');
      continue;
    }
    
    const words = paragraph.split(' ');
    let currentLine = '';
    
    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      
      try {
        const width = (font as { widthOfTextAtSize: (t: string, s: number)=> number }).widthOfTextAtSize(testLine, fontSize);
        
        if (width <= maxWidth) {
          currentLine = testLine;
        } else {
          lines.push(currentLine);
          currentLine = word;
        }
      } catch (error) {
        console.warn(`Erreur lors du calcul de la largeur du texte "${testLine}":`, error);
        // En cas d'erreur, on ajoute la ligne en cours et on continue
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }
    
    if (currentLine) {
      lines.push(currentLine);
    }
  }
  
  return lines;
}

// Fonction pour dessiner un en-tête de section
function drawSectionHeader(
  page: { drawText: (t: string, o: unknown)=>void; drawLine: (o: unknown)=>void; getWidth: ()=> number },
  text: string,
  yPosition: number,
  font: unknown,
  fontSize: number
) {
  page.drawText(text, {
    x: 50,
    y: yPosition,
    size: fontSize,
    font: font,
    color: COLORS.blue
  });
  
  // Ligne horizontale sous le titre
  page.drawLine({
    start: { x: 50, y: yPosition - 5 },
    end: { x: page.getWidth() - 50, y: yPosition - 5 },
    thickness: 1,
    color: COLORS.blue
  });
  
  return yPosition - 25; // Retourner la nouvelle position Y
}

// Fonction pour dessiner un tableau
async function drawTable(
  page: { drawText: (t: string, o: unknown)=>void; drawRectangle: (o: unknown)=>void; drawLine: (o: unknown)=>void; getWidth: ()=> number }, 
  headers: string[], 
  rows: string[][], 
  yStart: number, 
  widths: number[], 
  regularFont: unknown, 
  boldFont: unknown,
  fontSize: number
) {
  const cellPadding = 15;
  const rowHeight = 35;
  const lineHeight = 20;
  const pageWidth = page.getWidth();
  const tableWidth = pageWidth - 100; // Marges gauche et droite
  const tableX = 50;
  
  // Calculer les largeurs absolues des colonnes
  const absoluteWidths = widths.map(w => (w * tableWidth) / 100);
  
  // Dessiner l'en-tête du tableau
  let currentX = tableX;
  let currentY = yStart;
  
  // Fond de l'en-tête
  page.drawRectangle({
    x: tableX,
    y: currentY - rowHeight,
    width: tableWidth,
    height: rowHeight,
    color: COLORS.tableHeader
  });
  
  // Texte de l'en-tête
  for (let i = 0; i < headers.length; i++) {
    page.drawText(headers[i], {
      x: currentX + cellPadding,
      y: currentY - rowHeight/2 + fontSize/2 - 2,
      size: fontSize,
      font: boldFont,
      color: COLORS.black
    });
    currentX += absoluteWidths[i];
  }
  
  // Bordure de l'en-tête
  page.drawRectangle({
    x: tableX,
    y: currentY - rowHeight,
    width: tableWidth,
    height: rowHeight,
    borderColor: COLORS.black,
    borderWidth: 1,
    color: undefined
  });
  
  // Dessiner chaque ligne du tableau
  currentY -= rowHeight;
  
  for (const row of rows) {
    // Pour chaque cellule de la ligne, calculer le nombre de lignes de texte
    let maxLinesInRow = 1;
    
    const cellLines = row.map((cell, index) => {
      // Prétraiter les sauts de ligne explicites
      const cellContent = cell.toString();
      if (cellContent.includes('\n')) {
        // Si la cellule contient déjà des sauts de ligne, les respecter
        const explicitLines = cellContent.split('\n');
        const processedLines: string[] = [];
        
        // Pour chaque ligne explicite, vérifier si elle nécessite un découpage supplémentaire
        for (const line of explicitLines) {
          const wrappedLines = splitTextIntoLines(
            line, 
            absoluteWidths[index] - 2 * cellPadding - 4,
            regularFont, 
            fontSize
          );
          processedLines.push(...wrappedLines);
        }
        
        if (processedLines.length > maxLinesInRow) {
          maxLinesInRow = processedLines.length;
        }
        
        return processedLines;
      } else {
        // Sinon, découper le texte normalement
        const lines = splitTextIntoLines(
          cellContent, 
          absoluteWidths[index] - 2 * cellPadding - 4,
          regularFont, 
          fontSize
        );
        
        if (lines.length > maxLinesInRow) {
          maxLinesInRow = lines.length;
        }
        
        return lines;
      }
    });
    
    const actualRowHeight = Math.max(rowHeight, lineHeight * maxLinesInRow + 12);
    
    // Fond de la ligne
    page.drawRectangle({
      x: tableX,
      y: currentY - actualRowHeight,
      width: tableWidth,
      height: actualRowHeight,
      color: rgb(1, 1, 1) // Blanc
    });
    
    // Texte de la ligne
    currentX = tableX;
    for (let i = 0; i < row.length; i++) {
      const lines = cellLines[i];
      
      for (let j = 0; j < lines.length; j++) {
        try {
          page.drawText(lines[j], {
            x: currentX + cellPadding,
            y: currentY - (j * lineHeight) - (lineHeight * 0.75) - 4,
            size: fontSize,
            font: regularFont,
            color: COLORS.black
          });
        } catch (error) {
          console.warn(`Erreur lors du dessin du texte "${lines[j]}":`, error);
          // Continuer avec la ligne suivante
        }
      }
      
      currentX += absoluteWidths[i];
    }
    
    // Bordure de la ligne
    page.drawRectangle({
      x: tableX,
      y: currentY - actualRowHeight,
      width: tableWidth,
      height: actualRowHeight,
      borderColor: COLORS.black,
      borderWidth: 1,
      color: undefined
    });
    
    // Bordures intérieures verticales
    currentX = tableX;
    for (let i = 0; i < widths.length - 1; i++) {
      currentX += absoluteWidths[i];
      page.drawLine({
        start: { x: currentX, y: currentY },
        end: { x: currentX, y: currentY - actualRowHeight },
        thickness: 1,
        color: COLORS.black
      });
    }
    
    currentY -= actualRowHeight;
  }
  
  return currentY; // Retourner la nouvelle position Y
}

// Fonction pour dessiner une liste à puces
function drawBulletList(page: { drawText: (t: string, o: unknown)=>void; getWidth: ()=> number }, items: string[], yStart: number, font: unknown, fontSize: number) {
  let currentY = yStart;
  const bulletPadding = 20; // Augmenté de 15 à 20
  const lineHeight = fontSize * 1.8; // Augmenté de 1.5 à 1.8 pour plus d'espace entre les lignes
  const maxTextWidth = page.getWidth() - 70 - 50; // Ajusté pour laisser plus d'espace pour le texte
  
  for (const item of items) {
    try {
      // Dessiner la puce
      page.drawText('•', {
        x: 50,
        y: currentY,
        size: fontSize + 2, // Puce légèrement plus grande pour meilleure visibilité
        font: font,
        color: COLORS.black
      });
      
      // Diviser le texte de l'élément en lignes
      const lines = splitTextIntoLines(item, maxTextWidth, font, fontSize);
      
      // Dessiner chaque ligne du texte
      for (let i = 0; i < lines.length; i++) {
        try {
          // Première ligne alignée avec la puce, les suivantes indentées
          const xPos = i === 0 ? 70 : 70 + bulletPadding; // Plus d'espace entre la puce et le texte
          
          page.drawText(lines[i], {
            x: xPos,
            y: currentY - (i * lineHeight * 0.8), // Ajustement pour un meilleur espacement
            size: fontSize,
            font: font,
            color: COLORS.black
          });
        } catch (error) {
          console.warn(`Erreur lors du dessin du texte de liste "${lines[i]}":`, error);
        }
      }
      
      // Passer à l'élément suivant, en ajoutant de l'espace pour toutes les lignes
      currentY -= lineHeight * (lines.length + 0.7); // Plus d'espace entre les éléments de liste
    } catch (error) {
      console.warn(`Erreur lors du traitement de l'élément de liste:`, error);
      currentY -= lineHeight;
    }
  }
  
  return currentY;
}

/**
 * Génère un Plan Particulier de Sécurité et de Santé (PPSS) pour un chantier
 * @param chantierId Identifiant du chantier
 * @param userId Identifiant de l'utilisateur qui génère le document
 * @returns Le document créé dans la base de données
 */
export async function generatePPSS(chantierId: string, userId: string) {
  try {
    console.log('Début de la génération du PPSS pour le chantier:', chantierId);
    
    // Récupérer les données du chantier
    const chantier = await prisma.chantier.findUnique({
      where: { chantierId },
      include: { client: true }
    })
    
    if (!chantier) {
      throw new Error('Chantier non trouvé')
    }
    
    // Récupérer les informations de l'entreprise
    const companyInfo = await getCompanyInfo();
    
    // Récupérer le logo de l'entreprise
    let logoBase64 = ''
    try {
      const logoPath = join(process.cwd(), 'public', 'images', 'logo.png')
      const logoBuffer = await readFile(logoPath)
      logoBase64 = logoBuffer.toString('base64')
    } catch (error) {
      console.error('Erreur lors de la lecture du logo:', error)
      // Utiliser un logo par défaut ou laisser vide
    }
    
    // Récupérer l'image de la signature
    let signatureBase64 = ''
    try {
      const signaturePath = join(process.cwd(), 'public', 'images', 'signature.png')
      const signatureBuffer = await readFile(signaturePath)
      signatureBase64 = signatureBuffer.toString('base64')
    } catch (error) {
      console.error('Erreur lors de la lecture de la signature:', error)
      // Continuer sans image de signature
    }
    
    // Créer le dossier pour le chantier s'il n'existe pas
    const chantierDir = join(DOCUMENTS_BASE_PATH, chantierId)
    try {
      // S'assurer que le dossier de base existe
      await mkdir(join(process.cwd(), 'public', 'uploads'), { recursive: true })
      await mkdir(join(process.cwd(), 'public', 'uploads', 'documents'), { recursive: true })
      // Créer ensuite le dossier du chantier
      await mkdir(chantierDir, { recursive: true })
      console.log('Dossiers créés ou vérifiés avec succès')
    } catch (error) {
      console.error('Erreur lors de la création des dossiers:', error)
      throw new Error(`Impossible de créer les dossiers nécessaires: ${error}`)
    }
    
    // Nom du fichier PDF
    const fileName = `PPSS-${chantier.chantierId}.pdf`
    const filePath = join(chantierDir, fileName)
    
    // Date de génération formatée
    const dateGeneration = format(new Date(), 'dd/MM/yyyy', { locale: fr });
    const dateDebut = chantier.dateDebut 
      ? format(new Date(chantier.dateDebut), 'MMMM yyyy', { locale: fr }) 
      : 'Non définie';
      
    // Création du PDF avec pdf-lib
    const pdfDoc = await PDFDocument.create();
    
    // Ajouter les métadonnées du document
    pdfDoc.setTitle(`Plan Particulier de Sécurité et de Santé - ${chantier.nomChantier}`);
    pdfDoc.setAuthor(companyInfo.nom);
    pdfDoc.setSubject('PPSS');
    pdfDoc.setKeywords(['PPSS', 'sécurité', 'santé', 'chantier']);
    pdfDoc.setCreationDate(new Date());
    
    // Incorporation des polices
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const _italicFont = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
  void _italicFont;
    
    // Créer la première page
    const page1 = pdfDoc.addPage([595, 842]); // A4
    const { width, height } = page1.getSize();
    
    // Logo (centré en haut)
    if (logoBase64) {
      try {
        const logoImage = await pdfDoc.embedPng(Buffer.from(logoBase64, 'base64'));
        const logoDims = logoImage.scale(0.5); // Ajustez l'échelle selon vos besoins
        
        page1.drawImage(logoImage, {
          x: (width - logoDims.width) / 2,
          y: height - 100,
          width: logoDims.width,
          height: logoDims.height
        });
      } catch (error) {
        console.error('Erreur lors de l\'incorporation du logo:', error);
      }
    }
    
    // Titre principal (centré)
    const title = 'PLAN PARTICULIER DE SÉCURITÉ ET DE';
    const subtitle = 'PROTECTION DE LA SANTÉ (PPSS)';
    
    const titleWidth = boldFont.widthOfTextAtSize(title, FONT_SIZES.title);
    const subtitleWidth = boldFont.widthOfTextAtSize(subtitle, FONT_SIZES.title);
    
    page1.drawText(title, {
      x: (width - titleWidth) / 2,
      y: height - 180,
      size: FONT_SIZES.title,
      font: boldFont,
      color: COLORS.black
    });
    
    page1.drawText(subtitle, {
      x: (width - subtitleWidth) / 2,
      y: height - 205,
      size: FONT_SIZES.title,
      font: boldFont,
      color: COLORS.black
    });
    
    // Section 1: Informations générales
    let yPos = height - 250;
    yPos = drawSectionHeader(page1, '1. INFORMATIONS GÉNÉRALES', yPos, boldFont, FONT_SIZES.heading);
    
    // Tableau d'informations
    const infoHeaders = ['Entreprise', ''];
    const infoRows = [
      ['Entreprise', companyInfo.nom],
      ['Adresse', companyInfo.adresse],
      ['Tél.', companyInfo.telephone],
      ['TVA', companyInfo.tva],
      ['Email', companyInfo.email],
      ['Chantier', chantier.nomChantier],
      ['Coordonnées du chantier', chantier.adresseChantier || '']
    ];
    
    yPos = await drawTable(page1, infoHeaders, infoRows, yPos, [30, 70], regularFont, boldFont, FONT_SIZES.normal);
    
    // Page 2: Description des travaux
    const page2 = pdfDoc.addPage([595, 842]);
    yPos = height - 50;
    yPos = drawSectionHeader(page2, '2. DESCRIPTION DES TRAVAUX', yPos, boldFont, FONT_SIZES.heading);
    
    page2.drawText(`${companyInfo.nom} intervient sur le chantier pour la réalisation des travaux de carrelage, incluant :`, {
      x: 50,
      y: yPos,
      size: FONT_SIZES.normal,
      font: regularFont,
      color: COLORS.black
    });
    
    yPos -= 25;
    
    // Liste des travaux
    const travauxItems = [
      'Préparation des surfaces : nettoyage, nivellement et application de primaires d\'accrochage.',
      'Manutention des matériaux : transport et stockage des carreaux, colles, joints et autres matériaux.',
      'Découpe et ajustement des carreaux : utilisation d\'outils manuels et électriques.',
      'Pose du carrelage : application de la colle, installation des carreaux et réalisation des joints.',
      'Finitions : nettoyage des surfaces, application de produits de protection si nécessaire.',
      'Gestion des déchets : tri, stockage temporaire et évacuation des déchets conformément aux réglementations en vigueur.'
    ];
    
    yPos = drawBulletList(page2, travauxItems, yPos, regularFont, FONT_SIZES.normal);
    
    yPos -= 20;
    
    // Tableau d'informations complémentaires
    const planningHeaders = ['', ''];
    const planningRows = [
      ['Délai d\'intervention', `Commencement des travaux à partir de ${dateDebut}`],
      ['Horaire de travail', '7h30 - 16h00'],
      ['Nombre de personnes prévues sur le chantier', '3 en moyenne, 5 au maximum']
    ];
    
    yPos = await drawTable(page2, planningHeaders, planningRows, yPos, [30, 70], regularFont, boldFont, FONT_SIZES.normal);
    
    // Page 3: Analyse des risques et mesures de prévention
    const page3 = pdfDoc.addPage([595, 842]);
    yPos = height - 50;
    yPos = drawSectionHeader(page3, '3. ANALYSE DES RISQUES ET MESURES DE PRÉVENTION', yPos, boldFont, FONT_SIZES.heading);
    
    // Tableau des risques
    const risquesHeaders = ['Tâches', 'Risques', 'Mesures de prévention'];
    const risquesRows = [
      [
        'Préparation des surfaces', 
        'Exposition à la poussière\nTroubles musculo-squelettiques (TMS)', 
        'Aspiration de poussière\nPort de masques\nFormation aux postures de travail'
      ],
      [
        'Manutention des matériaux', 
        'Charges lourdes\nRisques de chutes', 
        'Équipements de levage\nFormation à la manutention\nPort de chaussures de sécurité antidérapantes'
      ],
      [
        'Découpe et ajustement', 
        'Coupures\nProjections de débris\nBruit excessif', 
        'Gants, lunettes de protection\nProtections auditives\nVérification des outils'
      ],
      [
        'Pose du carrelage', 
        'Inhalation de produits chimiques\nTMS\nContact avec produits chimiques', 
        'Colles/joints à faible émission de COV\nMasques, gants, genouillères\nAlternance des tâches'
      ],
      [
        'Finitions', 
        'Risques de glissades', 
        'Gants, lunettes de protection\nVentilation adéquate\nNettoyage immédiat des déversements'
      ],
      [
        'Gestion des déchets', 
        'Coupures avec débris\nStockage inapproprié', 
        'Tri des déchets\nStockage sécurisé\nBordereau de suivi des déchets dangereux'
      ]
    ];
    
    yPos = await drawTable(page3, risquesHeaders, risquesRows, yPos, [20, 40, 40], regularFont, boldFont, FONT_SIZES.normal);
    
    // Page 4: Organisation du chantier et consignes d'urgence
    const page4 = pdfDoc.addPage([595, 842]);
    yPos = height - 50;
    yPos = drawSectionHeader(page4, '4. ORGANISATION DU CHANTIER', yPos, boldFont, FONT_SIZES.heading);
    
    // Liste organisation
    const organisationItems = [
      'Planification des interventions : Coordination avec les autres corps de métier.',
      'Zones de stockage : Définition d\'espaces dédiés, sécurisés et accessibles.',
      'Installations sanitaires : Sanitaires propres et suffisants pour le personnel.',
      'Circulation : Voies dégagées et sécurisées, signalisation claire.'
    ];
    
    yPos = drawBulletList(page4, organisationItems, yPos, regularFont, FONT_SIZES.normal);
    
    yPos -= 30;
    
    // Section 5: Consignes en cas d'urgence
    yPos = drawSectionHeader(page4, '5. CONSIGNES EN CAS D\'URGENCE', yPos, boldFont, FONT_SIZES.heading);
    
    // Sous-section: Organisation des premiers secours
    page4.drawText('Organisation des premiers secours', {
      x: 50,
      y: yPos,
      size: FONT_SIZES.subheading,
      font: boldFont,
      color: COLORS.black
    });
    
    yPos -= 25;
    
    // Liste numérotée
    const listeItems = [
      'Alerte : Composer le 112.',
      'Informations à fournir : Localisation du chantier, nature de l\'accident, nombre et état des blessés.',
      'Premiers secours : Application des gestes de premiers secours, utilisation de la trousse de secours disponible.',
      'Accueil des secours : Une personne guide les secours depuis l\'entrée du chantier.'
    ];
    
    // Dessiner la liste numérotée
    for (let i = 0; i < listeItems.length; i++) {
      page4.drawText(`${i + 1}.`, {
        x: 50,
        y: yPos,
        size: FONT_SIZES.normal,
        font: boldFont,
        color: COLORS.black
      });
      
      const lines = splitTextIntoLines(listeItems[i], width - 90, regularFont, FONT_SIZES.normal);
      
      for (let j = 0; j < lines.length; j++) {
        page4.drawText(lines[j], {
          x: 70,
          y: yPos - j * 15,
          size: FONT_SIZES.normal,
          font: regularFont,
          color: COLORS.black
        });
      }
      
      yPos -= (lines.length + 1) * 15;
    }
    
    // Page 5: Équipements de protection et conclusion
    const page5 = pdfDoc.addPage([595, 842]);
    yPos = height - 50;
    
    // Section 6: Équipements de protection individuelle
    yPos = drawSectionHeader(page5, '6. ÉQUIPEMENTS DE PROTECTION INDIVIDUELLE (EPI)', yPos, boldFont, FONT_SIZES.heading);
    
    // Liste des EPI
    const epiItems = [
      'Casque de chantier (risque de chute d\'objets).',
      'Lunettes de protection (projections).',
      'Masques respiratoires (poussières, vapeurs).',
      'Gants de protection (coupures, produits chimiques).',
      'Chaussures de sécurité (antidérapantes, embout renforcé).',
      'Protections auditives (outils bruyants).',
      'Genouillères (travail prolongé au sol).'
    ];
    
    yPos = drawBulletList(page5, epiItems, yPos, regularFont, FONT_SIZES.normal);
    
    yPos -= 30;
    
    // Section 7: Gestion des déchets
    yPos = drawSectionHeader(page5, '7. GESTION DES DÉCHETS', yPos, boldFont, FONT_SIZES.heading);
    
    // Liste gestion des déchets
    const dechetsItems = [
      'Tri sélectif : Séparation des déchets inertes et dangereux.',
      'Stockage temporaire : Zones dédiées, sécurisées.',
      'Évacuation : Déchets enlevés une fois par semaine minimum.',
      'Sensibilisation du personnel : Formation et affichage des consignes.'
    ];
    
    yPos = drawBulletList(page5, dechetsItems, yPos, regularFont, FONT_SIZES.normal);
    
    yPos -= 40;
    
    // Section 10: Validation du PPSS
    yPos = drawSectionHeader(page5, '10. VALIDATION DU PPSS', yPos, boldFont, FONT_SIZES.heading);
    
    // Texte de validation
    const validationText = `Par la présente, ${companyInfo.nom} adhère aux mesures définies dans le PPSS de l'entreprise générale ainsi qu'au plan d'installation de chantier de celle-ci.`;
    
    // Découper le texte en plusieurs lignes si nécessaire
    const validationLines = splitTextIntoLines(validationText, width - 100, regularFont, FONT_SIZES.normal);
    
    // Dessiner chaque ligne du texte de validation
    for (let i = 0; i < validationLines.length; i++) {
      page5.drawText(validationLines[i], {
        x: 50,
        y: yPos - (i * 15),
        size: FONT_SIZES.normal,
        font: regularFont,
        color: COLORS.black
      });
    }
    
    // Ajuster la position Y en fonction du nombre de lignes
    yPos -= (validationLines.length * 15) + 25;
    
    // Bloc de signature
    page5.drawRectangle({
      x: 50,
      y: yPos - 150,
      width: width - 100,
      height: 150,
      borderColor: COLORS.black,
      borderWidth: 1
    });
    
    page5.drawText('Responsable de l\'entreprise : Maccio Grégory', {
      x: 70,
      y: yPos - 30,
      size: FONT_SIZES.normal,
      font: regularFont,
      color: COLORS.black
    });
    
    page5.drawText(`Date : ${dateGeneration}`, {
      x: 70,
      y: yPos - 50,
      size: FONT_SIZES.normal,
      font: regularFont,
      color: COLORS.black
    });
    
    // Signature
    if (signatureBase64) {
      try {
        const signatureImage = await pdfDoc.embedPng(Buffer.from(signatureBase64, 'base64'));
        const signatureDims = signatureImage.scale(0.5);
        
        page5.drawImage(signatureImage, {
          x: 70,
          y: yPos - 120,
          width: signatureDims.width / 2,
          height: signatureDims.height / 2
        });
      } catch (error) {
        console.error('Erreur lors de l\'incorporation de la signature:', error);
      }
    }
    
    // Numérotation des pages
    const pageCount = pdfDoc.getPageCount();
    for (let i = 0; i < pageCount; i++) {
      const page = pdfDoc.getPage(i);
      page.drawText(`Page ${i + 1}/${pageCount}`, {
        x: page.getWidth() - 100,
        y: 30,
        size: FONT_SIZES.small,
        font: regularFont,
        color: COLORS.black
      });
    }
    
    // Sérialiser le PDF
    const pdfBytes = await pdfDoc.save();
    
    // Écrire le fichier sur le disque
    await writeFile(filePath, pdfBytes);
    
    console.log(`Fichier PPSS créé: ${filePath}, taille: ${pdfBytes.length} octets`);
    
    // Vérifier si un document PPSS existe déjà pour ce chantier
    const existingDocument = await prisma.document.findFirst({
      where: {
        chantierId,
        type: 'PPSS'
      }
    });
    
    if (existingDocument) {
      // Mettre à jour le document existant
      const updatedDoc = await prisma.document.update({
        where: { id: existingDocument.id },
        data: {
          updatedAt: new Date(),
          taille: pdfBytes.length
        }
      });
      return updatedDoc.url;
    } else {
      // Créer une nouvelle entrée dans la base de données
      const newDoc = await prisma.document.create({
        data: {
          nom: fileName,
          type: 'PPSS',
          url: `/uploads/documents/${chantierId}/${fileName}`,
          taille: pdfBytes.length,
          mimeType: 'application/pdf',
          chantierId: chantierId,
          createdBy: userId,
          updatedAt: new Date()
        }
      });
      return newDoc.url;
    }
  } catch (error) {
    console.error("Erreur lors de la génération du PPSS:", error);
    throw error;
  }
}