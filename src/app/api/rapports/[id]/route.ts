import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'
import { enregistrerRapport, RapportInvalideError, supprimerFichierPublic as removeFileForUrl } from '@/lib/rapports/service'

export const dynamic = 'force-dynamic'
// Génération des PDF (général + un par tag) côté serveur
export const maxDuration = 300

// GET /api/rapports/[id] — rapport complet pour l'édition
export async function GET(_request: Request, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const rapport = await prisma.rapport.findUnique({
    where: { id },
    include: {
      notes: { orderBy: { ordre: 'asc' } },
      photos: { orderBy: { ordre: 'asc' } },
      documents: { select: { id: true, type: true, url: true, nom: true, tagKey: true } },
      chantier: { select: { chantierId: true, nomChantier: true } },
    },
  })
  if (!rapport) return NextResponse.json({ error: 'Rapport non trouvé' }, { status: 404 })
  return NextResponse.json(rapport)
}

// PUT /api/rapports/[id] — mise à jour (remplace notes/photos, régénère les PDF).
// L'ancienne version n'est retirée qu'une fois la nouvelle entièrement générée.
export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const existing = await prisma.rapport.findUnique({
      where: { id },
      include: {
        chantier: { select: { id: true, chantierId: true, nomChantier: true, clientNom: true, adresseChantier: true } },
      },
    })
    if (!existing) return NextResponse.json({ error: 'Rapport non trouvé' }, { status: 404 })

    const body = await request.json()
    await enregistrerRapport({
      rapportId: id,
      chantier: existing.chantier,
      createdBy: session.user.id,
      date: body.date || existing.date.toISOString(),
      personnes: Array.isArray(body.personnes) ? body.personnes : [],
      notes: Array.isArray(body.notes) ? body.notes : [],
      photos: Array.isArray(body.photos) ? body.photos : [],
    })

    const full = await prisma.rapport.findUnique({
      where: { id },
      include: { documents: { select: { id: true, type: true, url: true, nom: true, tagKey: true } } },
    })
    return NextResponse.json(full)
  } catch (error) {
    if (error instanceof RapportInvalideError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error('Erreur mise à jour rapport:', error)
    return NextResponse.json({ error: 'Erreur lors de la génération du rapport. L\'ancienne version est conservée : réessayez.' }, { status: 500 })
  }
}

// DELETE /api/rapports/[id] — supprime le rapport, ses PDF et fichiers
export async function DELETE(_request: Request, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const existing = await prisma.rapport.findUnique({
      where: { id },
      include: { documents: { select: { url: true } }, photos: { select: { url: true } } },
    })
    if (!existing) return NextResponse.json({ error: 'Rapport non trouvé' }, { status: 404 })

    for (const doc of existing.documents) await removeFileForUrl(doc.url)
    for (const ph of existing.photos) await removeFileForUrl(ph.url)

    // Cascade sur notes/photos ; on détache/supprime les Document liés
    await prisma.document.deleteMany({ where: { rapportId: id } })
    await prisma.rapport.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erreur suppression rapport:', error)
    return NextResponse.json({ error: 'Erreur lors de la suppression du rapport' }, { status: 500 })
  }
}
