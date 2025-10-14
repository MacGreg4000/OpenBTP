import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import path from 'path';
import crypto from 'crypto';
import { saveFileToServer, ajouterPhotoAuxDocuments } from '@/lib/fileUploadUtils';
import fs from 'fs'; // Import fs pour suppression de fichiers si nécessaire

// Fonction pour convertir les BigInt en nombre lors de la sérialisation JSON
function formatBigIntValues(data: unknown): unknown {
  if (data === null || data === undefined) {
    return data;
  }
  
  if (typeof data === 'bigint') {
    return Number(data);
  }
  
  if (Array.isArray(data)) {
    return (data as unknown[]).map(formatBigIntValues);
  }
  
  if (typeof data === 'object') {
    const result: Record<string, unknown> = {};
    const obj = data as Record<string, unknown>;
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        result[key] = formatBigIntValues(obj[key]);
      }
    }
    return result;
  }
  
  return data;
}

// PATCH /api/chantiers/[chantierId]/reception/[id]/remarques/[remarqueId]
// Mettre à jour le statut d'une remarque (valider/rejeter)
export async function PATCH(
  request: Request,
  { params }: { 
    params: Promise<{ chantierId: string; id: string; remarqueId: string }> 
  }
) {
  try {
    // Attendre la Promise params
    const resolvedParams = await params;
    const chantierId = resolvedParams.chantierId;
    const receptionId = resolvedParams.id;
    const remarqueId = resolvedParams.remarqueId;
    
    console.log(`PATCH remarque: chantierId=${chantierId}, receptionId=${receptionId}, remarqueId=${remarqueId}`);
    
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      );
    }

    // Vérifier si la remarque existe et appartient à la réception
    const remarque = await prisma.remarqueReception.findUnique({
      where: { id: remarqueId, receptionId: receptionId, reception: { chantierId: chantierId } },
    });

    if (!remarque) {
      return NextResponse.json(
        { error: 'Remarque non trouvée' },
        { status: 404 }
      );
    }

    const body = await request.json();
    console.log('Body reçu:', body);
    
    const { action, raisonRejet } = body;

    // Valider ou rejeter la remarque
    if (action === 'valider') {
      await prisma.remarqueReception.update({
        where: { id: remarqueId },
        data: { estValidee: true, estRejetee: false, updatedAt: new Date() },
      });
      console.log(`Remarque ${remarqueId} validée`);
    } else if (action === 'rejeter') {
      if (!raisonRejet) {
        return NextResponse.json(
          { error: 'La raison du rejet est requise' },
          { status: 400 }
        );
      }

      await prisma.remarqueReception.update({
        where: { id: remarqueId },
        data: { estRejetee: true, estValidee: false, estResolue: false, raisonRejet: raisonRejet, updatedAt: new Date() },
      });
      console.log(`Remarque ${remarqueId} rejetée avec raison: ${raisonRejet}`);
    } else {
      return NextResponse.json(
        { error: 'Action non valide' },
        { status: 400 }
      );
    }

    // Récupérer la remarque mise à jour
    const remarqueUpdated = await prisma.remarqueReception.findUnique({
      where: { id: remarqueId },
      include: { photos: true, tags: true }
    });

    return NextResponse.json(formatBigIntValues(remarqueUpdated));
  } catch (error) {
    console.error('Erreur de mise à jour de remarque (PATCH):', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de la remarque', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// PUT /api/chantiers/[chantierId]/reception/[id]/remarques/[remarqueId]
// Mettre à jour les détails d'une remarque (description, localisation, plan, etc.)
export async function PUT(
  request: Request,
  { params: paramsPromise }: { 
    params: Promise<{ chantierId: string; id: string; remarqueId: string }> 
  }
) {
  try {
    const { chantierId, id: receptionId, remarqueId } = await paramsPromise;

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }
    const userId = session.user.id;

    const existingRemarque = await prisma.remarqueReception.findUnique({
      where: { id: remarqueId, receptionId: receptionId, reception: { chantierId: chantierId } },
      include: { photos: true } // Inclure les photos existantes pour comparaison
    });

    if (!existingRemarque) {
      return NextResponse.json({ error: 'Remarque non trouvée ou non accessible' }, { status: 404 });
    }

    const formData = await request.formData();
    const description = formData.get('description') as string | null;
    const localisation = formData.get('localisation') as string | null;
    const planIdStr = formData.get('planId') as string | null;
    const coordonneesPlanStr = formData.get('coordonneesPlan') as string | null;
    const existingPhotoIdsStr = formData.get('existingPhotoIds') as string | null;
    const newPhotoFiles = formData.getAll('photos') as File[];

    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    if (description !== null) updateData.description = description;
    if (localisation !== null) updateData.localisation = localisation; // Permettre de vider la localisation
    
    if (planIdStr !== null) {
        updateData.planId = planIdStr ? parseInt(planIdStr) : null;
        if (!planIdStr) {
            updateData.coordonneesPlan = null; // Dissocier coords si plan délié
        }
    }

    if (coordonneesPlanStr !== null && updateData.planId !== null) {
        try {
            updateData.coordonneesPlan = JSON.parse(coordonneesPlanStr);
        } catch {
            return NextResponse.json({ error: 'Format JSON invalide pour coordonneesPlan' }, { status: 400 });
        }
    } else if (updateData.planId === null) {
        updateData.coordonneesPlan = null;
    }

    // Début de la transaction Prisma
    const updatedRemarque = await prisma.$transaction(async (tx) => {
      // 1. Mettre à jour les champs simples de la remarque
      await tx.remarqueReception.update({
        where: { id: remarqueId },
        data: updateData,
      });

      // 2. Gérer les photos existantes
      const keptPhotoIds = existingPhotoIdsStr ? JSON.parse(existingPhotoIdsStr) as string[] : [];
      const photosToDelete = existingRemarque.photos.filter(p => !keptPhotoIds.includes(p.id));

      for (const photo of photosToDelete) {
        await tx.photoRemarque.delete({ where: { id: photo.id } });
        // Optionnel: supprimer le fichier du disque
        const filePathToDelete = path.join(process.cwd(), 'public', photo.url);
        try {
          if (fs.existsSync(filePathToDelete)) {
            await fs.promises.unlink(filePathToDelete);
            console.log(`Fichier supprimé: ${filePathToDelete}`);
          }
        } catch (fileError) {
          console.error(`Erreur suppression fichier ${filePathToDelete}:`, fileError);
        }
        // Supprimer également des documents du chantier si elle y était liée
        // Cette logique peut être complexe si une photo est partagée ou si sa suppression doit être tracée.
        // Pour l'instant, on se concentre sur la suppression de PhotoRemarque.
      }

      // 3. Gérer les nouvelles photos
      const descriptionPourNouvellesPhotos = description || existingRemarque.description; // Utiliser la nouvelle description ou l'ancienne

      for (const photoFile of newPhotoFiles) {
        if (photoFile instanceof File) {
          const photoId = crypto.randomUUID();
          const fileExtension = path.extname(photoFile.name) || '.jpg';
          const fileName = `${photoId}${fileExtension}`;
          const uploadDir = path.join(process.cwd(), 'public', 'uploads', chantierId, receptionId);
          const filePath = path.join(uploadDir, fileName);
          
          await saveFileToServer(photoFile, filePath);
          const photoUrl = `/uploads/${chantierId}/${receptionId}/${fileName}`;

          await tx.photoRemarque.create({
            data: {
              id: photoId,
              remarqueId: remarqueId,
              url: photoUrl,
              estPreuve: false, // Par défaut, les nouvelles photos ne sont pas des preuves ici
              createdAt: new Date(),
            }
          });

          await ajouterPhotoAuxDocuments(chantierId, remarqueId, photoUrl, descriptionPourNouvellesPhotos, userId, false);
        }
      }
      
      // Retourner la remarque mise à jour avec toutes ses relations
      return tx.remarqueReception.findUnique({
        where: { id: remarqueId },
        include: { photos: true, tags: true },
      });
    });

    return NextResponse.json(formatBigIntValues(updatedRemarque));

  } catch (error) {
    console.error('Erreur de mise à jour de remarque (PUT):', error);
    if (error instanceof SyntaxError && error.message.includes("JSON")) {
        return NextResponse.json({ error: 'Données JSON invalides dans la requête' }, { status: 400 });
    }
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de la remarque', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// DELETE /api/chantiers/[chantierId]/reception/[id]/remarques/[remarqueId]
// Supprimer une remarque (réservé aux admin et managers)
export async function DELETE(
  request: Request,
  { params: paramsPromise }: { 
    params: Promise<{ chantierId: string; id: string; remarqueId: string }> 
  }
) {
  try {
    const { chantierId, id: receptionId, remarqueId } = await paramsPromise;
    
    const session = await getServerSession(authOptions);
    // Vérifier si l'utilisateur est admin ou manager
    if (!session?.user?.role || (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER')) {
      return NextResponse.json(
        { error: 'Non autorisé ou droits insuffisants' },
        { status: 403 }
      );
    }

    // Récupérer la remarque avec ses photos pour suppression des fichiers
    const remarqueToDelete = await prisma.remarqueReception.findUnique({
      where: {
        id: remarqueId,
        receptionId: receptionId,
        reception: {
          chantierId: chantierId,
        },
      },
      include: { photos: true }, // Inclure les photos pour les supprimer du disque
    });

    if (!remarqueToDelete) {
      return NextResponse.json(
        { error: 'Remarque non trouvée ou non accessible' },
        { status: 404 }
      );
    }

    // Supprimer les fichiers photo associés du disque
    for (const photo of remarqueToDelete.photos) {
      if (photo.url) { // S'assurer qu'il y a une URL
        const filePathToDelete = path.join(process.cwd(), 'public', photo.url);
        try {
          if (fs.existsSync(filePathToDelete)) {
            await fs.promises.unlink(filePathToDelete);
            console.log(`Fichier photo supprimé du disque: ${filePathToDelete}`);
          }
        } catch (fileError) {
          console.error(`Erreur lors de la suppression du fichier photo ${filePathToDelete}:`, fileError);
          // Continuer même si la suppression du fichier échoue, pour supprimer les refs DB
        }
      }
    }
    
    // Supprimer la remarque de la base de données.
    // Prisma devrait gérer la suppression en cascade des PhotoRemarque et TagRemarque liées
    // grâce aux définitions onDelete: Cascade dans le schéma.
    await prisma.remarqueReception.delete({
      where: { id: remarqueId },
    });

    return NextResponse.json({ message: 'Remarque supprimée avec succès' });

  } catch (error) {
    console.error('Erreur de suppression de remarque (DELETE):', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression de la remarque', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 