import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { readPortalSessionFromCookie, unauthorized } from '@/app/public/portail/auth'

export async function GET(request: Request, props: { params: Promise<{ type: 'ouvrier'|'soustraitant'; actorId: string }> }) {
  const { type, actorId } = await props.params
  const sess = readPortalSessionFromCookie(request.headers.get('cookie'))
  if (!sess) return unauthorized()
  const isOuvrier = type === 'ouvrier'
  if ((isOuvrier && sess.t !== 'OUVRIER_INTERNE') || (!isOuvrier && sess.t !== 'SOUSTRAITANT') || sess.id !== actorId) {
    return unauthorized()
  }

  // Approche: lier les réceptions via tickets/affectations: ici, on renvoie les réceptions des chantiers où l'acteur a des tasks ou SAV récents
  // Simplifié: dernières 20 réceptions des chantiers où l'acteur a des tasks
  const chantierIds = isOuvrier
    ? await prisma.task.findMany({ where: { ouvriersInternes: { some: { ouvrierInterneId: actorId } } }, select: { chantierId: true }, distinct: ['chantierId'] })
    : await prisma.task.findMany({ where: { sousTraitants: { some: { soustraitantId: actorId } } }, select: { chantierId: true }, distinct: ['chantierId'] })

  const ids = chantierIds.map(c => c.chantierId).filter(Boolean) as string[]
  const receptions = await prisma.receptionChantier.findMany({
    where: ids.length ? { chantierId: { in: ids } } : undefined,
    orderBy: { dateCreation: 'desc' },
    take: 20,
    select: {
      id: true,
      chantierId: true,
      dateCreation: true,
      dateLimite: true,
      estFinalise: true,
      chantier: { select: { nomChantier: true } },
      _count: { select: { remarques: true } }
    }
  })
  return NextResponse.json(receptions)
}

