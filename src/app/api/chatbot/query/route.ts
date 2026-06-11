// Chatbot agentique : question → agent loop (Ollama /api/chat + outils)
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { runAgent, HistoryMessage } from '@/lib/chatbot/agent'
import { RAGConversationService } from '@/lib/rag/conversation-service'
import { ModelToolsUnsupportedError } from '@/lib/ollama/client'

// Derrière nginx/Synology : proxy_read_timeout déjà aligné (cf. /api/rag/query)
export const maxDuration = 300
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }
    const userId = session.user.id

    const body = await request.json()
    const question = typeof body?.question === 'string' ? body.question.trim() : ''
    if (!question) {
      return NextResponse.json({ error: 'Question requise' }, { status: 400 })
    }

    const startTime = Date.now()

    // Historique persisté (user/bot) → format agent
    const persisted = await RAGConversationService.loadUserConversation(userId)
    const history: HistoryMessage[] = persisted.map((m) => ({
      role: m.type === 'user' ? 'user' : 'assistant',
      content: m.content,
    }))

    const result = await runAgent(question, history, { userId })
    const processingTime = Date.now() - startTime

    if (result.pendingAction) {
      // Pas de persistance ici : la conversation sera complétée après confirmation/annulation
      return NextResponse.json({
        pendingAction: result.pendingAction,
        toolCalls: result.toolCalls,
        model: result.model,
        processingTime,
      })
    }

    return NextResponse.json({
      answer: result.answer,
      toolCalls: result.toolCalls,
      model: result.model,
      iterations: result.iterations,
      processingTime,
    })
  } catch (error) {
    console.error('❌ Erreur chatbot query:', error)
    if (error instanceof ModelToolsUnsupportedError) {
      return NextResponse.json({ error: error.message }, { status: 422 })
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur lors du traitement de la question' },
      { status: 500 }
    )
  }
}
