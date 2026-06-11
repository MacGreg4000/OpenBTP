import { prisma } from '@/lib/prisma/client'
import { ToolDefinition } from '../types'
import { resolveChantier, clampLimit } from './helpers'

export const listeDevis: ToolDefinition = {
  name: 'liste_devis',
  description:
    'Liste les devis et avenants : numéro, type, statut (BROUILLON, EN_ATTENTE, ACCEPTE, REFUSE, CONVERTI, EXPIRE), client, montants.',
  parameters: {
    type: 'object',
    properties: {
      statut: {
        type: 'string',
        enum: ['BROUILLON', 'EN_ATTENTE', 'ACCEPTE', 'REFUSE', 'CONVERTI', 'EXPIRE'],
        description: 'Filtrer par statut',
      },
      type: { type: 'string', enum: ['DEVIS', 'AVENANT'], description: 'Filtrer par type' },
      client: { type: 'string', description: 'Nom du client (même partiel)' },
      chantier: { type: 'string', description: 'Identifiant ou nom du chantier (pour les avenants)' },
      limit: { type: 'number', description: 'Nombre max de résultats (défaut 20, max 50)' },
    },
  },
  execute: async (args) => {
    const limit = clampLimit(args.limit, 20, 50)
    const where: Record<string, unknown> = {}
    if (args.statut) where.statut = String(args.statut)
    if (args.type) where.typeDevis = String(args.type)
    if (args.client) where.client = { nom: { contains: String(args.client) } }
    if (args.chantier) {
      const res = await resolveChantier(String(args.chantier))
      if (!res.ok) return { erreur: res.message, candidats: res.candidats }
      where.chantierId = res.value.chantierId // Devis → Chantier.chantierId
    }
    const devis = await prisma.devis.findMany({
      where,
      select: {
        numeroDevis: true,
        typeDevis: true,
        reference: true,
        statut: true,
        dateCreation: true,
        dateValidite: true,
        montantHT: true,
        montantTTC: true,
        client: { select: { nom: true } },
        chantier: { select: { nomChantier: true } },
        _count: { select: { lignes: true } },
      },
      orderBy: { dateCreation: 'desc' },
      take: limit,
    })
    return {
      total: devis.length,
      devis: devis.map((d) => ({
        numero: d.numeroDevis,
        type: d.typeDevis,
        reference: d.reference,
        statut: d.statut,
        client: d.client.nom,
        chantier: d.chantier?.nomChantier,
        dateCreation: d.dateCreation,
        dateValidite: d.dateValidite,
        montantHT: d.montantHT,
        montantTTC: d.montantTTC,
        nombreLignes: d._count.lignes,
      })),
    }
  },
}
