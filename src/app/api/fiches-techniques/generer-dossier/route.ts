import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PDFDocument, rgb, StandardFonts, PDFPage, PDFFont } from 'pdf-lib'
import fs from 'fs'
import path from 'path'
import { prisma } from '@/lib/prisma/client'

// Fonction pour trouver un fichier PDF dans un dossier et ses sous-dossiers
async function findPdfFile(baseDir: string, fileName: string): Promise<string | null> {
  console.log(`Recherche de fichier: ${fileName} dans ${baseDir}`)
  
  try {
    // Vérifier si le chemin est déjà complet avec l'extension .pdf
    if (fileName.toLowerCase().endsWith('.pdf')) {
      // Construire le chemin complet sans ajouter d'extension
      const fullPath = path.join(process.cwd(), 'public', fileName)
      if (fs.existsSync(fullPath)) {
        console.log(`Fichier trouvé: ${fullPath}`)
        return fullPath
      }
    } else {
      // Si le fichier n'a pas d'extension, utiliser l'ancienne logique
      // Vérifier d'abord dans le dossier Carrelage
      const carrelagePath = path.join(process.cwd(), 'public', 'fiches-techniques', 'Carrelage', `${fileName}.pdf`)
      if (fs.existsSync(carrelagePath)) {
        console.log(`Fichier trouvé dans Carrelage: ${carrelagePath}`)
        return carrelagePath
      }
      
      // Ensuite vérifier dans les dossiers connus de Produits Technique
      const produitsTechniquePath = path.join(process.cwd(), 'public', 'fiches-techniques', 'Produits Technique')
      const knownSubdirs = ['Colle', 'Etanchéité', 'Joint', 'Silicone']
      
      for (const subdir of knownSubdirs) {
        const ptPath = path.join(produitsTechniquePath, subdir, `${fileName}.pdf`)
        if (fs.existsSync(ptPath)) {
          console.log(`Fichier trouvé dans ${subdir}: ${ptPath}`)
          return ptPath
        }
      }
    }
    
    // Si on n'a pas trouvé, chercher dans tous les sous-dossiers
    console.log(`Aucun fichier correspondant à ${fileName} trouvé directement, recherche récursive...`)
    return null
  } catch (error) {
    console.error(`Erreur lors de la recherche de fichier:`, error)
    return null
  }
}

// Fonction pour ajouter un pied de page à une page
function addFooter(page: PDFPage, font: PDFFont, width: number, height: number, settings: { name: string; address: string; zipCode: string; city: string }) {
  const footerText = `${settings.name} - ${settings.address}, ${settings.zipCode} ${settings.city}`
  const footerWidth = font.widthOfTextAtSize(footerText, 10)
  
  page.drawText(footerText, {
    x: (width - footerWidth) / 2,
    y: 30,
    size: 10,
    font,
    color: rgb(0.4, 0.4, 0.4)
  })
}

