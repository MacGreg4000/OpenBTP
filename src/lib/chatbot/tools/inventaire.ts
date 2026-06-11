// Inventaire : matériaux (avec localisation rack/emplacement) et machines (avec prêts)
import { prisma } from '@/lib/prisma/client'
import { ToolDefinition } from '../types'
import { clampLimit } from './helpers'

export const rechercheMateriaux: ToolDefinition = {
  name: 'recherche_materiaux',
  description:
    "Recherche des matériaux dans l'inventaire du dépôt avec leur quantité et leur localisation exacte (rack, ligne, colonne).",
  parameters: {
    type: 'object',
    properties: {
      recherche: { type: 'string', description: 'Nom ou description du matériau' },
      limit: { type: 'number', description: 'Nombre max de résultats (défaut 20, max 50)' },
    },
  },
  execute: async (args) => {
    const limit = clampLimit(args.limit, 20, 50)
    const where = args.recherche
      ? {
          OR: [
            { nom: { contains: String(args.recherche) } },
            { description: { contains: String(args.recherche) } },
          ],
        }
      : undefined
    const materiaux = await prisma.materiau.findMany({
      where,
      select: {
        nom: true,
        description: true,
        quantite: true,
        emplacement: {
          select: { ligne: true, colonne: true, rack: { select: { nom: true, position: true } } },
        },
      },
      orderBy: { nom: 'asc' },
      take: limit,
    })
    return {
      total: materiaux.length,
      materiaux: materiaux.map((m) => ({
        nom: m.nom,
        description: m.description,
        quantite: m.quantite,
        localisation: m.emplacement
          ? `${m.emplacement.rack.nom} (${m.emplacement.rack.position}) — ligne ${m.emplacement.ligne}, colonne ${m.emplacement.colonne}`
          : 'Non rangé',
      })),
    }
  },
}

export const listeMachines: ToolDefinition = {
  name: 'liste_machines',
  description:
    'Liste les machines/outillage avec leur statut (DISPONIBLE, PRETEE…), leur localisation et le prêt en cours éventuel (emprunteur, date de retour prévue).',
  parameters: {
    type: 'object',
    properties: {
      recherche: { type: 'string', description: 'Nom ou modèle de la machine' },
      statut: { type: 'string', description: 'Filtrer par statut (ex. DISPONIBLE, PRETEE)' },
      limit: { type: 'number', description: 'Nombre max de résultats (défaut 20, max 50)' },
    },
  },
  execute: async (args) => {
    const limit = clampLimit(args.limit, 20, 50)
    const where: Record<string, unknown> = {}
    if (args.recherche) {
      const q = String(args.recherche)
      where.OR = [{ nom: { contains: q } }, { modele: { contains: q } }]
    }
    if (args.statut) where.statut = String(args.statut)
    const machines = await prisma.machine.findMany({
      where,
      select: {
        nom: true,
        modele: true,
        statut: true,
        localisation: true,
        commentaire: true,
        pret: {
          where: { statut: 'EN_COURS' },
          select: { emprunteur: true, datePret: true, dateRetourPrevue: true },
          take: 1,
        },
      },
      orderBy: { nom: 'asc' },
      take: limit,
    })
    return {
      total: machines.length,
      machines: machines.map((m) => ({
        nom: m.nom,
        modele: m.modele,
        statut: m.statut,
        localisation: m.localisation,
        commentaire: m.commentaire,
        pretEnCours: m.pret[0]
          ? {
              emprunteur: m.pret[0].emprunteur,
              depuis: m.pret[0].datePret,
              retourPrevu: m.pret[0].dateRetourPrevue,
            }
          : null,
      })),
    }
  },
}
