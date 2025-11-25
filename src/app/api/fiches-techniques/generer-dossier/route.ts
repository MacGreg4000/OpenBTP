import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PDFDocument, rgb } from 'pdf-lib'
import fs from 'fs'
import path from 'path'
import { prisma } from '@/lib/prisma/client'
import { PDFGenerator } from '@/lib/pdf/pdf-generator'
import { generateFicheTechniqueCoverHTML, type FicheTechniqueCoverData } from '@/lib/pdf/templates/fiche-technique-template'
import { generateDossierTechniqueCoverHTML, type DossierTechniqueCoverData } from '@/lib/pdf/templates/dossier-technique-template'
import { readFile } from 'fs/promises'

// Fonction pour vérifier si un chantier a un dossier personnalisé
function hasCustomFiches(chantierId: string): boolean {
  const customPath = path.join(process.cwd(), 'public', 'chantiers', chantierId, 'fiches-techniques')
  return fs.existsSync(customPath) && fs.statSync(customPath).isDirectory()
}

// Fonction pour obtenir le chemin de base des fiches techniques (personnalisé ou standard)
function getFichesBaseDir(chantierId?: string): string {
  if (chantierId && hasCustomFiches(chantierId)) {
    return path.join(process.cwd(), 'public', 'chantiers', chantierId, 'fiches-techniques')
  }
  return path.join(process.cwd(), 'public', 'fiches-techniques')
}

// Fonction récursive pour chercher un fichier PDF dans un dossier et ses sous-dossiers
function findPdfRecursive(dir: string, fileName: string): string | null {
  try {
    const items = fs.readdirSync(dir)
    for (const item of items) {
      const fullPath = path.join(dir, item)
      const stat = fs.statSync(fullPath)
      
      if (stat.isDirectory()) {
        // Chercher récursivement dans les sous-dossiers
        const found = findPdfRecursive(fullPath, fileName)
        if (found) return found
      } else if (item === fileName || item === `${fileName}.pdf` || (fileName.endsWith('.pdf') && item === fileName)) {
        // Fichier trouvé
        return fullPath
      }
    }
  } catch (error) {
    console.error(`Erreur lors de la recherche récursive dans ${dir}:`, error)
  }
  return null
}

