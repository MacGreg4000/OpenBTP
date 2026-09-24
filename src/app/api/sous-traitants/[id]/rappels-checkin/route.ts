// Historique des rappels Checkinatwork d'un sous-traitant (fiche sous-traitant).
// Lecture seule : le journal n'est jamais modifié.

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id } = await context.params
  const rappels = await prisma.rappelCheckinLog.findMany({
    where: { soustraitantId: id },
    select: {
      id: true,
      dateRappel: true,
      createdAt: true,
      declencheur: true,
      modeTest: true,
      destinataire: true,
      destinataireReel: true,
      contratReference: true,
      statut: true,
      erreur: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 500,
  })
  return NextResponse.json({ rappels })
}
