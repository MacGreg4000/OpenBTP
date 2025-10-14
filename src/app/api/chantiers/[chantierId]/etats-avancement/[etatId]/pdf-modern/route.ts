import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'
import { PDFGenerator } from '@/lib/pdf/pdf-generator'
import { generateEtatAvancementHTML, EtatAvancementData } from '@/lib/pdf/templates/etat-avancement-template'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  props: { params: Promise<{ chantierId: string; etatId: string }> }
) {
  try {
    const resolvedParams = await props.params
    const chantierReadableId = resolvedParams.chantierId
    const etatNumero = parseInt(resolvedParams.etatId)

    console.log(`🎯 Génération PDF moderne - État client N°${etatNumero} du chantier ${chantierReadableId}`)
    
    const session = await getServerSession(authOptions)
    if (!session) {
      console.error('❌ Session non autorisée')
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Récupérer le chantier avec le client
    const chantierEntity = await prisma.chantier.findUnique({
      where: { chantierId: chantierReadableId },
      include: {
        client: true
      }
    })

    if (!chantierEntity) {
      console.error(`❌ Chantier non trouvé: ${chantierReadableId}`)
      return NextResponse.json({ error: 'Chantier non trouvé' }, { status: 404 })
    }
    
    console.log(`✅ Chantier trouvé: ${chantierEntity.nomChantier}`)

    // Récupérer les paramètres de l'entreprise
    const companySettings = await PDFGenerator.getCompanySettings()
    console.log(`📋 Paramètres entreprise: ${companySettings?.nomEntreprise || 'Non définie'}`)

    // Récupérer l'état d'avancement avec ses relations
    const etatAvancement = await prisma.etatAvancement.findFirst({
      where: {
        chantierId: chantierEntity.id,
        numero: etatNumero
      },
      include: {
        lignes: {
          orderBy: {
            ligneCommandeId: 'asc'
          }
        },
        avenants: {
          orderBy: {
            id: 'asc'
          }
        }
      }
    })

    if (!etatAvancement) {
      console.error(`❌ État d'avancement N°${etatNumero} non trouvé`)
      return NextResponse.json({ error: 'État d\'avancement non trouvé' }, { status: 404 })
    }
    
    console.log(`✅ État d'avancement trouvé: ${etatAvancement.lignes.length} lignes, ${etatAvancement.avenants.length} avenants`)

    // Calculer les totaux
    const totalCommandeInitiale = etatAvancement.lignes.reduce((acc, ligne) => ({
      precedent: acc.precedent + ligne.montantPrecedent,
      actuel: acc.actuel + ligne.montantActuel,
      total: acc.total + ligne.montantTotal
    }), { precedent: 0, actuel: 0, total: 0 })

    const totalAvenants = etatAvancement.avenants.reduce((acc, avenant) => ({
      precedent: acc.precedent + avenant.montantPrecedent,
      actuel: acc.actuel + avenant.montantActuel,
      total: acc.total + avenant.montantTotal
    }), { precedent: 0, actuel: 0, total: 0 })

    const totalGeneral = {
      precedent: totalCommandeInitiale.precedent + totalAvenants.precedent,
      actuel: totalCommandeInitiale.actuel + totalAvenants.actuel,
      total: totalCommandeInitiale.total + totalAvenants.total
    }

    // Préparer les données pour le template
    const pdfData: EtatAvancementData = {
      numero: etatAvancement.numero,
      date: etatAvancement.createdAt,
      estFinalise: etatAvancement.estFinalise,
      mois: etatAvancement.mois || undefined,
      commentaires: etatAvancement.commentaires || undefined,
      
      chantier: {
        nomChantier: chantierEntity.nomChantier,
        adresseChantier: chantierEntity.adresseChantier || '',
        chantierId: chantierEntity.chantierId
      },
      
      client: {
        nom: chantierEntity.client.nom,
        adresse: chantierEntity.client.adresse || undefined
      },
      
      lignes: etatAvancement.lignes.map(ligne => ({
        article: ligne.article,
        description: ligne.description,
        type: ligne.type,
        unite: ligne.unite,
        prixUnitaire: ligne.prixUnitaire,
        quantite: ligne.quantite,
        quantitePrecedente: ligne.quantitePrecedente,
        quantiteActuelle: ligne.quantiteActuelle,
        quantiteTotale: ligne.quantiteTotale,
        montantPrecedent: ligne.montantPrecedent,
        montantActuel: ligne.montantActuel,
        montantTotal: ligne.montantTotal
      })),
      
      avenants: etatAvancement.avenants.map(avenant => ({
        article: avenant.article,
        description: avenant.description,
        type: avenant.type,
        unite: avenant.unite,
        prixUnitaire: avenant.prixUnitaire,
        quantite: avenant.quantite,
        quantitePrecedente: avenant.quantitePrecedente,
        quantiteActuelle: avenant.quantiteActuelle,
        quantiteTotale: avenant.quantiteTotale,
        montantPrecedent: avenant.montantPrecedent,
        montantActuel: avenant.montantActuel,
        montantTotal: avenant.montantTotal
      })),
      
      totalCommandeInitiale,
      totalAvenants,
      totalGeneral
    }

    console.log('🎨 Génération du HTML...')
    const html = generateEtatAvancementHTML(pdfData, companySettings, 'client')
    
    console.log('📄 Génération du PDF avec Puppeteer...')
    const pdfBuffer = await PDFGenerator.generatePDF(html, {
      format: 'A4',
      orientation: 'landscape',
      margins: {
        top: '15mm',
        right: '10mm',
        bottom: '15mm',
        left: '10mm'
      }
    })

    console.log(`✅ PDF généré: ${pdfBuffer.length} bytes`)

    // Nom du fichier
    const fileName = `etat-avancement-client-${chantierEntity.chantierId}-n${etatNumero}.pdf`

    // Retourner le PDF
    return new Response(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': pdfBuffer.length.toString()
      }
    })

  } catch (error) {
    console.error('❌ Erreur génération PDF:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la génération du PDF' },
      { status: 500 }
    )
  }
}
