// CRM Prospects : lecture + création de rappels et d'activités
import { prisma } from '@/lib/prisma/client'
import { ToolDefinition } from '../types'
import { ResolveResult, clampLimit } from './helpers'

async function resolveProspect(ref: string): Promise<ResolveResult<{ id: string; nom: string }>> {
  const cleaned = String(ref || '').trim()
  if (!cleaned) return { ok: false, message: 'Référence de prospect vide.' }
  const exact = await prisma.prospectEntreprise.findUnique({
    where: { id: cleaned },
    select: { id: true, nom: true },
  })
  if (exact) return { ok: true, value: exact }
  const matches = await prisma.prospectEntreprise.findMany({
    where: { nom: { contains: cleaned } },
    select: { id: true, nom: true },
    take: 6,
  })
  if (matches.length === 1) return { ok: true, value: matches[0] }
  if (matches.length > 1) {
    return {
      ok: false,
      message: `Plusieurs prospects correspondent à « ${cleaned} ». Demande à l'utilisateur de préciser.`,
      candidats: matches,
    }
  }
  return { ok: false, message: `Aucun prospect trouvé pour « ${cleaned} ».` }
}

export const listeProspects: ToolDefinition = {
  name: 'liste_prospects',
  description:
    'Liste les prospects du CRM : nom, type (ENTREPRISE_GENERALE, ARCHITECTE, CLIENT_DIRECT, AUTRE), ville, contacts.',
  parameters: {
    type: 'object',
    properties: {
      recherche: { type: 'string', description: 'Nom du prospect (même partiel)' },
      type: {
        type: 'string',
        enum: ['ENTREPRISE_GENERALE', 'ARCHITECTE', 'CLIENT_DIRECT', 'AUTRE'],
        description: 'Filtrer par type',
      },
      limit: { type: 'number', description: 'Nombre max de résultats (défaut 20, max 50)' },
    },
  },
  execute: async (args) => {
    const limit = clampLimit(args.limit, 20, 50)
    const where: Record<string, unknown> = {}
    if (args.recherche) where.nom = { contains: String(args.recherche) }
    if (args.type) where.type = String(args.type)
    const prospects = await prisma.prospectEntreprise.findMany({
      where,
      select: {
        nom: true,
        type: true,
        ville: true,
        telephone: true,
        email: true,
        notes: true,
        contacts: { select: { prenom: true, nom: true, role: true, telephone: true, email: true }, take: 5 },
        _count: { select: { rappels: true, activites: true } },
      },
      orderBy: { nom: 'asc' },
      take: limit,
    })
    return {
      total: prospects.length,
      prospects: prospects.map((p) => ({
        nom: p.nom,
        type: p.type,
        ville: p.ville,
        telephone: p.telephone,
        email: p.email,
        notes: p.notes ? p.notes.slice(0, 200) : null,
        contacts: p.contacts.map((c) => ({
          nom: `${c.prenom} ${c.nom}`,
          role: c.role,
          telephone: c.telephone,
          email: c.email,
        })),
        nombreRappels: p._count.rappels,
        nombreActivites: p._count.activites,
      })),
    }
  },
}

export const listeRappelsProspects: ToolDefinition = {
  name: 'liste_rappels_prospects',
  description:
    'Liste les rappels CRM (relances prospects) en attente ou à venir, avec leur date et le prospect concerné.',
  parameters: {
    type: 'object',
    properties: {
      statut: { type: 'string', enum: ['EN_ATTENTE', 'FAIT', 'ANNULE'], description: 'Filtrer par statut (défaut EN_ATTENTE)' },
      limit: { type: 'number', description: 'Nombre max de résultats (défaut 20, max 50)' },
    },
  },
  execute: async (args) => {
    const limit = clampLimit(args.limit, 20, 50)
    const rappels = await prisma.prospectRappel.findMany({
      where: { statut: args.statut ? String(args.statut) : 'EN_ATTENTE' },
      select: {
        titre: true,
        description: true,
        dateRappel: true,
        statut: true,
        entreprise: { select: { nom: true, telephone: true } },
      },
      orderBy: { dateRappel: 'asc' },
      take: limit,
    })
    return {
      total: rappels.length,
      rappels: rappels.map((r) => ({
        date: r.dateRappel,
        titre: r.titre,
        description: r.description,
        statut: r.statut,
        prospect: r.entreprise.nom,
        telephone: r.entreprise.telephone,
      })),
    }
  },
}

