import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'

type SubjectTypeInput = 'ouvrier' | 'soustraitant'
type SubjectEnumValue = 'OUVRIER_INTERNE' | 'SOUSTRAITANT'

function toSubjectEnum(type: SubjectTypeInput): SubjectEnumValue {
  return type === 'ouvrier' ? 'OUVRIER_INTERNE' : 'SOUSTRAITANT'
}

export async function GET(request: Request) {
  try {
    const cookieHeader = request.headers.get('cookie')
    
    if (!cookieHeader) {
      return NextResponse.json({ authenticated: false }, { status: 401 })
    }

    const cookies = Object.fromEntries(
      cookieHeader.split(';').map(cookie => {
        const [key, value] = cookie.trim().split('=')
        return [key, value]
      })
    )

    const portalSession = cookies.portalSession
    
    if (!portalSession) {
      return NextResponse.json({ authenticated: false }, { status: 401 })
    }

    // Décoder le cookie qui peut être URL-encodé
    const decodedSession = decodeURIComponent(portalSession)
    const [subjectType, subjectId] = decodedSession.split(':')
    if (!subjectType || !subjectId) {
      return NextResponse.json({ authenticated: false }, { status: 401 })
    }

    // Vérifier que le PIN existe toujours et est actif
    const access = await prisma.publicAccessPIN.findFirst({
      where: {
        subjectType: subjectType as SubjectEnumValue,
        subjectId,
        estActif: true,
      }
    })

    if (!access) {
      return NextResponse.json({ authenticated: false }, { status: 401 })
    }

    // Récupérer le nom du sujet
    let subjectName = ''
    if (subjectType === 'OUVRIER_INTERNE') {
      const ouvrier = await prisma.ouvrierInterne.findUnique({
        where: { id: subjectId },
        select: { nom: true, prenom: true }
      })
      if (ouvrier) {
        subjectName = `${ouvrier.prenom || ''} ${ouvrier.nom || ''}`.trim()
      }
    } else if (subjectType === 'SOUSTRAITANT') {
      const soustraitant = await prisma.soustraitant.findUnique({
        where: { id: subjectId },
        select: { nom: true }
      })
      if (soustraitant) {
        subjectName = soustraitant.nom || ''
      }
    }

    return NextResponse.json({
      authenticated: true,
      token: {
        subjectType: subjectType as SubjectEnumValue,
        subjectId,
        subjectName
      }
    })

  } catch (error) {
    console.error('Erreur vérification session portail:', error)
    return NextResponse.json({ authenticated: false }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { type, actorId, pin } = await request.json() as { type: SubjectTypeInput; actorId: string; pin: string }
    if (!type || !actorId || !pin) {
      return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 })
    }

    const subjectType = toSubjectEnum(type)

    const access = await prisma.publicAccessPIN.findFirst({
      where: {
        subjectType,
        subjectId: actorId,
        codePIN: pin,
        estActif: true,
      }
    })

    if (!access) {
      return NextResponse.json({ error: 'PIN invalide' }, { status: 401 })
    }

    const res = NextResponse.json({ ok: true })
    const value = `${subjectType}:${actorId}`
    
    res.cookies.set('portalSession', value, {
      httpOnly: false, // Permettre l'accès depuis JavaScript en développement
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 8, // 8 heures
    })
    
    // En développement, ajouter aussi dans les headers pour localStorage
    if (process.env.NODE_ENV !== 'production') {
      res.headers.set('X-Portal-Session', value)
    }
    
    return res
  } catch (error) {
    console.error('Erreur login portail:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

