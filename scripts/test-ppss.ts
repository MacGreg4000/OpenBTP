/**
 * Script de test pour la génération PPSS v2 — données fictives, aucune DB requise.
 * Usage : npx tsx scripts/test-ppss.ts
 * Résultat : /tmp/ppss-test.pdf
 */

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { writeFile, readFile } from 'fs/promises'
import { join } from 'path'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

// ── Données fictives ────────────────────────────────────────────────────────

const companyInfo = {
  nom: 'Secotech SRL',
  adresse: 'Rue Frumhy, 20, 4671 Barchon',
  telephone: '0032(0)498 32 49 49',
  email: 'info@secotech.be',
  tva: 'BE0537822042'
}

const chantier = {
  chantierId: 'TEST-2026-001',
  nomChantier: 'Rénovation complète salle de bains — Appartement Dupont',
  adresseChantier: 'Rue de la Paix 12, 4000 Liège',
  dateDebut: new Date('2026-09-01'),
  maitreOuvrageNom: 'Constructions Maison Neuve SA'
}

// ── Helpers copiés depuis ppss-generator.ts ─────────────────────────────────

const COLORS = {
  blue: rgb(0.14, 0.39, 0.93),
  black: rgb(0, 0, 0),
  tableHeader: rgb(0.92, 0.92, 0.95),
  gray: rgb(0.5, 0.5, 0.5),
  lightGray: rgb(0.97, 0.97, 0.97)
}

const FONT_SIZES = {
  title: 18, subtitle: 16, heading: 14, subheading: 12,
  normal: 11, small: 10, tiny: 9
}

type DrawableFont = { widthOfTextAtSize: (t: string, s: number) => number }
type DrawablePage = {
  drawText: (t: string, o: unknown) => void
  drawLine: (o: unknown) => void
  drawRectangle: (o: unknown) => void
  drawImage?: (img: unknown, o: unknown) => void
  getWidth: () => number
  getSize: () => { width: number; height: number }
}

function splitTextIntoLines(text: string, maxWidth: number, font: DrawableFont | unknown, fontSize: number): string[] {
  const paragraphs = text.split('\n')
  const lines: string[] = []
  for (const paragraph of paragraphs) {
    if (paragraph.trim() === '') { lines.push(''); continue }
    const words = paragraph.split(' ')
    let currentLine = ''
    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word
      try {
        const width = (font as DrawableFont).widthOfTextAtSize(testLine, fontSize)
        if (width <= maxWidth) { currentLine = testLine }
        else { if (currentLine) lines.push(currentLine); currentLine = word }
      } catch { if (currentLine) lines.push(currentLine); currentLine = word }
    }
    if (currentLine) lines.push(currentLine)
  }
  return lines
}

function drawSectionHeader(page: DrawablePage, text: string, yPosition: number, font: unknown, fontSize: number) {
  page.drawText(text, { x: 50, y: yPosition, size: fontSize, font, color: COLORS.blue })
  page.drawLine({ start: { x: 50, y: yPosition - 5 }, end: { x: page.getWidth() - 50, y: yPosition - 5 }, thickness: 1, color: COLORS.blue })
  return yPosition - 25
}

function drawSubSectionHeader(page: DrawablePage, text: string, yPosition: number, font: unknown, fontSize: number) {
  page.drawText(text, { x: 50, y: yPosition, size: fontSize, font, color: COLORS.black })
  page.drawLine({ start: { x: 50, y: yPosition - 4 }, end: { x: page.getWidth() - 50, y: yPosition - 4 }, thickness: 0.5, color: COLORS.gray })
  return yPosition - 20
}