// Fonction pour ajouter un en-tête à une page
function addHeader(page: PDFPage, font: PDFFont, width: number, height: number, text: string) {
  const headerText = text
  const headerWidth = font.widthOfTextAtSize(headerText, 12)
  
  page.drawText(headerText, {
    x: (width - headerWidth) / 2,
    y: height - 30,
    size: 12,
    font,
    color: rgb(0.4, 0.4, 0.4)
  })
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

    const { chantierId, ficheIds, ficheReferences, options } = await request.json()
    console.log('Fiches techniques sélectionnées:', ficheIds)
    console.log('Références des fiches:', ficheReferences)

    // Tableau pour stocker les erreurs éventuelles
    const errors: string[] = [];

    // Récupérer les informations du chantier
    const chantier = await prisma.chantier.findUnique({
      where: { chantierId },
      include: { client: true }
    })

    if (!chantier) {
      return NextResponse.json({ error: 'Chantier non trouvé' }, { status: 404 })
    }

    // Récupérer les paramètres de l'entreprise
    const settings = await prisma.companysettings.findFirst()
    if (!settings) {
      return NextResponse.json({ error: 'Paramètres de l\'entreprise non trouvés' }, { status: 404 })
    }

    // Créer un nouveau document PDF
    const pdfDoc = await PDFDocument.create()

    // Charger la police Helvetica
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

    // Charger le logo
    let logoImage
    if (settings.logo) {
      const logoPath = path.join(process.cwd(), 'public', settings.logo)
      if (fs.existsSync(logoPath)) {
        const logoBytes = await fs.promises.readFile(logoPath)
        logoImage = await pdfDoc.embedPng(logoBytes)
      }
    }

    // Ajouter la page de garde
    const pageDeGarde = pdfDoc.addPage()
    const { width, height } = pageDeGarde.getSize()
    
    // Dessiner un rectangle en arrière-plan
    pageDeGarde.drawRectangle({
      x: 0,
      y: 0,
      width,
      height,
      color: rgb(0.95, 0.95, 0.95)
    })

    // Ajouter le logo
    if (logoImage) {
      const logoWidth = 150
      const logoHeight = (logoImage.height * logoWidth) / logoImage.width
      pageDeGarde.drawImage(logoImage, {
        x: (width - logoWidth) / 2,
        y: height - 150,
        width: logoWidth,
        height: logoHeight
      })
    }

    // Nom de l'entreprise
    pageDeGarde.drawText(settings.name, {
      x: 50,
      y: height - 300,
      size: 28,
      font: helveticaBoldFont,
      color: rgb(0.2, 0.2, 0.2)
    })

    // Titre principal
    pageDeGarde.drawText('DOSSIER TECHNIQUE', {
      x: 50,
      y: height - 350,
      size: 32,
      font: helveticaBoldFont,
      color: rgb(0.2, 0.2, 0.2)
    })

    // Informations du chantier
    const infoY = height - 450
    pageDeGarde.drawText('Informations du chantier', {
      x: 50,
      y: infoY,
      size: 18,
      font: helveticaBoldFont,
      color: rgb(0.2, 0.2, 0.2)
    })

    const infoStartY = infoY - 40
    const lineHeight = 25
    // Cast pour accéder aux champs réels de la base de données
    const chantierData = chantier as unknown as { dateDebut?: string | Date | null };
    
    // Afficher la structure des données du chantier pour debug
    console.log("Structure des données du chantier:", JSON.stringify(chantier, null, 2));
    
    const infoTexts = [
      `Nom du chantier : ${chantier.nomChantier}`,
      `Client : ${chantier.client?.nom || 'Non spécifié'}`,
      `Adresse : ${chantier.adresseChantier || 'Non spécifiée'}`,
      `Date de début : ${chantierData.dateDebut ? new Date(chantierData.dateDebut).toLocaleDateString('fr-FR') : 'Non définie'}`,
      `Date de génération : ${new Date().toLocaleDateString('fr-FR')}`
    ]

    infoTexts.forEach((text, index) => {
      pageDeGarde.drawText(text, {
        x: 70,
        y: infoStartY - (index * lineHeight),
        size: 12,
        font: helveticaFont,
        color: rgb(0.4, 0.4, 0.4)
      })
    })

    // Ajouter le pied de page avec les informations de l'entreprise
    const footerText = `${settings.name} - ${settings.address}, ${settings.zipCode} ${settings.city}`
    const footerWidth = helveticaFont.widthOfTextAtSize(footerText, 10)
    pageDeGarde.drawText(footerText, {
      x: (width - footerWidth) / 2,
      y: 30,
      size: 10,
      font: helveticaFont,
      color: rgb(0.4, 0.4, 0.4)
    })

    // Ajouter la table des matières si demandé
    if (options.includeTableOfContents) {
      // D'abord, calculer le nombre de pages de chaque fiche PDF pour la numérotation
      const pagesInfo = [];
      let pageCount = 2; // Commencer à 2 (après la page de garde et la table des matières)
      
      // Première analyse pour calculer les numéros de page
      for (const ficheId of ficheIds) {
        const fichePath = await findPdfFile(path.join(process.cwd(), 'public', 'fiches-techniques'), ficheId);
        
        if (fichePath) {
          try {
            const ficheBytes = await fs.promises.readFile(fichePath);
            const fichePdf = await PDFDocument.load(ficheBytes);
            const nbPages = fichePdf.getPageCount();
            
            // Ajouter les informations dans pagesInfo
            pagesInfo.push({
              id: ficheId,
              path: fichePath,
              startPage: pageCount,
              pageCount: nbPages
            });
            
            // Mise à jour du compteur de pages (une page d'en-tête + les pages du PDF)
            pageCount += 1 + nbPages;
          } catch (error) {
            console.error(`Erreur lors de l'analyse de ${fichePath}:`, error);
            // Ajouter quand même une entrée avec une page estimée
            pagesInfo.push({
              id: ficheId,
              path: fichePath,
              startPage: pageCount,
              pageCount: 1 // Estimation minimale
            });
            pageCount += 2; // En-tête + 1 page estimée
          }
        }
      }
      
      // Maintenant créer la table des matières avec les numéros de page corrects
      const tableDesMatieres = pdfDoc.addPage()
      const { width, height } = tableDesMatieres.getSize()
      
      // Titre de la table des matières
      tableDesMatieres.drawText('TABLE DES MATIÈRES', {
        x: 50,
        y: height - 100,
        size: 24,
        font: helveticaBoldFont,
        color: rgb(0.2, 0.2, 0.2)
      })

      // Liste des fiches techniques avec points de suite
      let currentY = height - 150
      const lineHeight = 20
      const pageNumberX = width - 50
      
      for (const info of pagesInfo) {
        const fichePath = info.path;
        const ficheName = path.basename(fichePath, '.pdf')
          .replace(/_/g, ' ')
          .replace(/-/g, ' ')
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');

        // Afficher la référence au cahier des charges si disponible
        let displayName = ficheName;
        if (ficheReferences && ficheReferences[info.id]) {
          displayName = `${ficheName} - Réf CSC: ${ficheReferences[info.id]}`;
        }

        // Normaliser le texte pour éviter les erreurs d'encodage
        const normalizedDisplayName = normalizeText(displayName);

        // Dessiner le titre
        tableDesMatieres.drawText(normalizedDisplayName, {
          x: 70,
          y: currentY,
          size: 12,
          font: helveticaFont,
          color: rgb(0.4, 0.4, 0.4)
        })

        // Dessiner les points de suite
        const titleWidth = helveticaFont.widthOfTextAtSize(displayName, 12)
        const dotsStartX = 70 + titleWidth + 10
        const dotsEndX = pageNumberX - 30
        const dotsCount = Math.floor((dotsEndX - dotsStartX) / 5)
        
        for (let i = 0; i < dotsCount; i++) {
          tableDesMatieres.drawText('.', {
            x: dotsStartX + (i * 5),
            y: currentY,
            size: 12,
            font: helveticaFont,
            color: rgb(0.4, 0.4, 0.4)
          })
        }

        // Dessiner le numéro de page (page de début)
        tableDesMatieres.drawText(info.startPage.toString(), {
          x: pageNumberX,
          y: currentY,
          size: 12,
          font: helveticaFont,
          color: rgb(0.4, 0.4, 0.4)
        })

        currentY -= lineHeight
      }

      // Ajouter le pied de page à la table des matières
      addFooter(tableDesMatieres, helveticaFont, width, height, settings)
    }

    // Ajouter les fiches techniques
    for (const ficheId of ficheIds) {
      try {
        console.log('Recherche du fichier:', ficheId);
        let fichePath = null;
        
        // Vérifier dans le dossier Carrelage et Produits Technique
        fichePath = await findPdfFile(path.join(process.cwd(), 'public', 'fiches-techniques'), ficheId);
        
        if (fichePath) {
          console.log('Fichier trouvé:', fichePath)
          const ficheBytes = await fs.promises.readFile(fichePath)
          console.log('Taille du fichier lu:', ficheBytes.length)
          
          try {
            const fichePdf = await PDFDocument.load(ficheBytes)
            console.log('Nombre de pages dans le PDF:', fichePdf.getPageCount())
            
            // Ajouter une page d'en-tête pour la fiche technique
            const headerPage = pdfDoc.addPage()
            const { width, height } = headerPage.getSize()
            
            // Titre de la fiche technique
            const ficheName = path.basename(fichePath as string, '.pdf')
              .replace(/_/g, ' ')
              .replace(/-/g, ' ')
              .split(' ')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ')
            
            // Afficher la référence au cahier des charges si disponible
            let displayName = ficheName;
            if (ficheReferences && ficheReferences[ficheId]) {
              displayName = `${ficheName} - Réf CSC: ${ficheReferences[ficheId]}`;
            }

            // Normaliser le texte pour éviter les erreurs d'encodage
            const normalizedDisplayName = normalizeText(displayName);

            headerPage.drawText(normalizedDisplayName, {
              x: 50,
              y: height - 100,
              size: 24,
              font: helveticaBoldFont,
              color: rgb(0.2, 0.2, 0.2)
            })

            // Ajouter l'en-tête et le pied de page
            addHeader(headerPage, helveticaFont, width, height, normalizedDisplayName)
            addFooter(headerPage, helveticaFont, width, height, settings)

            // Copier les pages de la fiche technique
            const pages = await pdfDoc.copyPages(fichePdf, fichePdf.getPageIndices())
            pages.forEach(page => {
              const { width, height } = page.getSize()
              // Ajouter l'en-tête et le pied de page à chaque page
              addHeader(page, helveticaFont, width, height, normalizedDisplayName)
              addFooter(page, helveticaFont, width, height, settings)
              pdfDoc.addPage(page)
            })
            
            console.log('Fichier ajouté avec succès')
          } catch (pdfError) {
            console.error(`Erreur lors du chargement du PDF ${fichePath}:`, pdfError)
            errors.push(`Erreur lors du chargement du PDF ${fichePath}: ${pdfError}`);
          }
        } else {
          console.error('Fichier non trouvé:', ficheId)
          errors.push(`Fichier non trouvé: ${ficheId}`);
        }
      } catch (error) {
        console.error(`Erreur lors du traitement de la fiche ${ficheId}:`, error);
        errors.push(`Erreur lors du traitement de la fiche ${ficheId}: ${error}`);
      }
    }

    // Si des erreurs sont survenues, les retourner
    if (errors.length > 0) {
      return NextResponse.json({ 
        error: 'Erreurs lors de la génération du dossier',
        details: errors 
      }, { status: 400 });
    }

    // Sauvegarder le PDF
    const pdfBytes = await pdfDoc.save()
    
    // Créer le dossier Documents du chantier s'il n'existe pas
    const chantierDir = path.join(process.cwd(), 'public', 'chantiers', chantierId, 'documents')
    if (!fs.existsSync(chantierDir)) {
      fs.mkdirSync(chantierDir, { recursive: true })
    }
    
    // Sauvegarder le fichier
    const fileName = `dossier-technique-${new Date().toISOString().split('T')[0]}.pdf`
    const filePath = path.join(chantierDir, fileName)
    await fs.promises.writeFile(filePath, pdfBytes)
    
    // Créer l'entrée dans la base de données
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 })
    }

    await prisma.document.create({
      data: {
        nom: `Dossier technique - ${new Date().toLocaleDateString('fr-FR')} - ${ficheIds.length} fiches`,
        type: 'DOSSIER_TECHNIQUE',
        url: `/chantiers/${chantierId}/documents/${fileName}`,
        taille: pdfBytes.length,
        mimeType: 'application/pdf',
        updatedAt: new Date(),
        chantierId: chantierId,
        createdBy: user.id
      }
    })

    // Retourner le PDF
    return new NextResponse(pdfBytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`
      }
    })
  } catch (error) {
    console.error('Erreur lors de la génération du dossier:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la génération du dossier' },
      { status: 500 }
    )
  }
} 