import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { exportCommandeToExcel, type ExportCommandeOptions } from '@/lib/excel/export-commandes'

export async function GET(
  request: Request,
  context: { params: Promise<{ chantierId: string; commandeId: string }> }
) {
  try {
    console.log('📊 Début export Excel commande')
    
    const session = await getServerSession(authOptions)
    if (!session) {
      console.log('❌ Session non autorisée')
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { chantierId, commandeId } = await context.params
    console.log(`📥 Paramètres: chantierId=${chantierId}, commandeId=${commandeId}`)

    // Vérifier que le chantier existe et récupérer ses informations
    console.log('🔍 Recherche du chantier...')
    const chantier = await prisma.chantier.findUnique({
      where: { chantierId },
      include: {
        client: {
          select: {
            nom: true,
            adresse: true
          }
        }
      }
    })

    if (!chantier) {
      console.log(`❌ Chantier ${chantierId} non trouvé`)
      return NextResponse.json({ error: 'Chantier non trouvé' }, { status: 404 })
    }
    console.log(`✅ Chantier trouvé: ${chantier.nomChantier}`)

    // Récupérer la commande avec ses lignes
    console.log('🔍 Recherche de la commande...')
    const commande = await prisma.commande.findFirst({
      where: {
        id: parseInt(commandeId),
        chantierId: chantier.id
      },
      include: {
        lignes: {
          orderBy: {
            id: 'asc'
          }
        }
      }
    })

    if (!commande) {
      console.log(`❌ Commande ${commandeId} non trouvée`)
      return NextResponse.json({ error: 'Commande non trouvée' }, { status: 404 })
    }
    console.log(`✅ Commande trouvée: ${commande.lignes.length} lignes`)

    // Préparer les données pour l'export
    console.log('📋 Préparation des données...')
    const exportOptions: ExportCommandeOptions = {
      chantierInfo: {
        nomChantier: chantier.nomChantier,
        chantierId: chantier.chantierId,
        clientNom: chantier.client?.nom,
        adresse: chantier.client?.adresse
      },
      commandeInfo: {
        id: commande.id,
        reference: commande.reference || undefined,
        dateCommande: commande.dateCommande.toISOString(),
        total: commande.total,
        statut: commande.statut,
        description: commande.description || undefined
      },
      lignesCommande: commande.lignes.map(ligne => ({
        id: ligne.id,
        article: ligne.article || undefined,
        description: ligne.description,
        quantite: ligne.quantite,
        prixUnitaire: ligne.prixUnitaire,
        total: ligne.total,
        unite: ligne.unite || undefined,
        type: ligne.type
      }))
    }

    // Générer le fichier Excel
    console.log('📊 Génération du fichier Excel...')
    const buffer = await exportCommandeToExcel(exportOptions)
    console.log(`✅ Excel généré: ${buffer.length} bytes`)

    // Générer le nom de fichier
    const filename = `Commande_${chantier.chantierId}_${commande.reference || commande.id}_${new Date().toISOString().split('T')[0]}.xlsx`
    console.log(`📄 Nom de fichier: ${filename}`)

    // Retourner le fichier
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buffer.length.toString()
      }
    })

  } catch (error) {
    console.error('❌ Erreur lors de l\'export Excel de la commande:', error)
    console.error('Stack trace:', error instanceof Error ? error.stack : 'N/A')
    
    // Détails de l'erreur pour debug
    const errorDetails = {
      message: error instanceof Error ? error.message : 'Erreur inconnue',
      name: error instanceof Error ? error.name : 'Unknown',
      stack: error instanceof Error ? error.stack : undefined
    }
    
    console.error('📋 Détails de l\'erreur:', errorDetails)
    
    return NextResponse.json(
      { 
        error: 'Erreur lors de l\'export Excel',
        details: errorDetails.message 
      },
      { status: 500 }
    )
  }
}