export const creerRappelProspect: ToolDefinition = {
  name: 'creer_rappel_prospect',
  description:
    "Crée un rappel (relance) pour un prospect du CRM à une date donnée. Nécessite la confirmation de l'utilisateur.",
  requiresConfirmation: true,
  parameters: {
    type: 'object',
    properties: {
      prospect: { type: 'string', description: 'Nom (même partiel) ou id du prospect' },
      titre: { type: 'string', description: 'Titre du rappel' },
      date_rappel: { type: 'string', description: 'Date du rappel (YYYY-MM-DD)' },
      description: { type: 'string', description: 'Détails (optionnel)' },
    },
    required: ['prospect', 'titre', 'date_rappel'],
  },
  summarize: async (args) => {
    const res = await resolveProspect(String(args.prospect))
    const nom = res.ok ? res.value.nom : String(args.prospect)
    return `Créer un rappel « ${String(args.titre)} » pour le prospect ${nom} le ${String(args.date_rappel)}`
  },
  execute: async (args, ctx) => {
    const res = await resolveProspect(String(args.prospect))
    if (!res.ok) return { erreur: res.message, candidats: res.candidats }
    const dateRappel = new Date(String(args.date_rappel))
    if (Number.isNaN(dateRappel.getTime())) return { erreur: 'Date invalide (format attendu YYYY-MM-DD).' }

    const rappel = await prisma.prospectRappel.create({
      data: {
        entrepriseId: res.value.id,
        titre: String(args.titre),
        description: args.description ? String(args.description) : null,
        dateRappel,
        creePar: ctx.userId,
      },
      select: { id: true },
    })
    return { succes: true, prospect: res.value.nom, dateRappel, rappelId: rappel.id }
  },
}

export const ajouterActiviteProspect: ToolDefinition = {
  name: 'ajouter_activite_prospect',
  description:
    "Enregistre une activité dans l'historique d'un prospect du CRM (appel passé, email envoyé, rendez-vous, note). Nécessite la confirmation de l'utilisateur.",
  requiresConfirmation: true,
  parameters: {
    type: 'object',
    properties: {
      prospect: { type: 'string', description: 'Nom (même partiel) ou id du prospect' },
      type: { type: 'string', enum: ['APPEL', 'EMAIL', 'RDV', 'NOTE', 'AUTRE'], description: "Type d'activité" },
      description: { type: 'string', description: "Description de l'activité" },
    },
    required: ['prospect', 'type', 'description'],
  },
  summarize: async (args) => {
    const res = await resolveProspect(String(args.prospect))
    const nom = res.ok ? res.value.nom : String(args.prospect)
    return `Enregistrer une activité ${String(args.type)} pour le prospect ${nom} : « ${String(args.description)} »`
  },
  execute: async (args, ctx) => {
    const res = await resolveProspect(String(args.prospect))
    if (!res.ok) return { erreur: res.message, candidats: res.candidats }
    const VALID = ['APPEL', 'EMAIL', 'RDV', 'NOTE', 'AUTRE']
    const type = VALID.includes(String(args.type)) ? String(args.type) : 'NOTE'

    await prisma.prospectActivite.create({
      data: {
        entrepriseId: res.value.id,
        type,
        description: String(args.description),
        creePar: ctx.userId,
      },
    })
    return { succes: true, prospect: res.value.nom, type }
  },
}
