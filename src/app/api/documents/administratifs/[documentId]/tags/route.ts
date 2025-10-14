import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma/client';
// On importe les types de modèles directement. Prisma génère des types pour les arguments et les payloads.
// import type { Document, Tag, User as PrismaUser } from '@prisma/client';
// Importer Prisma pour accéder aux types générés comme Prisma.TagWhereUniqueInput
// Remplacement des types Prisma par des types locaux minimalistes pour éviter les erreurs d'import

interface UpdateTagsRequestBody {
  tags: string[];
}

// Type helper pour obtenir le type de retour de Prisma avec des includes
// Cet utilitaire n'est pas toujours nécessaire si on peut laisser TypeScript inférer.
// type PrismaPromise<T> = T extends PromiseLike<infer U> ? U : T; // Non utilisé pour l'instant

export async function PUT(request: Request, { params }: { params: Promise<{ documentId: string }> }) {
  try {
    const { documentId } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }
    // const userId = session.user.id; // userId de la session, utile pour 'assignedBy' si on gérait la table de jointure manuellement

    if (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
    }

    const documentIdNum = parseInt(documentId, 10);
    if (isNaN(documentIdNum)) {
      return NextResponse.json({ error: 'ID de document invalide' }, { status: 400 });
    }

    const body: UpdateTagsRequestBody = await request.json();
    const { tags: tagNames } = body;

    if (!Array.isArray(tagNames) || !tagNames.every(t => typeof t === 'string')) {
      return NextResponse.json({ error: 'Format des tags invalide. Attendu: string[]' }, { status: 400 });
    }

    // Vérifier si le document existe et est un document administratif
    const documentExists = await prisma.document.findUnique({
      where: { id: documentIdNum },
      select: { chantierId: true, id: true } // id pour s'assurer qu'il existe
    });

    if (!documentExists) {
      return NextResponse.json({ error: 'Document non trouvé' }, { status: 404 });
    }
    if (documentExists.chantierId !== null) {
        return NextResponse.json({ error: 'Ce document est lié à un chantier et ne peut être modifié ici.' }, { status: 400 });
    }

    const tagsToConnect: Array<{ id: string | number } | { nom: string }> = [];
    if (tagNames.length > 0) {
      for (const tagName of tagNames) {
        const normalizedTagName = tagName.trim().toLowerCase();
        if (normalizedTagName) {
          const tag = await prisma.tag.upsert({
            where: { nom: normalizedTagName }, // Assumons que 'nom' est @unique sur Tag
            update: {},
            create: { nom: normalizedTagName },
            select: { id: true } 
          });
          // Prisma attend { id: valeur } ou { nom: valeur } pour WhereUniqueInput si les deux sont uniques
          // Si Tag.id est Int, { id: tag.id } devrait fonctionner.
          tagsToConnect.push({ id: tag.id }); 
        }
      }
    }
    
    // Définir explicitement les arguments pour l'update afin d'obtenir un typage précis du résultat
    const documentUpdateArgs = {
      where: { id: documentIdNum },
      data: {
        tags: {
          // `set` attend un tableau de `TagWhereUniqueInput`
          // Si Tag.id est Int, alors { id: number } est un TagWhereUniqueInput valide.
          set: tagsToConnect 
        }
      },
      include: {
        User: { select: { id: true, name: true, email: true } }, // User est nullable, donc User peut être null
        tags: true 
      }
    } as const;
    const updatedDocument = await prisma.document.update(documentUpdateArgs);
    
    // updatedDocument a maintenant un type précis incluant User? et tags: Tag[]
    // et tous les champs scalaires de Document.
    // L'erreur persistante sur `userId` suggère que ce champ n'existe pas directement sur le modèle Document.
    // Nous utiliserons `updatedDocument.User?.id` pour la réponse.

    const formattedDocument = {
        id: updatedDocument.id.toString(), 
        nom: updatedDocument.nom,           
        url: updatedDocument.url,           
        type: updatedDocument.type,         
        taille: updatedDocument.taille,     
        createdAt: updatedDocument.createdAt.toISOString(), 
        updatedAt: updatedDocument.updatedAt.toISOString(), 
        chantierId: updatedDocument.chantierId, 
        // Remplacer l'accès direct à `userId` par l'id de l'utilisateur inclus.
        // Le nom dans la réponse reste 'userId' pour la cohérence avec ce que le client attendait peut-être.
        userId: updatedDocument.User?.id ?? null, // Fournit l'ID de l'utilisateur associé, ou null si pas d'utilisateur ou pas d'ID.
        tags: updatedDocument.tags.map(tag => tag.nom), 
        User: updatedDocument.User ? { 
            id: updatedDocument.User.id,
            name: updatedDocument.User.name,
            email: updatedDocument.User.email 
        } : null, // S'assurer que l'objet User est bien formaté pour la réponse
    };

    // Pour `dateUpload` et `uploadedBy`, si ce sont des concepts différents de createdAt/User du document,
    // ils devraient être des champs séparés sur le modèle Document ou gérés différemment.
    // Pour l'instant, je vais les baser sur createdAt et User comme avant, mais c'est un point d'attention.
    const finalResponse = {
        ...formattedDocument,
        dateUpload: updatedDocument.createdAt.toISOString(),
        uploadedBy: updatedDocument.User ? (updatedDocument.User.name || updatedDocument.User.email) : undefined,
    };

    return NextResponse.json(finalResponse);

  } catch (error) {
    console.error('Erreur PUT /api/documents/administratifs/[documentId]/tags:', error);
    if (error instanceof Error) {
        console.error('Message d\'erreur:', error.message);
        // Si c'est une erreur Prisma, elle aura des propriétés spécifiques
    if (typeof error === 'object' && error !== null && 'code' in error && 'meta' in error) {
             const prismaError = error as { code: string; meta?: unknown; message: string };
             console.error('Code d\'erreur Prisma:', prismaError.code);
             console.error('Meta Prisma:', prismaError.meta);
        }
    }
    return NextResponse.json({ error: 'Erreur serveur lors de la mise à jour des tags.' }, { status: 500 });
  }
} 