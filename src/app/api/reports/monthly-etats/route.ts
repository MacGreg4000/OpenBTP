import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { envoyerRapportHebdo } from '@/lib/rapports/rapport-hebdo'

// Rapport d'activité hebdomadaire (envoyé automatiquement le vendredi à midi).
// POST : l'envoyer maintenant aux administrateurs — session ADMIN ou CRON_SECRET.
// (Chemin historique « monthly-etats » conservé pour ne casser aucun appel.)
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    const cronSecret = request.headers.get('Authorization')?.replace('Bearer ', '')
    const estAdmin = session?.user?.role === 'ADMIN'
    if (!estAdmin && !(process.env.CRON_SECRET && cronSecret === process.env.CRON_SECRET)) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }
    return NextResponse.json(await envoyerRapportHebdo())
  } catch (error) {
    console.error('Erreur /api/reports/monthly-etats:', error)
    return NextResponse.json({ error: 'Erreur lors de la génération du rapport' }, { status: 500 })
  }
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  return NextResponse.json({
    description: "Rapport d'activité hebdomadaire",
    schedule: 'Chaque vendredi à 12h00 (Europe/Brussels)',
  })
}
