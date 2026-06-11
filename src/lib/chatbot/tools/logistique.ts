import { prisma } from '@/lib/prisma/client'
import { ToolDefinition } from '../types'
import { clampLimit } from './helpers'

export const listeTachesLogistique: ToolDefinition = {
  name: 'liste_taches_logistique',
  description:
    'Liste les tâches des magasiniers (logistique) : titre, date d\'exécution, statut (A_FAIRE ou VALIDEE), magasinier assigné.',
  parameters: {
    type: 'object',
    properties: {
      statut: { type: 'string', enum: ['A_FAIRE', 'VALIDEE'], description: 'Filtrer par statut' },
      date_debut: { type: 'string', description: 'Date min d\'exécution (format YYYY-MM-DD)' },
      date_fin: { type: 'string', description: 'Date max d\'exécution (format YYYY-MM-DD)' },
      limit: { type: 'number', description: 'Nombre max de résultats (défaut 20, max 50)' },
    },
  },
  execute: async (args) => {
    const limit = clampLimit(args.limit, 20, 50)
    const where: Record<string, unknown> = {}
    if (args.statut) where.statut = String(args.statut)
    const dateFilter: Record<string, Date> = {}
    if (args.date_debut) dateFilter.gte = new Date(String(args.date_debut))
    if (args.date_fin) dateFilter.lte = new Date(`${String(args.date_fin)}T23:59:59`)
    if (Object.keys(dateFilter).length > 0) where.dateExecution = dateFilter

    const taches = await prisma.tacheMagasinier.findMany({
      where,
      select: {
        titre: true,
        description: true,
        dateExecution: true,
        statut: true,
        commentaire: true,
        magasinier: { select: { nom: true } },
      },
      orderBy: { dateExecution: 'desc' },
      take: limit,
    })
    return {
      total: taches.length,
      taches: taches.map((t) => ({
        titre: t.titre,
        description: t.description,
        dateExecution: t.dateExecution,
        statut: t.statut,
        magasinier: t.magasinier.nom,
        commentaire: t.commentaire,
      })),
    }
  },
}

export const listeMagasiniers: ToolDefinition = {
  name: 'liste_magasiniers',
  description: 'Liste les magasiniers (personnel logistique) actifs.',
  parameters: { type: 'object', properties: {} },
  execute: async () => {
    const magasiniers = await prisma.magasinier.findMany({
      where: { actif: true },
      select: { id: true, nom: true },
      orderBy: { nom: 'asc' },
    })
    return { magasiniers }
  },
}
