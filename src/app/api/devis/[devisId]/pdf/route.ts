import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'
import { generateDevisHTML } from '@/lib/pdf/templates/devis-template'
import { PDFGenerator } from '@/lib/pdf/pdf-generator'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { getActiveTemplateHtml } from '@/lib/templates/get-active-template'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ devisId: string }> }
) {
  const params = await props.params
  const { devisId } = params
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Récupérer le devis avec toutes ses relations
    const devis = await prisma.devis.findUnique({
      where: { id: devisId },
      include: {
        client: true,
        lignes: {
          orderBy: {
            ordre: 'asc'
          }
        }
      }
    })

    if (!devis) {
      return NextResponse.json(
        { error: 'Devis introuvable' },
        { status: 404 }
      )
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
        const mimeType = entreprise.logo.endsWith('.png') ? 'image/png' : 'image/jpeg'
        logoBase64 = `data:${mimeType};base64,${logoBuffer.toString('base64')}`
      } catch (error) {
        console.warn('Impossible de charger le logo:', error)
      }
    }

    const cgvHtml = await getActiveTemplateHtml('CGV')

    // Préparer les données pour le template
    const devisData = {
      devis: {
        numeroDevis: devis.numeroDevis,
        reference: devis.reference || undefined,
        dateCreation: devis.dateCreation.toISOString(),
        dateValidite: devis.dateValidite.toISOString(),
        clientNom: devis.client.nom,
        clientEmail: devis.client.email || undefined,
        clientTelephone: devis.client.telephone || undefined,
        clientAdresse: devis.client.adresse || undefined,
        observations: devis.observations || undefined,
        tauxTVA: Number(devis.tauxTVA),
        remiseGlobale: Number(devis.remiseGlobale),
        montantHT: Number(devis.montantHT),
        montantTVA: Number(devis.montantTVA),
        montantTTC: Number(devis.montantTTC),
        lignes: devis.lignes.map(ligne => ({
          id: ligne.id,
          ordre: ligne.ordre,
          type: ligne.type,
          article: ligne.article,
          description: ligne.description,
          unite: ligne.unite,
          quantite: ligne.quantite ? Number(ligne.quantite) : null,
          prixUnitaire: ligne.prixUnitaire ? Number(ligne.prixUnitaire) : null,
          remise: Number(ligne.remise),
          total: ligne.total ? Number(ligne.total) : null
        }))
      },
      entreprise,
      logoBase64,
      cgvHtml: cgvHtml || undefined
    }

    // Générer le HTML
    const html = generateDevisHTML(devisData)

    // Générer le PDF
    const pdfBuffer = await PDFGenerator.generatePDF(html, {
      format: 'A4',
      margins: {
        top: '10mm',
        right: '10mm',
        bottom: '10mm',
        left: '10mm'
      }
    })

    // Retourner le PDF avec headers pour permettre l'affichage dans iframe
    const response = new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="Devis_${devis.numeroDevis}.pdf"`,
        // Headers pour permettre l'affichage dans iframe
        'Content-Security-Policy': "frame-ancestors 'self'",
      }
    })
    
    // Supprimer explicitement X-Frame-Options si défini par next.config.js
    response.headers.delete('X-Frame-Options')
    
    return response
  } catch (error) {
    console.error('Erreur lors de la génération du PDF:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la génération du PDF' },
      { status: 500 }
    )
  }
}

