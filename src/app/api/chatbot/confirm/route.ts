// Exécution d'une action d'écriture confirmée par l'utilisateur
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { runConfirmedAction } from '@/lib/chatbot/agent'
import { getTool } from '@/lib/chatbot/tools'

export const maxDuration = 300
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const body = await request.json()
    const tool = typeof body?.tool === 'string' ? body.tool : ''
    const args = typeof body?.args === 'object' && body.args !== null ? (body.args as Record<string, unknown>) : {}

    const definition = getTool(tool)
    if (!definition || !definition.requiresConfirmation) {
      return NextResponse.json({ error: `Action inconnue ou non confirmable : ${tool}` }, { status: 400 })
    }

    const { answer, result } = await runConfirmedAction(tool, args, { userId: session.user.id })
    return NextResponse.json({ answer, result })
  } catch (error) {
    console.error('❌ Erreur chatbot confirm:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur lors de l'exécution de l'action" },
      { status: 500 }
    )
  }
}
