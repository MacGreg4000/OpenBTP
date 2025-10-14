import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Définition d'une interface pour le chat
type Chat = {
  id: string;
  name?: string;
  isGroup: boolean;
  createdAt: Date;
  updatedAt: Date;
  participants: Array<{
    id: string;
    userId: string;
    isAdmin: boolean;
    user?: { id: string; name: string | null; email: string | null } | null;
  }>;
  messages: Array<{
    id: string;
    chatId: string;
    senderId: string;
    content: string | null;
    createdAt: Date;
    read: boolean;
    sender?: { id: string; name: string | null } | null;
  }>;
}

// GET /api/messaging/conversations - Récupérer toutes les conversations de l'utilisateur
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }
    
    const userId = session.user.id;
    
    // Récupérer toutes les conversations où l'utilisateur est participant
    const chats = await prisma.chat.findMany({
      where: {
        participants: {
          some: {
            userId,
          },
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        messages: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 20, // Récupérer les 20 derniers messages au lieu d'un seul
          include: {
            sender: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
    
    // Calculer le nombre de messages non lus pour chaque chat
    const chatsWithUnreadCount = await Promise.all(
      chats.map(async (chat: Chat) => {
        const unreadCount = await prisma.chatMessage.count({
          where: {
            chatId: chat.id,
            senderId: {
              not: userId,
            },
            read: false,
          },
        });
        
        return {
          ...chat,
          unreadCount,
        };
      })
    );
    
    return NextResponse.json(chatsWithUnreadCount);
  } catch (error) {
    console.error('Erreur lors de la récupération des conversations:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST /api/messaging/conversations - Créer une nouvelle conversation
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }
    
    const userId = session.user.id;
    const { participantIds, name, isGroup = false } = await req.json();
    
    // Validation de base
    if (!participantIds || !Array.isArray(participantIds) || participantIds.length === 0) {
      return NextResponse.json({ error: 'Participants requis' }, { status: 400 });
    }
    
    // S'assurer que les ID sont uniques et inclure l'utilisateur actuel
    const uniqueParticipantIds = [...new Set([...participantIds, userId])];
    
    // Pour les chats non-groupe (1:1), vérifier si un chat existe déjà
    if (!isGroup && uniqueParticipantIds.length === 2) {
      const existingChat = await prisma.chat.findFirst({
        where: {
          isGroup: false,
          participants: {
            every: {
              userId: {
                in: uniqueParticipantIds,
              },
            },
          },
          AND: [
            {
              participants: {
                some: {
                  userId: uniqueParticipantIds[0],
                },
              },
            },
            {
              participants: {
                some: {
                  userId: uniqueParticipantIds[1],
                },
              },
            },
          ],
        },
        include: {
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
          messages: {
            take: 20,
            orderBy: {
              createdAt: 'desc',
            },
            include: {
              sender: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });
      
      if (existingChat) {
        // Calculer les messages non lus
        const unreadCount = await prisma.chatMessage.count({
          where: {
            chatId: existingChat.id,
            senderId: {
              not: userId,
            },
            read: false,
          },
        });
        
        return NextResponse.json({
          ...existingChat,
          unreadCount,
          messages: existingChat.messages.reverse(), // Inverser pour ordre chronologique
        });
      }
    }
    
    // Créer un nouveau chat
    const newChat = await prisma.chat.create({
      data: {
        name: isGroup ? name : undefined,
        isGroup,
        participants: {
          create: uniqueParticipantIds.map(pid => ({
            userId: pid,
            isAdmin: pid === userId, // Le créateur est admin
          })),
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });
    
    return NextResponse.json({
      ...newChat,
      messages: [],
      unreadCount: 0,
    });
  } catch (error) {
    console.error('Erreur lors de la création de conversation:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
} 