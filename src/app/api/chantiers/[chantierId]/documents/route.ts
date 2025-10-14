import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

// Type JSON local pour éviter la dépendance aux types Prisma
type JsonValue = string | number | boolean | null | { [key: string]: JsonValue } | JsonValue[]

// Définir le chemin de base pour les documents
const DOCUMENTS_BASE_PATH = join(process.cwd(), 'public', 'uploads', 'documents')

export async function GET(request: Request, props: { params: Promise<{ chantierId: string }> }) {
  const params = await props.params;
  try {
    console.log('GET documents - params:', params)
    const session = await getServerSession(authOptions)
    console.log('Session:', session)

    if (!session?.user) {
      console.log('Pas de session utilisateur')
      return new NextResponse('Non autorisé', { status: 401 })
    }

    // Récupérer les paramètres de requête
    const url = new URL(request.url)
    const typeFilter = url.searchParams.get('type')
    const tagFilter = url.searchParams.get('tag')
    
    console.log('Recherche des documents pour le chantier:', params.chantierId, 'Type:', typeFilter || 'tous', 'Tag:', tagFilter || 'tous')
    
    // Vérifions d'abord si le chantier existe
    const chantier = await prisma.chantier.findUnique({
      where: { chantierId: params.chantierId }
    })

    if (!chantier) {
      console.log('Chantier non trouvé:', params.chantierId)
      return new NextResponse(
        JSON.stringify({ error: 'Chantier non trouvé' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Construire la requête avec ou sans filtre de type
    const whereClause: {
      chantierId: string;
      type?: string | null;
      tags?: { some: { nom: string } };
    } = {
      chantierId: params.chantierId
    }
    
    // Ajouter le filtre de type si présent
    if (typeFilter) {
      whereClause.type = typeFilter
    }
    if (tagFilter) {
      // Modifié pour filtrer par nom de tag dans la relation many-to-many
      whereClause.tags = {
        some: {
          nom: tagFilter,
        },
      };
    }

    // Récupérer les documents avec le filtre et inclure les tags
    const documentsWithDetails = await prisma.document.findMany({
      where: whereClause,
      include: {
        User: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        tags: true, // Inclure les tags associés
      },
    });

    console.log(`Documents trouvés: ${documentsWithDetails.length}`)

    // Ne plus transformer les données, retourner directement ce que Prisma fournit
    return NextResponse.json(documentsWithDetails);
  } catch (error) {
    // Log plus détaillé de l'erreur
    console.error('Erreur complète dans GET documents:', {
      error,
      message: error instanceof Error ? error.message : 'Une erreur inconnue est survenue',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    })

    // Si c'est une erreur Prisma, on log plus de détails
    if (error && typeof error === 'object' && 'code' in error) {
      console.error('Erreur Prisma:', {
        code: error.code,
        meta: 'meta' in error ? error.meta : undefined,
        clientVersion: 'clientVersion' in error ? error.clientVersion : undefined
      })
    }

    return new NextResponse(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Une erreur inconnue est survenue',
        code: error && typeof error === 'object' && 'code' in error ? error.code : undefined
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

export async function POST(request: Request, props: { params: Promise<{ chantierId: string }> }) {
  const params = await props.params;
  try {
    console.log('POST documents - début de la requête')
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      console.log('POST documents - non autorisé')
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    console.log('POST documents - session valide, récupération du formData')
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      console.log('POST documents - aucun fichier fourni')
      return NextResponse.json(
        { error: 'Aucun fichier fourni' },
        { status: 400 }
      )
    }

    console.log('POST documents - fichier reçu:', file.name, file.type, file.size)
    
    // Récupérer le type de document s'il est fourni
    const documentType = formData.get('type') as string || file.name.split('.').pop() || 'unknown'
    console.log('POST documents - type de document:', documentType)
    
    // Récupérer les notes si elles sont fournies
    const notes = formData.get('notes') as string || ''
    console.log('POST documents - notes reçues:', notes ? 'Oui' : 'Non')
    // const documentTag = formData.get('tag') as string | null // Ancien champ, supprimé
    // console.log('POST documents - tag reçu:', documentTag) 

    // Récupérer les tags sous forme de tableau de chaînes
    // Le frontend devrait envoyer les tags comme formData.append('tags[]', tagValue1); formData.append('tags[]', tagValue2);
    // Ou comme une chaîne JSON que nous parserons ici.
    // Pour la simplicité avec FormData, nous allons attendre une chaîne de tags séparés par des virgules, ou un champ 'tags' par tag.
    // Alternative: si le client envoie un JSON dans un champ "documentData", ce serait plus propre.
    // Pour l'instant, on s'attend à ce que le client envoie un string JSON dans formData.get('tagsJsonString')
    const tagsJsonString = formData.get('tagsJsonString') as string | null;
    let tagsToConnect: { nom: string }[] = [];
    if (tagsJsonString) {
      try {
        const tagNames = JSON.parse(tagsJsonString) as string[];
        if (Array.isArray(tagNames) && tagNames.length > 0) {
          tagsToConnect = tagNames.map(nom => ({ nom }));
        }
      } catch (e) {
        console.error("Erreur lors du parsing du JSON des tags:", e);
        // Gérer l'erreur si le JSON est malformé, peut-être retourner une erreur 400
      }
    }
    console.log('POST documents - tags à connecter:', tagsToConnect);

    // Récupérer les métadonnées supplémentaires
    let metadata: JsonValue | null = null;
    
    if (documentType === 'rapport-visite') {
      // Personnes présentes
      const personnesPresentes = formData.get('personnesPresentes');
      // Tags utilisés
      const tags = formData.get('tags');
      
      // Créer un objet de métadonnées si nécessaire
      if (personnesPresentes || tags) {
        metadata = {
          personnes: personnesPresentes ? JSON.parse(personnesPresentes as string) : [],
          tags: tags ? JSON.parse(tags as string) : [],
          notes: notes
        };
      }
    } else if (documentType === 'photo-chantier') {
      // Récupérer les métadonnées pour les photos
      const metadataStr = formData.get('metadata') as string;
      if (metadataStr) {
        try {
          metadata = JSON.parse(metadataStr) as JsonValue;
        } catch (e) {
          console.error('Erreur lors du parsing des métadonnées:', e);
        }
      }
    }

    // Créer le dossier des documents si nécessaire
    const chantierDir = join(DOCUMENTS_BASE_PATH, params.chantierId)
    try {
      console.log('POST documents - création des dossiers')
      // Créer d'abord le dossier de base s'il n'existe pas
      await mkdir(DOCUMENTS_BASE_PATH, { recursive: true })
      // Puis créer le sous-dossier du chantier
      await mkdir(chantierDir, { recursive: true })
      console.log('POST documents - dossiers créés avec succès')
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error('Erreur lors de la création des dossiers:', errorMessage)
      return NextResponse.json(
        { error: `Erreur lors de la création des dossiers: ${errorMessage}` },
        { status: 500 }
      )
    }

    const filePath = join(chantierDir, file.name)
    console.log('POST documents - écriture du fichier:', filePath)
    try {
      const buffer = Buffer.from(await file.arrayBuffer())
      await writeFile(filePath, buffer)
      console.log('POST documents - fichier écrit avec succès')
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error('Erreur lors de l\'écriture du fichier:', errorMessage)
      return NextResponse.json(
        { error: `Erreur lors de l'écriture du fichier: ${errorMessage}` },
        { status: 500 }
      )
    }

    console.log('POST documents - création de l\'entrée dans la base de données')
    try {
      // Vérifier que l'utilisateur existe dans la base de données
      const userExists = await prisma.user.findUnique({
        where: { id: session.user.id }
      })
      
      if (!userExists) {
        console.log('POST documents - Utilisateur non trouvé dans la base de données:', session.user.id)
        return NextResponse.json(
          { error: 'Utilisateur non trouvé dans la base de données' },
          { status: 400 }
        )
      }
      
      console.log('POST documents - Utilisateur trouvé:', userExists.id)

      // Créer le document dans la base de données
      const document = await prisma.document.create({
        data: {
          nom: file.name,
          type: documentType,
          url: `/uploads/documents/${params.chantierId}/${file.name}`,
          taille: file.size,
          mimeType: file.type,
          chantierId: params.chantierId,
          createdBy: userExists.id,
          updatedAt: new Date(),
          // ...(documentTag && { tag: documentTag }), // Ancien champ
          ...(tagsToConnect.length > 0 && { 
            tags: { 
              connectOrCreate: tagsToConnect.map(tagObj => ({ // tagsToConnect est [{nom: 'Tag1'}, {nom: 'Tag2'}]
                where: { nom: tagObj.nom },
                create: { nom: tagObj.nom },
              }))
            } 
          }),
          ...(metadata ? { metadata } : {})
        },
        include: {
          User: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          tags: true, // Inclure les tags dans la réponse
        }
      });

      console.log('POST documents - document créé avec succès:', document.id)
      return NextResponse.json(document)
    } catch (dbError: unknown) {
      const dbMessage = dbError instanceof Error ? dbError.message : String(dbError)
      console.error('Erreur lors de la création du document dans la base de données:', dbMessage)
      // Afficher plus de détails sur l'erreur Prisma
      if (dbError && typeof dbError === 'object') {
        if ('code' in dbError) {
          console.error('Code d\'erreur Prisma:', (dbError as { code?: unknown }).code)
        }
        if ('meta' in dbError) {
          console.error('Métadonnées d\'erreur Prisma:', (dbError as { meta?: unknown }).meta)
        }
      }
      return NextResponse.json(
        { error: `Erreur lors de la création du document dans la base de données: ${dbMessage}` },
        { status: 500 }
      )
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined
    console.error('Erreur globale dans POST documents:', errorMessage, errorStack)
    return NextResponse.json(
      { error: `Erreur générale: ${errorMessage}` },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request, props: { params: Promise<{ chantierId: string }> }) {
  const params = await props.params;
  try {
    console.log('DELETE document - début de la requête')
    const session = await getServerSession(authOptions)
    
    // Vérifier si l'utilisateur est connecté
    if (!session?.user) {
      console.log('DELETE document - non autorisé')
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }
    
    // Vérifier si l'utilisateur est administrateur
    if (session.user.role !== 'ADMIN') {
      console.log('DELETE document - utilisateur non administrateur')
      return NextResponse.json(
        { error: 'Seuls les administrateurs peuvent supprimer des documents' },
        { status: 403 }
      )
    }
    
    // Récupérer l'ID du document à supprimer depuis l'URL
    const url = new URL(request.url)
    const documentId = url.searchParams.get('documentId')
    
    if (!documentId) {
      console.log('DELETE document - ID du document manquant')
      return NextResponse.json(
        { error: 'ID du document manquant' },
        { status: 400 }
      )
    }
    
    console.log('DELETE document - suppression du document:', documentId)
    
    // Supprimer le document de la base de données
    const document = await prisma.document.delete({
      where: {
        id: parseInt(documentId),
        chantierId: params.chantierId
      }
    })
    
    console.log('DELETE document - document supprimé avec succès:', document.id)
    
    // Note: Nous ne supprimons pas le fichier physique pour éviter les problèmes
    // si d'autres documents y font référence. Dans une implémentation complète,
    // on pourrait vérifier si le fichier est utilisé ailleurs avant de le supprimer.
    
    return NextResponse.json({ success: true, message: 'Document supprimé avec succès' })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    console.error('Erreur lors de la suppression du document:', errorMessage)
    
    // Si le document n'existe pas
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Document non trouvé' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(
      { error: `Erreur lors de la suppression du document: ${errorMessage}` },
      { status: 500 }
    )
  }
} 