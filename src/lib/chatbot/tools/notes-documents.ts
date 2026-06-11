import { prisma } from '@/lib/prisma/client'
import { ToolDefinition } from '../types'
import { resolveChantier, clampLimit } from './helpers'

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
    if (!res.ok) return { erreur: res.message, candidats: res.candidats }
    const limit = clampLimit(args.limit, 10, 30)

    const notes = await prisma.note.findMany({
      where: { chantierId: res.value.chantierId }, // Note → Chantier.chantierId
      select: {
        contenu: true,
        createdAt: true,
        User: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
    return {
      chantier: res.value.nomChantier,
      total: notes.length,
      notes: notes.map((n) => ({ date: n.createdAt, auteur: n.User.name, contenu: n.contenu })),
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
    if (!res.ok) return { erreur: res.message, candidats: res.candidats }
    const limit = clampLimit(args.limit, 20, 50)

    const where: Record<string, unknown> = { chantierId: res.value.chantierId } // Document → Chantier.chantierId
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
