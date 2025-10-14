import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'
import { unlink, mkdir, writeFile } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

// Définir un type qui inclut metadata
interface DocumentWithMetadata {
  id: number;
  nom: string;
  type: string;
  url: string;
  taille: number;
  mimeType: string;
  chantierId: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  metadata?: string | null;
  User?: {
    name: string | null;
    email: string;
  };
}

// const DOCUMENTS_BASE_PATH = join(process.cwd(), 'public', 'uploads', 'documents')
const PHOTOS_BASE_PATH = join(process.cwd(), 'public', 'uploads', 'photos')

// GET /api/chantiers/[chantierId]/documents/[documentId]
export async function GET(
  request: Request,
  props: { params: Promise<{ chantierId: string; documentId: string }> }
) {
  const params = await props.params;
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return new NextResponse('Non autorisé', { status: 401 })
    }

    // Vérifier si le document existe et appartient au chantier spécifié
    const documentResult = await prisma.document.findUnique({
      where: {
        id: parseInt(params.documentId),
        chantierId: params.chantierId
      },
      include: {
        User: {
          select: {
            name: true,
            email: true
          }
        }
      }
    })

    if (!documentResult) {
      return new NextResponse('Document non trouvé', { status: 404 })
    }

    // Traiter le document comme ayant potentiellement une propriété metadata
    const document = documentResult as unknown as DocumentWithMetadata;

    // Pour les rapports de visite, essayer de récupérer les métadonnées supplémentaires
    if (document.type === 'rapport-visite') {
      try {
        // Vérifier si le document a des métadonnées JSON stockées
        const metadata = document.metadata ? JSON.parse(document.metadata) : null;
        
        // S'il y a des métadonnées et des photos, vérifier que les photos existent bien
        if (metadata && metadata.photos && Array.isArray(metadata.photos)) {
          // Chemin du dossier pour les photos de ce rapport
          const photoDir = join(PHOTOS_BASE_PATH, params.chantierId, params.documentId);
          
          // Vérifier si les photos réelles existent
      const photosWithRealPaths = await Promise.all(metadata.photos.map(async (photo: { preview?: string; [key:string]: unknown }, index: number) => {
            const photoFileName = `photo_${index + 1}.jpg`;
            const photoPath = join(photoDir, photoFileName);
            const publicUrl = `/uploads/photos/${params.chantierId}/${params.documentId}/${photoFileName}`;
            
            // Vérifier si la photo existe physiquement
            const exists = existsSync(photoPath);
            
            return {
              ...photo,
              file: null,
              publicUrl: exists ? publicUrl : photo.preview,
              exists
            };
          }));
          
          metadata.photos = photosWithRealPaths;
        }
        
        return NextResponse.json({
          ...document,
          metadata
        });
      } catch (error) {
        console.error('Erreur lors de la récupération des métadonnées du rapport:', error);
        // En cas d'erreur, retourner simplement le document sans métadonnées
        return NextResponse.json(document);
      }
    }

    // Pour les autres types de documents, retourner tel quel
    return NextResponse.json(document);
  } catch (error) {
    console.error('Erreur:', error)
    return new NextResponse(
      JSON.stringify({ error: 'Erreur lors de la récupération du document' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

// PUT pour mettre à jour les métadonnées d'un document
export async function PUT(
  request: Request,
  props: { params: Promise<{ chantierId: string; documentId: string }> }
) {
  const params = await props.params;
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return new NextResponse('Non autorisé', { status: 401 })
    }

    const document = await prisma.document.findUnique({
      where: {
        id: parseInt(params.documentId),
        chantierId: params.chantierId
      }
    })

    if (!document) {
      return new NextResponse('Document non trouvé', { status: 404 })
    }

    // Récupérer le corps de la requête
    const body = await request.json()
    const { metadata: newMetadata, estPlan: newEstPlan, tags: newTagNames } = body

    // Préparer les données pour la mise à jour
    const updateData: { metadata?: string; estPlan?: boolean; tags?: unknown; updatedAt: Date } = {
      updatedAt: new Date(),
    };

    if (typeof newEstPlan === 'boolean') {
      updateData.estPlan = newEstPlan;
    }

    // Gestion de la mise à jour des tags (relation many-to-many)
    if (Array.isArray(newTagNames)) {
      // newTagNames est un tableau de noms de tags, ex: ["Contrat", "Plans"]
      updateData.tags = {
        set: [], // Déconnecte tous les tags existants
        connectOrCreate: newTagNames.map(nom => ({
          where: { nom },
          create: { nom },
        }))
      };
    }

    if (newMetadata) {
      updateData.metadata = JSON.stringify(newMetadata);
      // Si des photos sont incluses, les sauvegarder physiquement
      if (newMetadata.photos && Array.isArray(newMetadata.photos)) {
        const photoDir = join(PHOTOS_BASE_PATH, params.chantierId, params.documentId);
        
        // Créer le dossier pour les photos si nécessaire
        await mkdir(photoDir, { recursive: true });
        
        // Sauvegarder chaque photo comme un fichier physique
        for (let i = 0; i < newMetadata.photos.length; i++) {
          const photo = newMetadata.photos[i];
          if (photo.preview && photo.preview.startsWith('data:image')) {
            try {
              // Extraire les données binaires de l'image (base64)
              const base64Data = photo.preview.replace(/^data:image\/\w+;base64,/, '');
              const buffer = Buffer.from(base64Data, 'base64');
              
              // Créer un nom de fichier pour la photo
              const photoFileName = `photo_${i+1}.jpg`;
              const photoPath = join(photoDir, photoFileName);
              
              // Sauvegarder la photo
              await writeFile(photoPath, buffer);
            } catch (error) {
              console.error(`Erreur lors de la sauvegarde de la photo ${i}:`, error);
            }
          }
        }
      }
    }
    
    // Effectuer la mise à jour si des données sont à mettre à jour
    if (Object.keys(updateData).length > 1) { // updatedAt est toujours là
      await prisma.document.update({
        where: { id: parseInt(params.documentId) },
        data: updateData,
        include: { tags: true } // Inclure les tags dans la réponse pour vérification
      });
    }

    // Récupérer le document mis à jour pour le retourner avec les tags
    const updatedDocument = await prisma.document.findUnique({
      where: { id: parseInt(params.documentId) },
      include: { User: { select: { name: true, email: true } }, tags: true }
    });

    return NextResponse.json(updatedDocument);
  } catch (error) {
    console.error('Erreur lors de la mise à jour du document:', error) // Message d'erreur plus générique
    return new NextResponse(
      JSON.stringify({ error: 'Erreur lors de la mise à jour du document' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

export async function DELETE(
  request: Request,
  props: { params: Promise<{ chantierId: string; documentId: string }> }
) {
  const params = await props.params;
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return new NextResponse('Non autorisé', { status: 401 })
    }

    const document = await prisma.document.findUnique({
      where: {
        id: parseInt(params.documentId),
        chantierId: params.chantierId
      }
    })

    if (!document) {
      return new NextResponse('Document non trouvé', { status: 404 })
    }

    // Supprimer le fichier physique
    const filePath = join(process.cwd(), 'public', document.url)
    try {
      await unlink(filePath)
    } catch (error) {
      console.error('Erreur lors de la suppression du fichier:', error)
      // Continuer même si le fichier n'existe pas
    }
    
    // Supprimer également le dossier de photos associé si c'est un rapport
    if (document.type === 'rapport-visite') {
      try {
        // Intentionnellement laissé pour une implémentation future de suppression de photos associées
      } catch (error) {
        console.error('Erreur lors de la suppression des photos:', error);
      }
    }

    // Supprimer l'entrée dans la base de données
    await prisma.document.delete({
      where: {
        id: parseInt(params.documentId)
      }
    })

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Erreur:', error)
    return new NextResponse(
      JSON.stringify({ error: 'Erreur lors de la suppression du document' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
} 