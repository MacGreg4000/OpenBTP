import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const receptionsEnCours = await prisma.receptionChantier.findMany({
      where: {
        estFinalise: false, // On ne prend que les réceptions non finalisées
      },
      include: {
        chantier: { // Inclure les informations du chantier lié
          select: {
            nomChantier: true,
            clientNom: true, // Garder clientNom pour le fallback
            client: {         // Inclure l'objet Client lié
              select: {
                nom: true     // Sélectionner le nom depuis le modèle Client
              }
            }
          },
        },
      },
      orderBy: {
        dateLimite: 'asc', // Optionnel: trier par date limite la plus proche
      },
      // take: 5, // Optionnel: limiter le nombre de résultats pour le widget
    })

    // Adapter les données au format attendu par le widget
    const formattedReceptions = receptionsEnCours.map(reception => ({
      id: reception.id,
      nomChantier: reception.chantier.nomChantier,
      client: reception.chantier.client?.nom || reception.chantier.clientNom || 'N/A',
      dateReceptionPrevue: reception.dateLimite.toISOString(), // Utiliser dateLimite comme dateReceptionPrevue
    }))

    return NextResponse.json(formattedReceptions)

  } catch (error) {
    console.error("Erreur lors de la récupération des réceptions en cours:", error)
    return NextResponse.json(
      { error: "Impossible de récupérer les réceptions en cours" },
      { status: 500 }
    )
  }
} 