async function drawTable(page: DrawablePage, headers: string[], rows: string[][], yStart: number, widths: number[], regularFont: unknown, boldFont: unknown, fontSize: number) {
  const cellPadding = 8, rowHeight = 30, lineHeight = fontSize * 1.6
  const tableWidth = page.getWidth() - 100, tableX = 50
  const absoluteWidths = widths.map(w => (w * tableWidth) / 100)
  let currentX = tableX, currentY = yStart

  page.drawRectangle({ x: tableX, y: currentY - rowHeight, width: tableWidth, height: rowHeight, color: COLORS.tableHeader })
  for (let i = 0; i < headers.length; i++) {
    if (headers[i]) page.drawText(headers[i], { x: currentX + cellPadding, y: currentY - rowHeight / 2 + fontSize / 2 - 2, size: fontSize, font: boldFont, color: COLORS.black })
    currentX += absoluteWidths[i]
  }
  page.drawRectangle({ x: tableX, y: currentY - rowHeight, width: tableWidth, height: rowHeight, borderColor: COLORS.black, borderWidth: 1, color: undefined })
  currentY -= rowHeight

  for (const row of rows) {
    let maxLinesInRow = 1
    const cellLines = row.map((cell, index) => {
      const allLines: string[] = []
      for (const rawLine of cell.toString().split('\n')) {
        const wrapped = splitTextIntoLines(rawLine, absoluteWidths[index] - 2 * cellPadding - 4, regularFont, fontSize)
        allLines.push(...wrapped)
      }
      if (allLines.length > maxLinesInRow) maxLinesInRow = allLines.length
      return allLines
    })
    const actualRowHeight = Math.max(rowHeight, lineHeight * maxLinesInRow + 10)
    page.drawRectangle({ x: tableX, y: currentY - actualRowHeight, width: tableWidth, height: actualRowHeight, color: rgb(1, 1, 1) })
    currentX = tableX
    for (let i = 0; i < row.length; i++) {
      for (let j = 0; j < cellLines[i].length; j++) {
        try { page.drawText(cellLines[i][j], { x: currentX + cellPadding, y: currentY - j * lineHeight - lineHeight * 0.75 - 2, size: fontSize, font: regularFont, color: COLORS.black }) } catch { /* skip */ }
      }
      currentX += absoluteWidths[i]
    }
    page.drawRectangle({ x: tableX, y: currentY - actualRowHeight, width: tableWidth, height: actualRowHeight, borderColor: COLORS.black, borderWidth: 1, color: undefined })
    currentX = tableX
    for (let i = 0; i < widths.length - 1; i++) {
      currentX += absoluteWidths[i]
      page.drawLine({ start: { x: currentX, y: currentY }, end: { x: currentX, y: currentY - actualRowHeight }, thickness: 1, color: COLORS.black })
    }
    currentY -= actualRowHeight
  }
  return currentY
}

function drawBulletList(page: DrawablePage, items: string[], yStart: number, font: unknown, fontSize: number) {
  let currentY = yStart
  const lineHeight = fontSize * 1.7, maxTextWidth = page.getWidth() - 90
  for (const item of items) {
    try {
      page.drawText('•', { x: 55, y: currentY, size: fontSize + 1, font, color: COLORS.blue })
      const lines = splitTextIntoLines(item, maxTextWidth, font, fontSize)
      for (let i = 0; i < lines.length; i++) {
        page.drawText(lines[i], { x: 72, y: currentY - i * lineHeight * 0.85, size: fontSize, font, color: COLORS.black })
      }
      currentY -= lineHeight * (lines.length + 0.5)
    } catch { currentY -= lineHeight }
  }
  return currentY
}

function drawNumberedList(page: DrawablePage, items: string[], yStart: number, regularFont: unknown, boldFont: unknown, fontSize: number) {
  let currentY = yStart
  const lineHeight = fontSize * 1.6, maxTextWidth = page.getWidth() - 95
  for (let i = 0; i < items.length; i++) {
    try {
      page.drawText(`${i + 1}.`, { x: 55, y: currentY, size: fontSize, font: boldFont, color: COLORS.blue })
      const lines = splitTextIntoLines(items[i], maxTextWidth, regularFont, fontSize)
      for (let j = 0; j < lines.length; j++) {
        page.drawText(lines[j], { x: 72, y: currentY - j * lineHeight * 0.85, size: fontSize, font: regularFont, color: COLORS.black })
      }
      currentY -= lineHeight * (lines.length + 0.4)
    } catch { currentY -= lineHeight }
  }
  return currentY
}

function drawWrappedText(page: DrawablePage, text: string, x: number, yStart: number, maxWidth: number, font: unknown, fontSize: number, color = COLORS.black) {
  const lineHeight = fontSize * 1.6
  const lines = splitTextIntoLines(text, maxWidth, font, fontSize)
  for (let i = 0; i < lines.length; i++) {
    try { page.drawText(lines[i], { x, y: yStart - i * lineHeight * 0.85, size: fontSize, font, color }) } catch { /* skip */ }
  }
  return yStart - lines.length * lineHeight * 0.85
}

