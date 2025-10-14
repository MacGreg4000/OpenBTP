import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

interface ErrorLogData {
  message: string
  stack?: string
  componentStack?: string
  timestamp: string
  url: string
  userAgent: string
  errorId: string
  userId?: string
  severity?: 'low' | 'medium' | 'high' | 'critical'
}

export async function POST(request: NextRequest) {
  try {
    // Vérifier l'authentification (optionnel pour le logging d'erreurs)
    let userId: string | undefined
    try {
      const session = await getServerSession(authOptions)
      userId = session?.user?.id
    } catch {
      // Continuer même sans session pour logger les erreurs d'authentification
    }

    const errorData: ErrorLogData = await request.json()

    // Validation des données d'erreur
    if (!errorData.message || !errorData.timestamp || !errorData.url) {
      return NextResponse.json(
        { error: 'Données d\'erreur invalides' },
        { status: 400 }
      )
    }

    // Déterminer la sévérité de l'erreur
    let severity: ErrorLogData['severity'] = 'medium'
    if (errorData.message.includes('Critical') || errorData.message.includes('Fatal')) {
      severity = 'critical'
    } else if (errorData.message.includes('Warning') || errorData.message.includes('Deprecated')) {
      severity = 'low'
    } else if (errorData.message.includes('Error') || errorData.message.includes('Exception')) {
      severity = 'high'
    }

    // Enrichir les données d'erreur
    const enrichedErrorData = {
      ...errorData,
      userId,
      severity,
      serverTimestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    }

    // Logger l'erreur (ici vous pouvez implémenter votre logique de logging)
    console.error('🚨 ERREUR CAPTURÉE:', {
      ...enrichedErrorData,
      // Masquer les informations sensibles en production
      stack: process.env.NODE_ENV === 'production' ? '[MASQUÉ]' : enrichedErrorData.stack,
      componentStack: process.env.NODE_ENV === 'production' ? '[MASQUÉ]' : enrichedErrorData.componentStack
    })

    // Ici vous pourriez :
    // 1. Sauvegarder dans une base de données
    // 2. Envoyer à un service externe (Sentry, LogRocket, etc.)
    // 3. Envoyer une notification Slack/Email pour les erreurs critiques
    // 4. Analyser les patterns d'erreurs

    // Exemple : Notification pour les erreurs critiques
    if (severity === 'critical') {
      await notifyCriticalError(enrichedErrorData)
    }

    // Exemple : Sauvegarde en base de données (si vous avez une table d'erreurs)
    // await prisma.errorLog.create({
    //   data: {
    //     message: enrichedErrorData.message,
    //     stack: enrichedErrorData.stack,
    //     componentStack: enrichedErrorData.componentStack,
    //     url: enrichedErrorData.url,
    //     userAgent: enrichedErrorData.userAgent,
    //     errorId: enrichedErrorData.errorId,
    //     userId: enrichedErrorData.userId,
    //     severity: enrichedErrorData.severity,
    //     timestamp: new Date(enrichedErrorData.timestamp)
    //   }
    // })

    return NextResponse.json({ 
      success: true, 
      errorId: enrichedErrorData.errorId,
      severity: enrichedErrorData.severity
    })

  } catch (error) {
    console.error('Erreur lors du logging de l\'erreur:', error)
    
    // Retourner une réponse d'erreur mais ne pas faire échouer le processus
    return NextResponse.json(
      { error: 'Erreur lors du logging' },
      { status: 500 }
    )
  }
}

// Fonction pour notifier les erreurs critiques
async function notifyCriticalError(errorData: ErrorLogData & { severity: string }) {
  try {
    // Exemple : Notification Slack
    if (process.env.SLACK_WEBHOOK_URL) {
      const slackMessage = {
        text: `🚨 ERREUR CRITIQUE DÉTECTÉE`,
        blocks: [
          {
            type: "header",
            text: {
              type: "plain_text",
              text: "🚨 ERREUR CRITIQUE DÉTECTÉE"
            }
          },
          {
            type: "section",
            fields: [
              {
                type: "mrkdwn",
                text: `*Message:*\n${errorData.message}`
              },
              {
                type: "mrkdwn",
                text: `*URL:*\n${errorData.url}`
              },
              {
                type: "mrkdwn",
                text: `*Timestamp:*\n${errorData.timestamp}`
              },
              {
                type: "mrkdwn",
                text: `*Error ID:*\n${errorData.errorId}`
              }
            ]
          }
        ]
      }

      await fetch(process.env.SLACK_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(slackMessage)
      })
    }

    // Exemple : Notification par email
    if (process.env.ADMIN_EMAIL) {
      // Implémenter l'envoi d'email ici
      console.log('📧 Email de notification envoyé à:', process.env.ADMIN_EMAIL)
    }

  } catch (notificationError) {
    console.error('Erreur lors de la notification:', notificationError)
  }
}
