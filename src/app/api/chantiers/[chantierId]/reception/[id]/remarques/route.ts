import path from 'path';
// import fs from 'fs';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma/client';
import crypto from 'crypto';
import { ensureDirectoryExists, saveFileToServer } from '@/lib/fileUploadUtils';
// Remplacer l’usage direct de Prisma types par des types locaux pour la compatibilité
type JsonValue = string | number | boolean | null | { [key: string]: JsonValue } | JsonValue[]
type PrismaClientKnownRequestErrorLike = { code: string; message: string }

// Type de remplacement pour FormDataEntryValue
// type FormDataEntryValue = string | File | null;

// Fonction pour s'assurer que le répertoire de destination existe
// async function ensureDirectoryExists(directoryPath: string) { ... }

// Fonction pour sauvegarder un fichier sur le serveur
// async function saveFileToServer(file: File, savePath: string): Promise<string> { ... }

// Fonction pour convertir les BigInt en nombre et gérer correctement les booléens
function formatValues(data: unknown): unknown {
  if (data === null || data === undefined) {
    return data;
  }
  
  if (typeof data === 'bigint') {
    return Number(data);
  }
  
  // Rétablissement de la conversion booléenne si elle était utile ailleurs
  // ou suppression si cette fonction n'est utilisée que pour les remarques
  // Pour l'instant, je la laisse commentée car elle posait problème pour numeroSequentiel
  /* 
  if (data === 0 || data === 1) {
    return Boolean(data);
  }
  */
  
  if (Array.isArray(data)) {
    return (data as unknown[]).map(formatValues);
  }
  
  if (typeof data === 'object' && data !== null) {
    if (data instanceof Date) {
      return data.toISOString();
    }
    
    const result: Record<string, unknown> = {};
    const obj = data as Record<string, unknown>;
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        result[key] = formatValues(obj[key]);
      }
    }
    return result;
  }
  
  return data;
}

// Fonction pour formater correctement les dates
function formatDate(date: unknown): string | null {
  if (!date) return null;
  
  try {
    // Si c'est déjà une chaîne formatée, la retourner
    if (typeof date === 'string') {
      // Convertir les dates MySQL en format ISO
      if (date.includes(' ') && !date.includes('T')) {
        return date.replace(' ', 'T');
      }
      return date;
    }
    
    // Si c'est un objet Date, convertir en ISO string
    if (date instanceof Date) {
      return date.toISOString();
    }
    
    // Sinon, ne gérer que number/string, sinon retour null
    const d = (typeof date === 'number') ? new Date(date) : new Date(NaN);
    return isNaN(d.getTime()) ? null : d.toISOString();
  } catch (e) {
    console.error("Erreur lors du formatage de la date:", e, date);
    return null;
  }
}

// Fonction améliorée pour sécuriser les URLs des photos
function securiserUrlPhotos<T extends { id?: string; url?: unknown }>(photos: T[]): Array<T & { id: string; url: string } | null> {
  if (!photos || !Array.isArray(photos)) return [];
  
  return photos.map((photo) => {
    if (!photo) return null;
    
    try {
      // Vérifier si photo est un objet valide
      if (typeof photo !== 'object') {
        return null;
      }
      
      // Si l'URL est un nombre ou non définie, retourner un objet photo avec URL par défaut
      if (typeof (photo as { url?: unknown }).url !== 'string' || !(photo as { url?: string }).url) {
        return {
          ...photo,
          id: (photo as { id?: string }).id || crypto.randomUUID(),
          url: '/assets/images/placeholder-image.jpg'
        };
      }
      
      // Nettoyer et formater l'URL
      let url = (photo as { url: string }).url;
      
      // Éviter la duplication du préfixe /uploads/
      if (!url.startsWith('http') && !url.startsWith('/uploads/') && !url.startsWith('/assets/')) {
        url = `/uploads/${url}`;
      }
      
      // Ne pas échapper les caractères dans les URLs - cela cause des problèmes avec les chemins
      // Nous nous assurons simplement que l'URL est valide
      return { ...(photo as object), url } as T & { id: string; url: string };
    } catch (error) {
      console.error('Erreur dans le traitement de la photo:', error);
      return null;
    }
  }).filter(Boolean) as Array<T & { id: string; url: string } | null>; // Filtrer les photos nulles
}

