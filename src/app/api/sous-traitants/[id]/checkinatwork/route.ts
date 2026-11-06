// Résumé Checkinatwork d'un sous-traitant (fiche sous-traitant) : pour chaque
// ouvrier actif, nom, numéro d'entreprise auquel il est lié, numéro national
// et dernier Limosa. Lecture seule.

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id } = await context.params
  const st = await prisma.soustraitant.findUnique({ where: { id }, select: { id: true, nom: true, tva: true } })
  if (!st) return NextResponse.json({ error: 'Sous-traitant non trouvé' }, { status: 404 })

  const ouvriers = await prisma.ouvrier.findMany({
    where: { sousTraitantId: id, actif: true },
    select: {
      id: true,
      nom: true,
      prenom: true,
      numeroNational: true,
      numeroEntreprise: true,
      DocumentOuvrier: {
        where: { type: 'limosa' },
        select: { id: true, numero: true, dateExpiration: true, archive: true, createdAt: true },
      },
    },
    orderBy: [{ nom: 'asc' }, { prenom: 'asc' }],
  })

  const aujourdhui = new Date()
  aujourdhui.setUTCHours(0, 0, 0, 0)

  const lignes = ouvriers.map((o) => {
    // Dernier Limosa : le document en vigueur d'abord, puis la date de fin la
    // plus lointaine, puis le plus récent. Un ancien Limosa archivé n'est
    // repris qu'à défaut de document en vigueur.
    const limosas = [...o.DocumentOuvrier].sort((a, b) => {
      if (a.archive !== b.archive) return a.archive ? 1 : -1
      const fa = a.dateExpiration ? a.dateExpiration.getTime() : 0
      const fb = b.dateExpiration ? b.dateExpiration.getTime() : 0
      if (fa !== fb) return fb - fa
      return b.createdAt.getTime() - a.createdAt.getTime()
    })
    const l = limosas[0]
    return {
      id: o.id,
      nom: o.nom,
      prenom: o.prenom,
      numeroNational: o.numeroNational,
      numeroEntreprise: o.numeroEntreprise || st.tva || null,
      entreprisePropre: Boolean(o.numeroEntreprise),
      limosa: l
        ? {
            documentId: l.id,
            numero: l.numero,
            dateFin: l.dateExpiration ? l.dateExpiration.toISOString().slice(0, 10) : null,
            expire: l.archive || (l.dateExpiration ? l.dateExpiration < aujourdhui : false),
          }
        : null,
    }
  })

  return NextResponse.json({ sousTraitant: { id: st.id, nom: st.nom, tva: st.tva }, ouvriers: lignes })
}
