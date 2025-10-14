import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'

// GET /api/public/sav?subjectType=OUVRIER_INTERNE|SOUSTRAITANT&subjectId=...
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const subjectType = searchParams.get('subjectType') as 'OUVRIER_INTERNE' | 'SOUSTRAITANT' | null
    const subjectId = searchParams.get('subjectId')
    if (!subjectType || !subjectId) {
      return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 })
    }

    // Filtrer les tickets selon le sujet
    const where: Record<string, unknown> = {}
    if (subjectType === 'OUVRIER_INTERNE') {
      where.ouvrierInterneAssignId = subjectId
    }
    if (subjectType === 'SOUSTRAITANT') {
      where.soustraitantAssignId = subjectId
    }

    const tickets = await prisma.ticketSAV.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        chantier: { select: { chantierId: true, nomChantier: true } },
      },
    })

    return NextResponse.json({ data: tickets })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
