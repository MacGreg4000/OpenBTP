import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { statut, client, localisation, lignes } = body

    const data: Record<string, unknown> = {}
    if (statut === 'A_FAIRE' || statut === 'TERMINE') data.statut = statut
    if (client?.trim()) data.client = client.trim()
    if (localisation !== undefined) data.localisation = localisation?.trim() || null
    if (Array.isArray(lignes)) data.lignes = lignes

    const bon = await prisma.bonPreparation.update({
      where: { id },
      data,
      include: {
        magasinier: { select: { id: true, nom: true } },
        createur: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json(bon)
  } catch (error) {
    console.error('Erreur PATCH bon-preparation:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { id } = await params
    await prisma.bonPreparation.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erreur DELETE bon-preparation:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
