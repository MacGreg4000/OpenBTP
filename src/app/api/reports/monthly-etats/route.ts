import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { sendMonthlyReport } from '@/lib/email/monthly-report'

// POST /api/reports/monthly-etats — Déclenche l'envoi du rapport mensuel (test ou CRON)
export async function POST(request: Request) {
  try {
    // Vérifier l'authentification : soit session admin, soit CRON_SECRET
    const session = await getServerSession(authOptions)
    const cronSecret = request.headers.get('Authorization')?.replace('Bearer ', '')

    if (!session && cronSecret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Optionnel : date personnalisée pour tester un mois spécifique
    let targetDate: Date | undefined
    try {
      const body = await request.json().catch(() => null)
      if (body?.targetDate) {
        targetDate = new Date(body.targetDate)
      }
    } catch {
      // Pas de body, on utilise la date par défaut
    }

    const result = await sendMonthlyReport(targetDate)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Erreur /api/reports/monthly-etats:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la génération du rapport mensuel' },
      { status: 500 }
    )
  }
}

// GET /api/reports/monthly-etats — Info sur le rapport (pour vérifier que l'endpoint est disponible)
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    return NextResponse.json({
      description: 'Rapport mensuel des états d\'avancement',
      schedule: 'Le 15 de chaque mois à 8h00',
      trigger: 'POST /api/reports/monthly-etats',
      note: 'Envoie un récapitulatif du mois précédent à tous les administrateurs'
    })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
