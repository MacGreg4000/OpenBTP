import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { readPortalSessionFromCookie, unauthorized } from '@/app/public/portail/auth'

export async function GET(request: Request, props: { params: Promise<{ type: 'ouvrier'|'soustraitant'; actorId: string; ticketId: string }> }) {
  const { type, actorId, ticketId } = await props.params
  const sess = readPortalSessionFromCookie(request.headers.get('cookie'))
  if (!sess) return unauthorized()
  const isOuvrier = type === 'ouvrier'
  if ((isOuvrier && sess.t !== 'OUVRIER_INTERNE') || (!isOuvrier && sess.t !== 'SOUSTRAITANT') || sess.id !== actorId) {
    return unauthorized()
  }

  const whereAssignment = isOuvrier ? { ouvrierInterneAssignId: actorId } : { soustraitantAssignId: actorId }
  const ticket = await prisma.ticketSAV.findFirst({
    where: { id: ticketId, ...whereAssignment },
    include: {
      chantier: { 
        select: { 
          chantierId: true, 
          nomChantier: true,
          clientNom: true,
          clientTelephone: true,
          clientEmail: true,
          clientAdresse: true,
          adresseChantier: true,
          villeChantier: true
        } 
      },
      documents: true,
      photos: true,
      interventions: { orderBy: { dateDebut: 'desc' } },
      commentaires: { orderBy: { createdAt: 'desc' } },
    }
  })
  if (!ticket) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(ticket)
}

