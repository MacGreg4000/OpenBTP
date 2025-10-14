import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { readPortalSessionFromCookie } from '@/app/public/portail/auth'

// GET /api/public/access
// Vérifie la session active via les cookies
export async function GET(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get('cookie')
    const session = readPortalSessionFromCookie(cookieHeader)
    
    if (!session) {
      return NextResponse.json({ error: 'Pas de session active' }, { status: 401 })
    }

    // Récupérer le nom du sujet
    let subjectName = ''
    if (session.t === 'OUVRIER_INTERNE') {
      const ouvrier = await prisma.ouvrierInterne.findUnique({
        where: { id: session.id },
        select: { nom: true, prenom: true }
      })
      if (ouvrier) {
        subjectName = `${ouvrier.prenom} ${ouvrier.nom}`
      }
    } else if (session.t === 'SOUSTRAITANT') {
      const soustraitant = await prisma.soustraitant.findUnique({
        where: { id: session.id },
        select: { nom: true }
      })
      if (soustraitant) {
        subjectName = soustraitant.nom
      }
    }

    const token = {
      subjectType: session.t,
      subjectId: session.id,
      subjectName
    }

    return NextResponse.json({
      success: true,
      token
    })
  } catch (error) {
    console.error('Erreur /api/public/access GET:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST /api/public/access
// Body: { codePIN: string }
// Vérifie un code PIN et retourne un jeton d'accès public scellé et les métadonnées sujet
export async function POST(request: NextRequest) {
  try {
    const { codePIN } = await request.json()
    if (!codePIN) return NextResponse.json({ error: 'PIN requis' }, { status: 400 })

    const pin = await prisma.publicAccessPIN.findUnique({
      where: { codePIN },
    })

    if (!pin || !pin.estActif || (pin.expiresAt && pin.expiresAt < new Date())) {
      return NextResponse.json({ error: 'PIN invalide ou expiré' }, { status: 401 })
    }

    // Récupérer le nom du sujet
    let subjectName = ''
    if (pin.subjectType === 'OUVRIER_INTERNE') {
      const ouvrier = await prisma.ouvrierInterne.findUnique({
        where: { id: pin.subjectId },
        select: { nom: true, prenom: true }
      })
      if (ouvrier) {
        subjectName = `${ouvrier.prenom} ${ouvrier.nom}`
      }
    } else if (pin.subjectType === 'SOUSTRAITANT') {
      const soustraitant = await prisma.soustraitant.findUnique({
        where: { id: pin.subjectId },
        select: { nom: true }
      })
      if (soustraitant) {
        subjectName = soustraitant.nom
      }
    }

    // Créer un jeton simple (JWT non nécessaire, on peut signer côté serveur si besoin)
    const token = {
      subjectType: pin.subjectType,
      subjectId: pin.subjectId,
      subjectName,
      issuedAt: Date.now(),
    }

    // Pour rester simple, renvoyer le token en clair (peut évoluer vers JWT signé)
    return NextResponse.json({
      success: true,
      token,
    })
  } catch (error) {
    console.error('Erreur /api/public/access:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
