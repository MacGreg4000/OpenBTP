import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { signPortalSession } from '@/app/public/portail/auth'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { pin } = body as { pin: string }

    const codePIN = String(pin || '').replace(/\D/g, '')
    if (!codePIN || codePIN.length < 4) {
      return NextResponse.json({ error: 'PIN invalide' }, { status: 400 })
    }

    // Avec des PINs hachés, on ne peut pas filtrer par valeur directement.
    // On récupère tous les PINs MAGASINIER actifs et on compare avec bcrypt.
    const candidates = await prisma.publicAccessPIN.findMany({
      where: { subjectType: 'MAGASINIER', estActif: true }
    })

    let access = null
    for (const candidate of candidates) {
      if (await bcrypt.compare(codePIN, candidate.codePIN)) {
        access = candidate
        break
      }
    }

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
    const value = signPortalSession('MAGASINIER', magasinier.id)

    res.cookies.set('portalSession', value, {
      httpOnly: true,
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
