// Registry des outils du chatbot.
// Les erreurs sont renvoyées comme données (jamais de throw) pour que le
// modèle puisse se rattraper. Mêmes signatures que le futur serveur MCP.
import { ToolDefinition, ToolContext, OllamaTool } from '../types'
import { listeChantiers, detailChantier } from './chantiers'
import { listeClients } from './clients'
import { listeSousTraitants, tarifsSousTraitant } from './sous-traitants'
import {
  listeCommandesSousTraitant,
  listeEtatsAvancement,
  listeDepenses,
  listeBonsRegie,
} from './finances'
import { listeTachesLogistique, listeMagasiniers } from './logistique'
import { listePlanning } from './planning'
import { listeNotesChantier, listeDocumentsChantier } from './notes-documents'
import { rechercheSemantique } from './recherche'
import {
  creerNoteChantier,
  creerTacheLogistique,
  creerCommandeST,
  ajouterAvenantEtat,
} from './actions'

const ALL_TOOLS: ToolDefinition[] = [
  // Lecture
  listeChantiers,
  detailChantier,
  listeClients,
  listeSousTraitants,
  tarifsSousTraitant,
  listeCommandesSousTraitant,
  listeEtatsAvancement,
  listeDepenses,
  listeBonsRegie,
  listeNotesChantier,
  listeDocumentsChantier,
  listeTachesLogistique,
  listeMagasiniers,
  listePlanning,
  rechercheSemantique,
  // Écriture (confirmation obligatoire)
  creerNoteChantier,
  creerTacheLogistique,
  creerCommandeST,
  ajouterAvenantEtat,
]

const TOOLS_BY_NAME = new Map(ALL_TOOLS.map((t) => [t.name, t]))

export function getTools(): ToolDefinition[] {
  return ALL_TOOLS
}

export function getTool(name: string): ToolDefinition | undefined {
  return TOOLS_BY_NAME.get(name)
}

export function toOllamaTools(): OllamaTool[] {
  return ALL_TOOLS.map((t) => ({
    type: 'function' as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    },
  }))
}

/** Parse défensif : certaines versions d'Ollama renvoient arguments en string JSON. */
export function parseToolArgs(raw: Record<string, unknown> | string | undefined): Record<string, unknown> {
  if (!raw) return {}
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      return typeof parsed === 'object' && parsed !== null ? parsed : {}
    } catch {
      return {}
    }
  }
  return raw
}

export async function executeTool(
  name: string,
  args: Record<string, unknown>,
  ctx: ToolContext
): Promise<unknown> {
  const tool = TOOLS_BY_NAME.get(name)
  if (!tool) {
    return { erreur: `Outil inconnu : ${name}. Outils disponibles : ${ALL_TOOLS.map((t) => t.name).join(', ')}` }
  }
  try {
    return await tool.execute(args, ctx)
  } catch (error) {
    console.error(`❌ Erreur outil ${name}:`, error)
    return { erreur: `L'outil ${name} a échoué : ${error instanceof Error ? error.message : 'erreur inconnue'}` }
  }
}
