import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { v4 as uuidv4 } from 'uuid'
import fs from 'fs'
import path from 'path'

// Fonction pour ajouter automatiquement une photo de remarque dans les documents du chantier
async function ajouterPhotoAuxDocuments(chantierId: string, remarqueId: string, photoUrl: string, estPreuve: boolean, userId: string = 'system') {
  try {
    // Récupérer la description de la remarque
    const remarque = await prisma.remarqueReception.findUnique({
      where: { id: remarqueId }
    });
    
    if (!remarque) {
      console.error(`Remarque non trouvée pour l'ID: ${remarqueId}`);
      return;
    }
    
    // Récupérer le nom du fichier à partir de l'URL
    const fileName = path.basename(photoUrl);
    
    // Récupérer la taille et le type du fichier (valeurs par défaut si non déterminables)
    const fileSize = 1000000; // Taille par défaut (1MB)
    const mimeType = 'image/jpeg'; // Type MIME par défaut
    
    // Créer les métadonnées avec l'annotation indiquant que c'est une photo de remarque
    const metadata = {
      annotation: remarque.description,
      origine: 'remarque',
      remarqueId: remarqueId,
      estPreuve: estPreuve,
      tags: ['Photo de chantier', estPreuve ? 'Preuve de résolution' : '']
    };
    
    // Créer l'entrée document dans la base de données
    await prisma.document.create({
      data: {
        nom: `${estPreuve ? 'Preuve résolution' : 'Photo'} - ${fileName}`,
        type: 'photo-chantier',
        url: photoUrl,
        taille: fileSize,
        mimeType: mimeType,
        chantierId: chantierId,
        createdBy: userId,
        updatedAt: new Date(),
        metadata: metadata
      }
    });
    
    console.log(`Photo ${estPreuve ? 'de preuve' : ''} ajoutée aux documents: ${photoUrl}`);
  } catch (error) {
    console.error('Erreur lors de l\'ajout de la photo aux documents:', error);
    // On continue même en cas d'erreur pour ne pas bloquer le processus principal
  }
}

// PATCH /api/public/reception/remarque
// Marquer une remarque comme résolue et ajouter une photo de preuve
export async function PATCH(request: Request) {
  try {
    const formData = await request.formData()
    const remarqueId = formData.get('remarqueId')?.toString()
    const codePIN = formData.get('codePIN')?.toString()
    void formData.get('commentaire')?.toString()
    const photo = formData.get('photo') as File | null

    if (!remarqueId || !codePIN) {
      return NextResponse.json(
        { error: 'Données manquantes' },
        { status: 400 }
      )
    }

    // Vérifier que le code PIN est valide et correspond à une réception active
    type ReceptionRow = { receptionId: number; chantierId: string; remarqueId: string; estValidee: number | boolean };
    const reception = await prisma.$queryRaw<ReceptionRow[]>`
      SELECT 
        rc.id as receptionId, 
        rc.chantierId, 
        rr.id as remarqueId, 
        rr.estValidee
      FROM reception_chantier rc
      JOIN remarque_reception rr ON rc.id = rr.receptionId
      WHERE rc.codePIN = ${codePIN}
      AND rc.estFinalise = 0
      AND rr.id = ${remarqueId}
      LIMIT 1
    `

    if (!reception || reception.length === 0) {
      return NextResponse.json(
        { error: 'Code PIN invalide ou remarque non trouvée' },
        { status: 404 }
      )
    }

    const remarque = reception[0]
    if (remarque.estValidee === 1) {
      return NextResponse.json(
        { error: 'Cette remarque a déjà été validée' },
        { status: 400 }
      )
    }

    // Mettre à jour la remarque comme résolue
    await prisma.$executeRaw`
      UPDATE remarque_reception
      SET estResolue = 1, dateResolution = NOW()
      WHERE id = ${remarqueId}
    `

    // Si une photo de preuve a été fournie, l'enregistrer et ajouter à la base de données
    if (photo) {
      try {
        const photoId = uuidv4(); // Générer un UUID côté serveur
        const chantierId = remarque.chantierId;
        
        // Chemin dans public/uploads où seront stockées les photos
        const uploadPath = path.join('uploads', 'receptions');
        const publicDir = path.join(process.cwd(), 'public');
        const uploadDir = path.join(publicDir, uploadPath);
        
        // S'assurer que le dossier de destination existe
        await fs.promises.mkdir(uploadDir, { recursive: true });
        
        // Nom du fichier avec timestamp et extension
        const fileName = `resolution-${Date.now()}-${photoId.substring(0, 8)}.jpg`;
        const filePath = path.join(uploadDir, fileName);
        
        // Convertir le blob en buffer et enregistrer le fichier
        const arrayBuffer = await photo.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        await fs.promises.writeFile(filePath, buffer);
        
        // URL relative pour l'accès depuis le navigateur
        const photoUrl = `/${uploadPath}/${fileName}`;
        
        // Insérer dans la base de données avec l'UUID généré
        await prisma.$executeRaw`
          INSERT INTO photo_remarque (id, remarqueId, url, estPreuve, createdAt)
          VALUES (${photoId}, ${remarqueId}, ${photoUrl}, 1, NOW())
        `;
        
        // Ajouter automatiquement la photo aux documents du chantier
        await ajouterPhotoAuxDocuments(
          chantierId,
          remarqueId,
          photoUrl,
          true, // C'est une photo de preuve
          'system' // Utilisateur système car c'est une action publique
        );
      } catch (error) {
        console.error('Erreur lors de l\'enregistrement de la photo:', error);
        // On continue même en cas d'erreur avec la photo
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Remarque marquée comme résolue'
    })
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la résolution de la remarque' },
      { status: 500 }
    )
  }
} 