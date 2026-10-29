import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'
import { enregistrerRapport, RapportInvalideError } from '@/lib/rapports/service'

export const dynamic = 'force-dynamic'
// Génération des PDF (général + un par tag) côté serveur
export const maxDuration = 300

// GET /api/chantiers/[chantierId]/rapports — liste des rapports (modèle durable)
export async function GET(_request: Request, props: { params: Promise<{ chantierId: string }> }) {
  const { chantierId } = await props.params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const rapports = await prisma.rapport.findMany({
    where: { chantierId },
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    include: {
      documents: { select: { id: true, type: true, url: true, nom: true, tagKey: true } },
      auteur: { select: { name: true, email: true } },
      _count: { select: { photos: true, notes: true } },
    },
  })
  return NextResponse.json(rapports)
}

// POST /api/chantiers/[chantierId]/rapports — créer un rapport durable + générer les PDF
export async function POST(request: Request, props: { params: Promise<{ chantierId: string }> }) {
  const { chantierId } = await props.params
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const chantier = await prisma.chantier.findUnique({
      where: { chantierId },
      select: { id: true, chantierId: true, nomChantier: true, clientNom: true, adresseChantier: true },
    })
    if (!chantier) return NextResponse.json({ error: 'Chantier non trouvé' }, { status: 404 })

    const body = await request.json()
    const rapportId = await enregistrerRapport({
      chantier,
      createdBy: session.user.id,
      date: body.date || new Date().toISOString(),
      personnes: Array.isArray(body.personnes) ? body.personnes : [],
      notes: Array.isArray(body.notes) ? body.notes : [],
      photos: Array.isArray(body.photos) ? body.photos : [],
      remplaceDocuments: Array.isArray(body.remplaceDocuments) ? body.remplaceDocuments : [],
    })

    const full = await prisma.rapport.findUnique({
      where: { id: rapportId },
      include: { documents: { select: { id: true, type: true, url: true, nom: true, tagKey: true } } },
    })
    return NextResponse.json(full, { status: 201 })
  } catch (error) {
    if (error instanceof RapportInvalideError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error('Erreur création rapport:', error)
    return NextResponse.json({ error: 'Erreur lors de la génération du rapport. Rien n\'a été perdu : réessayez.' }, { status: 500 })
  }
}
