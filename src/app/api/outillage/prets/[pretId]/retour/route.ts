import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(request: Request, props: { params: Promise<{ pretId: string }> }) {
  const params = await props.params;
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    // Récupérer le prêt
    const pret = await prisma.pret.findUnique({
      where: { id: params.pretId },
      include: { machine: true }
    })

    if (!pret) {
      return NextResponse.json(
        { error: 'Prêt non trouvé' },
        { status: 404 }
      )
    }

    if (pret.statut === 'TERMINE') {
      return NextResponse.json(
        { error: 'Ce prêt est déjà terminé' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const commentaire = body.commentaire || pret.commentaire

    // Mettre à jour le prêt et la machine en une seule transaction
    const [updatedPret] = await prisma.$transaction([
      prisma.pret.update({
        where: { id: params.pretId },
        data: {
          statut: 'TERMINE',
          dateRetourEffective: new Date(),
          commentaire
        }
      }),
      prisma.machine.update({
        where: { id: pret.machineId },
        data: {
          statut: body.nouveauStatut || 'DISPONIBLE'
        }
      })
    ])

    return NextResponse.json(updatedPret)
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur lors du retour du prêt' },
      { status: 500 }
    )
  }
} 