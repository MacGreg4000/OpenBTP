import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'

// Types globaux réutilisés dans la route
type RemarqueBase = { id: string; description: string; localisation: string | null; estResolue: number | boolean; dateResolution: Date | null; estValidee: number | boolean; estRejetee: number | boolean };
type TagRow = { id: string; nom: string; typeTag: string };
type PhotoRow = { id: string; url: string; estPreuve: number | boolean };
// import { Prisma } from '@prisma/client'
// import fs from 'fs'
import path from 'path'

// Fonction pour ajouter automatiquement une photo de remarque dans les documents du chantier
// eslint-disable-next-line @typescript-eslint/no-unused-vars
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

// POST /api/public/reception
// Vérifier l'accès avec un code PIN et récupérer les remarques associées
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { codePIN } = body

    if (!codePIN) {
      return NextResponse.json(
        { error: 'Le code PIN est requis' },
        { status: 400 }
      )
    }

    // Vérifier si c'est un PIN de sous-traitant spécifique
    // Utilisation du client Prisma typé pour le modèle SousTraitantPIN
    type PinRow = {
      id: string; codePIN: string; estInterne: number | boolean; receptionId: number; dateLimite: Date; estFinalise: number | boolean; chantierId: string; nomChantier: string; soustraitantId: string | null; soustraitantNom: string | null;
    };
    const soustraitantPIN = await prisma.$transaction(async (tx) => {
      // Requête SQL directe pour contourner les erreurs de typage
      const pins = await tx.$queryRaw<PinRow[]>`
        SELECT sp.*, r.id as receptionId, r.dateLimite, r.estFinalise, 
        c.chantierId, c.nomChantier, st.id as soustraitantId, st.nom as soustraitantNom 
        FROM soustraitant_pin sp
        LEFT JOIN reception_chantier r ON sp.receptionId = r.id
        LEFT JOIN chantier c ON r.chantierId = c.chantierId
        LEFT JOIN soustraitant st ON sp.soustraitantId = st.id
        WHERE sp.codePIN = ${codePIN}
        LIMIT 1
      `;
      
      if (!pins || pins.length === 0) {
        return null;
      }
      
      const pin = pins[0];
      return {
        id: pin.id,
        codePIN: pin.codePIN,
        estInterne: !!pin.estInterne,
        receptionId: pin.receptionId,
        reception: {
          id: pin.receptionId,
          dateLimite: pin.dateLimite,
          estFinalise: !!pin.estFinalise,
          chantier: {
            chantierId: pin.chantierId,
            nomChantier: pin.nomChantier
          }
        },
        soustraitant: pin.soustraitantId ? {
          id: pin.soustraitantId,
          nom: pin.soustraitantNom
        } : null
      };
    });

    if (soustraitantPIN) {
      // Vérifier que la réception n'est pas finalisée
      if (soustraitantPIN.reception.estFinalise) {
        return NextResponse.json(
          { error: 'Cette réception est finalisée et n\'est plus accessible' },
          { status: 404 }
        );
      }

      // Récupérer les remarques pour cette réception
      // Si estInterne=true, retourner toutes les remarques
      // Sinon, filtrer les remarques par soustraitantId
      type RemarqueBase = { id: string; description: string; localisation: string | null; estResolue: number | boolean; dateResolution: Date | null; estValidee: number | boolean; estRejetee: number | boolean };
      type TagRow = { id: string; nom: string; typeTag: string };
      type PhotoRow = { id: string; url: string; estPreuve: number | boolean };
      let remarques: RemarqueBase[];
      
      if (soustraitantPIN.estInterne) {
        // Si c'est un PIN interne, récupérer toutes les remarques
        remarques = await prisma.$queryRaw<RemarqueBase[]>`
          SELECT
            rr.id,
            rr.description,
            rr.localisation,
            rr.estResolue,
            rr.dateResolution,
            rr.estValidee,
            rr.estRejetee
          FROM remarque_reception rr
          WHERE rr.receptionId = ${soustraitantPIN.receptionId}
        `;
      } else if (soustraitantPIN.soustraitant) {
        // Si c'est un PIN de sous-traitant, filtrer par le tag du sous-traitant
        remarques = await prisma.$queryRaw<RemarqueBase[]>`
          SELECT DISTINCT
            rr.id,
            rr.description,
            rr.localisation,
            rr.estResolue,
            rr.dateResolution,
            rr.estValidee,
            rr.estRejetee
          FROM remarque_reception rr
          JOIN tag_remarque tr ON rr.id = tr.remarqueId
          WHERE rr.receptionId = ${soustraitantPIN.receptionId}
          AND tr.nom = ${soustraitantPIN.soustraitant.nom}
        `;
      } else {
        // Si ni interne ni sous-traitant valide, retourner un tableau vide
        remarques = [];
      }

      // Pour chaque remarque, récupérer ses tags et photos
      const remarquesCompletes = await Promise.all(
        remarques.map(async (remarque) => {
          const tags = await prisma.$queryRaw<TagRow[]>`
            SELECT id, nom, typeTag
            FROM tag_remarque
            WHERE remarqueId = ${remarque.id}
          `;

          const photos = await prisma.$queryRaw<PhotoRow[]>`
            SELECT id, url, estPreuve
            FROM photo_remarque
            WHERE remarqueId = ${remarque.id}
          `;

          return {
            ...remarque,
            tags: tags.map(t => ({ ...t })),
            photos: photos.map(p => ({ ...p, url: String(p.url) }))
          };
        })
      );

      // Construire la réponse
      const response = {
        id: soustraitantPIN.receptionId,
        dateLimite: soustraitantPIN.reception.dateLimite,
        chantier: soustraitantPIN.reception.chantier,
        soustraitant: soustraitantPIN.soustraitant,
        estInterne: soustraitantPIN.estInterne,
        remarques: remarquesCompletes
      };

      return NextResponse.json(response);
    }

    // Si ce n'est pas un PIN de sous-traitant, vérifier s'il s'agit d'un PIN global (ancien système)
    type ReceptionRow = { id: number; dateLimite: Date; estFinalise: number | boolean; chantierId: string; nomChantier: string };
    const reception = await prisma.$queryRaw<ReceptionRow[]>`
      SELECT
        rc.id,
        rc.dateLimite,
        rc.estFinalise,
        c.chantierId,
        c.nomChantier
      FROM reception_chantier rc
      JOIN Chantier c ON rc.chantierId = c.chantierId
      WHERE rc.codePIN = ${codePIN}
      AND rc.estFinalise = 0
      LIMIT 1
    `;

    if (!reception || reception.length === 0) {
      return NextResponse.json(
        { error: 'Code PIN invalide ou réception finalisée' },
        { status: 404 }
      );
    }

    const receptionData = reception[0];

    // Récupérer toutes les remarques pour cette réception
    const remarques = await prisma.$queryRaw<RemarqueBase[]>`
      SELECT
        rr.id,
        rr.description,
        rr.localisation,
        rr.estResolue,
        rr.dateResolution,
        rr.estValidee,
        rr.estRejetee
      FROM remarque_reception rr
      WHERE rr.receptionId = ${receptionData.id}
    `;

    // Pour chaque remarque, récupérer ses tags et photos
    const remarquesCompletes = await Promise.all(
      remarques.map(async (remarque) => {
        const tags = await prisma.$queryRaw<TagRow[]>`
          SELECT id, nom, typeTag
          FROM tag_remarque
          WHERE remarqueId = ${remarque.id}
        `;

        const photos = await prisma.$queryRaw<PhotoRow[]>`
          SELECT id, url, estPreuve
          FROM photo_remarque
          WHERE remarqueId = ${remarque.id}
        `;

        return {
          ...remarque,
          tags: tags.map(t => ({ ...t })),
          photos: photos.map(p => ({ ...p, url: String(p.url) }))
        };
      })
    );

    // Construire la réponse
    const response = {
      id: receptionData.id,
      dateLimite: receptionData.dateLimite,
      chantier: {
        chantierId: receptionData.chantierId,
        nomChantier: receptionData.nomChantier
      },
      remarques: remarquesCompletes,
      estInterne: true // Le PIN global donne accès à tout, comme un PIN interne
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Erreur:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la vérification du code PIN' },
      { status: 500 }
    );
  }
} 