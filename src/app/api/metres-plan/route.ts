import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'
import { mkdir } from 'fs/promises'
import { join } from 'path'

const METRES_PLAN_BASE_PATH = join(process.cwd(), 'public', 'uploads', 'metres-plan')

// GET /api/metres-plan
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const url = new URL(request.url)
    const chantierId = url.searchParams.get('chantierId')

    const whereClause: { createdBy: string; chantierId?: string } = {
      createdBy: session.user.id,
    }

    if (chantierId) {
      whereClause.chantierId = chantierId
    }

    const metresPlan = await prisma.metrePlan.findMany({
      where: whereClause,
      include: {
        chantier: {
          select: {
            chantierId: true,
            nomChantier: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(metresPlan)
  } catch (error) {
    console.error('Erreur GET /api/metres-plan:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des métrés sur plan' },
      { status: 500 }
    )
  }
}

// POST /api/metres-plan
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const body = await request.json()
    const { nom, chantierId } = body as { nom: string; chantierId?: string }

    if (!nom) {
      return NextResponse.json({ error: 'Le nom est requis' }, { status: 400 })
    }

    const metrePlan = await prisma.metrePlan.create({
      data: {
        nom,
        chantierId: chantierId || null,
        mplanUrl: '',
        createdBy: session.user.id,
      },
      include: {
        chantier: {
          select: {
            chantierId: true,
            nomChantier: true,
          },
        },
      },
    })

    // Créer le dossier de stockage
    const dir = join(METRES_PLAN_BASE_PATH, metrePlan.id)
    await mkdir(dir, { recursive: true })

    return NextResponse.json(metrePlan, { status: 201 })
  } catch (error) {
    console.error('Erreur POST /api/metres-plan:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création du métré sur plan' },
      { status: 500 }
    )
  }
}
