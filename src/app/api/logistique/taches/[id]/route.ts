import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'

export async function GET(
  _req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { id } = await props.params
    const tache = await prisma.tacheMagasinier.findUnique({
      where: { id },
      include: {
        magasinier: { select: { id: true, nom: true } },
        createur: { select: { id: true, name: true } },
        photos: { orderBy: { ordre: 'asc' } }
      }
    })

    if (!tache) {
      return NextResponse.json({ error: 'Tâche introuvable' }, { status: 404 })
    }

    return NextResponse.json(tache)
  } catch (error) {
    console.error('Erreur GET tache:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { id } = await props.params
    const body = await request.json()
    const { titre, description, dateExecution } = body as {
      titre?: string
      description?: string
      dateExecution?: string
    }

    const tache = await prisma.tacheMagasinier.update({
      where: { id },
      data: {
        ...(titre !== undefined && { titre: String(titre).trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(dateExecution !== undefined && { dateExecution: new Date(dateExecution) })
      },
      include: {
        magasinier: { select: { id: true, nom: true } },
        photos: true
      }
    })

    return NextResponse.json(tache)
  } catch (error) {
    console.error('Erreur PATCH tache:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { id } = await props.params
    await prisma.tacheMagasinier.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erreur DELETE tache:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
