import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { envoyerContratEnSignature } from '@/lib/contrats/envoi-signature'

// La logique (représentant obligatoire, réutilisation d'un contrat non signé
// du template actif, email au représentant) vit dans envoyerContratEnSignature,
// partagée avec le renouvellement automatique.
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { id } = await context.params
  const r = await envoyerContratEnSignature(id, session.user.id)
  if (!r.ok) {
    return NextResponse.json({ error: r.erreur }, { status: r.status ?? 500 })
  }
  return NextResponse.json({ success: true, message: 'Email envoyé avec succès' })
}
