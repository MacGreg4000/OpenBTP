// Suivi administratif et réceptions de chantier
import { prisma } from '@/lib/prisma/client'
import { ToolDefinition } from '../types'
import { resolveChantier } from './helpers'

export const listeTachesAdministratives: ToolDefinition = {
  name: 'liste_taches_administratives',
  description:
    "Checklist administrative d'un chantier (déclaration de chantier, PPSS, assurances…) : ce qui est fait et ce qui reste à faire.",
  parameters: {
    type: 'object',
    properties: {
      chantier: { type: 'string', description: 'Identifiant ou nom du chantier' },
      uniquement_a_faire: { type: 'boolean', description: 'Ne montrer que les tâches non faites (défaut false)' },
    },
    required: ['chantier'],
  },
  execute: async (args) => {
    const res = await resolveChantier(String(args.chantier))
    if (!res.ok) return { erreur: res.message, candidats: res.candidats }

    const [taches, types] = await Promise.all([
      prisma.admintask.findMany({
        where: {
          chantierId: res.value.chantierId, // admintask → Chantier.chantierId
          ...(args.uniquement_a_faire === true ? { completed: false } : {}),
        },
        select: { taskType: true, title: true, completed: true, completedAt: true, user: { select: { name: true } } },
      }),
      prisma.adminTaskType.findMany({
        where: { isActive: true },
        select: { taskType: true, label: true },
      }),
    ])
    const labels = new Map(types.map((t) => [t.taskType, t.label]))
    return {
      chantier: res.value.nomChantier,
      total: taches.length,
      taches: taches.map((t) => ({
        tache: t.title || labels.get(t.taskType) || t.taskType,
        faite: t.completed,
        faiteLe: t.completedAt,
        faitePar: t.user?.name,
      })),
    }
  },
}

export const listeRemarquesReception: ToolDefinition = {
  name: 'liste_remarques_reception',
  description:
    "Remarques de réception d'un chantier (réserves) : description, localisation, résolues ou non, validées ou rejetées.",
  parameters: {
    type: 'object',
    properties: {
      chantier: { type: 'string', description: 'Identifiant ou nom du chantier' },
      uniquement_non_resolues: { type: 'boolean', description: 'Ne montrer que les remarques non résolues (défaut false)' },
    },
    required: ['chantier'],
  },
  execute: async (args) => {
    const res = await resolveChantier(String(args.chantier))
    if (!res.ok) return { erreur: res.message, candidats: res.candidats }

    const receptions = await prisma.receptionChantier.findMany({
      where: { chantierId: res.value.chantierId }, // ReceptionChantier → Chantier.chantierId
      select: {
        dateCreation: true,
        dateLimite: true,
        estFinalise: true,
        remarques: {
          where: args.uniquement_non_resolues === true ? { estResolue: false } : undefined,
          select: {
            numeroSequentiel: true,
            description: true,
            localisation: true,
            estResolue: true,
            estValidee: true,
            estRejetee: true,
            dateResolution: true,
          },
          orderBy: { numeroSequentiel: 'asc' },
          take: 50,
        },
      },
      orderBy: { dateCreation: 'desc' },
    })
    if (receptions.length === 0) {
      return { chantier: res.value.nomChantier, info: 'Aucune réception pour ce chantier.' }
    }
    return {
      chantier: res.value.nomChantier,
      receptions: receptions.map((r) => ({
        dateCreation: r.dateCreation,
        dateLimite: r.dateLimite,
        finalisee: r.estFinalise,
        nombreRemarques: r.remarques.length,
        remarques: r.remarques.map((rem) => ({
          numero: rem.numeroSequentiel,
          description: rem.description,
          localisation: rem.localisation,
          resolue: rem.estResolue,
          validee: rem.estValidee,
          rejetee: rem.estRejetee,
        })),
      })),
    }
  },
}

export const listeContactsClient: ToolDefinition = {
  name: 'liste_contacts_client',
  description: "Liste les personnes de contact d'un client (nom, fonction, téléphone, email).",
  parameters: {
    type: 'object',
    properties: {
      client: { type: 'string', description: 'Nom (même partiel) ou id du client' },
    },
    required: ['client'],
  },
  execute: async (args) => {
    const ref = String(args.client || '').trim()
    const clients = await prisma.client.findMany({
      where: { OR: [{ id: ref }, { nom: { contains: ref } }] },
      select: {
        nom: true,
        email: true,
        telephone: true,
        contacts: {
          select: { prenom: true, nom: true, fonction: true, telephone: true, email: true },
        },
      },
      take: 5,
    })
    if (clients.length === 0) return { erreur: `Aucun client trouvé pour « ${ref} ».` }
    return {
      clients: clients.map((c) => ({
        client: c.nom,
        emailGeneral: c.email,
        telephoneGeneral: c.telephone,
        contacts: c.contacts.map((ct) => ({
          nom: `${ct.prenom} ${ct.nom}`,
          fonction: ct.fonction,
          telephone: ct.telephone,
          email: ct.email,
        })),
      })),
    }
  },
}
