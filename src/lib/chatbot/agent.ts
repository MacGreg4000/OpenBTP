// Boucle agent : Ollama /api/chat + outils, max N itérations.
// S'arrête sur un outil d'écriture (requiresConfirmation) → pendingAction
// que l'UI doit faire confirmer avant exécution via /api/chatbot/confirm.
import { getOllamaClient, OllamaChatMessage } from '@/lib/ollama/client'
import { AgentResult, ToolCallLogEntry, ToolContext } from './types'
import { buildSystemPrompt } from './system-prompt'
import { toOllamaTools, executeTool, getTool, parseToolArgs } from './tools'
import { serializeToolResult } from './serialize'

export interface HistoryMessage {
  role: 'user' | 'assistant'
  content: string
}

function maxIterations(): number {
  const n = parseInt(process.env.CHATBOT_MAX_ITERATIONS || '6', 10)
  return Number.isFinite(n) && n > 0 ? Math.min(n, 12) : 6
}

export async function runAgent(
  question: string,
  history: HistoryMessage[],
  ctx: ToolContext
): Promise<AgentResult> {
  const ollama = getOllamaClient()
  const tools = toOllamaTools()
  const toolCallLog: ToolCallLogEntry[] = []

  const messages: OllamaChatMessage[] = [
    { role: 'system', content: buildSystemPrompt() },
    ...history.slice(-10).map((m): OllamaChatMessage => ({ role: m.role, content: m.content })),
    { role: 'user', content: question },
  ]

  const limit = maxIterations()
  let iterations = 0

  while (iterations < limit) {
    iterations++
    const msg = await ollama.chat(messages, { tools })

    if (!msg.tool_calls || msg.tool_calls.length === 0) {
      return { answer: msg.content || '(réponse vide)', toolCalls: toolCallLog, model: ollama.chatModel, iterations }
    }

    messages.push(msg)

    for (const call of msg.tool_calls) {
      const name = call.function?.name || ''
      const args = parseToolArgs(call.function?.arguments)
      const tool = getTool(name)

      // Outil d'écriture : on s'arrête et on demande confirmation à l'utilisateur
      if (tool?.requiresConfirmation) {
        const resume = tool.summarize ? await tool.summarize(args) : `Exécuter ${name}`
        return {
          pendingAction: { tool: name, args, resume },
          toolCalls: toolCallLog,
          model: ollama.chatModel,
          iterations,
        }
      }

      const t0 = Date.now()
      const result = await executeTool(name, args, ctx)
      toolCallLog.push({ name, args, durationMs: Date.now() - t0 })
      messages.push({
        role: 'tool',
        tool_name: name,
        content: serializeToolResult(result),
      })
    }
  }

  // Budget épuisé : forcer une réponse finale sans outils
  messages.push({
    role: 'user',
    content: 'Réponds maintenant à ma question initiale avec les informations déjà obtenues, sans appeler d\'autres outils.',
  })
  const finalMsg = await ollama.chat(messages)
  return {
    answer: finalMsg.content || '(réponse vide)',
    toolCalls: toolCallLog,
    model: ollama.chatModel,
    iterations,
  }
}

/**
 * Exécute une action confirmée par l'utilisateur, puis demande au modèle
 * une phrase de conclusion. Pas de reprise de boucle : simple et sans état.
 */
export async function runConfirmedAction(
  tool: string,
  args: Record<string, unknown>,
  ctx: ToolContext
): Promise<{ answer: string; result: unknown }> {
  const definition = getTool(tool)
  if (!definition || !definition.requiresConfirmation) {
    throw new Error(`Action non confirmable : ${tool}`)
  }
  const result = await executeTool(tool, args, ctx)

  const ollama = getOllamaClient()
  try {
    const msg = await ollama.chat([
      { role: 'system', content: buildSystemPrompt() },
      {
        role: 'user',
        content: `L'action ${tool} vient d'être exécutée après confirmation de l'utilisateur. Résultat : ${serializeToolResult(
          result
        )}\nFormule UNE phrase de confirmation en français (commence par ✓ en cas de succès, sinon explique l'erreur).`,
      },
    ])
    return { answer: msg.content || 'Action exécutée.', result }
  } catch {
    // Le LLM est indisponible : l'action est faite, on répond sans lui
    const r = result as { erreur?: string; succes?: boolean }
    return {
      answer: r?.erreur ? `L'action a échoué : ${r.erreur}` : '✓ Action exécutée.',
      result,
    }
  }
}
