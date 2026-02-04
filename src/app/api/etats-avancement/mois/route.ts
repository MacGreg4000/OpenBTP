import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'

// GET /api/etats-avancement/mois - Liste des mois distincts (pour filtre par période)
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const rows = await prisma.etatAvancement.findMany({
      where: { mois: { not: null } },
      select: { mois: true },
      distinct: ['mois'],
      orderBy: { mois: 'desc' }
    })

    const mois = rows.map((r) => r.mois).filter((m): m is string => m != null && m.trim() !== '')
    return NextResponse.json(mois)
  } catch (error) {
    console.error('Erreur /api/etats-avancement/mois:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
