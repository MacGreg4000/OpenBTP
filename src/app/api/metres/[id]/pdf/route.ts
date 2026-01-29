import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'
import { PDFGenerator } from '@/lib/pdf/pdf-generator'
import { generateMetreSoustraitantHTML } from '@/lib/pdf/templates/metre-soustraitant-template'
import { readFile } from 'fs/promises'
import { join } from 'path'

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { id } = await props.params

    // Récupérer le métré avec toutes les informations nécessaires
    const metre = await prisma.metreSoustraitant.findUnique({
      where: { id },
      include: {
        chantier: {
          select: {
            chantierId: true,
            nomChantier: true,
            clientNom: true,
          }
        },
        soustraitant: {
          select: {
            id: true,
            nom: true,
            email: true,
          }
        },
        lignes: {
          orderBy: { createdAt: 'asc' }
        },
        commande: {
          select: {
            id: true,
            reference: true,
          }
        }
      }
    })

    if (!metre) {
      return NextResponse.json({ error: 'Métré non trouvé' }, { status: 404 })
    }

    // Récupérer les paramètres de l'entreprise
    const companySettings = await prisma.companysettings.findFirst()
    
    // Charger le logo si disponible
    let logoBase64: string | undefined
    if (companySettings?.logo) {
      try {
        const logoPath = join(process.cwd(), 'public', companySettings.logo.replace(/^\//, ''))
        const logoBuffer = await readFile(logoPath)
        const logoMimeType = companySettings.logo.endsWith('.png') ? 'image/png' : 'image/jpeg'
        logoBase64 = `data:${logoMimeType};base64,${logoBuffer.toString('base64')}`
      } catch (error) {
        console.warn('Impossible de charger le logo:', error)
      }
    }

    // Préparer les données pour le template
    const templateData = {
      id: metre.id,
      statut: metre.statut,
      commentaire: metre.commentaire,
      createdAt: metre.createdAt,
      chantier: metre.chantier,
      soustraitant: metre.soustraitant,
      commande: metre.commande,
      lignes: metre.lignes.map(ligne => ({
        id: ligne.id,
        article: ligne.article,
        description: ligne.description,
        type: ligne.type,
        unite: ligne.unite,
        prixUnitaire: ligne.prixUnitaire,
        quantite: ligne.quantite,
        estSupplement: ligne.estSupplement
      })),
      logoBase64
    }

    // Générer le HTML
    const html = generateMetreSoustraitantHTML(
      templateData,
      companySettings ? {
        name: companySettings.name,
        address: companySettings.address,
        zipCode: companySettings.zipCode,
        city: companySettings.city,
        phone: companySettings.phone,
        email: companySettings.email,
        tva: companySettings.tva || undefined
      } : null,
      logoBase64
    )

    // Générer le PDF
    const pdfBuffer = await PDFGenerator.generatePDF(html, {
      format: 'A4',
      orientation: 'portrait',
      margins: {
        top: '15mm',
        right: '15mm',
        bottom: '15mm',
        left: '15mm'
      }
    })

    // Retourner le PDF (Uint8Array pour compatibilité BodyInit)
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="metre-${metre.chantier.chantierId}-${metre.soustraitant.nom.replace(/\s+/g, '-')}-${new Date(metre.createdAt).toISOString().split('T')[0]}.pdf"`,
        'Content-Length': pdfBuffer.length.toString()
      }
    })
  } catch (error) {
    console.error('Erreur lors de la génération du PDF:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la génération du PDF' },
      { status: 500 }
    )
  }
}
