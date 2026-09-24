// Jeton du lien public /checkin/<jeton>.
//
// GET  : lien actuel (null si jamais généré)
// POST : génère un nouveau jeton — l'ancien lien cesse immédiatement de
//        fonctionner. Les rappels suivants utiliseront le nouveau.

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { randomBytes } from 'crypto'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'

const ROLES = ['ADMIN', 'MANAGER']

function urlDe(jeton: string | null | undefined): string | null {
  if (!jeton) return null
  const base = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || '').replace(/\/$/, '')
  return `${base}/checkin/${jeton}`
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user || !ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }
  const s = await prisma.companysettings.findFirst({ select: { checkinToken: true } })
  return NextResponse.json({ url: urlDe(s?.checkinToken) })
}

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session?.user || !ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }
  const s = await prisma.companysettings.findFirst({ select: { id: true } })
  if (!s) {
    return NextResponse.json(
      { error: 'Paramètres société absents : enregistre d’abord la configuration de l’entreprise.' },
      { status: 400 }
    )
  }
  // 24 octets → 48 caractères hexadécimaux : impossible à deviner.
  const jeton = randomBytes(24).toString('hex')
  await prisma.companysettings.update({ where: { id: s.id }, data: { checkinToken: jeton } })
  return NextResponse.json({ url: urlDe(jeton) })
}
