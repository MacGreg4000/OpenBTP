import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'

export async function GET(request: Request, props: { params: Promise<{ chantierId: string }> }) {
  const params = await props.params;
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Vérifier que le chantier existe
    const chantier = await prisma.chantier.findUnique({
      where: { chantierId: params.chantierId }
    })

    if (!chantier) {
      return NextResponse.json({ error: 'Chantier non trouvé' }, { status: 404 })
    }

    console.log('Récupération des commandes sous-traitants validées pour le chantier:', params.chantierId)

    // Récupérer toutes les commandes sous-traitants validées pour ce chantier
    const commandesSousTraitants = await prisma.commandeSousTraitant.findMany({
      where: {
        chantierId: params.chantierId,
        estVerrouillee: true
      },
      include: {
        soustraitant: {
          select: {
            id: true,
            nom: true,
            email: true,
            telephone: true,
            adresse: true
          }
        }
      },
      orderBy: {
        dateCommande: 'desc'
      }
    })

    console.log('Commandes sous-traitants trouvées:', commandesSousTraitants.length)

    // Pour chaque commande, récupérer les états d'avancement du sous-traitant
    const formattedCommandes = await Promise.all(
      commandesSousTraitants.map(async (commande) => {
        console.log('Récupération des états d\'avancement pour le sous-traitant:', commande.soustraitantId)
        
        // Récupérer les états d'avancement pour ce sous-traitant dans ce chantier
        const etatsAvancement = await prisma.soustraitantEtatAvancement.findMany({
          where: {
            soustraitantId: commande.soustraitantId,
            etatAvancement: {
              chantierId: params.chantierId
            }
          },
          include: {
            etatAvancement: true
          },
          orderBy: {
            createdAt: 'desc'
          }
        })

        console.log('États d\'avancement trouvés pour le sous-traitant:', etatsAvancement.length)

        return {
          id: commande.id,
          soustraitantId: commande.soustraitantId,
          soustraitantNom: commande.soustraitant.nom,
          reference: commande.reference,
          dateCommande: commande.dateCommande,
          total: commande.total,
          estVerrouillee: commande.estVerrouillee,
          etatsAvancement: etatsAvancement.map(etat => ({
            id: etat.id,
            numero: etat.numero,
            createdAt: etat.createdAt,
            estFinalise: etat.estFinalise,
            soustraitantId: etat.soustraitantId,
            etatAvancementId: etat.etatAvancementId
          }))
        }
      })
    )

    console.log('Commandes formatées:', formattedCommandes)

    return NextResponse.json(formattedCommandes)
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Une erreur est survenue' },
      { status: 500 }
    )
  }
} 