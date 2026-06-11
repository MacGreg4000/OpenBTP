// Santé du chatbot : modèle actif, présence sur le serveur Ollama, capacité tools
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getOllamaClient } from '@/lib/ollama/client'
import { getTools } from '@/lib/chatbot/tools'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const ollama = getOllamaClient()
    const model = ollama.chatModel
    const info = await ollama.showModel(model)

    return NextResponse.json({
      model,
      modelPresent: info.exists,
      supportsTools: info.capabilities.includes('tools'),
      capabilities: info.capabilities,
      toolsCount: getTools().length,
      baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
      numCtx: parseInt(process.env.OLLAMA_CHAT_NUM_CTX || '16384', 10),
    })
  } catch (error) {
    console.error('❌ Erreur chatbot health:', error)
    return NextResponse.json({ error: 'Serveur Ollama injoignable' }, { status: 502 })
  }
}
