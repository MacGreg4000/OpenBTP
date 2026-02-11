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

    const magasinier = await prisma.magasinier.findUnique({
      where: { id: magasinierId },
      select: { id: true, nom: true }
    })

    if (!magasinier) {
      return NextResponse.json({ error: 'Magasinier introuvable' }, { status: 404 })
    }

    const aFaire = await prisma.tacheMagasinier.count({
      where: {
        magasinierId,
        statut: 'A_FAIRE',
        dateExecution: { lte: new Date(new Date().toISOString().slice(0, 10) + 'T23:59:59.999Z') }
      }
    })

    return NextResponse.json({ magasinier, tachesAFaire: aFaire })
  } catch (error) {
    console.error('Erreur GET magasinier me:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
