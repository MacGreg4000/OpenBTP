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
    const magasinier = await prisma.magasinier.findUnique({
      where: { id },
      include: { _count: { select: { taches: true } } }
    })

    if (!magasinier) {
      return NextResponse.json({ error: 'Magasinier introuvable' }, { status: 404 })
    }

    return NextResponse.json(magasinier)
  } catch (error) {
    console.error('Erreur GET magasinier:', error)
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
    const { nom, actif } = body as { nom?: string; actif?: boolean }

    const magasinier = await prisma.magasinier.update({
      where: { id },
      data: {
        ...(nom !== undefined && { nom: String(nom).trim() }),
        ...(actif !== undefined && { actif })
      }
    })

    return NextResponse.json(magasinier)
  } catch (error) {
    console.error('Erreur PATCH magasinier:', error)
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
    await prisma.magasinier.update({
      where: { id },
      data: { actif: false }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erreur DELETE magasinier:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
