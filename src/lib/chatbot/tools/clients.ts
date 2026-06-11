import { prisma } from '@/lib/prisma/client'
import { ToolDefinition } from '../types'
import { clampLimit } from './helpers'

export const listeClients: ToolDefinition = {
  name: 'liste_clients',
  description: 'Liste les clients avec leurs coordonnées et le nombre de chantiers.',
  parameters: {
    type: 'object',
    properties: {
      recherche: { type: 'string', description: 'Recherche sur le nom du client' },
      limit: { type: 'number', description: 'Nombre max de résultats (défaut 20, max 50)' },
    },
  },
  execute: async (args) => {
    const limit = clampLimit(args.limit, 20, 50)
    const clients = await prisma.client.findMany({
      where: args.recherche ? { nom: { contains: String(args.recherche) } } : undefined,
      select: {
        id: true,
        nom: true,
        email: true,
        telephone: true,
        adresse: true,
        _count: { select: { Chantier: true } },
      },
      orderBy: { nom: 'asc' },
      take: limit,
    })
    return {
      total: clients.length,
      clients: clients.map((c) => ({
        id: c.id,
        nom: c.nom,
        email: c.email,
        telephone: c.telephone,
        adresse: c.adresse,
        nombreChantiers: c._count.Chantier,
      })),
    }
  },
}
