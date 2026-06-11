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
import { lireNotesDashboard, ajouterTodoDashboard, ajouterNoteDashboard } from './dashboard'
import { listeTicketsSAV, detailTicketSAV, creerTicketSAV } from './sav'
import { rechercheMateriaux, listeMachines } from './inventaire'
import { listeDevis } from './devis'
import {
  listeProspects,
  listeRappelsProspects,
  creerRappelProspect,
  ajouterActiviteProspect,
} from './crm'
import {
  listeTachesAdministratives,
  listeRemarquesReception,
  listeContactsClient,
} from './suivi-chantier'
import {
  creerNoteChantier,
  creerTacheLogistique,
  creerCommandeST,
  ajouterAvenantEtat,
} from './actions'

const ALL_TOOLS: ToolDefinition[] = [
  // Lecture — chantiers & suivi
  listeChantiers,
  detailChantier,
  listeTachesAdministratives,
  listeRemarquesReception,
  listeNotesChantier,
  listeDocumentsChantier,
  // Lecture — finances
  listeCommandesSousTraitant,
  listeEtatsAvancement,
  listeDepenses,
  listeBonsRegie,
  listeDevis,
  // Lecture — acteurs
  listeClients,
  listeContactsClient,
  listeSousTraitants,
  tarifsSousTraitant,
  // Lecture — logistique, planning, inventaire
  listeTachesLogistique,
  listeMagasiniers,
  listePlanning,
  rechercheMateriaux,
  listeMachines,
  // Lecture — SAV & CRM
  listeTicketsSAV,
  detailTicketSAV,
  listeProspects,
  listeRappelsProspects,
  // Lecture — personnel & recherche
  lireNotesDashboard,
  rechercheSemantique,
  // Écriture (confirmation obligatoire)
  creerNoteChantier,
  creerTacheLogistique,
  creerCommandeST,
  ajouterAvenantEtat,
  ajouterTodoDashboard,
  ajouterNoteDashboard,
  creerTicketSAV,
  creerRappelProspect,
  ajouterActiviteProspect,
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