// Fonction pour trouver un fichier PDF dans un dossier et ses sous-dossiers
async function findPdfFile(baseDir: string, fileName: string, chantierId?: string): Promise<string | null> {
  console.log(`🔍 [findPdfFile] Recherche: "${fileName}" dans ${baseDir}${chantierId ? ` (chantier: ${chantierId})` : ''}`)
  
  try {
    const isCustom = chantierId ? hasCustomFiches(chantierId) : false
    
    // PRIORITÉ 1: Si c'est un chemin complet relatif depuis public (ex: "chantiers/CH-XXX/fiches-techniques/...")
    // C'est le cas normal quand on utilise l'ID de la fiche depuis l'API structure
    if (fileName.startsWith('chantiers/') || fileName.startsWith('fiches-techniques/')) {
      const fullPath = path.join(process.cwd(), 'public', fileName)
      if (fs.existsSync(fullPath)) {
        // Vérifier que le fichier trouvé est dans le bon dossier
        if (isCustom && !fullPath.includes(`chantiers/${chantierId}/fiches-techniques`)) {
          console.warn(`⚠️ [findPdfFile] Fichier trouvé dans le mauvais dossier! ID: ${fileName}, Chemin: ${fullPath}`)
          return null // Ne pas retourner un fichier du mauvais dossier
        }
        if (!isCustom && fullPath.includes(`chantiers/${chantierId}`)) {
          console.warn(`⚠️ [findPdfFile] Fichier trouvé dans le dossier personnalisé alors qu'on utilise le standard!`)
          return null
        }
        console.log(`✅ [findPdfFile] Fichier trouvé via chemin complet: ${fullPath}`)
        return fullPath
      } else {
        console.log(`❌ [findPdfFile] Chemin complet n'existe pas: ${fullPath}`)
      }
    }
    
    // PRIORITÉ 2: Si on a un dossier personnalisé, NE JAMAIS chercher dans le dossier standard
    // Chercher uniquement dans le dossier personnalisé
    if (isCustom) {
      // Normaliser le nom de fichier
      const searchName = fileName.toLowerCase().endsWith('.pdf') ? fileName : `${fileName}.pdf`
      
      // Chercher directement dans le dossier de base
      const directPath = path.join(baseDir, searchName)
      if (fs.existsSync(directPath)) {
        console.log(`✅ [findPdfFile] Fichier trouvé directement: ${directPath}`)
        return directPath
      }
      
      // Chercher récursivement dans le dossier personnalisé uniquement
      const foundPath = findPdfRecursive(baseDir, searchName)
      if (foundPath) {
        console.log(`✅ [findPdfFile] Fichier trouvé récursivement: ${foundPath}`)
        return foundPath
      }
      
      console.log(`❌ [findPdfFile] Fichier non trouvé dans le dossier personnalisé: ${baseDir}`)
      return null
    }
    
    // PRIORITÉ 3: Si on utilise le dossier standard, chercher normalement
    const searchName = fileName.toLowerCase().endsWith('.pdf') ? fileName : `${fileName}.pdf`
    
    // Chercher directement dans le dossier de base
    const directPath = path.join(baseDir, searchName)
    if (fs.existsSync(directPath)) {
      console.log(`✅ [findPdfFile] Fichier trouvé directement: ${directPath}`)
      return directPath
    }
    
    // Chercher récursivement dans le dossier standard
    const foundPath = findPdfRecursive(baseDir, searchName)
    if (foundPath) {
      console.log(`✅ [findPdfFile] Fichier trouvé récursivement: ${foundPath}`)
      return foundPath
    }
    
    // Essayer les dossiers connus (pour compatibilité avec l'ancien système)
    const standardBaseDir = path.join(process.cwd(), 'public', 'fiches-techniques')
    if (baseDir === standardBaseDir) {
      const carrelagePath = path.join(standardBaseDir, 'Carrelage', searchName)
      if (fs.existsSync(carrelagePath)) {
        console.log(`✅ [findPdfFile] Fichier trouvé dans Carrelage: ${carrelagePath}`)
        return carrelagePath
      }
      
      const produitsTechniquePath = path.join(standardBaseDir, 'Produits Technique')
      const knownSubdirs = ['Colle', 'Etanchéité', 'Joint', 'Silicone']
      
      for (const subdir of knownSubdirs) {
        const ptPath = path.join(produitsTechniquePath, subdir, searchName)
        if (fs.existsSync(ptPath)) {
          console.log(`✅ [findPdfFile] Fichier trouvé dans ${subdir}: ${ptPath}`)
          return ptPath
        }
      }
    }
    
    console.log(`❌ [findPdfFile] Aucun fichier correspondant à "${fileName}" trouvé dans ${baseDir}`)
    return null
  } catch (error) {
    console.error(`❌ [findPdfFile] Erreur lors de la recherche:`, error)
    return null
  }
}