// Fonction pour ajouter automatiquement une photo de remarque dans les documents du chantier
// async function ajouterPhotoAuxDocuments(chantierId: string, remarqueId: string, photoUrl: string, description: string, userId: string) { ... }

// Typage souple de la réponse (on laisse TypeScript inférer depuis Prisma et on formate ensuite)

// GET /api/chantiers/[chantierId]/reception/[id]/remarques
// Récupérer toutes les remarques d'une réception
export async function GET(
  request: Request,
  { params }: { params: Promise<{ chantierId: string; id: string }> }
) {
  try {
    const resolvedParams = await params;
    const chantierId = resolvedParams.chantierId;
    const receptionId = resolvedParams.id;

    // console.log("API GET Remarques - Paramètres reçus:", { chantierId, receptionId }); // SUPPRESSION LOG

    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json(
        { error: "Non autorisé, utilisateur non connecté" },
        { status: 401 }
      );
    }

    // Vérifier si la réception existe et appartient au chantier
    try {
      // Utiliser Prisma avec typages au lieu de SQL brut
      const reception = await prisma.receptionChantier.findFirst({
        where: {
          id: receptionId,
          chantierId: chantierId
        }
      });

      if (!reception) {
        return NextResponse.json(
          { error: 'Réception non trouvée' },
          { status: 404 }
        );
      }

      // Récupérer les remarques avec Prisma
      const remarquesBrutes = await prisma.remarqueReception.findMany({
        where: {
          receptionId: receptionId
        },
        include: { 
          photos: true,
          tags: true,
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            }
          }
        },
        orderBy: {
          numeroSequentiel: 'asc'
        },
      });

      // console.log("API GET Remarques - Remarques brutes de Prisma:", remarquesBrutes); // SUPPRESSION LOG

      // Mapper les résultats pour convertir BigInt en Number si nécessaire (typage souple)
      const remarques = remarquesBrutes.map(remarque => formatValues(remarque));
      return NextResponse.json(remarques);
    } catch (prismaError) {
      console.error('Erreur Prisma:', prismaError);
      
      // Fallback avec SQL brut en cas d'erreur
      const reception = await prisma.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM reception_chantier
        WHERE id = ${receptionId} AND chantierId = ${chantierId}
      `;

      if (!reception || reception.length === 0) {
        return NextResponse.json(
          { error: 'Réception non trouvée' },
          { status: 404 }
        );
      }

      // Récupérer toutes les remarques de cette réception
      const remarques = await prisma.$queryRaw<Array<{ id: string; description: string; localisation: string | null; estResolue: number; estValidee: number; estRejetee: number; dateResolution: Date | null; raisonRejet: string | null; createdAt: Date; updatedAt: Date; createdById: string }>>`
        SELECT rr.*
        FROM remarque_reception rr
        WHERE rr.receptionId = ${receptionId}
        ORDER BY rr.createdAt DESC
      `;

      // Pour chaque remarque, récupérer les photos et les tags
      const remarquesCompletes = await Promise.all(
        remarques.map(async (remarque) => {
          const photos = await prisma.$queryRaw<Array<{ id: string; url: string; estPreuve: number; createdAt: Date }>>`
            SELECT id, url, estPreuve, createdAt
            FROM photo_remarque
            WHERE remarqueId = ${remarque.id}
          `;

          const tags = await prisma.$queryRaw<Array<{ id: string; nom: string; email: string | null; typeTag: string }>>`
            SELECT id, nom, email, typeTag
            FROM tag_remarque
            WHERE remarqueId = ${remarque.id}
          `;

          const user = await prisma.$queryRaw<Array<{ id: string; name: string | null; email: string }>>`
            SELECT id, name, email
            FROM User
            WHERE id = ${remarque.createdById}
          `;

          // Convertir les valeurs booléennes
          return {
            id: remarque.id,
            description: remarque.description,
            localisation: remarque.localisation,
            estResolue: Boolean(remarque.estResolue),
            estValidee: Boolean(remarque.estValidee),
            estRejetee: Boolean(remarque.estRejetee),
            dateResolution: formatDate(remarque.dateResolution),
            raisonRejet: remarque.raisonRejet,
            createdAt: formatDate(remarque.createdAt),
            updatedAt: formatDate(remarque.updatedAt),
            photos: securiserUrlPhotos(photos),
            tags: tags || [],
            createdBy: user && user.length > 0 ? user[0] : null
          };
        })
      );

      return NextResponse.json(formatValues(remarquesCompletes));
    }
  } catch (error) {
    console.error('Erreur lors de la récupération des remarques:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des remarques' },
      { status: 500 }
    );
  }
}

// POST /api/chantiers/[chantierId]/reception/[id]/remarques
// Créer une nouvelle remarque pour une réception
export async function POST(
  request: Request,
  { params }: { params: Promise<{ chantierId: string; id: string }> }
) {
  try {
    const resolvedParams = await params;
    const chantierId = resolvedParams.chantierId;
    const receptionId = resolvedParams.id;

    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json(
        { error: "Non autorisé, utilisateur non connecté" },
        { status: 401 }
      );
    }
    const userId = session.user.id;
    console.log("API POST Remarques - Tentative de création par userId:", userId, "Type:", typeof userId); // DEBUG

    // Vérification active de l'existence de l'utilisateur avant la transaction
    const userExists = await prisma.user.findUnique({ where: { id: userId } });
    if (!userExists) {
      console.error("API POST Remarques - ERREUR FATALE: L'utilisateur avec l'ID de session", userId, "n'existe pas dans la base de données !");
      return NextResponse.json(
        { error: "Utilisateur de session invalide ou introuvable dans la base de données." },
        { status: 500 } 
      );
    }

    const receptionExistante = await prisma.receptionChantier.findUnique({
      where: { id: receptionId, chantierId: chantierId },
    });

    if (!receptionExistante) {
      return NextResponse.json(
        { error: "Réception non trouvée" },
        { status: 404 }
      );
    }
    
    const formData = await request.formData();

    const description = formData.get('description') as string;
    const localisation = formData.get('localisation')?.toString() || null;
    const estResolueBool = formData.get('estResolue') === 'true';
    const estValideeBool = formData.get('estValidee') === 'true';
    const estRejeteeBool = formData.get('estRejetee') === 'true';
    const _dateResolution = formData.get('dateResolution') as string | null; void _dateResolution;
    const _raisonRejet = formData.get('raisonRejet') as string | null; void _raisonRejet;
    const planIdStr = formData.get('planId') as string | null;
    const coordonneesPlanStr = formData.get('coordonneesPlan') as string | null;

    if (!description) {
      return NextResponse.json(
        { error: "La description est obligatoire" },
        { status: 400 }
      );
    }

    const planIdNum = planIdStr ? parseInt(planIdStr, 10) : undefined;
    // Gestion correcte pour Prisma: null ou objet JSON
    const coordonneesPlanData: JsonValue | null = coordonneesPlanStr ? JSON.parse(coordonneesPlanStr) as JsonValue : null;

    let numeroSequentiel: number;
    const derniereRemarque = await prisma.remarqueReception.findFirst({
      where: { receptionId: receptionId },
      orderBy: { numeroSequentiel: 'desc' },
      select: { numeroSequentiel: true },
    });

    if (derniereRemarque && derniereRemarque.numeroSequentiel !== null) {
      numeroSequentiel = derniereRemarque.numeroSequentiel + 1;
    } else {
      numeroSequentiel = 1;
    }

    const nouvelleRemarque = await prisma.$transaction(async (tx) => {
      const createdRemarque = await tx.remarqueReception.create({
        data: {
          receptionId: receptionId,
          description: description,
          localisation: localisation,
          estResolue: estResolueBool,
          estValidee: estValideeBool,
          estRejetee: estRejeteeBool,
          numeroSequentiel: numeroSequentiel,
          planId: planIdNum,
          coordonneesPlan: coordonneesPlanData,
          createdById: userId,
        },
        select: { 
          id: true,
          numeroSequentiel: true,
          planId: true,
          coordonneesPlan: true,
        }
      });

      const tagsDataStr = formData.get('tags') as string | null;
      if (tagsDataStr) {
        const tagsInput: Array<{ nom: string; email: string | null; typeTag: string }> = JSON.parse(tagsDataStr);
        const tagsToCreate = tagsInput.map(tag => ({
          remarqueId: createdRemarque.id,
          nom: tag.nom,
          email: tag.email,
          typeTag: tag.typeTag,
        }));
        await tx.tagRemarque.createMany({
          data: tagsToCreate,
          skipDuplicates: true,
        });
      }

      const photosFiles = formData.getAll('photos') as File[];
      const photosDataToCreate: Array<{ id: string; remarqueId: string; url: string; estPreuve: boolean }> = [];

      console.log('API POST Remarques - photosFiles:', photosFiles); // DEBUG

      if (photosFiles && photosFiles.length > 0) {
        const uploadsDir = path.join(process.cwd(), "public", "uploads", chantierId, receptionId);
        console.log('API POST Remarques - uploadsDir:', uploadsDir); // DEBUG
        await ensureDirectoryExists(uploadsDir); // Appel direct ici aussi pour test
        console.log('API POST Remarques - ensureDirectoryExists pour uploadsDir appelé.'); // DEBUG

        for (const photo of photosFiles) {
          console.log('API POST Remarques - Traitement photo:', photo.name, photo instanceof File); // DEBUG
          if (photo instanceof File) {
            const photoId = crypto.randomUUID();
            const extension = path.extname(photo.name);
            const filename = `${photoId}${extension}`;
            const savePath = path.join(uploadsDir, filename);
            console.log('API POST Remarques - savePath:', savePath); // DEBUG
            
            try {
              await saveFileToServer(photo, savePath); 
              console.log(`API POST Remarques - Photo ${filename} sauvegardée (tentative).`); // DEBUG
              const photoUrl = `/uploads/${chantierId}/${receptionId}/${filename}`;
              photosDataToCreate.push({
                id: photoId,
                remarqueId: createdRemarque.id, 
                url: photoUrl,
                estPreuve: false, 
              });
            } catch (saveError) {
              console.error('API POST Remarques - ERREUR saveFileToServer:', saveError); // DEBUG
            }
          } else {
            console.warn('API POST Remarques - Élément non File dans photosFiles:', photo); // DEBUG
          }
        }
        if (photosDataToCreate.length > 0) {
            await tx.photoRemarque.createMany({
                data: photosDataToCreate,
            });
        }
      }
      return createdRemarque;
    });

    const remarqueComplete = await prisma.remarqueReception.findUnique({
      where: { id: nouvelleRemarque.id },
      include: {
        photos: true,
        tags: true,
      },
    });
    
    return NextResponse.json(remarqueComplete, { status: 201 });
  } catch (error) {
    let errorMessage = "Erreur serveur lors de la création de la remarque";
    let statusCode = 500;
    if ((error as PrismaClientKnownRequestErrorLike)?.code) {
        switch ((error as PrismaClientKnownRequestErrorLike).code) {
            case 'P2002':
                errorMessage = "Une erreur de conflit de données est survenue (ex: doublon).";
                statusCode = 409;
                break;
            case 'P2025':
                errorMessage = "La ressource que vous essayez de modifier n\'existe pas.";
                statusCode = 404;
                break;
            default:
                errorMessage = `Erreur Prisma non gérée: ${(error as Error).message}`;
                break;
        }
    } else if (error instanceof Error) {
        errorMessage = error.message;
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    );
  }
} 