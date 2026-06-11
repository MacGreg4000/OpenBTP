import { prisma } from '@/lib/prisma/client'
import { ToolDefinition } from '../types'
import { resolveChantier, clampLimit } from './helpers'

export const listePlanning: ToolDefinition = {
  name: 'liste_planning',
  description:
    'Liste les tâches du planning ressources : titre, période, statut, chantier, ouvriers internes et sous-traitants assignés.',
  parameters: {
    type: 'object',
    properties: {
      date_debut: { type: 'string', description: 'Début de la période (YYYY-MM-DD)' },
      date_fin: { type: 'string', description: 'Fin de la période (YYYY-MM-DD)' },
      chantier: { type: 'string', description: 'Identifiant ou nom du chantier' },
      limit: { type: 'number', description: 'Nombre max de résultats (défaut 20, max 50)' },
    },
  },
  execute: async (args) => {
    const limit = clampLimit(args.limit, 20, 50)
    const where: Record<string, unknown> = {}
    if (args.chantier) {
      const res = await resolveChantier(String(args.chantier))
      if (!res.ok) return { erreur: res.message, candidats: res.candidats }
      where.chantierId = res.value.chantierId // Task → Chantier.chantierId
    }
    if (args.date_debut) where.end = { gte: new Date(String(args.date_debut)) }
    if (args.date_fin) where.start = { lte: new Date(`${String(args.date_fin)}T23:59:59`) }

    const tasks = await prisma.task.findMany({
      where,
      select: {
        title: true,
        description: true,
        start: true,
        end: true,
        status: true,
        chantier: { select: { nomChantier: true } },
        ouvriersInternes: { select: { ouvrierInterne: { select: { nom: true, prenom: true } } } },
        sousTraitants: { select: { soustraitant: { select: { nom: true } } } },
      },
      orderBy: { start: 'asc' },
      take: limit,
    })
    return {
      total: tasks.length,
      taches: tasks.map((t) => ({
        titre: t.title,
        description: t.description,
        debut: t.start,
        fin: t.end,
        statut: t.status,
        chantier: t.chantier?.nomChantier,
        ouvriers: t.ouvriersInternes.map((o) => `${o.ouvrierInterne.prenom} ${o.ouvrierInterne.nom}`),
        sousTraitants: t.sousTraitants.map((s) => s.soustraitant.nom),
      })),
    }
  },
}
