import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'
import { sendEmailWithAttachment } from '@/lib/email-sender'
import { join } from 'path'
import { readFile } from 'fs/promises'
import { PDFGenerator } from '@/lib/pdf/pdf-generator'
import { generateRapportHTML, type RapportData } from '@/lib/pdf/templates/rapport-template'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ chantierId: string; rapportId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { chantierId, rapportId } = await params
    const body = await request.json()
    let recipients = body.recipients
    const tagFilter = body.tagFilter

    // Récupérer le chantier avec les informations du client
    const chantier = await prisma.chantier.findUnique({
      where: { chantierId },
      select: {
        id: true,
        chantierId: true,
        nomChantier: true,
        clientNom: true,
        clientEmail: true,
        adresseChantier: true
      }
    })

    if (!chantier) {
      return NextResponse.json({ error: 'Chantier non trouvé' }, { status: 404 })
    }

    // Récupérer le document rapport
    const rapport = await prisma.document.findUnique({
      where: { id: parseInt(rapportId) },
      select: {
        id: true,
        nom: true,
        url: true,
        type: true,
        createdAt: true,
        metadata: true,
        User: {
          select: {
            name: true,
            email: true
          }
        }
      }
    })

    if (!rapport || rapport.type !== 'rapport-visite') {
      return NextResponse.json({ error: 'Rapport non trouvé' }, { status: 404 })
    }

    // Vérifier qu'on a des destinataires
    if (!recipients || recipients.length === 0) {
      // Si pas de destinataires fournis, utiliser l'email du client
      if (!chantier.clientEmail) {
        return NextResponse.json(
          { error: 'Aucun destinataire spécifié et aucun email client configuré' },
          { status: 400 }
        )
      }
      recipients = [chantier.clientEmail]
    }

    // Si un filtre de tag est spécifié, régénérer le PDF avec le filtre
    let pdfBuffer: Buffer
    let pdfFilename = rapport.nom
    
    if (tagFilter && tagFilter !== 'Tous') {
      console.log(`📄 Génération d'un PDF filtré avec le tag: ${tagFilter}`)
      
      // Récupérer les métadonnées du rapport pour régénérer le PDF
      const metadata = rapport.metadata as {
        photos?: Array<{ url: string; caption?: string; preview?: string; tags?: string[] }>
        date?: string
        personnes?: Array<{ id: string; nom: string; fonction: string }>
        notesIndividuelles?: Array<{ id: string; contenu: string; tags: string[] }>
        [key: string]: unknown
      }
      
      if (!metadata) {
        return NextResponse.json(
          { error: 'Impossible de filtrer ce rapport (métadonnées manquantes)' },
          { status: 400 }
        )
      }

      // Récupérer le logo
      let logoBase64 = ''
      try {
        const logoPath = join(process.cwd(), 'public', 'images', 'logo.png')
        const logoBuffer = await readFile(logoPath)
        logoBase64 = logoBuffer.toString('base64')
      } catch {
        console.warn('Logo non trouvé')
      }

      // Convertir les photos en base64 et adapter au format RapportData
      const photosWithBase64 = await Promise.all(
        (metadata.photos || []).map(async (photo: { url: string; caption?: string; preview?: string; tags?: string[] }) => {
          try {
            let previewBase64 = photo.preview || photo.url
            if (photo.preview && photo.preview.startsWith('/uploads/')) {
              const imagePath = join(process.cwd(), 'public', photo.preview)
              const imageBuffer = await readFile(imagePath)
              const extension = photo.preview.split('.').pop()?.toLowerCase() || 'jpg'
              const mimeType = extension === 'png' ? 'image/png' : 
                              extension === 'webp' ? 'image/webp' : 'image/jpeg'
              previewBase64 = `data:${mimeType};base64,${imageBuffer.toString('base64')}`
            }
            return {
              id: photo.url, // Utiliser l'URL comme ID temporaire
              file: null,
              preview: previewBase64,
              annotation: photo.caption || '',
              tags: photo.tags || [] // Récupérer les tags depuis les métadonnées
            }
          } catch (error) {
            console.error(`Erreur conversion photo:`, error)
            return {
              id: photo.url,
              file: null,
              preview: photo.preview || photo.url,
              annotation: photo.caption || '',
              tags: photo.tags || [] // Récupérer les tags depuis les métadonnées
            }
          }
        })
      )

      // Préparer les données pour le template
      const rapportData: RapportData = {
        chantier: {
          id: chantier.id,
          chantierId: chantier.chantierId,
          nomChantier: chantier.nomChantier,
          clientNom: chantier.clientNom || 'Client non spécifié',
          adresseChantier: chantier.adresseChantier || ''
        },
        date: metadata.date || '',
        personnes: metadata.personnes || [],
        notes: metadata.notesIndividuelles || [],
        photos: photosWithBase64,
        tagFilter,
        logoBase64
      }

      // Générer le HTML
      const htmlContent = generateRapportHTML(rapportData)

      // Générer le PDF avec Puppeteer
      pdfBuffer = await PDFGenerator.generatePDF(htmlContent, {
        format: 'A4',
        orientation: 'portrait',
        margins: {
          top: '10mm',
          right: '10mm',
          bottom: '10mm',
          left: '10mm'
        }
      })
      
      // Modifier le nom du fichier pour inclure le tag
      const baseName = rapport.nom.replace('.pdf', '')
      pdfFilename = `${baseName}-${tagFilter}.pdf`
      
      console.log(`✅ PDF filtré généré: ${pdfFilename}`)
    } else {
      // Utiliser le PDF existant
      const filePath = join(process.cwd(), 'public', rapport.url)
      try {
        pdfBuffer = await readFile(filePath)
      } catch (error) {
        console.error('Erreur lors de la lecture du fichier PDF:', error)
        return NextResponse.json(
          { error: 'Fichier PDF introuvable' },
          { status: 404 }
        )
      }
    }

    // Préparer le contenu de l'email
    const tagSuffix = tagFilter && tagFilter !== 'Tous' ? ` - ${tagFilter}` : ''
    const emailSubject = `Rapport de visite${tagSuffix} - ${chantier.nomChantier} - ${new Date(rapport.createdAt).toLocaleDateString('fr-FR')}`
    
    const emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Rapport de Visite de Chantier</h1>
        </div>
        
        <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px; color: #334155; margin-bottom: 20px;">Bonjour,</p>
          
          <p style="font-size: 14px; color: #475569; line-height: 1.6; margin-bottom: 20px;">
            Veuillez trouver ci-joint le rapport de visite${tagFilter && tagFilter !== 'Tous' ? ` <strong style="color: #1e40af;">(filtré: ${tagFilter})</strong>` : ''} pour le chantier suivant :
          </p>
          
          <div style="background: white; border-left: 4px solid #3b82f6; padding: 20px; margin: 20px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h3 style="color: #1e40af; margin: 0 0 15px 0; font-size: 18px;">📋 Détails du Chantier</h3>
            <p style="margin: 8px 0; font-size: 14px; color: #334155;">
              <strong style="color: #475569;">Nom :</strong> ${chantier.nomChantier}
            </p>
            <p style="margin: 8px 0; font-size: 14px; color: #334155;">
              <strong style="color: #475569;">Référence :</strong> ${chantier.chantierId}
            </p>
            ${chantier.adresseChantier ? `
            <p style="margin: 8px 0; font-size: 14px; color: #334155;">
              <strong style="color: #475569;">Adresse :</strong> ${chantier.adresseChantier}
            </p>
            ` : ''}
            <p style="margin: 8px 0; font-size: 14px; color: #334155;">
              <strong style="color: #475569;">Date du rapport :</strong> ${new Date(rapport.createdAt).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          
          <p style="font-size: 14px; color: #475569; line-height: 1.6; margin-top: 20px;">
            Le rapport complet est disponible en pièce jointe de cet email.
          </p>
          
          <p style="font-size: 14px; color: #475569; line-height: 1.6; margin-top: 20px;">
            Cordialement,<br/>
            ${rapport.User?.name || 'L\'équipe'}
          </p>
        </div>
        
        <div style="background: #e2e8f0; padding: 15px; text-align: center; margin-top: 20px; border-radius: 8px;">
          <p style="font-size: 12px; color: #64748b; margin: 0;">
            Ce message a été envoyé automatiquement. Merci de ne pas y répondre directement.
          </p>
        </div>
      </div>
    `

    // Envoyer l'email avec le PDF en pièce jointe
    await sendEmailWithAttachment(
      recipients,
      emailSubject,
      emailBody,
      [
        {
          filename: pdfFilename,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ]
    )

    console.log(`✅ Rapport ${pdfFilename} envoyé par email à ${recipients.join(', ')}`)

    return NextResponse.json({
      success: true,
      message: 'Rapport envoyé par email avec succès',
      recipients
    })

  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi du rapport par email:', error)
    return NextResponse.json(
      { 
        error: 'Erreur lors de l\'envoi du rapport',
        message: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    )
  }
}

