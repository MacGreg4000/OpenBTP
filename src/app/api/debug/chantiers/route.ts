import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    // Récupérer tous les chantiers avec leurs dates
    const chantiers = await prisma.chantier.findMany({
      select: {
        chantierId: true,
        nomChantier: true,
        dateCommencement: true,
        dureeEnJours: true,
        etatChantier: true,
        clientNom: true
      },
      orderBy: {
        dateCommencement: 'asc'
      }
    })

    // Analyser les données
    const chantiersAvecDate = chantiers.filter(c => c.dateCommencement)
    const chantiersSansDate = chantiers.filter(c => !c.dateCommencement)
    const chantiersAvecDuree = chantiers.filter(c => c.dureeEnJours)

    return NextResponse.json({
      total: chantiers.length,
      avecDate: chantiersAvecDate.length,
      sansDate: chantiersSansDate.length,
      avecDuree: chantiersAvecDuree.length,
      details: chantiers.map(c => ({
        id: c.chantierId,
        nom: c.nomChantier,
        dateCommencement: c.dateCommencement,
        dureeEnJours: c.dureeEnJours,
        etat: c.etatChantier,
        client: c.clientNom
      }))
    })
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des données de débogage' },
      { status: 500 }
    )
  }
} 