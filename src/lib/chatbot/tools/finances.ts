import { prisma } from '@/lib/prisma/client'
import { ToolDefinition } from '../types'
import { resolveChantier, resolveSousTraitant, clampLimit } from './helpers'

export const listeCommandesSousTraitant: ToolDefinition = {
  name: 'liste_commandes_sous_traitant',
  description:
    'Liste les commandes sous-traitant avec leurs totaux (HT, TVA, TTC), statut et verrouillage. Filtrable par chantier, sous-traitant et statut. Les totaux sont déjà calculés.',
  parameters: {
    type: 'object',
    properties: {
      chantier: { type: 'string', description: 'Identifiant ou nom du chantier' },
      sous_traitant: { type: 'string', description: 'Identifiant ou nom du sous-traitant' },
      statut: { type: 'string', description: 'Filtrer par statut (ex. BROUILLON, VALIDEE)' },
    },
  },
  execute: async (args) => {
    const where: Record<string, unknown> = {}
    if (args.chantier) {
      const res = await resolveChantier(String(args.chantier))
      if (!res.ok) return { erreur: res.message, candidats: res.candidats }
      where.chantierId = res.value.id
    }
    if (args.sous_traitant) {
      const res = await resolveSousTraitant(String(args.sous_traitant))
      if (!res.ok) return { erreur: res.message, candidats: res.candidats }
      where.soustraitantId = res.value.id
    }
    if (args.statut) where.statut = String(args.statut)

    const commandes = await prisma.commandeSousTraitant.findMany({
      where,
      select: {
        id: true,
        reference: true,
        dateCommande: true,
        statut: true,
        estVerrouillee: true,
        sousTotal: true,
        tauxTVA: true,
        tva: true,
        total: true,
        Chantier: { select: { nomChantier: true, chantierId: true } },
        soustraitant: { select: { nom: true } },
        _count: { select: { lignes: true } },
      },
      orderBy: { dateCommande: 'desc' },
      take: 50,
    })

    const sommeTTC = commandes.reduce((s, c) => s + c.total, 0)
    return {
      total: commandes.length,
      sommeTotaleTTC: Math.round(sommeTTC * 100) / 100,
      commandes: commandes.map((c) => ({
        id: c.id,
        reference: c.reference,
        date: c.dateCommande,
        chantier: c.Chantier.nomChantier,
        sousTraitant: c.soustraitant.nom,
        statut: c.statut,
        verrouillee: c.estVerrouillee,
        sousTotalHT: c.sousTotal,
        tva: c.tva,
        totalTTC: c.total,
        nombreLignes: c._count.lignes,
      })),
    }
  },
}

export const listeEtatsAvancement: ToolDefinition = {
  name: 'liste_etats_avancement',
  description:
    "Liste les états d'avancement d'un chantier (client et/ou sous-traitants) : numéro, mois, finalisé ou non, montants.",
  parameters: {
    type: 'object',
    properties: {
      chantier: { type: 'string', description: 'Identifiant ou nom du chantier' },
      type: {
        type: 'string',
        enum: ['client', 'soustraitant'],
        description: "Type d'état : 'client' (états facturés au client) ou 'soustraitant'. Si absent : les deux.",
      },
    },
    required: ['chantier'],
  },
  execute: async (args) => {
    const res = await resolveChantier(String(args.chantier))
    if (!res.ok) return { erreur: res.message, candidats: res.candidats }
    const type = args.type ? String(args.type) : undefined

    const result: Record<string, unknown> = { chantier: res.value.nomChantier }

    if (!type || type === 'client') {
      const etats = await prisma.etatAvancement.findMany({
        where: { chantierId: res.value.id },
        select: {
          numero: true,
          mois: true,
          date: true,
          estFinalise: true,
          factureNumero: true,
          commentaires: true,
          lignes: { select: { montantActuel: true, montantTotal: true } },
          avenants: { select: { montantActuel: true, montantTotal: true } },
        },
        orderBy: { numero: 'asc' },
      })
      result.etatsClient = etats.map((e) => ({
        numero: e.numero,
        mois: e.mois,
        date: e.date,
        finalise: e.estFinalise,
        facture: e.factureNumero,
        montantPeriode:
          Math.round(
            (e.lignes.reduce((s, l) => s + l.montantActuel, 0) +
              e.avenants.reduce((s, a) => s + a.montantActuel, 0)) * 100
          ) / 100,
        montantCumule:
          Math.round(
            (e.lignes.reduce((s, l) => s + l.montantTotal, 0) +
              e.avenants.reduce((s, a) => s + a.montantTotal, 0)) * 100
          ) / 100,
        nombreAvenants: e.avenants.length,
      }))
    }

    if (!type || type === 'soustraitant') {
      const etatsST = await prisma.soustraitant_etat_avancement.findMany({
        where: { etat_avancement: { chantierId: res.value.id } },
        select: {
          numero: true,
          date: true,
          estFinalise: true,
          soustraitant: { select: { nom: true } },
          ligne_soustraitant_etat_avancement: { select: { montantActuel: true, montantTotal: true } },
          avenant_soustraitant_etat_avancement: { select: { montantActuel: true, montantTotal: true } },
        },
        orderBy: { numero: 'asc' },
      })
      result.etatsSousTraitants = etatsST.map((e) => ({
        numero: e.numero,
        date: e.date,
        sousTraitant: e.soustraitant.nom,
        finalise: e.estFinalise,
        montantPeriode:
          Math.round(
            (e.ligne_soustraitant_etat_avancement.reduce((s, l) => s + l.montantActuel, 0) +
              e.avenant_soustraitant_etat_avancement.reduce((s, a) => s + a.montantActuel, 0)) * 100
          ) / 100,
        montantCumule:
          Math.round(
            (e.ligne_soustraitant_etat_avancement.reduce((s, l) => s + l.montantTotal, 0) +
              e.avenant_soustraitant_etat_avancement.reduce((s, a) => s + a.montantTotal, 0)) * 100
          ) / 100,
        nombreAvenants: e.avenant_soustraitant_etat_avancement.length,
      }))
    }

    return result
  },
}

