// Registre des outils agent.
//
// Conventions (héritées du socle chatbot, à respecter par tout nouvel outil) :
//  - ne JAMAIS throw : les erreurs sont renvoyées comme données
//    ({ erreur: '…', candidats: [...] }) pour que le modèle puisse se rattraper
//  - création uniquement : aucune suppression, aucun envoi d'email, rien sur
//    des entités verrouillées/finalisées
//  - toute écriture porte requiresConfirmation + summarize() en français
//
// Les outils sont ajoutés UN PAR UN (voir plan, phases 1→4).

import { ToolDefinition, ToolContext, ToolCatalogEntry } from '../types'
import {
  trouverOuCreerClient,
  creerChantier,
  completerFicheChantier,
  creerCommandeChantier,
  modifierClient,
} from './dossier'
import {
  lireNotesDashboard,
  ajouterNoteDashboard,
  ajouterTodoDashboard,
  creerNoteChantier,
} from './notes'
import { listeEtatsAvancement, creerEtatAvancement, ajouterAvenantEtat } from './etats'
import { creerDevis } from './devis'
import {
  lireBaremeMateriau,
  definirBaremeMateriau,
  analyserCoutMatiereChantier,
  definirCoutMatiereLigne,
  rentabiliteChantier,
  chantiersSousMarge,
} from './rentabilite'
import {
  listeChantiers,
  detailChantier,
  listeClients,
  listeSousTraitants,
  tarifsSousTraitant,
  listeNotesChantier,
  listeDocumentsChantier,
  documentsExpirants,
} from './lecture'
import { ajouterDocumentOuvrier, modifierDocumentOuvrier, listeDocumentsOuvrier } from './ouvriers'

const ALL_TOOLS: ToolDefinition[] = [
  // Lecture (aucune écriture)
  listeChantiers,
  detailChantier,
  listeClients,
  listeSousTraitants,
  tarifsSousTraitant,
  listeNotesChantier,
  listeDocumentsChantier,
  documentsExpirants,
  listeDocumentsOuvrier,
  listeEtatsAvancement,
  lireNotesDashboard,
  lireBaremeMateriau,
  analyserCoutMatiereChantier,
  rentabiliteChantier,
  chantiersSousMarge,
  // Encodage d'un dossier
  trouverOuCreerClient,
  creerChantier,
  completerFicheChantier,
  creerCommandeChantier,
  modifierClient,
  // Notes
  creerNoteChantier,
  ajouterNoteDashboard,
  ajouterTodoDashboard,
  // États d'avancement
  creerEtatAvancement,
  ajouterAvenantEtat,
  // Devis
  creerDevis,
  // Rentabilité / coût matière
  definirBaremeMateriau,
  definirCoutMatiereLigne,
  // Documents d'ouvriers — pas de suppression, voir commentaire dans ouvriers.ts
  ajouterDocumentOuvrier,
  modifierDocumentOuvrier,
]

const TOOLS_BY_NAME = new Map(ALL_TOOLS.map((t) => [t.name, t]))

export function getTools(): ToolDefinition[] {
  return ALL_TOOLS
}

export function getTool(name: string): ToolDefinition | undefined {
  return TOOLS_BY_NAME.get(name)
}

/** Catalogue exposé par GET /api/agent/tools (consommé par le serveur MCP). */
export function getToolCatalog(): ToolCatalogEntry[] {
  return ALL_TOOLS.map((t) => ({
    name: t.name,
    description: t.description,
    parameters: t.parameters,
    requiresConfirmation: Boolean(t.requiresConfirmation),
  }))
}

/** Parse défensif : certains clients renvoient les arguments en chaîne JSON. */
export function parseToolArgs(
  raw: Record<string, unknown> | string | undefined
): Record<string, unknown> {
  if (!raw) return {}
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : {}
    } catch {
      return {}
    }
  }
  return raw
}

export interface ExecuteOptions {
  /** Valide et calcule sans rien écrire. */
  dryRun?: boolean
}

/**
 * Exécute un outil. Ne lève jamais : toute erreur devient une donnée.
 * En dryRun, utilise `preview()` si l'outil en fournit un, sinon `summarize()`.
 */
export async function executeTool(
  name: string,
  args: Record<string, unknown>,
  ctx: ToolContext,
  options: ExecuteOptions = {}
): Promise<unknown> {
  const tool = TOOLS_BY_NAME.get(name)
  if (!tool) {
    const dispo = ALL_TOOLS.map((t) => t.name).join(', ') || '(aucun outil enregistré)'
    return { erreur: `Outil inconnu : ${name}. Outils disponibles : ${dispo}` }
  }

  try {
    if (options.dryRun) {
      const resume = tool.summarize ? await tool.summarize(args) : undefined
      if (tool.preview) {
        const apercu = await tool.preview(args, ctx)
        return { dryRun: true, resume, apercu }
      }
      return {
        dryRun: true,
        resume,
        info: "Aucune validation détaillée disponible pour cet outil ; rien n'a été écrit.",
      }
    }
    return await tool.execute(args, ctx)
  } catch (error) {
    console.error(`[agent] échec de l'outil ${name}:`, error)
    return {
      erreur: `L'outil ${name} a échoué : ${error instanceof Error ? error.message : 'erreur inconnue'}`,
    }
  }
}
