import { prisma } from '@/lib/prisma/client'
import { ToolDefinition } from '../types'
import { resolveChantier, clampLimit } from './helpers'

export const listeChantiers: ToolDefinition = {
  name: 'liste_chantiers',
  description:
    "Liste les chantiers avec leur statut, client, ville, dates et budget. Filtrable par statut et recherche sur le nom.",
  parameters: {
    type: 'object',
    properties: {
      statut: {
        type: 'string',
        enum: ['EN_PREPARATION', 'EN_COURS', 'TERMINE', 'A_VENIR'],
        description: 'Filtrer par statut du chantier',
      },
      recherche: { type: 'string', description: 'Recherche sur le nom du chantier ou le nom du client' },
      limit: { type: 'number', description: 'Nombre max de résultats (défaut 20, max 50)' },
    },
  },
  execute: async (args) => {
    const limit = clampLimit(args.limit, 20, 50)
    const where: Record<string, unknown> = {}
    if (args.statut) where.statut = String(args.statut)
    if (args.recherche) {
      const q = String(args.recherche)
      where.OR = [{ nomChantier: { contains: q } }, { clientNom: { contains: q } }]
    }
    const chantiers = await prisma.chantier.findMany({
      where,
      select: {
        chantierId: true,
        nomChantier: true,
        statut: true,
        clientNom: true,
        villeChantier: true,
        dateCommencement: true,
        dateFinPrevue: true,
        budget: true,
        avancement: true,
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
    })
    return { total: chantiers.length, chantiers }
  },
}

export const detailChantier: ToolDefinition = {
  name: 'detail_chantier',
  description:
    "Détail complet d'un chantier : informations, adresse, client, compteurs (notes, documents, commandes sous-traitant, états d'avancement) et totaux financiers.",
  parameters: {
    type: 'object',
    properties: {
      chantier: { type: 'string', description: 'Identifiant ou nom (même partiel) du chantier' },
    },
    required: ['chantier'],
  },
  execute: async (args) => {
    const res = await resolveChantier(String(args.chantier))
    if (!res.ok) return { erreur: res.message, candidats: res.candidats }
    const { id, chantierId } = res.value

    const [chantier, counts, commandesAgg, depensesAgg] = await Promise.all([
      prisma.chantier.findUnique({
        where: { id },
        select: {
          chantierId: true,
          nomChantier: true,
          statut: true,
          description: true,
          adresseChantier: true,
          villeChantier: true,
          clientNom: true,
          clientEmail: true,
          clientTelephone: true,
          dateCommencement: true,
          dateFinPrevue: true,
          dateFinEffective: true,
          budget: true,
          avancement: true,
          dureeEnJours: true,
        },
      }),
      prisma.chantier.findUnique({
        where: { id },
        select: {
          _count: {
            select: {
              notes: true,
              documents: true,
              commandeSousTraitant: true,
              etatsAvancement: true,
              bonsRegie: true,
              taches: { where: { completed: false } },
            },
          },
        },
      }),
      prisma.commandeSousTraitant.aggregate({
        where: { chantierId: id },
        _sum: { total: true },
        _count: true,
      }),
      prisma.depense.aggregate({
        where: { chantierId: id },
        _sum: { montant: true },
        _count: true,
      }),
    ])

    return {
      chantier: { ...chantier, chantierId },
      compteurs: counts?._count,
      totaux: {
        commandesSousTraitantTTC: commandesAgg._sum.total ?? 0,
        nombreCommandesST: commandesAgg._count,
        depenses: depensesAgg._sum.montant ?? 0,
        nombreDepenses: depensesAgg._count,
      },
    }
  },
}
