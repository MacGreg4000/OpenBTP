import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { getMagasinierIdFromCookie } from '@/app/public/portail/auth'

export async function GET(request: NextRequest) {
  try {
    const magasinierId = getMagasinierIdFromCookie(request.headers.get('cookie'))
    if (!magasinierId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const vue = searchParams.get('vue') ?? 'a_faire' // a_faire | historique
    const dateStr = searchParams.get('date') ?? undefined

    if (vue === 'historique') {
      const taches = await prisma.tacheMagasinier.findMany({
        where: {
          magasinierId,
          statut: 'VALIDEE'
        },
        orderBy: { dateValidation: 'desc' },
        include: { photos: { where: { type: 'PREUVE' }, orderBy: { ordre: 'asc' } } }
      })
      return NextResponse.json(taches)
    }

    // Vue à faire: tâches non validées, report au lendemain (dateExecution <= date affichée)
    const jours = searchParams.get('jours') ? parseInt(searchParams.get('jours')!, 10) : 14
    const dateDebut = dateStr ? new Date(dateStr) : new Date()
    dateDebut.setHours(0, 0, 0, 0)
    const dateFin = new Date(dateDebut)
    dateFin.setDate(dateFin.getDate() + Math.max(0, jours - 1))
    dateFin.setHours(23, 59, 59, 999)

    const taches = await prisma.tacheMagasinier.findMany({
      where: {
        magasinierId,
        statut: 'A_FAIRE',
        dateExecution: { lte: dateFin }
      },
      orderBy: [{ dateExecution: 'asc' }, { createdAt: 'asc' }],
      include: { photos: { where: { type: 'A_FAIRE' }, orderBy: { ordre: 'asc' } } }
    })

    return NextResponse.json({
      taches,
      dateDebut: dateDebut.toISOString(),
      dateFin: dateFin.toISOString()
    })
  } catch (error) {
    console.error('Erreur GET taches magasinier:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

/**
 * Le magasinier ajoute lui-même une tâche (aide-mémoire) : { titre, description?, date? (AAAA-MM-JJ) }.
 * Elle apparaît comme les autres dans sa liste et côté bureau (marquée « ajoutée par le magasinier »).
 */
export async function POST(request: NextRequest) {
  try {
    const magasinierId = getMagasinierIdFromCookie(request.headers.get('cookie'))
    if (!magasinierId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const titre = typeof body.titre === 'string' ? body.titre.trim().slice(0, 190) : ''
    const description = typeof body.description === 'string' && body.description.trim() ? body.description.trim() : null
    if (!titre) {
      return NextResponse.json({ error: 'Le titre est obligatoire' }, { status: 400 })
    }

    // Date d'exécution : jour choisi (midi, pour éviter tout décalage de fuseau), sinon maintenant
    let dateExecution = new Date()
    if (typeof body.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.date)) {
      dateExecution = new Date(`${body.date}T12:00:00`)
    }

    const tache = await prisma.tacheMagasinier.create({
      data: {
        titre,
        description,
        dateExecution,
        magasinierId,
        creeParMagasinier: true,
      },
      include: { photos: { where: { type: 'A_FAIRE' }, orderBy: { ordre: 'asc' } } }
    })
    return NextResponse.json(tache, { status: 201 })
  } catch (error) {
    console.error('Erreur POST taches magasinier:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
