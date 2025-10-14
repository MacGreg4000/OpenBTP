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
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { chantierId, commandeId } = await context.params

    // Vérifier que le chantier existe et récupérer ses informations
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
      return NextResponse.json({ error: 'Chantier non trouvé' }, { status: 404 })
    }

    // Récupérer la commande avec ses lignes
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
      return NextResponse.json({ error: 'Commande non trouvée' }, { status: 404 })
    }

    // Préparer les données pour l'export
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
    const buffer = await exportCommandeToExcel(exportOptions)

    // Générer le nom de fichier
    const filename = `Commande_${chantier.chantierId}_${commande.reference || commande.id}_${new Date().toISOString().split('T')[0]}.xlsx`

    // Retourner le fichier
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buffer.length.toString()
      }
    })

  } catch (error) {
    console.error('Erreur lors de l\'export Excel de la commande:', error)
    return NextResponse.json(
      { error: 'Erreur lors de l\'export Excel' },
      { status: 500 }
    )
  }
}