// Fonction pour normaliser les caractères spéciaux
function normalizeText(text: string): string {
  return text
    .normalize('NFD') // Décompose les caractères accentués
    .replace(/[\u0300-\u036f]/g, '') // Supprime les diacritiques
    .replace(/[^\x00-\x7F]/g, '') // Supprime tous les caractères non-ASCII
    .trim();
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { chantierId, ficheIds, ficheReferences, options, dossierId, fichesStatuts, fichesSoustraitants, fichesRemarques } = await request.json()
    console.log('📥 [API] Données reçues:')
    console.log('  - Fiches techniques sélectionnées:', ficheIds)
    console.log('  - Références des fiches:', ficheReferences)
    console.log('  - Dossier ID (si régénération):', dossierId)
    console.log('  - Statuts des fiches:', fichesStatuts)
    console.log('  - Sous-traitants des fiches:', fichesSoustraitants)
    console.log('  - Remarques des fiches:', fichesRemarques)
    
    // Vérifier que les sous-traitants sont bien présents
    if (fichesSoustraitants && Object.keys(fichesSoustraitants).length > 0) {
      console.log('✅ [API] Sous-traitants reçus:', Object.keys(fichesSoustraitants).length, 'fiches avec sous-traitants')
    } else {
      console.warn('⚠️ [API] AUCUN sous-traitant reçu dans la requête!')
    }

    // Tableau pour stocker les erreurs éventuelles
    const errors: string[] = []

    // Récupérer les informations du chantier
    const chantier = await prisma.chantier.findUnique({
      where: { chantierId },
      include: { 
        client: true 
      }
    })

    if (!chantier) {
      return NextResponse.json({ error: 'Chantier non trouvé' }, { status: 404 })
    }

    // Récupérer les paramètres de l'entreprise
    const settings = await prisma.companysettings.findFirst()
    if (!settings) {
      return NextResponse.json({ error: 'Paramètres de l\'entreprise non trouvés' }, { status: 404 })
    }

    // Récupérer l'utilisateur
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 })
    }

    // Si dossierId est fourni, récupérer le dossier existant pour déterminer la version
    let dossierExistant = null
    let nouvelleVersion = 1
    if (dossierId) {
      dossierExistant = await prisma.dossierTechnique.findUnique({
        where: { id: dossierId },
        include: { fiches: true }
      })
      if (dossierExistant) {
        nouvelleVersion = dossierExistant.version + 1
      }
    }

    // Charger le logo en base64
    let logoBase64 = ''
    if (settings.logo) {
      try {
        const logoPath = path.join(process.cwd(), 'public', settings.logo)
        if (fs.existsSync(logoPath)) {
          const logoBuffer = await readFile(logoPath)
          logoBase64 = logoBuffer.toString('base64')
        }
      } catch (error) {
        console.warn('Impossible de charger le logo:', error)
      }
    }

    // Créer un nouveau document PDF pour fusionner tous les PDFs
    const finalPdfDoc = await PDFDocument.create()

    // ===== 1. GÉNÉRER LA PAGE DE GARDE DU DOSSIER =====
    const dateGeneration = new Date()
    const fichesValidees = fichesStatuts ? Object.values(fichesStatuts).filter((s: string) => s === 'VALIDEE').length : 0
    const fichesNouvelles = fichesStatuts ? Object.values(fichesStatuts).filter((s: string) => s === 'NOUVELLE_PROPOSITION').length : 0
    
    const dossierCoverData: DossierTechniqueCoverData = {
      settings: {
        name: settings.name,
        address: settings.address || '',
        zipCode: settings.zipCode || '',
        city: settings.city || '',
        phone: settings.phone || '',
        email: settings.email || '',
        logo: settings.logo || undefined
      },
      chantier: {
        chantierId: chantier.chantierId,
        nomChantier: chantier.nomChantier || '',
        adresseChantier: chantier.adresseChantier,
        villeChantier: chantier.villeChantier,
        client: chantier.client ? { nom: chantier.client.nom } : undefined,
        dateDebut: chantier.dateDebut,
        maitreOuvrageNom: chantier.maitreOuvrageNom,
        maitreOuvrageAdresse: chantier.maitreOuvrageAdresse,
        maitreOuvrageLocalite: chantier.maitreOuvrageLocalite,
        bureauArchitectureNom: chantier.bureauArchitectureNom,
        bureauArchitectureAdresse: chantier.bureauArchitectureAdresse,
        bureauArchitectureLocalite: chantier.bureauArchitectureLocalite
      },
      dossier: {
        version: nouvelleVersion,
        dateGeneration: dateGeneration,
        datePremiereGeneration: dossierExistant ? dossierExistant.dateGeneration : null,
        nombreFiches: ficheIds.length,
        fichesValidees: fichesValidees,
        fichesNouvelles: fichesNouvelles
      },
      logoBase64: logoBase64 || undefined
    }

    const dossierCoverHTML = generateDossierTechniqueCoverHTML(dossierCoverData)
    const dossierCoverPDF = await PDFGenerator.generatePDF(dossierCoverHTML, {
      format: 'A4',
      orientation: 'portrait',
      margins: {
        top: '10mm',
        right: '10mm',
        bottom: '10mm',
        left: '10mm'
      }
    })

    // Ajouter la page de garde au PDF final
    const dossierCoverPdfDoc = await PDFDocument.load(dossierCoverPDF)
    const dossierCoverPages = await finalPdfDoc.copyPages(dossierCoverPdfDoc, dossierCoverPdfDoc.getPageIndices())
    dossierCoverPages.forEach(page => finalPdfDoc.addPage(page))

    // ===== 2. GÉNÉRER LA TABLE DES MATIÈRES (si demandé) =====
    if (options?.includeTableOfContents) {
      // D'abord, calculer le nombre de pages de chaque fiche PDF pour la numérotation
      const pagesInfo: Array<{ id: string; path: string; startPage: number; pageCount: number; name: string }> = []
      let pageCount = 2 // Commencer à 2 (après la page de garde et la table des matières)
      
      // Première analyse pour calculer les numéros de page
      const baseDir = getFichesBaseDir(chantierId)
      for (const ficheId of ficheIds) {
        const fichePath = await findPdfFile(baseDir, ficheId, chantierId)
        
        if (fichePath) {
          try {
            const ficheBytes = await readFile(fichePath)
            const fichePdf = await PDFDocument.load(ficheBytes)
            const nbPages = fichePdf.getPageCount()
            
            const ficheName = path.basename(fichePath, '.pdf')
              .replace(/_/g, ' ')
              .replace(/-/g, ' ')
              .split(' ')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ')
            
            // Ajouter les informations dans pagesInfo
            pagesInfo.push({
              id: ficheId,
              path: fichePath,
              startPage: pageCount,
              pageCount: nbPages,
              name: ficheName
            })
            
            // Mise à jour du compteur de pages (une page de couverture + les pages du PDF)
            pageCount += 1 + nbPages
          } catch (error) {
            console.error(`Erreur lors de l'analyse de ${fichePath}:`, error)
            // Ajouter quand même une entrée avec une page estimée
            pagesInfo.push({
              id: ficheId,
              path: fichePath,
              startPage: pageCount,
              pageCount: 1,
              name: path.basename(fichePath, '.pdf')
            })
            pageCount += 2 // Couverture + 1 page estimée
          }
        }
      }
      
      // Générer la table des matières en HTML
      const tocHTML = `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Table des Matières</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 11px;
            line-height: 1.5;
            color: #2d3748;
            background: white;
            width: 100%;
            min-height: 100vh;
        }
        
        .container {
            max-width: 100%;
            margin: 0 auto;
            padding: 20px;
            background: white;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
        }
        
        .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #e2e8f0;
        }
        
        .logo-section {
            flex: 1;
        }
        
        .logo {
            max-width: 140px;
            max-height: 70px;
            object-fit: contain;
        }
        
        .company-info {
            margin-top: 10px;
            font-size: 9px;
            color: #64748b;
            line-height: 1.4;
        }
        
        .document-title {
            flex: 2;
            text-align: center;
            padding: 0 30px;
        }
        
        .document-title h1 {
            font-size: 24px;
            font-weight: bold;
            color: #1e40af;
            margin-bottom: 5px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .toc-list {
            margin-top: 30px;
            flex: 1;
        }
        
        .toc-item {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 18px;
            padding-bottom: 12px;
            border-bottom: 1px solid #f1f5f9;
        }
        
        .toc-item-title {
            flex: 1;
            font-size: 12px;
            color: #374151;
            line-height: 1.6;
            word-wrap: break-word;
        }
        
        .toc-item-dots {
            flex: 0 0 auto;
            padding: 0 12px;
            font-size: 11px;
            color: #cbd5e1;
        }
        
        .toc-item-page {
            flex: 0 0 auto;
            font-size: 12px;
            font-weight: 600;
            color: #1e40af;
            min-width: 35px;
            text-align: right;
        }
        
        @media print {
            body { font-size: 10px; }
            .container { padding: 15px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo-section">
                ${logoBase64 ? `<img src="data:image/png;base64,${logoBase64}" alt="Logo" class="logo">` : `
                    <div style="width: 140px; height: 70px; background: linear-gradient(135deg, #1e40af 0%, #3b82f6 50%, #60a5fa 100%); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 16px; margin-bottom: 10px;">
                        ${settings.name.substring(0, 3).toUpperCase()}
                    </div>
                `}
                <div class="company-info">
                    <div><strong>${settings.name}</strong></div>
                    <div>${settings.address}</div>
                    <div>${settings.zipCode} ${settings.city}</div>
                </div>
            </div>
            
            <div class="document-title">
                <h1>TABLE DES MATIÈRES</h1>
            </div>
        </div>
        
        <div class="toc-list">
            ${pagesInfo.map(info => {
              const displayName = ficheReferences && ficheReferences[info.id] 
                ? `${info.name} - Réf CSC: ${ficheReferences[info.id]}`
                : info.name
              return `
                <div class="toc-item">
                    <div class="toc-item-title">${normalizeText(displayName)}</div>
                    <div class="toc-item-dots">${'·'.repeat(25)}</div>
                    <div class="toc-item-page">${info.startPage}</div>
                </div>
              `
            }).join('')}
        </div>
        
        <div style="margin-top: auto; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 9px; color: #64748b; text-align: center;">
            <p>© ${settings.name} - ${settings.address}, ${settings.zipCode} ${settings.city}</p>
        </div>
    </div>
</body>
</html>
      `
      
      const tocPDF = await PDFGenerator.generatePDF(tocHTML, {
        format: 'A4',
        orientation: 'portrait',
        margins: {
          top: '10mm',
          right: '10mm',
          bottom: '10mm',
          left: '10mm'
        }
      })
      
      // Ajouter la table des matières au PDF final
      const tocPdfDoc = await PDFDocument.load(tocPDF)
      const tocPages = await finalPdfDoc.copyPages(tocPdfDoc, tocPdfDoc.getPageIndices())
      tocPages.forEach(page => finalPdfDoc.addPage(page))
    }

    // ===== 3. GÉNÉRER LES PAGES DE COUVERTURE ET AJOUTER LES FICHES =====
    const baseDir = getFichesBaseDir(chantierId)
    const isCustom = hasCustomFiches(chantierId || '')
    console.log(`📁 [API] Génération du dossier - BaseDir: ${baseDir}, IsCustom: ${isCustom}, ChantierId: ${chantierId}`)
    console.log(`📋 [API] Fiches à traiter (${ficheIds.length}):`, ficheIds)
    
    for (let index = 0; index < ficheIds.length; index++) {
      const ficheId = ficheIds[index]
      try {
        console.log(`🔍 [API] Recherche du fichier ${index + 1}/${ficheIds.length}: ${ficheId}`)
        const fichePath = await findPdfFile(baseDir, ficheId, chantierId)
        
        if (fichePath) {
          console.log(`✅ [API] Fichier trouvé: ${fichePath}`)
          
          // Vérifier que le fichier trouvé est bien dans le bon dossier
          if (isCustom && !fichePath.includes(`chantiers/${chantierId}/fiches-techniques`)) {
            console.warn(`⚠️ [API] ATTENTION: Fichier trouvé dans le mauvais dossier! Attendu: chantiers/${chantierId}/fiches-techniques, Trouvé: ${fichePath}`)
          } else if (!isCustom && !fichePath.includes('fiches-techniques') && fichePath.includes(`chantiers/${chantierId}`)) {
            console.warn(`⚠️ [API] ATTENTION: Fichier trouvé dans le dossier personnalisé alors qu'on utilise le standard!`)
          }
          
          try {
            // Récupérer les informations de la fiche
            const ficheName = path.basename(fichePath, '.pdf')
              .replace(/_/g, ' ')
              .replace(/-/g, ' ')
              .split(' ')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ')
            
            const ficheReference = ficheReferences && ficheReferences[ficheId] ? ficheReferences[ficheId] : null
            const ficheStatut = fichesStatuts && fichesStatuts[ficheId] ? fichesStatuts[ficheId] : 'BROUILLON'
            const ficheVersion = 1 // Par défaut
            const soustraitantIdRaw = fichesSoustraitants && fichesSoustraitants[ficheId] ? fichesSoustraitants[ficheId] : null
            const remarques = fichesRemarques && fichesRemarques[ficheId] ? fichesRemarques[ficheId] : null

            console.log(`📋 [Fiche ${ficheId}]`)
            console.log(`  - soustraitantIdRaw:`, soustraitantIdRaw)
            console.log(`  - remarques:`, remarques)
            console.log(`  - fichesSoustraitants[${ficheId}]:`, fichesSoustraitants?.[ficheId])
            console.log(`  - Tous les sous-traitants reçus:`, fichesSoustraitants)

            // Récupérer le sous-traitant si spécifié
            let soustraitant = null
            let soustraitantLogoBase64 = ''
            if (soustraitantIdRaw && soustraitantIdRaw.toString().trim() !== '') {
              const soustraitantId = soustraitantIdRaw.toString().trim()
              soustraitant = await prisma.soustraitant.findUnique({
                where: { id: soustraitantId }
              })
              console.log(`  - ✅ Sous-traitant récupéré:`, soustraitant ? { id: soustraitant.id, nom: soustraitant.nom, logo: soustraitant.logo } : 'null')
              if (soustraitant?.logo) {
                try {
                  const soustraitantLogoPath = soustraitant.logo.startsWith('/')
                    ? path.join(process.cwd(), 'public', soustraitant.logo)
                    : path.join(process.cwd(), 'public', soustraitant.logo)
                  if (fs.existsSync(soustraitantLogoPath)) {
                    const soustraitantLogoBuffer = await readFile(soustraitantLogoPath)
                    soustraitantLogoBase64 = soustraitantLogoBuffer.toString('base64')
                    console.log('Logo du sous-traitant chargé avec succès')
                  } else {
                    console.warn('Logo du sous-traitant non trouvé:', soustraitantLogoPath)
                  }
                } catch (error) {
                  console.warn('Impossible de charger le logo du sous-traitant:', error)
                }
              }
            } else {
              console.log('Aucun ID sous-traitant fourni pour la fiche:', ficheId)
            }

            // Générer la page de couverture avec le template HTML
            const ficheCoverData: FicheTechniqueCoverData = {
              settings: {
                name: settings.name,
                address: settings.address || '',
                zipCode: settings.zipCode || '',
                city: settings.city || '',
                phone: settings.phone || '',
                email: settings.email || '',
                logo: settings.logo || undefined
              },
              chantier: {
                chantierId: chantier.chantierId,
                nomChantier: chantier.nomChantier || '',
                client: chantier.client ? { nom: chantier.client.nom } : undefined,
                maitreOuvrageNom: chantier.maitreOuvrageNom,
                maitreOuvrageAdresse: chantier.maitreOuvrageAdresse,
                maitreOuvrageLocalite: chantier.maitreOuvrageLocalite,
                bureauArchitectureNom: chantier.bureauArchitectureNom,
                bureauArchitectureAdresse: chantier.bureauArchitectureAdresse,
                bureauArchitectureLocalite: chantier.bureauArchitectureLocalite
              },
              fiche: {
                id: ficheId,
                name: ficheName,
                reference: ficheReference,
                statut: ficheStatut,
                version: ficheVersion
              },
              soustraitant: soustraitant ? {
                nom: soustraitant.nom,
                logo: soustraitant.logo || undefined
              } : null,
              remarques: remarques,
              logoBase64: logoBase64 || undefined,
              soustraitantLogoBase64: soustraitantLogoBase64 || undefined
            }

            console.log(`[Fiche ${ficheId}] Données envoyées au template:`, {
              soustraitant: ficheCoverData.soustraitant,
              soustraitantLogoBase64: ficheCoverData.soustraitantLogoBase64 ? 'présent' : 'absent',
              remarques: ficheCoverData.remarques
            })
            
            const ficheCoverHTML = generateFicheTechniqueCoverHTML(ficheCoverData)
            const ficheCoverPDF = await PDFGenerator.generatePDF(ficheCoverHTML, {
              format: 'A4',
              orientation: 'portrait',
              margins: {
                top: '10mm',
                right: '10mm',
                bottom: '10mm',
                left: '10mm'
              }
            })

            // Ajouter la page de couverture au PDF final
            const ficheCoverPdfDoc = await PDFDocument.load(ficheCoverPDF)
            
            // Ajouter les champs éditables (AcroForm) pour les remarques et signatures
            // NOTE: Les champs sont désactivés par défaut car ils masquent le contenu HTML
            // Pour les réactiver, changez ENABLE_FORM_FIELDS à true
            // ATTENTION: Les champs peuvent masquer le contenu visuel du PDF même sans backgroundColor
            const ENABLE_FORM_FIELDS = false // Mettre à true pour activer les champs éditables
            
            if (ENABLE_FORM_FIELDS) {
              const form = ficheCoverPdfDoc.getForm()
              const pages = ficheCoverPdfDoc.getPages()
              const coverPage = pages[0]
              const { width, height } = coverPage.getSize()
              
              // Calculer les positions approximatives basées sur le layout HTML
              // Les marges sont de 10mm = ~28 points
              // La zone de remarques est environ à 45% de la hauteur de la page
              // Les signatures sont en bas, environ à 15% de la hauteur
              
              try {
              // Champ de texte pour les remarques (position approximative)
              const remarquesY = height * 0.45 // Environ 45% du haut de la page
              const remarquesField = form.createTextField(`remarques_${ficheId}`)
              remarquesField.setText(remarques || '')
              // Rendre le champ transparent pour ne pas masquer le contenu HTML
              remarquesField.addToPage(coverPage, {
                x: 40, // marge gauche + padding
                y: height - remarquesY - 50, // Ajuster selon la hauteur du champ
                width: width - 80, // largeur page - marges
                height: 50,
                borderWidth: 0, // Pas de bordure visible
                borderColor: rgb(0, 0, 0),
                // Pas de backgroundColor pour laisser le contenu HTML visible
              })
              // Essayer de rendre le champ transparent (si supporté)
              try {
                remarquesField.enableReadOnly()
              } catch {
                // Ignorer si non supporté
              }
              
              // Champs de signature (4 champs côte à côte)
              // Note: pdf-lib ne supporte pas createSignatureField, on utilise des champs texte pour les signatures
              const signatureY = height * 0.15 // Environ 15% du haut de la page
              const signatureWidth = (width - 80) / 4 - 8 // Largeur disponible / 4 - gap
              const signatureHeight = 35
              
              const signatureLabels = ['L\'Architecte', 'Le M.O.', 'Représentant du M.O.', 'L\'Entrepreneur']
              signatureLabels.forEach((label, index) => {
                // Utiliser un champ texte pour la signature (pdf-lib ne supporte pas les champs de signature natifs)
                const signatureField = form.createTextField(`signature_${ficheId}_${index}`)
                signatureField.setText('') // Champ vide pour signature
                signatureField.addToPage(coverPage, {
                  x: 40 + index * (signatureWidth + 8), // Position X avec gap
                  y: height - signatureY - signatureHeight,
                  width: signatureWidth,
                  height: signatureHeight,
                  borderWidth: 0, // Pas de bordure visible
                  borderColor: rgb(0, 0, 0),
                  // Pas de backgroundColor pour laisser le contenu HTML visible
                })
              })
              
              // Champs de date pour chaque signature
              signatureLabels.forEach((label, index) => {
                const dateField = form.createTextField(`date_signature_${ficheId}_${index}`)
                dateField.addToPage(coverPage, {
                  x: 40 + index * (signatureWidth + 8),
                  y: height - signatureY - signatureHeight - 15,
                  width: signatureWidth,
                  height: 10,
                  borderWidth: 0, // Pas de bordure visible
                  borderColor: rgb(0, 0, 0),
                  // Pas de backgroundColor pour laisser le contenu HTML visible
                })
              })
              } catch (formError) {
                console.warn('Erreur lors de l\'ajout des champs de formulaire:', formError)
                // Continuer même si les champs de formulaire ne peuvent pas être ajoutés
              }
            }
            
            const ficheCoverPages = await finalPdfDoc.copyPages(ficheCoverPdfDoc, ficheCoverPdfDoc.getPageIndices())
            ficheCoverPages.forEach(page => finalPdfDoc.addPage(page))

            // Charger et ajouter les pages de la fiche technique originale
            const ficheBytes = await readFile(fichePath)
            const fichePdf = await PDFDocument.load(ficheBytes)
            const fichePages = await finalPdfDoc.copyPages(fichePdf, fichePdf.getPageIndices())
            fichePages.forEach(page => finalPdfDoc.addPage(page))
            
            console.log('Fichier ajouté avec succès')
          } catch (pdfError) {
            console.error(`Erreur lors du chargement du PDF ${fichePath}:`, pdfError)
            errors.push(`Erreur lors du chargement du PDF ${fichePath}: ${pdfError}`)
          }
        } else {
          console.error('Fichier non trouvé:', ficheId)
          errors.push(`Fichier non trouvé: ${ficheId}`)
        }
      } catch (error) {
        console.error(`Erreur lors du traitement de la fiche ${ficheId}:`, error)
        errors.push(`Erreur lors du traitement de la fiche ${ficheId}: ${error}`)
      }
    }

    // Si des erreurs sont survenues, les retourner
    if (errors.length > 0) {
      return NextResponse.json({ 
        error: 'Erreurs lors de la génération du dossier',
        details: errors 
      }, { status: 400 })
    }

    // Sauvegarder le PDF final
    const pdfBytes = await finalPdfDoc.save()
    
    // Créer le dossier Documents du chantier s'il n'existe pas
    const chantierDir = path.join(process.cwd(), 'public', 'chantiers', chantierId, 'documents')
    if (!fs.existsSync(chantierDir)) {
      fs.mkdirSync(chantierDir, { recursive: true })
    }
    
    // Sauvegarder le fichier
    const dateStr = new Date().toISOString().split('T')[0]
    const versionSuffix = dossierExistant ? `-v${nouvelleVersion}` : ''
    const fileName = `dossier-technique-${dateStr}${versionSuffix}.pdf`
    const filePath = path.join(chantierDir, fileName)
    await fs.promises.writeFile(filePath, pdfBytes)
    
    // Créer ou mettre à jour l'entrée dans la base de données
    let dossierTechnique
    if (dossierId && dossierExistant) {
      // Mise à jour du dossier existant
      dossierTechnique = await prisma.dossierTechnique.update({
        where: { id: dossierId },
        data: {
          version: nouvelleVersion,
          url: `/chantiers/${chantierId}/documents/${fileName}`,
          taille: pdfBytes.length,
          dateModification: new Date(),
          includeTableOfContents: options?.includeTableOfContents || false
        }
      })
      
      // Supprimer les anciennes fiches et créer les nouvelles
      await prisma.dossierFiche.deleteMany({
        where: { dossierId: dossierId }
      })
    } else {
      // Vérifier s'il existe un dossier brouillon pour ce chantier
      const dossierBrouillon = await prisma.dossierTechnique.findFirst({
        where: {
          chantierId: chantierId,
          statut: 'BROUILLON',
          url: '' // Un dossier brouillon n'a pas encore de PDF
        },
        orderBy: { dateGeneration: 'desc' }
      })

      if (dossierBrouillon) {
        // Utiliser le dossier brouillon existant et le mettre à jour
        dossierTechnique = await prisma.dossierTechnique.update({
          where: { id: dossierBrouillon.id },
          data: {
            nom: `Dossier technique - ${dateStr}`,
            version: 1,
            statut: 'BROUILLON',
            url: `/chantiers/${chantierId}/documents/${fileName}`,
            taille: pdfBytes.length,
            dateGeneration: new Date(),
            dateModification: new Date(),
            includeTableOfContents: options?.includeTableOfContents || false
          }
        })
        
        // Supprimer les anciennes fiches du brouillon pour les remplacer par les nouvelles
        await prisma.dossierFiche.deleteMany({
          where: { dossierId: dossierBrouillon.id }
        })
      } else {
        // Création d'un nouveau dossier
        dossierTechnique = await prisma.dossierTechnique.create({
          data: {
            chantierId: chantierId,
            nom: `Dossier technique - ${dateStr}`,
            version: 1,
            statut: 'BROUILLON',
            url: `/chantiers/${chantierId}/documents/${fileName}`,
            taille: pdfBytes.length,
            dateGeneration: new Date(),
            dateModification: new Date(),
            createdBy: user.id,
            includeTableOfContents: options?.includeTableOfContents || false
          }
        })
      }
    }

    // Créer les entrées DossierFiche pour chaque fiche
    for (let index = 0; index < ficheIds.length; index++) {
      const ficheId = ficheIds[index]
      const ficheReference = ficheReferences && ficheReferences[ficheId] ? ficheReferences[ficheId] : null
      const ficheStatut = fichesStatuts && fichesStatuts[ficheId] ? fichesStatuts[ficheId] : 'BROUILLON'
      const soustraitantIdRaw = fichesSoustraitants && fichesSoustraitants[ficheId] ? fichesSoustraitants[ficheId] : null
      const soustraitantId = soustraitantIdRaw && soustraitantIdRaw.toString().trim() !== ''
        ? soustraitantIdRaw.toString().trim()
        : null
      const remarques = fichesRemarques && fichesRemarques[ficheId] ? fichesRemarques[ficheId] : null

      await prisma.dossierFiche.create({
        data: {
          dossierId: dossierTechnique.id,
          ficheId: ficheId,
          ficheReference: ficheReference,
          version: 1,
          statut: ficheStatut,
          ordre: index + 1,
          soustraitantId: soustraitantId,
          remarques: remarques
        }
      })
    }

    // Créer aussi une entrée Document pour la compatibilité
    await prisma.document.create({
      data: {
        nom: `Dossier technique - ${dateStr}${versionSuffix ? ` ${versionSuffix}` : ''} - ${ficheIds.length} fiches`,
        type: 'DOSSIER_TECHNIQUE',
        url: `/chantiers/${chantierId}/documents/${fileName}`,
        taille: pdfBytes.length,
        mimeType: 'application/pdf',
        updatedAt: new Date(),
        chantierId: chantierId,
        createdBy: user.id,
        metadata: {
          dossierTechniqueId: dossierTechnique.id
        }
      }
    })

    // Retourner le PDF
    return new NextResponse(pdfBytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${fileName}"`
      }
    })
  } catch (error) {
    console.error('Erreur lors de la génération du dossier:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la génération du dossier', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
