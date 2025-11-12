import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PDFGenerator } from '@/lib/pdf/pdf-generator'
import { generateCommandeHTML, type CommandeData } from '@/lib/pdf/templates/commande-template'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { getActiveTemplateHtml } from '@/lib/templates/get-active-template'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  props: { params: Promise<{ commandeId: string }> }
) {
  try {
    const params = await props.params
    const { commandeId } = params

    console.log(`🎯 Génération PDF moderne - Commande N°${commandeId}`)
    
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Récupérer la commande avec toutes les données nécessaires
    const commande = await prisma.commande.findUnique({
      where: { id: parseInt(commandeId) },
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
      return NextResponse.json({ error: 'Commande non trouvée' }, { status: 404 })
    }

    // Récupérer les informations de l'entreprise
    const companySettings = await prisma.companysettings.findFirst()
    const entreprise = {
      name: companySettings?.name || 'Entreprise',
      address: companySettings?.address || 'Adresse non définie',
      zipCode: companySettings?.zipCode || '00000',
      city: companySettings?.city || 'Ville',
      phone: companySettings?.phone || '00 00 00 00 00',
      email: companySettings?.email || 'contact@entreprise.com',
      siret: companySettings?.iban || '', // Utiliser iban comme siret si pas de champ siret
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

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="commande-${commandeData.commande.reference}.pdf"`
      }
    })

  } catch (error) {
    console.error('❌ Erreur lors de la génération du PDF de commande:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la génération du PDF' },
      { status: 500 }
    )
  }
}