import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'

// GET /api/etats-avancement/stats - Liste tous les états d'avancement avec montants (filtres: mois, chantierId, client, statut, facture, search)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const mois = searchParams.get('mois') ?? undefined
    const chantierId = searchParams.get('chantierId') ?? undefined
    const client = searchParams.get('client') ?? undefined
    const statut = searchParams.get('statut') ?? undefined // finalise | brouillon | tous
    const facture = searchParams.get('facture') ?? undefined // oui | non | tous
    const search = searchParams.get('search') ?? undefined

    const whereChantier: { chantierId?: string; nomChantier?: { contains: string }; client?: { nom: { contains: string } }; OR?: Array<{ chantierId?: { contains: string }; nomChantier?: { contains: string }; client?: { nom: { contains: string } } }> } = {}
    if (chantierId?.trim()) whereChantier.chantierId = chantierId.trim()
    if (client?.trim()) whereChantier.client = { nom: { contains: client.trim() } }
    if (search?.trim()) {
      const term = search.trim()
      whereChantier.OR = [
        { chantierId: { contains: term } },
        { nomChantier: { contains: term } },
        { client: { nom: { contains: term } } }
      ]
    }

    const whereClause: {
      mois?: string
      estFinalise?: boolean
      factureNumero?: { not: null } | null
      OR?: Array<{ factureNumero: string | null }>
      Chantier?: typeof whereChantier
    } = {}
    if (mois?.trim()) whereClause.mois = mois.trim()
    if (statut === 'finalise') whereClause.estFinalise = true
    if (statut === 'brouillon') whereClause.estFinalise = false
    if (facture === 'oui') whereClause.factureNumero = { not: null }
    if (facture === 'non') whereClause.OR = [{ factureNumero: null }, { factureNumero: '' }]
    if (Object.keys(whereChantier).length > 0) whereClause.Chantier = whereChantier

    const etats = await prisma.etatAvancement.findMany({
      where: whereClause,
      orderBy: [{ date: 'desc' }, { numero: 'desc' }],
      include: {
        lignes: true,
        avenants: true,
        Chantier: {
          select: {
            nomChantier: true,
            chantierId: true,
            client: { select: { nom: true } }
          }
        }
      }
    })

    const num = (v: unknown): number => (typeof v === 'number' && !Number.isNaN(v) ? v : 0)
    const items = etats.map((e) => {
      const totalLignes = e.lignes.reduce((sum, l) => sum + num(l.montantActuel), 0)
      const totalAvenants = e.avenants.reduce((sum, a) => sum + num(a.montantActuel), 0)
      const montantTotal = totalLignes + totalAvenants
      return {
        id: e.id,
        chantierId: e.Chantier?.chantierId ?? null,
        nomChantier: e.Chantier?.nomChantier ?? 'Chantier',
        client: e.Chantier?.client?.nom ?? null,
        numero: e.numero,
        mois: e.mois ?? null,
        date: e.date ? new Date(e.date).toISOString() : null,
        estFinalise: e.estFinalise,
        montantBase: Math.round(totalLignes * 100) / 100,
        montantAvenants: Math.round(totalAvenants * 100) / 100,
        montantTotal: Math.round(montantTotal * 100) / 100,
        factureNumero: e.factureNumero ?? null
      }
    })

    // Filtre "facturé = oui" : exclure les chaînes vides (option B)
    let filtered = items
    if (facture === 'oui') {
      filtered = filtered.filter((row) => row.factureNumero != null && String(row.factureNumero).trim() !== '')
    }
    // Filtre recherche texte sur tout (si search fourni et pas déjà dans where Chantier)
    if (search?.trim()) {
      const term = search.trim().toLowerCase()
      filtered = filtered.filter(
        (row) =>
          row.nomChantier?.toLowerCase().includes(term) ||
          row.chantierId?.toLowerCase().includes(term) ||
          row.client?.toLowerCase().includes(term) ||
          (row.factureNumero?.toLowerCase().includes(term)) ||
          String(row.numero).includes(term)
      )
    }

    return NextResponse.json(filtered)
  } catch (error) {
    console.error('Erreur /api/etats-avancement/stats:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
