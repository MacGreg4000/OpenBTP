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

// POST /api/public/reception-remarque-resolver
// Marquer une remarque comme résolue et ajouter une photo de preuve
export async function POST(request: Request) {
  try {
    console.log('Requête reçue:', {
      contentType: request.headers.get('Content-Type'),
      method: request.method,
    })
    
    let formData: FormData
    try {
      formData = await request.formData()
    } catch (error) {
      console.error('Erreur lors de la récupération du formData:', error)
      return NextResponse.json(
        { error: 'Erreur de format de requête. Content-Type doit être multipart/form-data' },
        { status: 400 }
      )
    }
    
    const remarqueId = formData.get('remarqueId')?.toString()
    const codePIN = formData.get('codePIN')?.toString()
    void formData.get('commentaire')?.toString()
    const photo = formData.get('photo') as File | null

    console.log('Paramètres reçus:', { 
      remarqueId: remarqueId || 'non défini', 
      codePIN: codePIN || 'non défini',
      hasPhoto: !!photo 
    })

    if (!remarqueId || !codePIN) {
      return NextResponse.json(
        { error: 'Données manquantes', params: { remarqueId: !!remarqueId, codePIN: !!codePIN } },
        { status: 400 }
      )
    }

    // Vérifier d'abord si c'est un PIN de sous-traitant
    // C'est important de suivre la même logique que dans /api/public/reception
    let receptionId: number | null = null;
    let chantierId: string | null = null;

    // 1. Vérifier les PIN de sous-traitant 
    type PinRow = { receptionId: number; chantierId: string; estFinalise: number | boolean };
    const soustraitantPin = await prisma.$transaction(async (tx) => {
      // Requête SQL directe pour récupérer les infos du PIN
      const pins = await tx.$queryRaw<PinRow[]>`
        SELECT sp.receptionId, r.chantierId, r.estFinalise 
        FROM soustraitant_pin sp
        LEFT JOIN reception_chantier r ON sp.receptionId = r.id
        WHERE sp.codePIN = ${codePIN}
        LIMIT 1
      `;
      
      if (!pins || pins.length === 0) {
        return null;
      }
      
      return pins[0];
    });

    console.log('Info PIN sous-traitant:', soustraitantPin);

    if (soustraitantPin) {
      if (soustraitantPin.estFinalise) {
        return NextResponse.json(
          { error: 'Cette réception est finalisée et n\'est plus accessible' },
          { status: 403 }
        );
      }
      
      receptionId = soustraitantPin.receptionId;
      chantierId = soustraitantPin.chantierId;
    } else {
      // 2. Si ce n'est pas un PIN de sous-traitant, vérifier les PIN globaux
      type ReceptionInfoRow = { id: number; chantierId: string; estFinalise: number | boolean };
      const receptionInfo = await prisma.$queryRaw<ReceptionInfoRow[]>`
        SELECT rc.id, rc.chantierId, rc.estFinalise
        FROM reception_chantier rc
        WHERE rc.codePIN = ${codePIN}
        AND rc.estFinalise = 0
        LIMIT 1
      `;

      console.log('Info réception (PIN global):', receptionInfo);

      if (!receptionInfo || receptionInfo.length === 0) {
        return NextResponse.json(
          { error: 'Code PIN invalide ou réception non trouvée', params: { codePIN } },
          { status: 404 }
        );
      }

      const reception = receptionInfo[0];
      if (reception.estFinalise) {
        return NextResponse.json(
          { error: 'Cette réception est finalisée et n\'est plus accessible' },
          { status: 403 }
        );
      }

      receptionId = reception.id;
      chantierId = reception.chantierId;
    }

    // Vérifier que la remarque existe et appartient à cette réception
    type RemarqueInfoRow = { id: string; receptionId: number; estValidee: number | boolean };
    const remarqueInfo = await prisma.$queryRaw<RemarqueInfoRow[]>`
      SELECT rr.id, rr.receptionId, rr.estValidee
      FROM remarque_reception rr
      WHERE rr.id = ${remarqueId}
      LIMIT 1
    `;

    console.log('Info remarque:', remarqueInfo);

    if (!remarqueInfo || remarqueInfo.length === 0) {
      return NextResponse.json(
        { error: 'Remarque non trouvée', params: { remarqueId } },
        { status: 404 }
      );
    }

    const remarque = remarqueInfo[0];
    
    // Vérifier que la remarque appartient bien à la réception
    if (receptionId == null || remarque.receptionId !== receptionId) {
      return NextResponse.json(
        { 
          error: 'La remarque n\'appartient pas à cette réception', 
          params: { receptionId, remarqueReceptionId: remarque.receptionId } 
        },
        { status: 400 }
      );
    }

    if (remarque.estValidee === 1) {
      return NextResponse.json(
        { error: 'Cette remarque a déjà été validée' },
        { status: 400 }
      );
    }

    // Mettre à jour la remarque comme résolue
    await prisma.$executeRaw`
      UPDATE remarque_reception
      SET estResolue = 1, dateResolution = NOW()
      WHERE id = ${remarqueId}
    `;

    let nouvellePhotoInfo: { id: string; url: string; estPreuve: boolean } | undefined = undefined;

    // Si une photo de preuve a été fournie, l'enregistrer et ajouter à la base de données
    if (photo && chantierId) {
      try {
        const photoId = uuidv4(); 
        
        const uploadPath = path.join('uploads', 'receptions');
        const publicDir = path.join(process.cwd(), 'public');
        const uploadDir = path.join(publicDir, uploadPath);
        
        await fs.promises.mkdir(uploadDir, { recursive: true });
        
        const originalFileName = photo.name;
        const extension = path.extname(originalFileName) || '.jpg';
        const baseName = originalFileName.substring(0, originalFileName.lastIndexOf('.')) || 'resolution';
        const safeBaseName = baseName.replace(/[^a-zA-Z0-9-_]/g, '_');

        const fileName = `${safeBaseName}-${Date.now()}-${photoId.substring(0, 8)}${extension}`;
        const filePath = path.join(uploadDir, fileName);
        
        const arrayBuffer = await photo.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        await fs.promises.writeFile(filePath, buffer);
        
        const photoUrl = `/${uploadPath}/${fileName}`;
        
        await prisma.$executeRaw`
          INSERT INTO photo_remarque (id, remarqueId, url, estPreuve, createdAt)
          VALUES (${photoId}, ${remarqueId}, ${photoUrl}, 1, NOW())
        `;
        
        nouvellePhotoInfo = { id: photoId, url: photoUrl, estPreuve: true };

        await ajouterPhotoAuxDocuments(
          chantierId,
          remarqueId,
          photoUrl,
          true, 
          'system'
        );
      } catch (error) {
        console.error('Erreur lors de l\'enregistrement de la photo:', error);
      }
    }

    return NextResponse.json({
      message: 'Remarque marquée comme résolue avec succès',
      remarqueId: remarqueId,
      nouvellePhoto: nouvellePhotoInfo, 
    });

  } catch (error) {
    console.error('Erreur complète:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la résolution de la remarque', details: String(error) },
      { status: 500 }
    );
  }
} 