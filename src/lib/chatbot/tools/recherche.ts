import { getOllamaClient } from '@/lib/ollama/client'
import { vectorStore } from '@/lib/rag/vector-store'
import { ToolDefinition } from '../types'
import { resolveChantier } from './helpers'

export const rechercheSemantique: ToolDefinition = {
  name: 'recherche_semantique',
  description:
    "Recherche libre par similarité dans toutes les données indexées (notes, documents, remarques, matériaux…). À utiliser quand les autres outils ne suffisent pas ou pour une recherche par sens plutôt que par mot exact.",
  parameters: {
    type: 'object',
    properties: {
      requete: { type: 'string', description: 'La recherche en langage naturel' },
      chantier: { type: 'string', description: 'Limiter la recherche à un chantier (identifiant ou nom)' },
    },
    required: ['requete'],
  },
  execute: async (args) => {
    let chantierId: string | undefined
    if (args.chantier) {
      const res = await resolveChantier(String(args.chantier))
      if (!res.ok) return { erreur: res.message, candidats: res.candidats }
      chantierId = res.value.chantierId
    }
    const embedding = await getOllamaClient().generateEmbedding(String(args.requete))
    const chunks = await vectorStore.searchSimilar(embedding, 5, chantierId ? { chantierId } : undefined)
    return {
      total: chunks.length,
      resultats: chunks.map((c) => ({
        type: c.metadata.type,
        entite: c.metadata.entityName,
        score: typeof c.similarityScore === 'number' ? Math.round(c.similarityScore * 100) / 100 : undefined,
        contenu: c.content.slice(0, 600),
      })),
    }
  },
}