// ── Génération du PDF ────────────────────────────────────────────────────────

async function generate() {
  const dateGeneration = format(new Date(), 'dd/MM/yyyy', { locale: fr })
  const dateDebut = format(chantier.dateDebut, 'MMMM yyyy', { locale: fr })
  const nomEntrepreneurGeneral = chantier.maitreOuvrageNom
  const nomCoordinateur = 'Martin Dubois'
  const telephoneCoordinateur = '04/250.00.00'

  const pdfDoc = await PDFDocument.create()
  pdfDoc.setTitle(`PPSS v2 — Test — ${chantier.nomChantier}`)
  pdfDoc.setAuthor(companyInfo.nom)

  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const italicFont = await pdfDoc.embedFont(StandardFonts.HelveticaOblique)

  // Essai logo
  let logoBase64 = ''
  try {
    const logoBuffer = await readFile(join(process.cwd(), 'public', 'images', 'logo.png'))
    logoBase64 = logoBuffer.toString('base64')
  } catch { /* no logo in test */ }

  const { width, height } = { width: 595, height: 842 }

  // PAGE 1
  const page1 = pdfDoc.addPage([width, height])

  if (logoBase64) {
    try {
      const logoImage = await pdfDoc.embedPng(Buffer.from(logoBase64, 'base64'))
      const logoDims = logoImage.scale(0.45)
      page1.drawImage(logoImage, { x: (width - logoDims.width) / 2, y: height - 95, width: logoDims.width, height: logoDims.height })
    } catch { /* skip */ }
  }

  const titleLine1 = 'PLAN PARTICULIER DE SÉCURITÉ ET DE'
  const titleLine2 = 'PROTECTION DE LA SANTÉ (PPSS)'
  page1.drawText(titleLine1, { x: (width - boldFont.widthOfTextAtSize(titleLine1, FONT_SIZES.title)) / 2, y: height - 175, size: FONT_SIZES.title, font: boldFont, color: COLORS.black })
  page1.drawText(titleLine2, { x: (width - boldFont.widthOfTextAtSize(titleLine2, FONT_SIZES.title)) / 2, y: height - 200, size: FONT_SIZES.title, font: boldFont, color: COLORS.black })
  const refText = 'AR du 25 janvier 2001 — Chantiers temporaires ou mobiles — Code du bien-être, Livre V Titre 4'
  page1.drawText(refText, { x: (width - italicFont.widthOfTextAtSize(refText, FONT_SIZES.tiny)) / 2, y: height - 220, size: FONT_SIZES.tiny, font: italicFont, color: COLORS.gray })

  let yPos = height - 255
  yPos = drawSectionHeader(page1, '1. INFORMATIONS GÉNÉRALES', yPos, boldFont, FONT_SIZES.heading)
  const infoRows = [
    ['Entreprise sous-traitante', companyInfo.nom],
    ['Adresse', companyInfo.adresse],
    ['Téléphone', companyInfo.telephone],
    ['Email', companyInfo.email],
    ['N° TVA', companyInfo.tva],
    ['Chantier', chantier.nomChantier],
    ['Adresse du chantier', chantier.adresseChantier],
    ['Identifiant chantier', chantier.chantierId],
    ['Entrepreneur général / Maître d\'œuvre', nomEntrepreneurGeneral],
    ['Coordinateur sécurité-santé (CSS)', nomCoordinateur]
  ]
  yPos = await drawTable(page1, ['Élément', 'Information'], infoRows, yPos, [35, 65], regularFont, boldFont, FONT_SIZES.small)

  // PAGE 2
  const page2 = pdfDoc.addPage([width, height])
  yPos = height - 50
  yPos = drawSectionHeader(page2, '2. DESCRIPTION DES TRAVAUX', yPos, boldFont, FONT_SIZES.heading)
  yPos = drawWrappedText(page2, `${companyInfo.nom} intervient sur le chantier en qualité de sous-traitant pour la réalisation de travaux de carrelage, comprenant :`, 50, yPos, width - 100, regularFont, FONT_SIZES.normal)
  yPos -= 10
  yPos = drawBulletList(page2, [
    'Préparation des surfaces : nettoyage, nivellement, primaires d\'accrochage.',
    'Manutention des matériaux : transport et stockage des carreaux, colles, joints et accessoires.',
    'Découpe et ajustement des carreaux : carrelette à eau (préférentielle) ou meuleuse.',
    'Pose du carrelage : application de la colle, installation des carreaux, réalisation des joints.',
    'Finitions : nettoyage des surfaces et application de produits de protection si nécessaire.',
    'Gestion des déchets : tri, stockage temporaire et évacuation conforme à la réglementation.'
  ], yPos, regularFont, FONT_SIZES.normal)
  yPos -= 20
  yPos = await drawTable(page2, ['Donnée', 'Valeur'], [
    ['Commencement des travaux', `À partir de ${dateDebut}`],
    ['Horaire de travail', '7h30 – 16h00 (pause 30 min à 12h00)'],
    ['Effectif prévu', '3 personnes en moyenne, 5 au maximum'],
    ['Registre de présence', 'Tenu par le chef d\'équipe — obligation légale (AR 27/03/1998)'],
    ['Formation de base sécurité', 'BA4 ou équivalente requise avant toute intervention']
  ], yPos, [40, 60], regularFont, boldFont, FONT_SIZES.normal)

  // PAGE 3
  const page3 = pdfDoc.addPage([width, height])
  yPos = height - 50
  yPos = drawSectionHeader(page3, '3. ANALYSE DES RISQUES ET MESURES DE PRÉVENTION', yPos, boldFont, FONT_SIZES.heading)
  page3.drawText('Voir §3.1, §3.2 et §3.3 pour les développements détaillés sur la silice, les vibrations et les brûlures alcalines.', { x: 50, y: yPos, size: FONT_SIZES.tiny, font: italicFont, color: COLORS.gray })
  yPos -= 18
  yPos = await drawTable(page3, ['Tâches / Situation', 'Risques identifiés', 'Mesures de prévention'], [
    ['Préparation des surfaces', 'Poussière / silice cristalline\nTroubles musculo-squelettiques', 'Aspiration + masque FFP2 minimum\nDécoupe à l\'eau (silice)\nFormation postures de travail'],
    ['Manutention des matériaux', 'Surcharge lombaire\nChutes d\'objets / glissades', 'Équipements de levage si > 25 kg\nChaussures S1P antidérapantes\nFormation manutention'],
    ['Découpe et ajustement', 'Coupures — projections de débris\nBruit — Vibrations mains-bras\nSilice cristalline (meulage à sec)', 'Gants anti-coupures EN 388, lunettes EN 166\nProtections auditives EN 352\nDécoupe à l\'eau obligatoire — voir §3.1'],
    ['Pose du carrelage', 'Inhalation COV (colle/joint)\nTroubles musculo-squelettiques\nBrûlures alcalines (ciment pH>12)', 'Colles faible émission COV, ventilation\nGenouillères EN 14404, alternance tâches\nGants nitrile EN 374 — voir §3.3'],
    ['Finitions', 'Glissades (sols mouillés)\nProjections de produits de nettoyage', 'Signalisation zones mouillées\nGants + lunettes de protection\nNettoyage immédiat des déversements'],
    ['Gestion des déchets', 'Coupures avec débris\nBoues de découpe (silice en suspension)', 'Gants résistants aux coupures\nBoues collectées, pas de rejet direct égout\nBordereau de suivi déchets dangereux'],
    ['Risque électrique', 'Électrisation par outillage défectueux\nArc électrique (câbles endommagés)', 'PRCD obligatoire sur chaque poste\nOutils de classe II, câbles vérifiés\nInterdiction d\'alimenter un câble dégradé'],
    ['Coactivité', 'Collision entre corps de métier\nDéplacements matières dangereuses', 'Coordination avec CSS — PGP consulté\nDélimitation et signalisation des zones\nInfo mutuelle avant démarrage journée']
  ], yPos, [23, 38, 39], regularFont, boldFont, FONT_SIZES.tiny)

  // PAGE 4
  const page4 = pdfDoc.addPage([width, height])
  yPos = height - 50
  yPos = drawSubSectionHeader(page4, '§3.1 — Silice cristalline alvéolaire (risque cancérigène IARC Groupe 1)', yPos, boldFont, FONT_SIZES.subheading)
  yPos -= 5
  yPos = drawWrappedText(page4, 'La découpe de carreaux en céramique, grès cérame ou pierre naturelle libère de la silice cristalline (quartz) classée cancérigène par le CIRC. Des mesures spécifiques s\'appliquent :', 50, yPos, width - 100, regularFont, FONT_SIZES.normal)
  yPos -= 8
  yPos = drawBulletList(page4, [
    'Découpe à l\'eau systématique — utilisation de la carrelette avec bac d\'eau (méthode préférentielle).',
    'Découpe à sec strictement interdite sauf impossibilité technique — dans ce cas : aspiration classe H à la source, masque FFP3 (EN 149 : 2001+A1), zone évacuée pendant l\'opération.',
    'Masque FFP2 obligatoire pour préparation de supports poussiéreux et ponçage léger.',
    'Masque FFP3 obligatoire pour meulage ou ponçage de matériaux siliceux.',
    'Surveillance médicale renforcée via IDEWE pour tout travailleur exposé régulièrement à la silice.',
    'Information individuelle obligatoire de chaque travailleur avant démarrage sur le risque silice.'
  ], yPos, regularFont, FONT_SIZES.normal)
  page4.drawText('Réf. : Guide SPF Emploi — silice cristalline sur chantiers / Code du bien-être Livre VI Titre 2.', { x: 50, y: yPos, size: FONT_SIZES.tiny, font: italicFont, color: COLORS.gray })
  yPos -= 30

  yPos = drawSubSectionHeader(page4, '§3.2 — Vibrations mains-bras', yPos, boldFont, FONT_SIZES.subheading)
  yPos -= 5
  yPos = drawWrappedText(page4, 'La meuleuse d\'angle, la carrelette motorisée et le marteau-piqueur exposent aux vibrations mains-bras (risque de syndrome de Raynaud professionnel, neuropathies). Mesures appliquées :', 50, yPos, width - 100, regularFont, FONT_SIZES.normal)
  yPos -= 8
  yPos = drawBulletList(page4, [
    'Rotation des opérateurs : durée d\'utilisation des outils vibrants limitée par travailleur.',
    'Outils anti-vibratiles certifiés préférés ; entretien régulier (lames, disques, amortisseurs).',
    'Signalement immédiat au responsable et au médecin du travail de tout fourmillement ou blanchiment des doigts.',
    'Valeur d\'exposition journalière : limite AR du 7 juillet 2005 (A(8) ≤ 5 m/s², niveau d\'action 2,5 m/s²).'
  ], yPos, regularFont, FONT_SIZES.normal)
  page4.drawText('Réf. : AR du 7 juillet 2005 relatif à la protection des travailleurs contre les vibrations.', { x: 50, y: yPos, size: FONT_SIZES.tiny, font: italicFont, color: COLORS.gray })
  yPos -= 30

  yPos = drawSubSectionHeader(page4, '§3.3 — Dermite de contact et brûlures alcalines', yPos, boldFont, FONT_SIZES.subheading)
  yPos -= 5
  yPos = drawWrappedText(page4, 'Les colles, mortiers et jointures à base de ciment Portland présentent un pH supérieur à 12. Le contact prolongé provoque des brûlures chimiques profondes sans sensation immédiate. Mesures :', 50, yPos, width - 100, regularFont, FONT_SIZES.normal)
  yPos -= 8
  yPos = drawBulletList(page4, [
    'Gants nitrile longue manchette (EN 374) obligatoires pour tout contact avec colles, mortiers ou produits de nettoyage.',
    'Crème barrière appliquée avant chaque prise de poste sur les zones non couvertes.',
    'Utilisation préférentielle de ciments conformes EN 197 à teneur réduite en chrome VI (< 2 ppm).',
    'Signalement immédiat au médecin du travail IDEWE en cas d\'irritation, rougeur ou vésicules persistantes.',
    'Rinçage prolongé à l\'eau claire (15 min minimum) en cas de contact cutané accidentel avec un produit alcalin.'
  ], yPos, regularFont, FONT_SIZES.normal)

  // PAGE 5
  const page5 = pdfDoc.addPage([width, height])
  yPos = height - 50
  yPos = drawSectionHeader(page5, '4. ORGANISATION DU CHANTIER', yPos, boldFont, FONT_SIZES.heading)
  yPos = drawBulletList(page5, [
    'Coordination des interventions : planification journalière concertée avec les autres corps de métier et le CSS ; consultation du PGP (Plan Général de Prévention) avant tout démarrage.',
    'Zones de stockage : espaces définis, signalisés, sécurisés contre les chutes et l\'accès non autorisé. Produits chimiques stockés en bacs de rétention.',
    'Signalisation et panneaux EPI : affichés à l\'accès de chaque zone de travail.',
    'Installations sanitaires : sanitaires propres accessibles en permanence au personnel.',
    'Circulation : voies dégagées et sécurisées, signalisation claire aux intersections avec d\'autres corps de métier.',
    'Protocole travailleur isolé : check-in/check-out obligatoire au bureau ou par téléphone si un travailleur intervient seul sur le chantier.',
    'Accès visiteurs : toute personne extérieure à l\'équipe doit être accompagnée et équipée des EPI appropriés.'
  ], yPos, regularFont, FONT_SIZES.normal)
  yPos -= 25

  yPos = drawSectionHeader(page5, '5. CONSIGNES EN CAS D\'URGENCE', yPos, boldFont, FONT_SIZES.heading)
  yPos = drawSubSectionHeader(page5, 'Numéros d\'urgence', yPos, boldFont, FONT_SIZES.subheading)
  yPos = await drawTable(page5, ['Numéro', 'Service'], [
    ['112', 'Urgences générales (pompiers, SMUR, police)'],
    ['100', 'Ambulance / SMUR'],
    ['101', 'Police'],
    ['070 / 245 245', 'Centre Antipoisons — intoxications, brûlures chimiques'],
    [telephoneCoordinateur, `CSS — Coordinateur sécurité : ${nomCoordinateur}`]
  ], yPos, [30, 70], regularFont, boldFont, FONT_SIZES.normal)
  yPos -= 15

  yPos = drawSubSectionHeader(page5, 'Procédure en cas d\'accident', yPos, boldFont, FONT_SIZES.subheading)
  yPos = drawNumberedList(page5, [
    'Protéger : sécuriser la zone sans se mettre en danger.',
    'Alerter : composer le 112 (localisation du chantier, nature de l\'accident, nombre de blessés).',
    'Secourir : appliquer les gestes de premiers secours, utiliser la trousse de secours.',
    'Accueillir : désigner une personne pour guider les secours depuis l\'entrée du chantier.',
    'Déclarer : tout accident de travail doit être déclaré à Fédérale Assurance dans les 8 jours ouvrables.'
  ], yPos, regularFont, boldFont, FONT_SIZES.normal)

  // PAGE 6
  const page6 = pdfDoc.addPage([width, height])
  yPos = height - 50
  yPos = drawSubSectionHeader(page6, 'Moyens de première intervention', yPos, boldFont, FONT_SIZES.subheading)
  yPos = drawBulletList(page6, [
    'Trousse de secours complète maintenue sur le chantier et vérifiée mensuellement.',
    'Flacon de sérum physiologique (500 ml minimum) pour lavage oculaire en cas de projection de produit alcalin.',
    'Extincteur portatif (6 kg poudre ABC ou CO₂ si local électrique) accessible à tout moment.',
    'Couverture anti-feu disponible à proximité des zones de découpe.'
  ], yPos, regularFont, FONT_SIZES.normal)
  yPos -= 15

  yPos = drawSubSectionHeader(page6, 'Procédure incendie', yPos, boldFont, FONT_SIZES.subheading)
  yPos = drawNumberedList(page6, [
    'Donner l\'alarme : cri d\'alarme « AU FEU », activation du signal d\'alarme du chantier si disponible.',
    'Évacuer : évacuation immédiate par les voies dégagées vers le point de rassemblement défini par le CSS.',
    'Attaquer (seulement si feu naissant et sans risque personnel) : utiliser l\'extincteur adapté.',
    'Appeler le 112 : préciser la nature du feu, la localisation et le nombre de personnes évacuées.',
    'Ne jamais utiliser les ascenseurs. Ne pas revenir sur les lieux avant autorisation des pompiers.'
  ], yPos, regularFont, boldFont, FONT_SIZES.normal)
  yPos -= 25

  yPos = drawSectionHeader(page6, '6. ÉQUIPEMENTS DE PROTECTION INDIVIDUELLE (EPI)', yPos, boldFont, FONT_SIZES.heading)
  yPos = await drawTable(page6, ['EPI', 'Norme', 'Tâches concernées'], [
    ['Casque de chantier', 'EN 397', 'Zones avec risque de chute d\'objets'],
    ['Lunettes de protection', 'EN 166', 'Découpe, projection de débris, produits chimiques'],
    ['Masque FFP2', 'EN 149 : 2001+A1', 'Poussières — préparation surfaces, ponçage léger'],
    ['Masque FFP3', 'EN 149 : 2001+A1', 'Meulage/ponçage matériaux siliceux, découpe à sec'],
    ['Gants anti-coupures', 'EN 388', 'Manipulation carreaux, outils tranchants'],
    ['Gants nitrile manchette', 'EN 374', 'Contact colles, mortiers, produits alcalins (pH > 12)'],
    ['Chaussures de sécurité', 'EN ISO 20345 S1P', 'Toutes zones de travail'],
    ['Protections auditives', 'EN 352', 'Outils bruyants : meuleuse, marteau-piqueur (> 80 dB)'],
    ['Genouillères', 'EN 14404', 'Pose du carrelage au sol'],
    ['Harnais anti-chute', 'EN 361', 'Travaux en hauteur si hauteur de chute > 2 m']
  ], yPos, [28, 24, 48], regularFont, boldFont, FONT_SIZES.tiny)

  // PAGE 7
  const page7 = pdfDoc.addPage([width, height])
  yPos = height - 50
  yPos = drawSectionHeader(page7, '7. GESTION DES DÉCHETS', yPos, boldFont, FONT_SIZES.heading)
  yPos = await drawTable(page7, ['Type de déchet', 'Traitement / Évacuation', 'Remarques'], [
    ['Chutes de carreaux (inertes)', 'Benne inertes — collecteur agréé', 'Contrôler humidité (poussière silice)'],
    ['Emballages carton/plastique', 'Conteneur recyclage ou déchetterie', 'Pas de brûlage sur chantier'],
    ['Colles et joints (non durci)', 'Déchet dangereux — collecteur agréé', 'Jamais dans les égouts'],
    ['Boues de découpe à l\'eau', 'Collectées — décantation avant rejet', 'Interdiction rejet direct égout (silice)'],
    ['Solvants et produits chimiques', 'Déchet dangereux — bordereau de suivi', 'Stockage en bac de rétention'],
    ['EPI usagés souillés (gants, masques)', 'Déchet dangereux ou assimilé', 'Sac fermé — ne pas mélanger aux ordures']
  ], yPos, [32, 38, 30], regularFont, boldFont, FONT_SIZES.tiny)
  yPos -= 25

  yPos = drawSectionHeader(page7, '8. MESURES SPÉCIFIQUES AU CHANTIER', yPos, boldFont, FONT_SIZES.heading)
  yPos = drawBulletList(page7, [
    `Prise de connaissance du PSS de l\'entrepreneur général (${nomEntrepreneurGeneral}) avant le démarrage — tout écart doit être signalé au CSS.`,
    `Coordination avec le coordinateur sécurité-santé (CSS : ${nomCoordinateur}, tél. ${telephoneCoordinateur}) — information immédiate en cas de modification des méthodes de travail.`,
    'Conditions météo extrêmes : en cas de chaleur ≥ 30 °C, prévoir eau potable en quantité suffisante, pauses régulières à l\'ombre, horaires aménagés si possible. En cas de gel, les colles et mortiers ne peuvent être posés en dessous de +5 °C.',
    'Éclairage : minimum 100 lux en zone de travail, 300 lux pour travaux de précision — éclairage de secours prévu en cas de coupure.',
    'Modifications du PPSS : toute modification significative des conditions de chantier implique une mise à jour de ce document et sa validation par le CSS.'
  ], yPos, regularFont, FONT_SIZES.normal)

  // PAGE 8
  const page8 = pdfDoc.addPage([width, height])
  yPos = height - 50
  yPos = drawSectionHeader(page8, '9. INFORMATION ET FORMATION DES TRAVAILLEURS', yPos, boldFont, FONT_SIZES.heading)
  yPos = drawBulletList(page8, [
    'Information individuelle sur les risques identifiés dans ce PPSS : remise documentaire et explication orale avant la première intervention de chaque travailleur.',
    'Formation PSMT (Premiers Secours en Milieu de Travail) : au minimum un travailleur par équipe doit être formé PSMT valide.',
    'Formation spécifique silice cristalline : obligatoire pour tout travailleur intervenant en découpe ou ponçage.',
    'Formation manutention manuelle : dispensée avant affectation à des tâches de port de charges lourdes.',
    'Registre des formations : conservé au siège de l\'entreprise et mis à disposition de l\'inspection du travail sur demande.',
    'Accueil sécurité chantier : réalisé par le chef d\'équipe le premier jour d\'intervention.'
  ], yPos, regularFont, FONT_SIZES.normal)
  yPos -= 20

  yPos = drawSectionHeader(page8, '10. RESPONSABLES ET CONTACTS', yPos, boldFont, FONT_SIZES.heading)
  yPos = await drawTable(page8, ['Rôle', 'Nom / Entité', 'Téléphone'], [
    ['Responsable entreprise', 'Maccio Grégory', companyInfo.telephone],
    [`CSS — Coordinateur`, nomCoordinateur, telephoneCoordinateur],
    ['Médecin du travail (IDEWE)', 'Dr Van Neuss Ingrid', '04/341.33.69'],
    ['Centre Antipoisons', '—', '070 / 245 245'],
    ['Urgences générales', '—', '112']
  ], yPos, [38, 35, 27], regularFont, boldFont, FONT_SIZES.normal)
  yPos -= 20

  yPos = drawSectionHeader(page8, '11. VALIDATION DU PPSS', yPos, boldFont, FONT_SIZES.heading)
  yPos = drawWrappedText(page8, `Par la présente, ${companyInfo.nom} s\'engage à respecter les mesures définies dans ce PPSS ainsi que dans le PSS de l\'entrepreneur général. Les engagements suivants sont pris :`, 50, yPos, width - 100, regularFont, FONT_SIZES.normal)
  yPos -= 8
  yPos = drawBulletList(page8, [
    'Prise de connaissance et respect du PSS de l\'entrepreneur général et du plan d\'installation de chantier.',
    'Information du CSS de toute modification des méthodes de travail ou introduction d\'un risque nouveau.',
    'Tenue rigoureuse du registre de présence des travailleurs (AR du 27 mars 1998).',
    'Équipement systématique de chaque travailleur avec les EPI adaptés aux risques identifiés.',
    'Déclaration à l\'inspection du travail et à l\'assureur de tout accident de travail dans les délais légaux.'
  ], yPos, regularFont, FONT_SIZES.normal)
  yPos -= 15

  if (yPos > 180) {
    page8.drawRectangle({ x: 50, y: yPos - 120, width: width - 100, height: 120, borderColor: COLORS.black, borderWidth: 1 })
    page8.drawText('Responsable de l\'entreprise : Maccio Grégory', { x: 70, y: yPos - 25, size: FONT_SIZES.normal, font: regularFont, color: COLORS.black })
    page8.drawText(`Date : ${dateGeneration}`, { x: 70, y: yPos - 45, size: FONT_SIZES.normal, font: regularFont, color: COLORS.black })
    page8.drawText('Signature :', { x: 70, y: yPos - 65, size: FONT_SIZES.normal, font: regularFont, color: COLORS.black })
    page8.drawLine({ start: { x: 145, y: yPos - 65 }, end: { x: 400, y: yPos - 65 }, thickness: 0.5, color: COLORS.gray })
  }

  const legalNote = 'AR du 25/01/2001 chantiers temporaires ou mobiles — Code du bien-être au travail, Livre V Titre 4 (transposition directive 92/57/CEE)'
  page8.drawText(legalNote, { x: 50, y: 30, size: FONT_SIZES.tiny, font: italicFont, color: COLORS.gray })

  // Pagination
  const pageCount = pdfDoc.getPageCount()
  for (let i = 0; i < pageCount; i++) {
    const p = pdfDoc.getPage(i)
    p.drawText(`Page ${i + 1} / ${pageCount}`, { x: p.getWidth() - 105, y: 18, size: FONT_SIZES.tiny, font: regularFont, color: COLORS.gray })
  }

  const pdfBytes = await pdfDoc.save()
  const outputPath = '/tmp/ppss-test.pdf'
  await writeFile(outputPath, pdfBytes)
  console.log(`✅ PDF généré : ${outputPath}  (${pdfBytes.length} octets, ${pageCount} pages)`)
}

generate().catch(err => { console.error('❌ Erreur :', err); process.exit(1) })
