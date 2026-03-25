import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const magasinierId = searchParams.get('magasinierId') ?? undefined
    const statut = searchParams.get('statut') ?? undefined

    const where: Record<string, unknown> = {}
    if (magasinierId?.trim()) where.magasinierId = magasinierId.trim()
    if (statut === 'A_FAIRE' || statut === 'TERMINE') where.statut = statut

    const bons = await prisma.bonPreparation.findMany({
      where,
      include: {
        magasinier: { select: { id: true, nom: true } },
        createur: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(bons)
  } catch (error) {
    console.error('Erreur GET bons-preparation:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const body = await request.json()
    const { client, localisation, magasinierId, lignes } = body

    if (!client?.trim()) {
      return NextResponse.json({ error: 'Le nom du client est requis' }, { status: 400 })
    }
    if (!magasinierId?.trim()) {
      return NextResponse.json({ error: 'Le magasinier est requis' }, { status: 400 })
    }
    if (!Array.isArray(lignes) || lignes.length === 0) {
      return NextResponse.json({ error: 'Au moins une ligne est requise' }, { status: 400 })
    }

    const bon = await prisma.bonPreparation.create({
      data: {
        client: client.trim(),
        localisation: localisation?.trim() || null,
        magasinierId,
        creePar: session.user.id,
        lignes,
      },
      include: {
        magasinier: { select: { id: true, nom: true } },
        createur: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json(bon, { status: 201 })
  } catch (error) {
    console.error('Erreur POST bons-preparation:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
