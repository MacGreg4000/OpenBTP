import { NextRequest, NextResponse } from 'next/server'
import { NotificationService } from '@/lib/services/notificationService'

// POST /api/notifications/cleanup - Nettoyer les notifications expirées
// Cette route peut être appelée par un cron job externe (ex: cron-job.org) ou par un système interne
export async function POST(request: NextRequest) {
  try {
    // Vérifier le token d'authentification du cron (optionnel mais recommandé)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET || 'default-secret-change-me'
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    const deletedCount = await NotificationService.cleanupExpiredNotifications()

    return NextResponse.json({
      success: true,
      deletedCount,
      message: `${deletedCount} notification(s) expirée(s) supprimée(s)`,
    })
  } catch (error) {
    console.error('Erreur lors du nettoyage:', error)
    return NextResponse.json(
      { error: 'Erreur lors du nettoyage des notifications' },
      { status: 500 }
    )
  }
}

// GET /api/notifications/cleanup - Version GET pour les services cron qui ne supportent que GET
export async function GET(request: NextRequest) {
  return POST(request)
}

