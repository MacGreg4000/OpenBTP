import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'

// GET - Récupérer tous les chargements groupés par pays
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Récupérer tous les pays avec leurs usines et chargements
    const pays = await prisma.pays.findMany({
      include: {
        usines: {
          include: {
            chargements: {
              where: { estCharge: false },
              orderBy: { semaine: 'asc' }
            }
          }
        }
      },
      orderBy: { nom: 'asc' }
    })

    // Grouper les chargements par semaine pour chaque usine
    const paysAvecChargements = pays.map(pays => ({
      ...pays,
      usines: pays.usines.map(usine => {
        // Grouper les chargements par semaine
        const chargementsParSemaine = usine.chargements.reduce((acc, chargement) => {
          const semaine = chargement.semaine
          if (!acc[semaine]) {
            acc[semaine] = []
          }
          acc[semaine].push(chargement)
          return acc
        }, {} as Record<number, typeof usine.chargements>)

        return {
          ...usine,
          chargementsParSemaine
        }
      })
    }))

    return NextResponse.json(paysAvecChargements)
  } catch (error) {
    console.error('Erreur lors de la récupération des chargements:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des chargements' },
      { status: 500 }
    )
  }
}

// POST - Créer un nouveau chargement
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { usineId, contenu, semaine } = await request.json()

    if (!usineId || !contenu || !semaine) {
      return NextResponse.json(
        { error: 'usineId, contenu et semaine requis' },
        { status: 400 }
      )
    }

    const chargement = await prisma.chargement.create({
      data: {
        usineId,
        contenu,
        semaine: parseInt(semaine),
        estCharge: false
      },
      include: {
        usine: {
          include: {
            pays: true
          }
        }
      }
    })

    return NextResponse.json(chargement)
  } catch (error) {
    console.error('Erreur lors de la création du chargement:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création du chargement' },
      { status: 500 }
    )
  }
}
