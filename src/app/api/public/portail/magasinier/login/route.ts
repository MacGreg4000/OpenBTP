import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { pin } = body as { pin: string }

    const codePIN = String(pin || '').replace(/\D/g, '')
    if (!codePIN || codePIN.length < 4) {
      return NextResponse.json({ error: 'PIN invalide' }, { status: 400 })
    }

    const access = await prisma.publicAccessPIN.findFirst({
      where: {
        subjectType: 'MAGASINIER',
        codePIN,
        estActif: true
      }
    })

    if (!access) {
      return NextResponse.json({ error: 'PIN invalide' }, { status: 401 })
    }

    const magasinier = await prisma.magasinier.findUnique({
      where: { id: access.subjectId },
      select: { id: true, nom: true, actif: true }
    })

    if (!magasinier || !magasinier.actif) {
      return NextResponse.json({ error: 'PIN invalide' }, { status: 401 })
    }

    const res = NextResponse.json({ ok: true, magasinierId: magasinier.id, nom: magasinier.nom })
    const value = `MAGASINIER:${magasinier.id}`

    res.cookies.set('portalSession', value, {
      httpOnly: false,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 8 // 8 heures
    })

    return res
  } catch (error) {
    console.error('Erreur login magasinier:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
