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
    const access = await prisma.publicAccessPIN.findFirst({
      where: {
        subjectType: 'MAGASINIER',
        subjectId: id,
        estActif: true
      }
    })

    return NextResponse.json({ pin: access?.codePIN ?? '' })
  } catch (error) {
    console.error('Erreur GET pin magasinier:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function PUT(
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
    const { pin } = body as { pin: string }

    const codePIN = String(pin || '').replace(/\D/g, '').slice(0, 8)
    if (codePIN.length < 4) {
      return NextResponse.json({ error: 'PIN doit contenir 4 à 8 chiffres' }, { status: 400 })
    }

    // Vérifier que le magasinier existe
    const magasinier = await prisma.magasinier.findUnique({ where: { id } })
    if (!magasinier) {
      return NextResponse.json({ error: 'Magasinier introuvable' }, { status: 404 })
    }

    await prisma.publicAccessPIN.deleteMany({
      where: {
        subjectType: 'MAGASINIER',
        subjectId: id
      }
    })

    await prisma.publicAccessPIN.create({
      data: {
        subjectType: 'MAGASINIER',
        subjectId: id,
        codePIN,
        estActif: true
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erreur PUT pin magasinier:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
