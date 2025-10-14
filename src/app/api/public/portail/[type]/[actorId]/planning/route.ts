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

  // Montrer uniquement aujourd'hui et le futur
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const horizon = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 60)

  const tasks = await prisma.task.findMany({
    where: {
      // Inclure les tâches à venir ou en cours aujourd'hui
      OR: [
        { start: { gte: today } },
        { end: { gte: today } },
      ],
      // Optionnel: horizon pour limiter le volume
      end: { lte: horizon },
      ...(isOuvrier
        ? { ouvriersInternes: { some: { ouvrierInterneId: actorId } } }
        : { sousTraitants: { some: { soustraitantId: actorId } } }
      ),
    },
    orderBy: { start: 'asc' },
    select: {
      id: true,
      title: true,
      description: true,
      start: true,
      end: true,
      status: true,
      chantier: { select: { chantierId: true, nomChantier: true } }
    }
  })
  return NextResponse.json(tasks)
}

