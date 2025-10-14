import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: Request, props: { params: Promise<{ machineId: string }> }) {
  const params = await props.params;
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    const prets = await prisma.pret.findMany({
      where: {
        machineId: params.machineId
      },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        datePret: 'desc'
      }
    })

    return NextResponse.json(prets)
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des prêts' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request, props: { params: Promise<{ machineId: string }> }) {
  const params = await props.params;
  try {
    const session = await getServerSession(authOptions)
    console.log('Session:', session)

    if (!session) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    // Récupérer l'utilisateur connecté
    const user = await prisma.user.findUnique({
      where: {
        email: session.user?.email as string
      }
    })
    console.log('User trouvé:', user)

    if (!user) {
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      )
    }

    const body = await request.json()
    console.log('Body de la requête:', body)

    // Vérifier si la machine est disponible
    const machine = await prisma.machine.findUnique({
      where: { id: params.machineId }
    })
    console.log('Machine trouvée:', machine)

    if (!machine) {
      return NextResponse.json(
        { error: 'Machine non trouvée' },
        { status: 404 }
      )
    }

    if (machine.statut !== 'DISPONIBLE') {
      return NextResponse.json(
        { error: 'Machine non disponible' },
        { status: 400 }
      )
    }

    // Créer le prêt et mettre à jour le statut de la machine
    const [pret] = await prisma.$transaction([
      prisma.pret.create({
        data: {
          id: `PRET-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          machineId: params.machineId,
          userId: user.id,
          emprunteur: body.emprunteur,
          dateRetourPrevue: new Date(body.dateRetourPrevue),
          commentaire: body.commentaire || null,
          statut: 'EN_COURS',
          updatedAt: new Date()
        }
      }),
      prisma.machine.update({
        where: { id: params.machineId },
        data: { statut: 'PRETE' as const }
      })
    ])

    return NextResponse.json(pret)
  } catch (error) {
    console.error('Erreur détaillée:', {
      error,
      message: error instanceof Error ? error.message : 'Erreur inconnue',
      stack: error instanceof Error ? error.stack : undefined
    })
    
    return NextResponse.json(
      { error: 'Erreur lors de la création du prêt' },
      { status: 500 }
    )
  }
} 