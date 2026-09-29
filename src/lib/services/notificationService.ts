import { gabaritEmail, paragraphe, encadre, echapperHtml, texteEnHtml } from '@/lib/email/gabarit'
import { societeEmail } from '@/lib/email/societe'
import { prisma } from '@/lib/prisma/client'
import { sendEmail } from '@/lib/email-sender'

// Types pour les métadonnées de notification
export interface NotificationMetadata {
  chantierId?: string
  chantierNom?: string
  metreId?: string
  soustraitantId?: string
  soustraitantNom?: string
  userId?: string
  userName?: string
  remarqueId?: string
  ticketSAVId?: string
  documentId?: string
  montant?: number
  date?: string
  [key: string]: string | number | undefined
}

// Interface pour créer une notification
export interface CreateNotificationParams {
  code: string // Code du type de notification (ex: "METRE_SOUMIS")
  destinataires?: string[] // IDs utilisateurs spécifiques (optionnel)
  rolesDestinataires?: string[] // Rôles des utilisateurs (optionnel)
  metadata?: NotificationMetadata // Données contextuelles
  exclusions?: string[] // IDs utilisateurs à exclure
}

/**
 * Service principal de gestion des notifications
 */
export class NotificationService {
  /**
   * Créer et envoyer une notification
   */
  static async createNotification(params: CreateNotificationParams): Promise<void> {
    try {
      const { code, destinataires, rolesDestinataires, metadata, exclusions = [] } = params

      // Récupérer le type de notification
      const notificationType = await prisma.notificationType.findUnique({
        where: { code, actif: true },
      })

      if (!notificationType) {
        console.warn(`[NOTIFICATION] Type de notification "${code}" non trouvé ou inactif`)
        return
      }

      // Déterminer les destinataires finaux
      let userIds: string[] = []

      // 1. Ajout des destinataires spécifiques
      if (destinataires && destinataires.length > 0) {
        userIds.push(...destinataires)
      }

      // 2. Ajout des utilisateurs par rôle
      if (rolesDestinataires && rolesDestinataires.length > 0) {
        const usersByRole = await prisma.user.findMany({
          where: { role: { in: rolesDestinataires } },
          select: { id: true },
        })
        userIds.push(...usersByRole.map(u => u.id))
      }

      // 3. Si aucun destinataire spécifié, utiliser les rôles par défaut du type
      if (userIds.length === 0 && notificationType.rolesParDefaut) {
        const defaultRoles = notificationType.rolesParDefaut as string[]
        const usersByDefaultRoles = await prisma.user.findMany({
          where: { role: { in: defaultRoles as string[] } },
          select: { id: true },
        })
        userIds.push(...usersByDefaultRoles.map(u => u.id))
      }

      // Retirer les doublons et les exclusions
      userIds = [...new Set(userIds)].filter(id => !exclusions.includes(id))

      if (userIds.length === 0) {
        console.warn(`[NOTIFICATION] Aucun destinataire trouvé pour "${code}"`)
        return
      }

      // Récupérer les configurations utilisateurs
      const userConfigs = await prisma.notificationUserConfig.findMany({
        where: {
          userId: { in: userIds },
          notificationTypeId: notificationType.id,
        },
      })

      const configMap = new Map(userConfigs.map(c => [c.userId, c]))

      // Récupérer les informations complètes des utilisateurs
      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, email: true, name: true, role: true },
      })

      // Générer le contenu de la notification
      const { titre, message } = this.generateNotificationContent(
        notificationType.inAppTemplate || notificationType.libelle,
        metadata
      )

      const lien = this.generateLink(code, metadata)

      // Date d'expiration (30 jours)
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 30)

      // Pour chaque utilisateur
      for (const user of users) {
        const config = configMap.get(user.id) as { activeMail: boolean; activeInApp: boolean } | undefined

        // Si pas de config, utiliser les valeurs par défaut selon le rôle
        const defaultConfig = this.getDefaultConfigForRole(user.role as string)
        const activeMail = config?.activeMail ?? defaultConfig.activeMail
        const activeInApp = config?.activeInApp ?? defaultConfig.activeInApp

        // Créer la notification in-app si activée
        if (activeInApp) {
          await prisma.notification.create({
            data: {
              userId: user.id,
              notificationTypeId: notificationType.id,
              titre,
              message,
              lien,
              metadata: metadata ? (metadata as object) : undefined,
              expiresAt,
            },
          })
        }

        // Envoyer l'email si activé
        if (activeMail && user.email) {
          await this.sendEmailNotification(
            user.email,
            user.name || user.email,
            notificationType,
            titre,
            message,
            lien,
            metadata
          )
        }
      }

      console.log(`[NOTIFICATION] "${code}" envoyée à ${users.length} utilisateur(s)`)
    } catch (error) {
      console.error('[NOTIFICATION] Erreur lors de la création de la notification:', error)
    }
  }

  /**
   * Génère le contenu de la notification en remplaçant les variables
   */
  private static generateNotificationContent(
    template: string,
    metadata?: NotificationMetadata
  ): { titre: string; message: string } {
    if (!metadata) {
      return { titre: template, message: template }
    }

    let content = template

    // Mapping des clés camelCase vers leur équivalent avec underscore pour les templates
    const keyMapping: Record<string, string> = {
      chantierId: 'CHANTIER_ID',
      chantierNom: 'CHANTIER_NOM',
      metreId: 'METRE_ID',
      soustraitantId: 'SOUSTRAITANT_ID',
      soustraitantNom: 'SOUSTRAITANT_NOM',
      userId: 'USER_ID',
      userName: 'USER_NAME',
      remarqueId: 'REMARQUE_ID',
      ticketSAVId: 'TICKET_SAV_ID',
      documentId: 'DOCUMENT_ID',
      montant: 'MONTANT',
      date: 'DATE',
      nom: 'NOM',
      titre: 'TITRE',
      message: 'MESSAGE',
      priorite: 'PRIORITE',
      num: 'NUM',
      nb: 'NB',
      uploader: 'UPLOADER',
      client: 'CLIENT',
      id: 'ID',
    }

    // Remplacer les variables dans le template
    Object.entries(metadata).forEach(([key, value]) => {
      // Essayer d'abord avec le mapping (underscore)
      const mappedKey = keyMapping[key] || key.toUpperCase().replace(/([A-Z])/g, '_$1').substring(1)
      const regex = new RegExp(`\\[${mappedKey}\\]`, 'g')
      content = content.replace(regex, String(value || ''))
      
      // Aussi remplacer avec la clé directe (sans underscore) pour compatibilité
      const directKey = key.toUpperCase()
      const directRegex = new RegExp(`\\[${directKey}\\]`, 'g')
      content = content.replace(directRegex, String(value || ''))
    })

    // Générer un titre court (première ligne ou 80 premiers caractères)
    const titre = content.split('\n')[0].substring(0, 80)
    const message = content

    return { titre, message }
  }

  /**
   * Génère un lien vers la ressource concernée
   */
  private static generateLink(code: string, metadata?: NotificationMetadata): string | undefined {
    if (!metadata) return undefined

    const linkMap: Record<string, string> = {
      // Chantiers
      CHANTIER_CREE: `/chantiers/${metadata.chantierId}`,
      CHANTIER_DEMARRE: `/chantiers/${metadata.chantierId}`,
      CHANTIER_TERMINE: `/chantiers/${metadata.chantierId}`,
      CHANTIER_MODIFIE: `/chantiers/${metadata.chantierId}`,

      // Métrés
      METRE_SOUMIS: `/metres`,
      METRE_VALIDE: `/metres`,
      METRE_REJETE: `/metres`,

      // Réceptions
      RECEPTION_CREEE: `/chantiers/${metadata.chantierId}/reception`,
      RECEPTION_DEADLINE_7J: `/chantiers/${metadata.chantierId}/reception`,
      RECEPTION_FINALISEE: `/chantiers/${metadata.chantierId}/reception`,

      // Remarques
      REMARQUE_CREEE: `/chantiers/${metadata.chantierId}/reception`,
      REMARQUE_RESOLUE: `/chantiers/${metadata.chantierId}/reception`,

      // SAV
      SAV_TICKET_CREE: `/sav/${metadata.ticketSAVId}`,
      SAV_TICKET_ASSIGNE: `/sav/${metadata.ticketSAVId}`,
      SAV_INTERVENTION_PLANIFIEE: `/sav/${metadata.ticketSAVId}`,

      // Bons de régie
      BON_REGIE_CREE: `/bon-regie`,
      
      // Documents
      DOCUMENT_UPLOAD: `/chantiers/${metadata.chantierId}/documents`,
      DOCUMENT_EXPIRE: `/sous-traitants`,
    }

    return linkMap[code]
  }

  /**
   * Envoie un email de notification
   */
  private static async sendEmailNotification(
    email: string,
    name: string,
    notificationType: { emailSubject?: string | null; emailTemplate?: string | null; libelle: string },
    titre: string,
    message: string,
    lien?: string,
    metadata?: NotificationMetadata
  ): Promise<void> {
    try {
      // Remplacer les variables dans le sujet de l'email
      const subjectTemplate = notificationType.emailSubject || titre
      const subject = this.replaceTemplateVariables(subjectTemplate, metadata)
      
      // Template HTML de base si pas de template personnalisé
      const htmlContent = notificationType.emailTemplate 
        ? this.replaceTemplateVariables(notificationType.emailTemplate, metadata)
        : this.generateDefaultEmailTemplate(name, titre, message, lien, await societeEmail())

      await sendEmail(email, subject, htmlContent)
    } catch (error) {
      console.error('[NOTIFICATION] Erreur lors de l\'envoi de l\'email:', error)
    }
  }

  /**
   * Remplace les variables dans un template
   */
  private static replaceTemplateVariables(template: string, metadata?: NotificationMetadata): string {
    if (!metadata) return template

    // Mapping des clés camelCase vers leur équivalent avec underscore pour les templates
    const keyMapping: Record<string, string> = {
      chantierId: 'CHANTIER_ID',
      chantierNom: 'CHANTIER_NOM',
      metreId: 'METRE_ID',
      soustraitantId: 'SOUSTRAITANT_ID',
      soustraitantNom: 'SOUSTRAITANT_NOM',
      userId: 'USER_ID',
      userName: 'USER_NAME',
      remarqueId: 'REMARQUE_ID',
      ticketSAVId: 'TICKET_SAV_ID',
      documentId: 'DOCUMENT_ID',
      montant: 'MONTANT',
      date: 'DATE',
      nom: 'NOM',
      titre: 'TITRE',
      message: 'MESSAGE',
      priorite: 'PRIORITE',
      num: 'NUM',
      nb: 'NB',
      uploader: 'UPLOADER',
      client: 'CLIENT',
      id: 'ID',
    }

    let content = template
    Object.entries(metadata).forEach(([key, value]) => {
      // Essayer d'abord avec le mapping (underscore)
      const mappedKey = keyMapping[key] || key.toUpperCase().replace(/([A-Z])/g, '_$1').substring(1)
      const regex = new RegExp(`\\[${mappedKey}\\]`, 'g')
      content = content.replace(regex, String(value || ''))
      
      // Aussi remplacer avec la clé directe (sans underscore) pour compatibilité
      const directKey = key.toUpperCase()
      const directRegex = new RegExp(`\\[${directKey}\\]`, 'g')
      content = content.replace(directRegex, String(value || ''))
    })
    return content
  }

  /**
   * Génère un template email par défaut
   */
  private static generateDefaultEmailTemplate(
    name: string,
    titre: string,
    message: string,
    lien: string | undefined,
    societe: { nom: string; adresse?: string; tva?: string }
  ): string {
    // Le message est souvent identique au titre : ne pas l'afficher deux fois.
    const detail = message && message.trim() !== titre.trim() ? encadre(texteEnHtml(message)) : ''
    return gabaritEmail({
      titre,
      apercu: message || titre,
      contenuHtml: paragraphe(`Bonjour ${echapperHtml(name)},`) + detail,
      bouton: lien ? { libelle: 'Voir dans OpenBTP', url: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}${lien}` } : undefined,
      mention:
        'Vous recevez cet email car vous êtes inscrit aux notifications de l’application. ' +
        'Préférences : Configuration → Gestion des notifications.',
      societe,
    })
  }

  /**
   * Configuration par défaut selon le rôle
   */
  private static getDefaultConfigForRole(role: string): { activeMail: boolean; activeInApp: boolean } {
    switch (role) {
      case 'ADMIN':
        return { activeMail: true, activeInApp: true }
      case 'MANAGER':
        return { activeMail: true, activeInApp: true }
      case 'USER':
        return { activeMail: false, activeInApp: true }
      case 'BOT':
        return { activeMail: false, activeInApp: false }
      default:
        return { activeMail: false, activeInApp: true }
    }
  }

  /**
   * Marquer une notification comme lue
   */
  static async markAsRead(notificationId: string, userId: string): Promise<void> {
    try {
      await prisma.notification.updateMany({
        where: { id: notificationId, userId },
        data: { estLue: true, dateLue: new Date() },
      })
    } catch (error) {
      console.error('[NOTIFICATION] Erreur lors du marquage comme lu:', error)
    }
  }

  /**
   * Marquer toutes les notifications d'un utilisateur comme lues
   */
  static async markAllAsRead(userId: string): Promise<void> {
    try {
      await prisma.notification.updateMany({
        where: { userId, estLue: false },
        data: { estLue: true, dateLue: new Date() },
      })
    } catch (error) {
      console.error('[NOTIFICATION] Erreur lors du marquage de toutes les notifications:', error)
    }
  }

  /**
   * Supprimer les notifications expirées (à exécuter via cron)
   */
  static async cleanupExpiredNotifications(): Promise<number> {
    try {
      const result = await prisma.notification.deleteMany({
        where: { expiresAt: { lte: new Date() } },
      })
      console.log(`[NOTIFICATION] ${result.count} notification(s) expirée(s) supprimée(s)`)
      return result.count
    } catch (error) {
      console.error('[NOTIFICATION] Erreur lors du nettoyage:', error)
      return 0
    }
  }

  /**
   * Récupérer les notifications d'un utilisateur
   */
  static async getUserNotifications(
    userId: string,
    options: { limit?: number; onlyUnread?: boolean; offset?: number } = {}
  ) {
    const { limit = 20, onlyUnread = false, offset = 0 } = options

    try {
      const notifications = await prisma.notification.findMany({
        where: {
          userId,
          ...(onlyUnread && { estLue: false }),
        },
        include: {
          notificationType: {
            select: {
              code: true,
              libelle: true,
              categorie: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      })

      const total = await prisma.notification.count({
        where: {
          userId,
          ...(onlyUnread && { estLue: false }),
        },
      })

      const unreadCount = await prisma.notification.count({
        where: { userId, estLue: false },
      })

      return {
        notifications,
        total,
        unreadCount,
        hasMore: total > offset + limit,
      }
    } catch (error) {
      console.error('[NOTIFICATION] Erreur lors de la récupération des notifications:', error)
      return {
        notifications: [],
        total: 0,
        unreadCount: 0,
        hasMore: false,
      }
    }
  }
}

// Fonctions helper pour faciliter l'utilisation
export const notifier = NotificationService.createNotification.bind(NotificationService)

