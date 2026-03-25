import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'

function getMagasinierFromCookie(request: NextRequest): string | null {
  const cookieHeader = request.headers.get('cookie')
  if (!cookieHeader) return null
  const m = /portalSession=([^;]+)/.exec(cookieHeader)
  if (!m) return null
  try {
    const decoded = decodeURIComponent(m[1])
    const [type, id] = decoded.split(':')
    if (type === 'MAGASINIER' && id) return id
    return null
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    const magasinierId = getMagasinierFromCookie(request)
    if (!magasinierId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const bons = await prisma.bonPreparation.findMany({
      where: { magasinierId, statut: 'A_FAIRE' },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(bons)
  } catch (error) {
    console.error('Erreur GET bons-preparation portail:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
