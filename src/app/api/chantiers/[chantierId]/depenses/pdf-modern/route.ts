import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PDFGenerator } from '@/lib/pdf/pdf-generator'
import { generateDepensesHTML, type DepensesData } from '@/lib/pdf/templates/depenses-template'
import { readFile } from 'fs/promises'
import { join } from 'path'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  props: { params: Promise<{ chantierId: string }> }
) {
  try {
    const params = await props.params
    const { chantierId } = params

    console.log(`🎯 Génération PDF moderne - Dépenses pour chantier ${chantierId}`)
    
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Récupérer le chantier avec les informations client
    const chantier = await prisma.chantier.findUnique({
      where: { chantierId },
      include: {
        client: {
          select: {
            nom: true
          }
        }
      }
    })

    if (!chantier) {
      return NextResponse.json({ error: 'Chantier non trouvé' }, { status: 404 })
    }

    // Récupérer les dépenses
    const depenses = await prisma.depense.findMany({
      where: { chantierId: chantier.id },
      orderBy: { date: 'desc' }
    })

    // Récupérer le logo de l'entreprise
    let logoBase64 = ''
    try {
      const logoPath = join(process.cwd(), 'public', 'images', 'logo.png')
      const logoBuffer = await readFile(logoPath)
      logoBase64 = logoBuffer.toString('base64')
    } catch (error) {
      console.warn('Impossible de charger le logo:', error)
    }

    // Préparer les données pour le template
    const depensesData: DepensesData = {
      chantier: {
        id: chantier.id,
        chantierId: chantier.chantierId,
        nomChantier: chantier.nomChantier,
        clientNom: chantier.client?.nom || 'Client non spécifié',
        adresseChantier: chantier.adresseChantier || ''
      },
      depenses: depenses.map(depense => ({
        id: depense.id,
        date: depense.date.toISOString(),
        description: depense.description || '',
        categorie: depense.categorie || '',
        fournisseur: depense.fournisseur || '',
        reference: depense.reference || '',
        montant: depense.montant
      })),
      logoBase64
    }

    // Générer le HTML
    const htmlContent = generateDepensesHTML(depensesData)

    // Générer le PDF avec Puppeteer
    console.log('📄 Génération du PDF avec Puppeteer...')
    const pdfBuffer = await PDFGenerator.generatePDF(htmlContent, {
      format: 'A4',
      orientation: 'portrait',
      margins: {
        top: '10mm',
        right: '10mm',
        bottom: '10mm',
        left: '10mm'
      }
    })

    console.log('✅ PDF généré avec succès')

    // Convertir le Buffer en Uint8Array pour compatibilité avec NextResponse
    const uint8Array = new Uint8Array(pdfBuffer)
    return new NextResponse(uint8Array, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="depenses-${chantier.chantierId}-${new Date().toISOString().split('T')[0]}.pdf"`
      }
    })

  } catch (error) {
    console.error('❌ Erreur lors de la génération du PDF de dépenses:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la génération du PDF' },
      { status: 500 }
    )
  }
}
