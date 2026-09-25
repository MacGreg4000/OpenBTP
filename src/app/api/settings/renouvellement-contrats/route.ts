// Renouvellement automatique des contrats-cadres.
//
// GET  : option activée ou non + contrats signés à échéance (≤ 30 j ou expirés)
// PUT  : { actif: boolean }
// POST : lancer maintenant (même traitement que le cron de 8h00)

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'
import { listerEcheances, executerRenouvellements } from '@/lib/contrats/renouvellement'

const ROLES = ['ADMIN', 'MANAGER']

async function autorise() {
  const session = await getServerSession(authOptions)
  return !!session?.user && ROLES.includes(session.user.role)
}

export async function GET() {
  if (!(await autorise())) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  const s = await prisma.companysettings.findFirst({ select: { renouvellementContratAuto: true } })
  return NextResponse.json({ actif: !!s?.renouvellementContratAuto, echeances: await listerEcheances() })
}

export async function PUT(request: Request) {
  if (!(await autorise())) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  const s = await prisma.companysettings.findFirst({ select: { id: true } })
  if (!s) return NextResponse.json({ error: 'Paramètres société absents.' }, { status: 400 })
  const body = await request.json().catch(() => ({}))
  await prisma.companysettings.update({ where: { id: s.id }, data: { renouvellementContratAuto: body.actif === true } })
  return NextResponse.json({ ok: true })
}

export async function POST() {
  if (!(await autorise())) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  const r = await executerRenouvellements({ forcer: true })
  if (!r.execute) return NextResponse.json({ error: r.raison, ...r }, { status: 409 })
  return NextResponse.json(r)
}
