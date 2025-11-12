import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { exportEtatToExcel, type ExportEtatOptions } from '@/lib/excel/export-etats'

export async function GET(
  request: Request,
  context: { params: Promise<{ chantierId: string; etatId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { chantierId, etatId } = await context.params
    const etatNumero = parseInt(etatId, 10)

    if (Number.isNaN(etatNumero)) {
      return NextResponse.json({ error: 'Identifiant d\'état invalide' }, { status: 400 })
    }

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

    // Récupérer l'état d'avancement avec ses lignes et ses avenants
    const etatAvancement = await prisma.etatAvancement.findUnique({
      where: {
        chantierId_numero: {
          chantierId: chantier.id,
          numero: etatNumero
        }
      },
      include: {
        lignes: {
          orderBy: {
            id: 'asc'
          }
        },
        avenants: {
          orderBy: {
            id: 'asc'
          }
        },
        soustraitant_etat_avancement: {
          include: {
            soustraitant: {
              select: {
                nom: true
              }
            }
          }
        }
      }
    })

    if (!etatAvancement) {
      return NextResponse.json({ error: 'État d\'avancement non trouvé' }, { status: 404 })
    }

    const lignesPrincipales = etatAvancement.lignes.map(ligne => ({
      id: ligne.id,
      poste: ligne.article || undefined,
      description: ligne.description,
      quantite: ligne.quantiteTotale,
      prixUnitaire: ligne.prixUnitaire,
      total: ligne.montantTotal,
      unite: ligne.unite || undefined
    }))

    const lignesAvenants = etatAvancement.avenants.map((avenant, index) => ({
      id: 1_000_000 + avenant.id,
      poste: avenant.article || `Avenant ${index + 1}`,
      description: avenant.description,
      quantite: avenant.quantiteTotale || avenant.quantite || 0,
      prixUnitaire: avenant.prixUnitaire || 0,
      total: avenant.montantTotal || avenant.montantActuel,
      unite: avenant.unite || undefined
    }))

    const lignesEtat = [...lignesPrincipales, ...lignesAvenants]

    // Calculer le total à partir de toutes les lignes (y compris avenants)
    const totalCalculé = lignesEtat.reduce((sum, ligne) => sum + ligne.total, 0)

    // Préparer les données pour l'export
    const exportOptions: ExportEtatOptions = {
      chantierInfo: {
        nomChantier: chantier.nomChantier,
        chantierId: chantier.chantierId,
        clientNom: chantier.client?.nom,
        adresse: chantier.client?.adresse
      },
      etatInfo: {
        id: etatAvancement.id,
        numeroEtat: etatAvancement.numero.toString(),
        dateCreation: etatAvancement.createdAt.toISOString(),
        dateValidation: etatAvancement.estFinalise ? etatAvancement.updatedAt.toISOString() : undefined,
        statut: etatAvancement.estFinalise ? 'Finalisé' : 'En cours',
        total: totalCalculé,
        description: etatAvancement.commentaires || undefined,
        soustraitantNom: etatAvancement.soustraitant_etat_avancement?.[0]?.soustraitant?.nom
      },
      lignesEtat
    }

    // Générer le fichier Excel
    const buffer = await exportEtatToExcel(exportOptions)

    // Générer le nom de fichier
    const filename = `Etat_${chantier.chantierId}_${etatAvancement.numero}_${new Date().toISOString().split('T')[0]}.xlsx`

    // Retourner le fichier
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buffer.length.toString()
      }
    })

  } catch (error) {
    console.error('Erreur lors de l\'export Excel de l\'état d\'avancement:', error)
    return NextResponse.json(
      { error: 'Erreur lors de l\'export Excel' },
      { status: 500 }
    )
  }
}
