import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'
import puppeteer from 'puppeteer'
import { generateChoixClientHTML } from '@/lib/pdf/templates/choix-client-template'
import { sendEmailWithAttachment } from '@/lib/email-sender'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

export const dynamic = 'force-dynamic'

// POST - Envoyer le récapitulatif par email
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { id } = await params

    // Récupérer le choix client
    const choixClient = await prisma.choixClient.findUnique({
      where: { id },
      include: {
        chantier: {
          select: {
            nomChantier: true,
            adresseChantier: true
          }
        },
        detailsChoix: {
          orderBy: {
            numeroChoix: 'asc'
          }
        }
      }
    })

    if (!choixClient) {
      return NextResponse.json(
        { error: 'Choix client non trouvé' },
        { status: 404 }
      )
    }

    if (!choixClient.emailClient) {
      return NextResponse.json(
        { error: 'Aucune adresse email renseignée pour ce client' },
        { status: 400 }
      )
    }

    // Récupérer les paramètres de l'entreprise
    const companyInfo = await prisma.companysettings.findFirst()

    const companySettings = {
      nom: companyInfo?.name || 'SECOTECH',
      adresse: companyInfo ? `${companyInfo.address}, ${companyInfo.zipCode} ${companyInfo.city}` : 'Adresse de l\'entreprise',
      telephone: companyInfo?.phone || '0123456789',
      email: companyInfo?.email || 'contact@secotech.be',
      siret: '', // Non disponible dans companysettings
      tva: companyInfo?.tva || 'BE0123456789',
      logo: companyInfo?.logo || undefined
    }

    // Préparer les données pour le template
    const templateData = {
      nomClient: choixClient.nomClient,
      telephoneClient: choixClient.telephoneClient || undefined,
      emailClient: choixClient.emailClient || undefined,
      dateVisite: choixClient.dateVisite.toISOString(),
      statut: choixClient.statut,
      notesGenerales: choixClient.notesGenerales || undefined,
      chantier: choixClient.chantier || undefined,
      detailsChoix: choixClient.detailsChoix.map(detail => ({
        numeroChoix: detail.numeroChoix,
        couleurPlan: detail.couleurPlan,
        localisations: (detail.localisations as string[]) || [],
        type: detail.type,
        marque: detail.marque,
        collection: detail.collection || undefined,
        modele: detail.modele,
        reference: detail.reference || undefined,
        couleur: detail.couleur || undefined,
        formatLongueur: detail.formatLongueur ? parseFloat(detail.formatLongueur.toString()) : undefined,
        formatLargeur: detail.formatLargeur ? parseFloat(detail.formatLargeur.toString()) : undefined,
        epaisseur: detail.epaisseur ? parseFloat(detail.epaisseur.toString()) : undefined,
        finition: detail.finition || undefined,
        surfaceEstimee: detail.surfaceEstimee ? parseFloat(detail.surfaceEstimee.toString()) : undefined,
        couleurJoint: detail.couleurJoint || undefined,
        largeurJoint: detail.largeurJoint ? parseFloat(detail.largeurJoint.toString()) : undefined,
        typeJoint: detail.typeJoint || undefined,
        typePose: detail.typePose || undefined,
        sensPose: detail.sensPose || undefined,
        particularitesPose: detail.particularitesPose || undefined,
        notes: detail.notes || undefined
      })),
      companySettings
    }

    // Générer le HTML
    const html = generateChoixClientHTML(templateData)

    // Générer le PDF avec Puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    })

    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle0' })

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '15mm',
        right: '15mm',
        bottom: '15mm',
        left: '15mm'
      }
    })

    await browser.close()

    // Préparer l'email
    const emailSubject = `Récapitulatif de vos choix - ${choixClient.nomClient}`
    const emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Récapitulatif de vos choix</h1>
        </div>
        
        <div style="background-color: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            Bonjour <strong>${choixClient.nomClient}</strong>,
          </p>
          
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            Suite à votre visite du <strong>${format(new Date(choixClient.dateVisite), 'dd MMMM yyyy', { locale: fr })}</strong>, 
            vous trouverez ci-joint le récapitulatif complet de vos choix de revêtements.
          </p>
          
          <div style="background-color: #fff; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="color: #1f2937; font-size: 14px; margin: 0;">
              <strong>Nombre de choix:</strong> ${choixClient.detailsChoix.length}<br/>
              ${choixClient.chantier ? `<strong>Chantier:</strong> ${choixClient.chantier.nomChantier}<br/>` : ''}
            </p>
          </div>
          
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            N'hésitez pas à nous contacter si vous avez des questions ou si vous souhaitez modifier certains éléments.
          </p>
          
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px; margin: 5px 0;">
              <strong>${companySettings.nom}</strong><br/>
              ${companySettings.telephone} | ${companySettings.email}
            </p>
          </div>
        </div>
      </div>
    `

    // Envoyer l'email
    await sendEmailWithAttachment(
      choixClient.emailClient,
      emailSubject,
      emailBody,
      [
        {
          filename: `choix-client-${choixClient.nomClient.replace(/\s/g, '-')}.pdf`,
          content: Buffer.from(pdfBuffer),
          contentType: 'application/pdf'
        }
      ]
    )

    return NextResponse.json({
      success: true,
      message: 'Email envoyé avec succès'
    })

  } catch (error) {
    console.error('Erreur lors de l\'envoi de l\'email:', error)
    return NextResponse.json(
      { error: 'Erreur lors de l\'envoi de l\'email' },
      { status: 500 }
    )
  }
}

