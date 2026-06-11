import { prisma } from '@/lib/prisma/client'
import { generateTicketSAVNumber } from '@/lib/sav/utils'
import { ToolDefinition } from '../types'
import { resolveChantier, clampLimit } from './helpers'

export const listeTicketsSAV: ToolDefinition = {
  name: 'liste_tickets_sav',
  description:
    'Liste les tickets SAV (service après-vente) : numéro, titre, type, priorité, statut, chantier. Filtrable.',
  parameters: {
    type: 'object',
    properties: {
      statut: {
        type: 'string',
        enum: ['NOUVEAU', 'EN_ATTENTE', 'ASSIGNE', 'PLANIFIE', 'EN_COURS', 'EN_ATTENTE_PIECES', 'EN_ATTENTE_VALIDATION', 'RESOLU', 'CLOTURE', 'ANNULE'],
        description: 'Filtrer par statut',
      },
      priorite: { type: 'string', enum: ['CRITIQUE', 'HAUTE', 'NORMALE', 'BASSE'], description: 'Filtrer par priorité' },
      chantier: { type: 'string', description: 'Identifiant ou nom du chantier' },
      recherche: { type: 'string', description: 'Mot-clé (titre, description, numéro de ticket)' },
      limit: { type: 'number', description: 'Nombre max de résultats (défaut 20, max 50)' },
    },
  },
  execute: async (args) => {
    const limit = clampLimit(args.limit, 20, 50)
    const where: Record<string, unknown> = {}
    if (args.statut) where.statut = String(args.statut)
    if (args.priorite) where.priorite = String(args.priorite)
    if (args.chantier) {
      const res = await resolveChantier(String(args.chantier))
      if (!res.ok) return { erreur: res.message, candidats: res.candidats }
      where.chantierId = res.value.chantierId // TicketSAV → Chantier.chantierId
    }
    if (args.recherche) {
      const q = String(args.recherche)
      where.OR = [
        { titre: { contains: q } },
        { description: { contains: q } },
        { numTicket: { contains: q } },
        { localisation: { contains: q } },
      ]
    }
    const tickets = await prisma.ticketSAV.findMany({
      where,
      select: {
        numTicket: true,
        titre: true,
        type: true,
        priorite: true,
        statut: true,
        dateDemande: true,
        datePlanifiee: true,
        chantier: { select: { nomChantier: true } },
        nomLibre: true,
      },
      orderBy: { dateDemande: 'desc' },
      take: limit,
    })
    return {
      total: tickets.length,
      tickets: tickets.map((t) => ({
        numero: t.numTicket,
        titre: t.titre,
        type: t.type,
        priorite: t.priorite,
        statut: t.statut,
        dateDemande: t.dateDemande,
        datePlanifiee: t.datePlanifiee,
        chantier: t.chantier?.nomChantier || t.nomLibre,
      })),
    }
  },
}

export const detailTicketSAV: ToolDefinition = {
  name: 'detail_ticket_sav',
  description: "Détail complet d'un ticket SAV par son numéro (ex. SAV-2026-0012) ou son titre.",
  parameters: {
    type: 'object',
    properties: {
      ticket: { type: 'string', description: 'Numéro (SAV-YYYY-NNNN) ou titre (même partiel) du ticket' },
    },
    required: ['ticket'],
  },
  execute: async (args) => {
    const ref = String(args.ticket || '').trim()
    const ticket = await prisma.ticketSAV.findFirst({
      where: { OR: [{ numTicket: ref }, { titre: { contains: ref } }] },
      select: {
        numTicket: true,
        titre: true,
        description: true,
        type: true,
        priorite: true,
        statut: true,
        localisation: true,
        adresseIntervention: true,
        dateDemande: true,
        dateInterventionSouhaitee: true,
        datePlanifiee: true,
        dateIntervention: true,
        dateResolution: true,
        coutEstime: true,
        coutReel: true,
        contactNom: true,
        contactTelephone: true,
        chantier: { select: { nomChantier: true } },
        nomLibre: true,
        soustraitantAssign: { select: { nom: true } },
        ouvrierInterneAssign: { select: { nom: true, prenom: true } },
        _count: { select: { interventions: true, commentaires: true, photos: true } },
      },
    })
    if (!ticket) return { erreur: `Aucun ticket SAV trouvé pour « ${ref} ».` }
    return {
      ...ticket,
      chantier: ticket.chantier?.nomChantier || ticket.nomLibre,
      assigneA:
        ticket.soustraitantAssign?.nom ||
        (ticket.ouvrierInterneAssign
          ? `${ticket.ouvrierInterneAssign.prenom} ${ticket.ouvrierInterneAssign.nom}`
          : null),
      compteurs: ticket._count,
    }
  },
}

export const creerTicketSAV: ToolDefinition = {
  name: 'creer_ticket_sav',
  description:
    "Crée un ticket SAV (service après-vente). Le numéro est généré automatiquement. Nécessite la confirmation de l'utilisateur.",
  requiresConfirmation: true,
  parameters: {
    type: 'object',
    properties: {
      titre: { type: 'string', description: 'Titre court du problème' },
      description: { type: 'string', description: 'Description détaillée du problème' },
      type: {
        type: 'string',
        enum: ['DEFAUT_CONFORMITE', 'MALFACON', 'USURE_PREMATUREE', 'MAINTENANCE', 'REPARATION', 'RETOUCHE', 'AUTRE'],
        description: 'Type de problème (défaut AUTRE)',
      },
      priorite: { type: 'string', enum: ['CRITIQUE', 'HAUTE', 'NORMALE', 'BASSE'], description: 'Priorité (défaut NORMALE)' },
      chantier: { type: 'string', description: 'Identifiant ou nom du chantier concerné (optionnel)' },
      localisation: { type: 'string', description: "Emplacement du problème (ex. 'salle de bain étage 2')" },
    },
    required: ['titre', 'description'],
  },
  summarize: (args) =>
    `Créer un ticket SAV « ${String(args.titre)} » (priorité ${String(args.priorite || 'NORMALE')})${
      args.chantier ? ` sur le chantier ${String(args.chantier)}` : ''
    }`,
  execute: async (args, ctx) => {
    let chantierId: string | null = null
    let nomChantier: string | null = null
    if (args.chantier) {
      const res = await resolveChantier(String(args.chantier))
      if (!res.ok) return { erreur: res.message, candidats: res.candidats }
      chantierId = res.value.chantierId
      nomChantier = res.value.nomChantier
    }

    const numTicket = await generateTicketSAVNumber()
    const VALID_TYPES = ['DEFAUT_CONFORMITE', 'MALFACON', 'USURE_PREMATUREE', 'MAINTENANCE', 'REPARATION', 'RETOUCHE', 'AUTRE']
    const VALID_PRIORITES = ['CRITIQUE', 'HAUTE', 'NORMALE', 'BASSE']
    const type = VALID_TYPES.includes(String(args.type)) ? String(args.type) : 'AUTRE'
    const priorite = VALID_PRIORITES.includes(String(args.priorite)) ? String(args.priorite) : 'NORMALE'

    const ticket = await prisma.ticketSAV.create({
      data: {
        numTicket,
        titre: String(args.titre).trim(),
        description: String(args.description).trim(),
        type: type as never,
        priorite: priorite as never,
        statut: 'NOUVEAU',
        chantierId,
        localisation: args.localisation ? String(args.localisation) : null,
        createdBy: ctx.userId,
      },
      select: { numTicket: true },
    })
    return { succes: true, numero: ticket.numTicket, chantier: nomChantier }
  },
}
