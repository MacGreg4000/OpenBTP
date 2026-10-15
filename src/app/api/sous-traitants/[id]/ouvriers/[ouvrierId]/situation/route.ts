// Situation d'une personne (statut, nationalité) — détermine ses documents exigés.

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'

const STATUTS = ['INDEPENDANT', 'ASSOCIE_ACTIF', 'SALARIE']
const NATIONALITES = ['BE', 'UE', 'HORS_UE']

export async function PUT(request: Request, context: { params: Promise<{ id: string; ouvrierId: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const { id, ouvrierId } = await context.params
  const body = await request.json().catch(() => ({}))
  const data: Record<string, string | null> = {}
  if (body.statut !== undefined) data.statut = STATUTS.includes(body.statut) ? body.statut : null
  if (body.nationalite !== undefined) data.nationalite = NATIONALITES.includes(body.nationalite) ? body.nationalite : null
  const o = await prisma.ouvrier.findFirst({ where: { id: ouvrierId, sousTraitantId: id }, select: { id: true } })
  if (!o) return NextResponse.json({ error: 'Personne introuvable' }, { status: 404 })
  await prisma.ouvrier.update({ where: { id: o.id }, data: { ...data, updatedAt: new Date() } })
  return NextResponse.json({ ok: true })
}
