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

    const { searchParams } = new URL(request.url)
    const vue = searchParams.get('vue') ?? 'a_faire' // a_faire | historique
    const dateStr = searchParams.get('date') ?? undefined

    if (vue === 'historique') {
      const taches = await prisma.tacheMagasinier.findMany({
        where: {
          magasinierId,
          statut: 'VALIDEE'
        },
        orderBy: { dateValidation: 'desc' },
        include: { photos: { where: { type: 'PREUVE' }, orderBy: { ordre: 'asc' } } }
      })
      return NextResponse.json(taches)
    }

    // Vue à faire: tâches non validées, report au lendemain (dateExecution <= date affichée)
    const jours = searchParams.get('jours') ? parseInt(searchParams.get('jours')!, 10) : 14
    const dateDebut = dateStr ? new Date(dateStr) : new Date()
    dateDebut.setHours(0, 0, 0, 0)
    const dateFin = new Date(dateDebut)
    dateFin.setDate(dateFin.getDate() + Math.max(0, jours - 1))
    dateFin.setHours(23, 59, 59, 999)

    const taches = await prisma.tacheMagasinier.findMany({
      where: {
        magasinierId,
        statut: 'A_FAIRE',
        dateExecution: { lte: dateFin }
      },
      orderBy: [{ dateExecution: 'asc' }, { createdAt: 'asc' }],
      include: { photos: { where: { type: 'A_FAIRE' }, orderBy: { ordre: 'asc' } } }
    })

    return NextResponse.json({
      taches,
      dateDebut: dateDebut.toISOString(),
      dateFin: dateFin.toISOString()
    })
  } catch (error) {
    console.error('Erreur GET taches magasinier:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
