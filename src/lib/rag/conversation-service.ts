import { prisma } from '@/lib/prisma/client';

export interface RAGMessage {
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
  metadata?: {
    confidence?: number;
    sources?: number;
    processingTime?: number;
    ragResponse?: Record<string, unknown>;
    error?: boolean;
  };
}

export class RAGConversationService {
  private static readonly MAX_MESSAGES_PER_CONVERSATION = 20; // 10 Q&A pairs (réduit pour éviter les erreurs de taille)

  // Charger la conversation de l'utilisateur
  static async loadUserConversation(userId: string): Promise<RAGMessage[]> {
    try {
      const conversation = await prisma.ragConversation.findFirst({
        where: { userId },
        orderBy: { updatedAt: 'desc' }
      });

      if (!conversation) {
        return [];
      }

      return JSON.parse(conversation.messages) as RAGMessage[];
    } catch (error) {
      console.error('Erreur lors du chargement de la conversation:', error);
      return [];
    }
  }

  // Sauvegarder la conversation de l'utilisateur
  static async saveUserConversation(userId: string, messages: RAGMessage[]): Promise<void> {
    try {
      // Limiter à 20 messages (10 paires Q&A) et tronquer les messages trop longs
      const limitedMessages = messages.slice(-this.MAX_MESSAGES_PER_CONVERSATION).map(msg => ({
        ...msg,
        content: msg.content.length > 1000 ? msg.content.substring(0, 1000) + '...' : msg.content
      }));

      // Chercher une conversation existante
      const existingConversation = await prisma.ragConversation.findFirst({
        where: { userId },
        orderBy: { updatedAt: 'desc' }
      });

      if (existingConversation) {
        // Mettre à jour la conversation existante
        await prisma.ragConversation.update({
          where: { id: existingConversation.id },
          data: {
            messages: JSON.stringify(limitedMessages),
            updatedAt: new Date()
          }
        });
      } else {
        // Créer une nouvelle conversation
        await prisma.ragConversation.create({
          data: {
            userId,
            messages: JSON.stringify(limitedMessages)
          }
        });
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de la conversation:', error);
    }
  }

  // Ajouter un message à la conversation
  static async addMessage(userId: string, message: RAGMessage): Promise<void> {
    try {
      const currentMessages = await this.loadUserConversation(userId);
      const updatedMessages = [...currentMessages, message];
      await this.saveUserConversation(userId, updatedMessages);
    } catch (error) {
      console.error('Erreur lors de l\'ajout du message:', error);
    }
  }

  // Effacer la conversation de l'utilisateur
  static async clearUserConversation(userId: string): Promise<void> {
    try {
      await prisma.ragConversation.deleteMany({
        where: { userId }
      });
    } catch (error) {
      console.error('Erreur lors de l\'effacement de la conversation:', error);
    }
  }

  // Obtenir les statistiques des conversations
  static async getConversationStats(): Promise<{
    totalConversations: number;
    totalUsers: number;
    lastActivity: Date | null;
  }> {
    try {
      const [totalConversations, totalUsers, lastActivity] = await Promise.all([
        prisma.ragConversation.count(),
        prisma.ragConversation.groupBy({
          by: ['userId'],
          _count: { userId: true }
        }).then(result => result.length),
        prisma.ragConversation.findFirst({
          orderBy: { updatedAt: 'desc' },
          select: { updatedAt: true }
        }).then(result => result?.updatedAt || null)
      ]);

      return {
        totalConversations,
        totalUsers,
        lastActivity
      };
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques:', error);
      return {
        totalConversations: 0,
        totalUsers: 0,
        lastActivity: null
      };
    }
  }
}

