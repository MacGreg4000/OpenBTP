import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// POST /api/devis/reset-avenant
// Réinitialise les avenants du chantier Lantin pour les tests
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { chantierId } = await request.json()

    // Trouver tous les devis de type AVENANT pour ce chantier qui sont convertis
    const avenants = await prisma.devis.findMany({
      where: {
        chantierId,
        typeDevis: 'AVENANT',
        statut: 'CONVERTI'
      }
    })

    console.log(`🔄 Trouvé ${avenants.length} avenant(s) converti(s) pour le chantier ${chantierId}`)

    // Réinitialiser leur statut
    const results = await Promise.all(
      avenants.map(async (avenant) => {
        const updated = await prisma.devis.update({
          where: { id: avenant.id },
          data: {
            statut: 'ACCEPTE',
            convertedToCommandeId: null,
            convertedToEtatId: null
          }
        })
        console.log(`✅ Avenant ${avenant.numeroDevis} réinitialisé`)
        return updated
      })
    )

    // Supprimer les avenants de l'état d'avancement
    if (avenants.length > 0 && avenants[0].convertedToEtatId) {
      await prisma.avenantEtatAvancement.deleteMany({
        where: {
          description: {
            in: avenants.map(a => `${a.numeroDevis}${a.reference ? ` - ${a.reference}` : ''}`)
          }
        }
      })
      console.log('🗑️ Avenants supprimés de l\'état d\'avancement')
    }

    return NextResponse.json({
      success: true,
      message: `${results.length} avenant(s) réinitialisé(s)`,
      avenants: results.map(a => ({ id: a.id, numeroDevis: a.numeroDevis, statut: a.statut }))
    })
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la réinitialisation des avenants' },
      { status: 500 }
    )
  }
}

