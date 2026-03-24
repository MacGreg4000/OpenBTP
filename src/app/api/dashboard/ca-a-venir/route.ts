import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'

// GET /api/dashboard/ca-a-venir - Détail du chiffre d'affaires à venir par chantier
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Récupérer les chantiers actifs avec leurs commandes et états d'avancement
    const chantiersActifs = await prisma.chantier.findMany({
      where: {
        statut: {
          in: ['EN_PREPARATION', 'EN_COURS']
        }
      },
      include: {
        client: {
          select: { nom: true }
        },
        commandes: {
          where: {
            statut: { not: 'BROUILLON' }
          },
          select: {
            id: true,
            reference: true,
            total: true,
            statut: true
          }
        },
        etatsAvancement: {
          where: { estFinalise: true },
          include: {
            lignes: {
              select: { montantActuel: true }
            }
          }
        }
      },
      orderBy: { nomChantier: 'asc' }
    })

    const lignes = chantiersActifs.map(chantier => {
      const totalCommandes = chantier.commandes.reduce(
        (sum, cmd) => sum + (cmd.total || 0),
        0
      )

      const montantFacture = chantier.etatsAvancement.reduce((sum, etat) => {
        const montantLignes = etat.lignes.reduce((s, ligne) => {
          const m = ligne.montantActuel != null && !isNaN(Number(ligne.montantActuel))
            ? Number(ligne.montantActuel)
            : 0
          return s + m
        }, 0)
        return sum + montantLignes
      }, 0)

      const caAvenir = Math.max(0, totalCommandes - montantFacture)

      return {
        id: chantier.id,
        chantierId: chantier.chantierId,
        nomChantier: chantier.nomChantier,
        clientNom: chantier.client?.nom ?? 'Client non spécifié',
        statut: chantier.statut,
        nbCommandes: chantier.commandes.length,
        totalCommandes,
        nbEtatsAvancement: chantier.etatsAvancement.length,
        montantFacture,
        caAvenir
      }
    })

    const totaux = lignes.reduce(
      (acc, l) => ({
        totalCommandes: acc.totalCommandes + l.totalCommandes,
        montantFacture: acc.montantFacture + l.montantFacture,
        caAvenir: acc.caAvenir + l.caAvenir
      }),
      { totalCommandes: 0, montantFacture: 0, caAvenir: 0 }
    )

    return NextResponse.json({ lignes, totaux })

  } catch (error) {
    console.error('Erreur CA à venir:', error)
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 })
  }
}
