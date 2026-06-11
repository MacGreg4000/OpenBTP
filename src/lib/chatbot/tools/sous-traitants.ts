import { prisma } from '@/lib/prisma/client'
import { ToolDefinition } from '../types'
import { resolveSousTraitant, clampLimit } from './helpers'

export const listeSousTraitants: ToolDefinition = {
  name: 'liste_sous_traitants',
  description: 'Liste les sous-traitants avec leurs coordonnées et leur statut actif/inactif.',
  parameters: {
    type: 'object',
    properties: {
      recherche: { type: 'string', description: 'Recherche sur le nom' },
      actif: { type: 'boolean', description: 'Filtrer sur les sous-traitants actifs (true) ou inactifs (false)' },
      limit: { type: 'number', description: 'Nombre max de résultats (défaut 20, max 50)' },
    },
  },
  execute: async (args) => {
    const limit = clampLimit(args.limit, 20, 50)
    const where: Record<string, unknown> = {}
    if (args.recherche) where.nom = { contains: String(args.recherche) }
    if (typeof args.actif === 'boolean') where.actif = args.actif
    const sousTraitants = await prisma.soustraitant.findMany({
      where,
      select: {
        id: true,
        nom: true,
        email: true,
        telephone: true,
        contact: true,
        tva: true,
        actif: true,
        _count: { select: { commandes: true, tarifs: true } },
      },
      orderBy: { nom: 'asc' },
      take: limit,
    })
    return {
      total: sousTraitants.length,
      sousTraitants: sousTraitants.map((st) => ({
        id: st.id,
        nom: st.nom,
        email: st.email,
        telephone: st.telephone,
        contact: st.contact,
        tva: st.tva,
        actif: st.actif,
        nombreCommandes: st._count.commandes,
        nombreLignesTarif: st._count.tarifs,
      })),
    }
  },
}

export const tarifsSousTraitant: ToolDefinition = {
  name: 'tarifs_sous_traitant',
  description:
    "Liste de prix (tarifs) d'un sous-traitant : articles, descriptifs, unités et prix unitaires. Filtrable par mot-clé.",
  parameters: {
    type: 'object',
    properties: {
      sous_traitant: { type: 'string', description: 'Identifiant ou nom (même partiel) du sous-traitant' },
      recherche_article: { type: 'string', description: "Mot-clé pour filtrer les articles (ex. 'carrelage')" },
    },
    required: ['sous_traitant'],
  },
  execute: async (args) => {
    const res = await resolveSousTraitant(String(args.sous_traitant))
    if (!res.ok) return { erreur: res.message, candidats: res.candidats }

    const where: Record<string, unknown> = { soustraitantId: res.value.id, type: 'LIGNE' }
    if (args.recherche_article) {
      const q = String(args.recherche_article)
      where.OR = [{ descriptif: { contains: q } }, { article: { contains: q } }, { remarques: { contains: q } }]
    }
    const tarifs = await prisma.ligneTarifSousTraitant.findMany({
      where,
      select: { article: true, descriptif: true, unite: true, prixUnitaire: true, remarques: true },
      orderBy: { ordre: 'asc' },
      take: 50,
    })
    return { sousTraitant: res.value.nom, total: tarifs.length, tarifs }
  },
}
