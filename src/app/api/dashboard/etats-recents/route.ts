import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'

// GET /api/dashboard/etats-recents - Derniers états d'avancement avec montants
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const etats = await prisma.etatAvancement.findMany({
      orderBy: { date: 'desc' },
      take: 15,
      include: {
        lignes: true,
        avenants: true,
        Chantier: {
          select: { nomChantier: true, chantierId: true }
        }
      }
    })

    const num = (v: unknown): number => (typeof v === 'number' && !Number.isNaN(v) ? v : 0)
    const items = etats.map((e) => {
      const totalLignes = Array.isArray(e.lignes)
        ? e.lignes.reduce((sum: number, l) => sum + num((l as { montantActuel?: number }).montantActuel), 0)
        : 0
      const totalAvenants = Array.isArray(e.avenants)
        ? e.avenants.reduce((sum: number, a) => sum + num((a as { montantActuel?: number }).montantActuel), 0)
        : 0
      const montant = totalLignes + totalAvenants
      return {
        id: String(e.id),
        titre: `État #${e.numero}`,
        date: e.date ? new Date(e.date).toISOString() : new Date().toISOString(),
        montant,
        chantier: e.Chantier?.nomChantier || 'Chantier',
        chantierId: e.Chantier?.chantierId || null,
        etatId: e.numero
      }
    })

    return NextResponse.json(items)
  } catch (error) {
    console.error('Erreur /api/dashboard/etats-recents:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

