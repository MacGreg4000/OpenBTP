import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma/client';
import fs from 'fs/promises';
import path from 'path';

/**
 * GET /api/chantiers/[chantierId]/photos-externes
 * Récupère les photos externes d'un chantier (pour l'interface interne)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ chantierId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { chantierId } = await params;

    // Vérifier que le chantier existe
    const chantier = await prisma.chantier.findUnique({
      where: { chantierId },
      select: { id: true, chantierId: true, nomChantier: true }
    });

    if (!chantier) {
      return NextResponse.json(
        { error: 'Chantier non trouvé' },
        { status: 404 }
      );
    }

    // Récupérer les photos externes du chantier
    const photosExternes = await prisma.photoExterne.findMany({
      where: {
        chantierId: chantier.chantierId
      },
      orderBy: {
        dateUpload: 'desc'
      }
    });

    // Formater les données pour l'affichage
    const photosFormatees = photosExternes.map(photo => ({
      id: photo.id,
      uploadedByName: photo.uploadedByName,
      uploadedBy: photo.uploadedBy,
      uploadedByType: photo.uploadedByType,
      uploadedByTypeLibelle: photo.uploadedByType === 'OUVRIER_INTERNE' ? 'Ouvrier interne' : 'Sous-traitant',
      isManual: photo.uploadedBy && photo.uploadedBy.startsWith('user_'), // Photo manuelle si uploadedBy commence par 'user_'
      urls: JSON.parse(photo.urls),
      description: photo.description,
      dateUpload: photo.dateUpload?.toISOString(),
      createdAt: photo.createdAt.toISOString()
    }));

    return NextResponse.json({
      success: true,
      chantier: {
        id: chantier.chantierId,
        chantierId,
        nomChantier: chantier.nomChantier
      },
      photos: photosFormatees
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des photos externes:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des photos externes' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/chantiers/[chantierId]/photos-externes
 * Supprime une photo externe
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ chantierId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { chantierId } = await params;
    const { photoId } = await request.json();

    if (!photoId) {
      return NextResponse.json(
        { error: 'ID de photo requis' },
        { status: 400 }
      );
    }

    // Vérifier que le chantier existe
    const chantier = await prisma.chantier.findUnique({
      where: { chantierId },
      select: { id: true, chantierId: true, nomChantier: true }
    });

    if (!chantier) {
      return NextResponse.json(
        { error: 'Chantier non trouvé' },
        { status: 404 }
      );
    }

    // Récupérer la photo à supprimer
    const photo = await prisma.photoExterne.findFirst({
      where: {
        id: photoId,
        chantierId: chantier.chantierId
      }
    });

    if (!photo) {
      return NextResponse.json(
        { error: 'Photo non trouvée' },
        { status: 404 }
      );
    }

    // Supprimer les fichiers physiques
    try {
      const urls = JSON.parse(photo.urls);
      for (const url of urls) {
        // Extraire le chemin du fichier depuis l'URL
        const urlParts = url.split('/');
        const fileName = urlParts[urlParts.length - 1];
        const filePath = path.join(process.cwd(), 'public', 'uploads', 'photos-externes', fileName);
        
        try {
          // Vérifier si le fichier existe avant de tenter de le supprimer
          await fs.access(filePath);
          await fs.unlink(filePath);
          console.log(`Fichier supprimé: ${filePath}`);
        } catch (fileError: unknown) {
          if ((fileError as { code?: string }).code === 'ENOENT') {
            console.log(`Fichier déjà supprimé ou inexistant: ${filePath}`);
          } else {
            console.warn(`Impossible de supprimer le fichier ${filePath}:`, fileError);
          }
          // Continuer même si un fichier ne peut pas être supprimé
        }
      }
    } catch (fileError) {
      console.warn('Erreur lors de la suppression des fichiers:', fileError);
      // Continuer même si les fichiers ne peuvent pas être supprimés
    }

    // Supprimer l'enregistrement de la base de données
    await prisma.photoExterne.delete({
      where: {
        id: photoId
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Photo supprimée avec succès'
    });

  } catch (error) {
    console.error('Erreur lors de la suppression de la photo:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression de la photo' },
      { status: 500 }
    );
  }
}
