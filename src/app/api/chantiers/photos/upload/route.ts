import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma/client';
import fs from 'fs/promises';
import path from 'path';
import { notifier } from '@/lib/services/notificationService';

/**
 * POST /api/chantiers/photos/upload
 * Upload de photos manuelles pour un chantier
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const formData = await request.formData();
    const files = formData.getAll('photos') as File[];
    const description = formData.get('description') as string;
    const chantierId = formData.get('chantierId') as string;

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'Aucune photo fournie' },
        { status: 400 }
      );
    }

    if (!chantierId) {
      return NextResponse.json(
        { error: 'ID de chantier requis' },
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

    // Créer le dossier de destination s'il n'existe pas
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'photos-manuelles');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
    } catch (error) {
      console.error('Erreur lors de la création du dossier:', error);
    }

    const uploadedUrls: string[] = [];
    const timestamp = Date.now();

    // Traiter chaque fichier
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Vérifier le type de fichier
      if (!file.type.startsWith('image/')) {
        continue; // Ignorer les fichiers non-images
      }

      // Vérifier la taille (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        continue; // Ignorer les fichiers trop volumineux
      }

      try {
        // Générer un nom de fichier unique
        const fileExtension = path.extname(file.name);
        const fileName = `photo-manuelle-${timestamp}-${i + 1}${fileExtension}`;
        const filePath = path.join(uploadDir, fileName);

        // Convertir le fichier en buffer et l'écrire
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        await fs.writeFile(filePath, buffer);

        // Ajouter l'URL à la liste
        const url = `/uploads/photos-manuelles/${fileName}`;
        uploadedUrls.push(url);

        console.log(`Photo manuelle uploadée: ${fileName}`);
      } catch (fileError) {
        console.error(`Erreur lors de l'upload du fichier ${file.name}:`, fileError);
        // Continuer avec les autres fichiers
      }
    }

    if (uploadedUrls.length === 0) {
      return NextResponse.json(
        { error: 'Aucune photo valide n\'a pu être uploadée' },
        { status: 400 }
      );
    }

    // Créer l'enregistrement en base de données
    try {
      const photoManuelle = await prisma.photoExterne.create({
        data: {
          chantierId: chantier.chantierId,
          uploadedByName: session.user.name || 'Utilisateur interne',
          uploadedBy: session.user.id,
          uploadedByType: 'OUVRIER_INTERNE',
          urls: JSON.stringify(uploadedUrls),
          description: description || null,
          dateUpload: new Date(),
        }
      });

      console.log(`Photos manuelles créées en base: ${uploadedUrls.length} photos`);

      // 🔔 NOTIFICATION : Photos uploadées
      await notifier({
        code: 'PHOTOS_UPLOADEES',
        rolesDestinataires: ['ADMIN', 'MANAGER'],
        metadata: {
          chantierId: chantier.chantierId,
          chantierNom: chantier.nomChantier,
          nb: uploadedUrls.length.toString(),
          uploader: session.user.name || session.user.email || 'Un utilisateur',
        },
      })

      return NextResponse.json({
        success: true,
        message: `${uploadedUrls.length} photo(s) uploadée(s) avec succès`,
        uploadedCount: uploadedUrls.length,
        photoId: photoManuelle.id,
        urls: uploadedUrls
      });

    } catch (dbError) {
      console.error('Erreur lors de la création en base de données:', dbError);
      
      // Nettoyer les fichiers uploadés en cas d'erreur en base
      for (const url of uploadedUrls) {
        try {
          const fileName = path.basename(url);
          const filePath = path.join(uploadDir, fileName);
          await fs.unlink(filePath);
        } catch (cleanupError) {
          console.error('Erreur lors du nettoyage:', cleanupError);
        }
      }

      return NextResponse.json(
        { error: 'Erreur lors de l\'enregistrement en base de données' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Erreur lors de l\'upload des photos manuelles:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'upload des photos' },
      { status: 500 }
    );
  }
}
