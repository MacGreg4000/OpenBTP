import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const magasiniers = await prisma.magasinier.findMany({
      where: { actif: true },
      orderBy: { nom: 'asc' },
      include: {
        _count: { select: { taches: true } }
      }
    })

    return NextResponse.json(magasiniers)
  } catch (error) {
    console.error('Erreur GET magasiniers:', error)
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
    const { nom, pin } = body as { nom: string; pin?: string }

    if (!nom?.trim()) {
      return NextResponse.json({ error: 'Nom requis' }, { status: 400 })
    }

    const magasinier = await prisma.magasinier.create({
      data: {
        nom: nom.trim(),
        actif: true
      }
    })

    // Créer l'accès PIN si fourni
    if (pin && String(pin).replace(/\D/g, '').length >= 4) {
      const codePIN = String(pin).replace(/\D/g, '').slice(0, 8)
      await prisma.publicAccessPIN.create({
        data: {
          subjectType: 'MAGASINIER',
          subjectId: magasinier.id,
          codePIN,
          estActif: true
        }
      })
    }

    return NextResponse.json(magasinier, { status: 201 })
  } catch (error) {
    console.error('Erreur POST magasiniers:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
