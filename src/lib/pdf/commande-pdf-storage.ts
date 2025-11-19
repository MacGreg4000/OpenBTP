import { prisma } from '@/lib/prisma/client'
import { PDFGenerator } from '@/lib/pdf/pdf-generator'
import { generateCommandeHTML, type CommandeData } from '@/lib/pdf/templates/commande-template'
import { getActiveTemplateHtml } from '@/lib/templates/get-active-template'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

const DOCUMENTS_BASE_PATH = join(process.cwd(), 'public', 'uploads', 'documents')

/**
 * Génère et stocke le PDF d'une commande dans les documents du chantier
 * @param commandeId - ID de la commande
 * @param userId - ID de l'utilisateur qui effectue l'action
 * @returns L'URL du document créé ou null en cas d'erreur
 */
export async function generateAndStoreCommandePDF(
  commandeId: number,
  userId: string
): Promise<string | null> {
  try {
    console.log(`📄 Génération et stockage du PDF pour la commande ${commandeId}`)

    // Récupérer la commande avec toutes les données nécessaires
    const commande = await prisma.commande.findUnique({
      where: { id: commandeId },
      include: {
        lignes: {
          orderBy: { ordre: 'asc' }
        },
        Chantier: {
          select: {
            id: true,
            chantierId: true,
            nomChantier: true,
            clientNom: true,
            client: {
              select: {
                nom: true
              }
            }
          }
        }
      }
    })

    if (!commande) {
      console.error(`❌ Commande ${commandeId} non trouvée`)
      return null
    }

    // Vérifier si un document PDF existe déjà pour cette commande
    const existingDocument = await prisma.document.findFirst({
      where: {
        chantierId: commande.Chantier.chantierId,
        type: 'commande-pdf',
        nom: {
          contains: `commande-${commande.reference || commandeId}`
        }
      }
    })

    // Récupérer les informations de l'entreprise
    const companySettings = await prisma.companysettings.findFirst()
    const entreprise = {
      name: companySettings?.name || 'Entreprise',
      address: companySettings?.address || 'Adresse non définie',
      zipCode: companySettings?.zipCode || '00000',
      city: companySettings?.city || 'Ville',
      phone: companySettings?.phone || '00 00 00 00 00',
      email: companySettings?.email || 'contact@entreprise.com',
      siret: companySettings?.iban || '',
      tva: companySettings?.tva || '',
      logo: companySettings?.logo || ''
    }

    // Récupérer le logo en base64
    let logoBase64 = ''
    if (entreprise.logo) {
      try {
        const logoPath = join(process.cwd(), 'public', entreprise.logo)
        const logoBuffer = await readFile(logoPath)
        logoBase64 = logoBuffer.toString('base64')
      } catch (error) {
        console.warn('Impossible de charger le logo:', error)
      }
    }

    const cgvHtml = await getActiveTemplateHtml('CGV')

    // Préparer les données pour le template
    const commandeData: CommandeData = {
      commande: {
        id: commande.id,
        reference: commande.reference || `CMD-${commande.id}`,
        dateCommande: commande.dateCommande.toISOString(),
        clientNom: commande.Chantier.clientNom || commande.Chantier.client?.nom || 'Client non spécifié',
        tauxTVA: commande.tauxTVA,
        lignes: commande.lignes.map(ligne => ({
          id: ligne.id,
          ordre: ligne.ordre,
          article: ligne.article,
          description: ligne.description,
          type: ligne.type,
          unite: ligne.unite,
          prixUnitaire: ligne.prixUnitaire,
          quantite: ligne.quantite,
          total: ligne.total,
          estOption: ligne.estOption
        }))
      },
      entreprise,
      chantierId: commande.Chantier.chantierId,
      logoBase64,
      cgvHtml: cgvHtml || undefined
    }

    // Générer le HTML
    const htmlContent = generateCommandeHTML(commandeData)

    // Générer le PDF avec Puppeteer
    console.log('📄 Génération du PDF avec Puppeteer...')
    const pdfBuffer = await PDFGenerator.generatePDF(htmlContent, {
      format: 'A4',
      orientation: 'landscape',
      margins: {
        top: '10mm',
        right: '10mm',
        bottom: '10mm',
        left: '10mm'
      }
    })

    console.log('✅ PDF généré avec succès')

    // Créer le dossier des documents si nécessaire
    const chantierDir = join(DOCUMENTS_BASE_PATH, commande.Chantier.chantierId)
    await mkdir(DOCUMENTS_BASE_PATH, { recursive: true })
    await mkdir(chantierDir, { recursive: true })

    // Générer le nom du fichier
    const fileName = `commande-${commandeData.commande.reference}-${Date.now()}.pdf`
    const filePath = join(chantierDir, fileName)

    // Écrire le fichier
    await writeFile(filePath, pdfBuffer)
    console.log(`✅ PDF sauvegardé: ${filePath}`)

    // Supprimer l'ancien document s'il existe
    if (existingDocument) {
      try {
        await prisma.document.delete({
          where: { id: existingDocument.id }
        })
        console.log(`🗑️ Ancien document PDF supprimé: ${existingDocument.id}`)
      } catch (error) {
        console.warn('⚠️ Impossible de supprimer l\'ancien document:', error)
      }
    }

    // Créer l'entrée dans la base de données
    const documentUrl = `/uploads/documents/${commande.Chantier.chantierId}/${fileName}`
    const document = await prisma.document.create({
      data: {
        nom: fileName,
        type: 'commande-pdf',
        url: documentUrl,
        taille: pdfBuffer.length,
        mimeType: 'application/pdf',
        chantierId: commande.Chantier.chantierId,
        createdBy: userId,
        updatedAt: new Date()
      }
    })

    console.log(`✅ Document créé dans la base de données: ${document.id}`)

    return documentUrl
  } catch (error) {
    console.error('❌ Erreur lors de la génération et du stockage du PDF:', error)
    return null
  }
}

/**
 * Récupère l'URL du document PDF stocké pour une commande
 * @param commandeId - ID de la commande
 * @returns L'URL du document ou null s'il n'existe pas
 */
export async function getStoredCommandePDFUrl(commandeId: number): Promise<string | null> {
  try {
    const commande = await prisma.commande.findUnique({
      where: { id: commandeId },
      include: {
        Chantier: {
          select: {
            chantierId: true
          }
        }
      }
    })

    if (!commande) {
      return null
    }

    // Rechercher le document PDF le plus récent pour cette commande
    const document = await prisma.document.findFirst({
      where: {
        chantierId: commande.Chantier.chantierId,
        type: 'commande-pdf',
        nom: {
          contains: `commande-${commande.reference || commandeId}`
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    })

    return document ? document.url : null
  } catch (error) {
    console.error('❌ Erreur lors de la récupération du PDF stocké:', error)
    return null
  }
}

