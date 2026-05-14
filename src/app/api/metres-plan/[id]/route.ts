import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'
import { rm } from 'fs/promises'
import { join } from 'path'

const METRES_PLAN_BASE_PATH = join(process.cwd(), 'public', 'uploads', 'metres-plan')

// GET /api/metres-plan/[id]
export async function GET(
  _request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const metrePlan = await prisma.metrePlan.findUnique({
      where: { id },
      include: {
        chantier: {
          select: {
            chantierId: true,
            nomChantier: true,
          },
        },
      },
    })

    if (!metrePlan) {
      return NextResponse.json({ error: 'Métré sur plan non trouvé' }, { status: 404 })
    }

    return NextResponse.json(metrePlan)
  } catch (error) {
    console.error('Erreur GET /api/metres-plan/[id]:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du métré sur plan' },
      { status: 500 }
    )
  }
}

// PUT /api/metres-plan/[id]
export async function PUT(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const body = await request.json()
    const { nom, chantierId } = body as { nom?: string; chantierId?: string | null }

    const metrePlan = await prisma.metrePlan.update({
      where: { id },
      data: {
        ...(nom !== undefined && { nom }),
        ...(chantierId !== undefined && { chantierId }),
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

    return NextResponse.json(metrePlan)
  } catch (error) {
    console.error('Erreur PUT /api/metres-plan/[id]:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour du métré sur plan' },
      { status: 500 }
    )
  }
}

// DELETE /api/metres-plan/[id]
export async function DELETE(
  _request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    await prisma.metrePlan.delete({ where: { id } })

    // Supprimer le dossier de fichiers
    const dir = join(METRES_PLAN_BASE_PATH, id)
    try {
      await rm(dir, { recursive: true, force: true })
    } catch (fsError) {
      console.error('Erreur lors de la suppression du dossier:', fsError)
      // On continue même si la suppression du dossier échoue
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erreur DELETE /api/metres-plan/[id]:', error)

    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
      return NextResponse.json({ error: 'Métré sur plan non trouvé' }, { status: 404 })
    }

    return NextResponse.json(
      { error: 'Erreur lors de la suppression du métré sur plan' },
      { status: 500 }
    )
  }
}