export const listeDepenses: ToolDefinition = {
  name: 'liste_depenses',
  description: "Liste les dépenses d'un chantier avec la somme totale. Filtrable par catégorie.",
  parameters: {
    type: 'object',
    properties: {
      chantier: { type: 'string', description: 'Identifiant ou nom du chantier' },
      categorie: { type: 'string', description: 'Filtrer par catégorie de dépense' },
      limit: { type: 'number', description: 'Nombre max de résultats (défaut 20, max 50)' },
    },
    required: ['chantier'],
  },
  execute: async (args) => {
    const res = await resolveChantier(String(args.chantier))
    if (!res.ok) return { erreur: res.message, candidats: res.candidats }
    const limit = clampLimit(args.limit, 20, 50)

    const where: Record<string, unknown> = { chantierId: res.value.id }
    if (args.categorie) where.categorie = { contains: String(args.categorie) }

    const [depenses, agg] = await Promise.all([
      prisma.depense.findMany({
        where,
        select: { date: true, montant: true, description: true, categorie: true, fournisseur: true },
        orderBy: { date: 'desc' },
        take: limit,
      }),
      prisma.depense.aggregate({ where, _sum: { montant: true }, _count: true }),
    ])
    return {
      chantier: res.value.nomChantier,
      nombreTotal: agg._count,
      sommeTotale: agg._sum.montant ?? 0,
      depenses,
    }
  },
}

export const listeBonsRegie: ToolDefinition = {
  name: 'liste_bons_regie',
  description:
    'Liste les bons de régie (travaux en régie signés) : dates, description, temps passé, signataire. Filtrable par chantier ou mot-clé.',
  parameters: {
    type: 'object',
    properties: {
      chantier: { type: 'string', description: 'Identifiant ou nom du chantier' },
      recherche: { type: 'string', description: 'Mot-clé dans la description ou le nom du client' },
      limit: { type: 'number', description: 'Nombre max de résultats (défaut 20, max 50)' },
    },
  },
  execute: async (args) => {
    const limit = clampLimit(args.limit, 20, 50)
    const where: Record<string, unknown> = {}
    if (args.chantier) {
      const res = await resolveChantier(String(args.chantier))
      if (!res.ok) return { erreur: res.message, candidats: res.candidats }
      where.chantierId = res.value.chantierId // BonRegie → Chantier.chantierId
    }
    if (args.recherche) {
      const q = String(args.recherche)
      where.OR = [{ description: { contains: q } }, { client: { contains: q } }, { nomChantier: { contains: q } }]
    }
    const bons = await prisma.bonRegie.findMany({
      where,
      select: {
        id: true,
        dates: true,
        client: true,
        nomChantier: true,
        description: true,
        tempsChantier: true,
        nombreTechniciens: true,
        materiaux: true,
        nomSignataire: true,
        dateSignature: true,
      },
      orderBy: { dateSignature: 'desc' },
      take: limit,
    })
    return { total: bons.length, bonsRegie: bons }
  },
}
