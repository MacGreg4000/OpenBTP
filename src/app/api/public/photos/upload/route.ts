import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { readPortalSessionFromCookie, unauthorized } from '@/app/public/portail/auth';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { validateImageFile } from '@/lib/utils/image-validation';

// Chemin de base pour les photos externes
const PHOTOS_BASE_PATH = join(process.cwd(), 'public', 'uploads', 'photos-externes');

/**
 * POST /api/public/photos/upload
 * Upload de photos par les utilisateurs externes (ouvriers et sous-traitants)
 */
export async function POST(request: NextRequest) {
  const portalSession = readPortalSessionFromCookie(request.headers.get('cookie'))
  if (!portalSession) return unauthorized()

  try {
    const formData = await request.formData();
    
    // Récupérer les données du formulaire
    const chantierId = formData.get('chantierId') as string;
    const uploadedBy = formData.get('uploadedBy') as string;
    const uploadedByType = formData.get('uploadedByType') as 'OUVRIER_INTERNE' | 'SOUSTRAITANT';
    const uploadedByName = formData.get('uploadedByName') as string;
    const description = formData.get('description') as string | null;
    const files = formData.getAll('photos') as File[];

    // Validation des données
    if (!chantierId || !uploadedBy || !uploadedByType || !uploadedByName || !files || files.length === 0) {
      return NextResponse.json(
        { error: 'Données manquantes' },
        { status: 400 }
      );
    }

    // Vérifier que l'utilisateur upload pour lui-même uniquement
    if (portalSession.id !== uploadedBy) {
      return unauthorized()
    }

    // Vérifier que le chantier existe
    const chantier = await prisma.chantier.findUnique({
      where: { chantierId },
      select: { id: true, chantierId: true, nomChantier: true, statut: true }
    });

    if (!chantier) {
      return NextResponse.json(
        { error: 'Chantier non trouvé' },
        { status: 404 }
      );
    }

    // Vérifier que le chantier est actif
    if (!['EN_COURS', 'EN_PREPARATION'].includes(chantier.statut)) {
      return NextResponse.json(
        { error: 'Le chantier n\'est pas actif' },
        { status: 400 }
      );
    }

    // Limite de photos (20 max par envoi)
    if (files.length > 20) {
      return NextResponse.json(
        { error: 'Maximum 20 photos par envoi' },
        { status: 400 }
      );
    }

    // Créer le dossier pour ce chantier s'il n'existe pas
    const chantierFolder = `chantier-${chantierId}`;
    const fullPath = join(PHOTOS_BASE_PATH, chantierFolder);
    await mkdir(fullPath, { recursive: true });

    const uploadedUrls: string[] = [];
    const timestamp = Date.now();

    // Traiter chaque fichier
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Vérifier le type de fichier (Content-Type client, première barrière)
      // + magic bytes réels (seconde barrière, non falsifiable)
      const validation = await validateImageFile(file);
      if (!validation.isValid) continue;

      // Vérifier la taille (5MB max par photo)
      if (file.size > 5 * 1024 * 1024) {
        continue; // Ignorer les fichiers trop volumineux
      }

      // Générer un nom de fichier unique avec extension sécurisée
      const fileName = `photo-${timestamp}-${i + 1}.${validation.safeExtension}`;
      const filePath = join(fullPath, fileName);

      // Convertir le fichier en buffer et l'écrire
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      await writeFile(filePath, buffer);

      // Ajouter l'URL relative à la liste
      const relativeUrl = `/uploads/photos-externes/${chantierFolder}/${fileName}`;
      uploadedUrls.push(relativeUrl);
    }

    if (uploadedUrls.length === 0) {
      return NextResponse.json(
        { error: 'Aucune photo valide n\'a été uploadée' },
        { status: 400 }
      );
    }

    // Sauvegarder en base de données
    const photoExterne = await prisma.photoExterne.create({
      data: {
        chantierId: chantier.chantierId, // Utiliser chantierId (string) au lieu de id (UUID)
        uploadedBy,
        uploadedByType,
        uploadedByName,
        urls: JSON.stringify(uploadedUrls),
        description,
        dateUpload: new Date()
      }
    });

    // Envoyer une notification dans le chat du chantier
    try {
      await sendChatNotification(chantier.chantierId, chantier.nomChantier, uploadedByName, uploadedByType, uploadedUrls.length);
    } catch (error) {
      console.error('Erreur lors de l\'envoi de la notification chat:', error);
      // Ne pas faire échouer l'upload pour une erreur de notification
    }

    return NextResponse.json({
      success: true,
      photoId: photoExterne.id,
      uploadedCount: uploadedUrls.length,
      message: `${uploadedUrls.length} photo(s) uploadée(s) avec succès`
    });

  } catch (error) {
    console.error('Erreur lors de l\'upload des photos:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'upload des photos' },
      { status: 500 }
    );
  }
}

/**
 * Envoie une notification dans le chat du chantier
 */
async function sendChatNotification(
  chantierId: string, 
  nomChantier: string, 
  uploadedByName: string, 
  uploadedByType: string, 
  photoCount: number
) {
  try {
    // Trouver ou créer un chat pour ce chantier
    let chat = await prisma.chat.findFirst({
      where: {
        name: `Chat - ${nomChantier}`,
        isGroup: true
      }
    });

    if (!chat) {
      // Créer un nouveau chat pour le chantier
      chat = await prisma.chat.create({
        data: {
          name: `Chat - ${nomChantier}`,
          isGroup: true
        }
      });
    }

    // Trouver l'utilisateur système (ou créer un bot pour les notifications)
    let systemUser = await prisma.user.findFirst({
      where: { role: 'BOT' }
    });

    if (!systemUser) {
      systemUser = await prisma.user.create({
        data: {
          id: 'system-bot',
          email: 'system@secotech.fr',
          password: 'system',
          role: 'BOT',
          name: 'Système',
          updatedAt: new Date()
        }
      });
    }

    // Créer le message de notification
    const messageContent = `📸 **Nouvelles photos ajoutées**
• ${photoCount} photo(s) envoyée(s) par **${uploadedByName}** (${uploadedByType === 'OUVRIER_INTERNE' ? 'Ouvrier interne' : 'Sous-traitant'})
• Date: ${format(new Date(), 'dd/MM/yyyy à HH:mm', { locale: fr })}
• 📁 [Voir toutes les photos du chantier](/chantiers/${chantierId})`;

    await prisma.chatMessage.create({
      data: {
        chatId: chat.id,
        senderId: systemUser.id,
        content: messageContent
      }
    });

    console.log('✅ Notification chat envoyée pour les photos uploadées');
  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi de la notification chat:', error);
    throw error;
  }
}
