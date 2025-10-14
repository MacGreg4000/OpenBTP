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

  if (isOuvrier) {
    const o = await prisma.ouvrierInterne.findUnique({ where: { id: actorId }, select: { id: true, nom: true, prenom: true, poste: true } })
    if (!o) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ id: o.id, name: `${o.prenom} ${o.nom}`.trim(), role: o.poste || 'Ouvrier' })
  } else {
    const s = await prisma.soustraitant.findUnique({ where: { id: actorId }, select: { id: true, nom: true, email: true } })
    if (!s) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ id: s.id, name: s.nom, role: 'Sous-traitant' })
  }
}

