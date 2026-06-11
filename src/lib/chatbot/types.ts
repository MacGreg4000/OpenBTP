// Types du chatbot agentique (tool calling via Ollama /api/chat)
import { OllamaChatMessage, OllamaTool } from '@/lib/ollama/client'

export type { OllamaChatMessage, OllamaTool }

export interface ToolContext {
  /** Utilisateur connecté (User.id) — auteur des écritures */
  userId: string
}

export interface ToolDefinition {
  name: string
  description: string
  /** JSON Schema des paramètres (format OpenAPI / Ollama tools) */
  parameters: {
    type: 'object'
    properties: Record<string, unknown>
    required?: string[]
  }
  /** Outil d'écriture : nécessite une confirmation explicite de l'utilisateur dans l'UI */
  requiresConfirmation?: boolean
  /** Résumé lisible de l'action proposée, affiché dans la carte de confirmation */
  summarize?: (args: Record<string, unknown>) => Promise<string> | string
  execute: (args: Record<string, unknown>, ctx: ToolContext) => Promise<unknown>
}

export interface ToolCallLogEntry {
  name: string
  args: Record<string, unknown>
  durationMs: number
}

export interface PendingAction {
  tool: string
  args: Record<string, unknown>
  /** Résumé lisible affiché à l'utilisateur */
  resume: string
}

export interface AgentResult {
  answer?: string
  pendingAction?: PendingAction
  toolCalls: ToolCallLogEntry[]
  model: string
  iterations: number
}
