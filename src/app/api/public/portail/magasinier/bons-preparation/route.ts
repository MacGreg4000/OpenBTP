import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { getMagasinierIdFromCookie } from '@/app/public/portail/auth'

export async function GET(request: NextRequest) {
  try {
    const magasinierId = getMagasinierIdFromCookie(request.headers.get('cookie'))
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
