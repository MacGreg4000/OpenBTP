import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma/client';
import { unlink } from 'fs/promises';
import { join } from 'path';

/**
 * DELETE /api/photos-externes/[photoId]
 * Supprime une photo externe (pour les gestionnaires)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ photoId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // Vérifier que l'utilisateur a les droits (MANAGER ou ADMIN)
    if (!['ADMIN', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Permissions insuffisantes' },
        { status: 403 }
      );
    }

    const { photoId } = await params;

    // Récupérer la photo externe avec les informations du chantier
    const photoExterne = await prisma.photoExterne.findUnique({
      where: { id: photoId },
      include: {
        chantier: {
          select: {
            chantierId: true,
            nomChantier: true
          }
        }
      }
    });

    if (!photoExterne) {
      return NextResponse.json(
        { error: 'Photo non trouvée' },
        { status: 404 }
      );
    }

    // Supprimer les fichiers physiques
    try {
      const urls = JSON.parse(photoExterne.urls) as string[];
      
      for (const url of urls) {
        const filePath = join(process.cwd(), 'public', url);
        try {
          await unlink(filePath);
          console.log('✅ Fichier supprimé:', filePath);
        } catch (error) {
          console.warn('⚠️ Impossible de supprimer le fichier:', filePath, error);
          // Continuer même si un fichier ne peut pas être supprimé
        }
      }
    } catch (error) {
      console.error('Erreur lors de la suppression des fichiers:', error);
      // Continuer avec la suppression en base même si les fichiers ne sont pas supprimés
    }

    // Supprimer l'entrée en base de données
    await prisma.photoExterne.delete({
      where: { id: photoId }
    });

    console.log('✅ Photo externe supprimée:', {
      photoId,
      chantier: photoExterne.chantier.nomChantier,
      uploadedBy: photoExterne.uploadedByName
    });

    return NextResponse.json({
      success: true,
      message: 'Photo supprimée avec succès'
    });

  } catch (error) {
    console.error('Erreur lors de la suppression de la photo externe:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression de la photo' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/photos-externes/[photoId]
 * Récupère les détails d'une photo externe
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ photoId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { photoId } = await params;

    const photoExterne = await prisma.photoExterne.findUnique({
      where: { id: photoId },
      include: {
        chantier: {
          select: {
            chantierId: true,
            nomChantier: true
          }
        }
      }
    });

    if (!photoExterne) {
      return NextResponse.json(
        { error: 'Photo non trouvée' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      photo: {
        id: photoExterne.id,
        uploadedByName: photoExterne.uploadedByName,
        uploadedByType: photoExterne.uploadedByType,
        uploadedByTypeLibelle: photoExterne.uploadedByType === 'OUVRIER_INTERNE' ? 'Ouvrier interne' : 'Sous-traitant',
        urls: JSON.parse(photoExterne.urls),
        description: photoExterne.description,
        dateUpload: photoExterne.dateUpload,
        createdAt: photoExterne.createdAt,
        chantier: photoExterne.chantier
      }
    });

  } catch (error) {
    console.error('Erreur lors de la récupération de la photo externe:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération de la photo' },
      { status: 500 }
    );
  }
}


