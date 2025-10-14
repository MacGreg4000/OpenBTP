import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
// import fs from 'fs';
import path from 'path';
import { mkdir, writeFile } from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';

// GET /api/messaging/messages?chatId=xxx - Récupérer les messages d'une conversation
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }
    
    const userId = session.user.id;
    const { searchParams } = new URL(req.url);
    const chatId = searchParams.get('chatId');
    
    if (!chatId) {
      return NextResponse.json({ error: 'ID de chat requis' }, { status: 400 });
    }
    
    // Vérifier que l'utilisateur est bien participant de cette conversation
    const isParticipant = await prisma.chatParticipant.findUnique({
      where: {
        chatId_userId: {
          chatId,
          userId,
        },
      },
    });
    
    if (!isParticipant) {
      return NextResponse.json({ error: 'Non autorisé pour ce chat' }, { status: 403 });
    }
    
    // Récupérer les messages, les plus récents en premier
    const messages = await prisma.chatMessage.findMany({
      where: {
        chatId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      take: 100, // Limite raisonnable
    });
    
    // Marquer les messages comme lus pour cet utilisateur
    await prisma.chatMessage.updateMany({
      where: {
        chatId,
        senderId: {
          not: userId,
        },
        read: false,
      },
      data: {
        read: true,
      },
    });
    
    // Mettre à jour lastReadAt pour cet utilisateur
    await prisma.chatParticipant.update({
      where: {
        chatId_userId: {
          chatId,
          userId,
        },
      },
      data: {
        lastReadAt: new Date(),
      },
    });
    
    return NextResponse.json(messages.reverse()); // Renvoyer dans l'ordre chronologique
  } catch (error) {
    console.error('Erreur lors de la récupération des messages:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST /api/messaging/messages - Envoyer un nouveau message
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }
    
    const userId = session.user.id;
    
    // Vérifier si la requête contient un formulaire avec fichier
    if (req.headers.get('content-type')?.includes('multipart/form-data')) {
      const formData = await req.formData();
      const content = formData.get('content') as string;
      const chatId = formData.get('chatId') as string;
      const file = formData.get('file') as File;
      
      if (!chatId) {
        return NextResponse.json({ error: 'ID de chat requis' }, { status: 400 });
      }
      
      // Vérifier que l'utilisateur est participant
      const isParticipant = await prisma.chatParticipant.findUnique({
        where: {
          chatId_userId: {
            chatId,
            userId,
          },
        },
      });
      
      if (!isParticipant) {
        return NextResponse.json({ error: 'Non autorisé pour ce chat' }, { status: 403 });
      }
      
      // Gérer le fichier si présent
      let fileUrl = null;
      let fileName = null;
      let fileType = null;
      
      if (file) {
        // Créer le dossier de stockage s'il n'existe pas
        const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'chat');
        
        try {
          await mkdir(uploadDir, { recursive: true });
        } catch (err) {
          console.error('Erreur lors de la création du dossier:', err);
        }
        
        // Générer un nom de fichier unique
        const uniqueFilename = `${uuidv4()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        const filePath = path.join(uploadDir, uniqueFilename);
        
        // Lire le contenu du fichier
        const fileBuffer = Buffer.from(await file.arrayBuffer());
        
        // Écrire le fichier
        await writeFile(filePath, fileBuffer);
        
        // Construire l'URL publique
        fileUrl = `/uploads/chat/${uniqueFilename}`;
        fileName = file.name;
        fileType = file.type;
      }
      
      // Créer le message
      const message = await prisma.chatMessage.create({
        data: {
          chatId,
          senderId: userId,
          content: content || '',
          fileUrl,
          fileName,
          fileType,
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });
      
      // Mettre à jour la date de la conversation
      await prisma.chat.update({
        where: {
          id: chatId,
        },
        data: {
          updatedAt: new Date(),
        },
      });
      
      return NextResponse.json(message);
    } else {
      // Traitement standard JSON
      const { content, chatId } = await req.json();
      
      if (!chatId) {
        return NextResponse.json({ error: 'ID de chat requis' }, { status: 400 });
      }
      
      if (!content || content.trim() === '') {
        return NextResponse.json({ error: 'Contenu requis' }, { status: 400 });
      }
      
      // Vérifier que l'utilisateur est participant
      const isParticipant = await prisma.chatParticipant.findUnique({
        where: {
          chatId_userId: {
            chatId,
            userId,
          },
        },
      });
      
      if (!isParticipant) {
        return NextResponse.json({ error: 'Non autorisé pour ce chat' }, { status: 403 });
      }
      
      // Créer le message
      const message = await prisma.chatMessage.create({
        data: {
          chatId,
          senderId: userId,
          content,
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });
      
      // Mettre à jour la date de la conversation
      await prisma.chat.update({
        where: {
          id: chatId,
        },
        data: {
          updatedAt: new Date(),
        },
      });
      
      return NextResponse.json(message);
    }
  } catch (error) {
    console.error('Erreur lors de l\'envoi du message:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
} 