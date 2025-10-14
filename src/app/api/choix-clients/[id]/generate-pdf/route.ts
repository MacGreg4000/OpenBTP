import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'
import { RemotePDFGenerator } from '@/lib/pdf/pdf-generator-remote'
import { generateChoixClientHTML } from '@/lib/pdf/templates/choix-client-template'

export const dynamic = 'force-dynamic'

// POST - Générer le PDF d'un choix client
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

    // Récupérer les paramètres de l'entreprise
    const companyInfo = await prisma.companysettings.findFirst()

    // Convertir le logo en base64 si présent
    let logoBase64 = null
    if (companyInfo?.logo) {
      logoBase64 = await RemotePDFGenerator.getImageAsBase64(companyInfo.logo)
    }

    const companySettings = {
      nom: companyInfo?.name || 'SECOTECH',
      adresse: companyInfo ? `${companyInfo.address}, ${companyInfo.zipCode} ${companyInfo.city}` : 'Adresse de l\'entreprise',
      telephone: companyInfo?.phone || '0123456789',
      email: companyInfo?.email || 'contact@secotech.be',
      siret: '', // Non disponible dans companysettings
      tva: companyInfo?.tva || 'BE0123456789',
      logo: logoBase64 || undefined
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

    // Générer le PDF via le service distant
    console.log('📡 Appel du service PDF distant pour choix client...')
    const pdfBuffer = await RemotePDFGenerator.generatePDF(html, {
      format: 'A4',
      margins: {
        top: '15mm',
        right: '15mm',
        bottom: '15mm',
        left: '15mm'
      }
    })

    console.log(`✅ PDF généré: ${pdfBuffer.length} bytes`)

    // Retourner le PDF
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="choix-client-${choixClient.nomClient.replace(/\s/g, '-')}.pdf"`
      }
    })

  } catch (error) {
    console.error('❌ Erreur lors de la génération du PDF:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la génération du PDF', details: error instanceof Error ? error.message : 'Erreur inconnue' },
      { status: 500 }
    )
  }
}

