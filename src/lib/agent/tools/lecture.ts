// Outils de LECTURE — aucune écriture, donc aucun requiresConfirmation.
// Portés depuis le socle chatbot (branche feat/chatbot-agent), adaptés au
// socle agent de main. Les helpers de main étant un sur-ensemble de ceux de la
// branche, aucun n'a eu besoin d'être porté.

import { prisma } from '@/lib/prisma/client'
import { ToolDefinition } from '../types'
import { resolveChantier, resolveSousTraitant, clampLimit } from './helpers'

// ─────────────────────────────────────────────────────────────────────────────
// Chantiers
// ─────────────────────────────────────────────────────────────────────────────

export const listeChantiers: ToolDefinition = {
  name: 'liste_chantiers',
  description:
    'Liste les chantiers avec leur statut, client, ville, dates et budget. Filtrable par statut et recherche sur le nom.',
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
        dateDebut: true,
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
    if (!res.ok || !res.value) return { erreur: res.message, candidats: res.candidats }
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
          numeroIdentification: true,
          maitreOuvrageNom: true,
          bureauArchitectureNom: true,
          dateDebut: true,
          dateFinPrevue: true,
          dateFinReelle: true,
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
      // Depense.chantierId contient le SLUG métier, pas le cuid : l'application
      // l'écrit depuis le paramètre d'URL [chantierId]
      // (api/chantiers/[chantierId]/depenses/route.ts). Agréger sur `id`
      // renvoyait donc toujours 0. Le modèle n'a aucune relation Prisma, donc
      // rien ne signalait l'erreur.
      prisma.depense.aggregate({
        where: { chantierId },
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

// ─────────────────────────────────────────────────────────────────────────────
// Clients & sous-traitants
// ─────────────────────────────────────────────────────────────────────────────

export const listeClients: ToolDefinition = {
  name: 'liste_clients',
  description: 'Liste les clients avec leurs coordonnées, leur numéro de TVA et le nombre de chantiers.',
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
        numeroTva: true,
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
        numeroTva: c.numeroTva,
        nombreChantiers: c._count.Chantier,
      })),
    }
  },
}

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
      recherche_article: { type: 'string', description: "Mot-clé pour filtrer les articles (ex. « carrelage »)" },
    },
    required: ['sous_traitant'],
  },
  execute: async (args) => {
    const res = await resolveSousTraitant(String(args.sous_traitant))
    if (!res.ok || !res.value) return { erreur: res.message, candidats: res.candidats }

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

// ─────────────────────────────────────────────────────────────────────────────
// Notes & documents d'un chantier
// ─────────────────────────────────────────────────────────────────────────────

export const listeNotesChantier: ToolDefinition = {
  name: 'liste_notes_chantier',
  description: "Liste les notes d'un chantier (journal de bord) avec leur auteur et leur date.",
  parameters: {
    type: 'object',
    properties: {
      chantier: { type: 'string', description: 'Identifiant ou nom du chantier' },
      limit: { type: 'number', description: 'Nombre max de résultats (défaut 10, max 30)' },
    },
    required: ['chantier'],
  },
  execute: async (args) => {
    const res = await resolveChantier(String(args.chantier))
    if (!res.ok || !res.value) return { erreur: res.message, candidats: res.candidats }
    const limit = clampLimit(args.limit, 10, 30)

    const notes = await prisma.note.findMany({
      where: { chantierId: res.value.chantierId }, // Note → Chantier.chantierId (slug)
      select: { contenu: true, createdAt: true, User: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
    return {
      chantier: res.value.nomChantier,
      total: notes.length,
      notes: notes.map((n) => ({ date: n.createdAt, auteur: n.User?.name, contenu: n.contenu })),
    }
  },
}

export const listeDocumentsChantier: ToolDefinition = {
  name: 'liste_documents_chantier',
  description: "Liste les documents d'un chantier : nom, type, date d'ajout. Filtrable par mot-clé.",
  parameters: {
    type: 'object',
    properties: {
      chantier: { type: 'string', description: 'Identifiant ou nom du chantier' },
      recherche: { type: 'string', description: 'Mot-clé dans le nom du document' },
      limit: { type: 'number', description: 'Nombre max de résultats (défaut 20, max 50)' },
    },
    required: ['chantier'],
  },
  execute: async (args) => {
    const res = await resolveChantier(String(args.chantier))
    if (!res.ok || !res.value) return { erreur: res.message, candidats: res.candidats }
    const limit = clampLimit(args.limit, 20, 50)

    const where: Record<string, unknown> = { chantierId: res.value.chantierId } // Document → slug
    if (args.recherche) where.nom = { contains: String(args.recherche) }

    const documents = await prisma.document.findMany({
      where,
      select: { nom: true, type: true, mimeType: true, createdAt: true, estPlan: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
    return { chantier: res.value.nomChantier, total: documents.length, documents }
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Documents proches de l'expiration
//
// Seul `DocumentOuvrier.dateExpiration` porte une échéance métier dans le
// schéma. Les sous-traitants n'en ont pas directement : le rattachement se fait
// via `Ouvrier.sousTraitantId`, qui est un simple scalaire SANS relation Prisma
// — d'où la seconde requête groupée (et non un include).
// ─────────────────────────────────────────────────────────────────────────────

export const documentsExpirants: ToolDefinition = {
  name: 'documents_expirants',
  description:
    "Documents d'ouvriers (attestations, certificats…) déjà expirés ou proches de l'expiration, " +
    'avec le sous-traitant concerné. Utile pour relancer avant une intervention.',
  parameters: {
    type: 'object',
    properties: {
      jours: {
        type: 'number',
        description: "Fenêtre en jours (défaut 30). Les documents déjà expirés sont toujours inclus.",
      },
      limit: { type: 'number', description: 'Nombre max de résultats (défaut 30, max 100)' },
    },
  },
  execute: async (args) => {
    const jours = clampLimit(args.jours, 30, 365)
    const limit = clampLimit(args.limit, 30, 100)

    const maintenant = new Date()
    const limite = new Date()
    limite.setDate(maintenant.getDate() + jours)

    const documents = await prisma.documentOuvrier.findMany({
      where: { archive: false, dateExpiration: { not: null, lte: limite } },
      select: {
        nom: true,
        type: true,
        dateExpiration: true,
        Ouvrier: { select: { id: true, nom: true, prenom: true, sousTraitantId: true } },
      },
      orderBy: { dateExpiration: 'asc' },
      take: limit,
    })

    // Résolution groupée des sous-traitants (pas de relation Prisma → pas d'include)
    const stIds = [...new Set(documents.map((d) => d.Ouvrier?.sousTraitantId).filter(Boolean))] as string[]
    const sts = stIds.length
      ? await prisma.soustraitant.findMany({ where: { id: { in: stIds } }, select: { id: true, nom: true } })
      : []
    const nomParId = new Map(sts.map((s) => [s.id, s.nom]))

    const lignes = documents.map((d) => {
      const exp = d.dateExpiration as Date
      const jointRestants = Math.ceil((exp.getTime() - maintenant.getTime()) / 86400000)
      return {
        document: d.nom,
        type: d.type,
        ouvrier: d.Ouvrier ? `${d.Ouvrier.prenom} ${d.Ouvrier.nom}` : null,
        sousTraitant: d.Ouvrier?.sousTraitantId ? nomParId.get(d.Ouvrier.sousTraitantId) ?? 'Inconnu' : null,
        dateExpiration: exp,
        expire: jointRestants < 0,
        joursRestants: jointRestants,
      }
    })

    return {
      fenetreJours: jours,
      total: lignes.length,
      dejaExpires: lignes.filter((l) => l.expire).length,
      documents: lignes,
    }
  },
}
