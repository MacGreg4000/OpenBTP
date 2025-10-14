import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { existsSync } from 'fs'
// Remplacement: ne pas importer les types Prisma non exportés pour éviter les erreurs

// L'interface PopulatedDocumentTag n'est plus nécessaire si la relation est directe Tag[]
// interface PopulatedDocumentTag {
//   tag: Tag;
// }

// Type pour un document avec ses relations User et Tags (directement Tag[])
interface DocumentWithIncludedRelations {
  id: number | string
  nom: string
  url: string
  type: string
  taille: number
  createdAt: Date
  updatedAt: Date
  User: { id: string; name: string | null; email: string | null } | null
  tags: Array<{ id: string | number; nom: string }>
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }
    const userId = session.user.id;

    if (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const tagsString = formData.get('tags') as string | null

    let tagNames: string[] = []
    if (tagsString) {
      try {
        tagNames = JSON.parse(tagsString)
        if (!Array.isArray(tagNames) || !tagNames.every(t => typeof t === 'string')) {
          return NextResponse.json({ error: 'Format des tags invalide. Attendu: string[]' }, { status: 400 })
        }
      } catch {
        return NextResponse.json({ error: 'Format des tags invalide (JSON malformé)' }, { status: 400 })
      }
    }

    if (!file) {
      return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 })
    }

    const documentsBaseDir = path.join(process.cwd(), 'public', 'uploads', 'documents')
    const adminDocsDir = path.join(documentsBaseDir, 'administratifs')

    if (!existsSync(documentsBaseDir)) {
      await mkdir(documentsBaseDir, { recursive: true })
    }
    if (!existsSync(adminDocsDir)) {
      await mkdir(adminDocsDir, { recursive: true })
    }

    const uniqueFilename = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '')}`;
    const filePath = path.join(adminDocsDir, uniqueFilename);
    const fileUrl = `/uploads/documents/administratifs/${uniqueFilename}`;

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Upsert tags. On assume que Tag.id est de type String (CUID, UUID, etc.)
    // et que TagWhereUniqueInput attend { id: string_value } pour la connexion.
    const tagsToConnect: Array<{ id: string | number } | { nom: string }> = [];
    if (tagNames.length > 0) {
      for (const tagName of tagNames) {
        const normalizedTagName = tagName.trim().toLowerCase();
        if (normalizedTagName) {
          const tag = await prisma.tag.upsert({
            where: { nom: normalizedTagName },
            update: {},
            create: { nom: normalizedTagName },
            select: { id: true } // `tag.id` sera de type String si Tag.id est String
          });
          tagsToConnect.push({ id: tag.id }); // Pas de Number(), id est déjà une string
        }
      }
    }

    const calculatedFileType = file.type || path.extname(file.name).slice(1) || 'inconnu';

    // Assurer que createData utilise bien mimeType si c'est le nom du champ dans le schéma
    const createData = {
      nom: file.name,
      url: fileUrl,
      type: calculatedFileType,
      mimeType: calculatedFileType,
      taille: file.size,
      User: { connect: { id: userId } }, 
      ...(tagsToConnect.length > 0 && { // Gérer le cas où il n'y a pas de tags
        tags: {
          connect: tagsToConnect 
        }
      })
    } as const;
    
    const includeClause = {
      User: true, 
      tags: true // Pour une relation m2m implicite, ceci retourne Tag[]
    } as const; 

    // Utilisation du type DocumentWithIncludedRelations
    const newDocument = await prisma.document.create({
      data: createData,
      include: includeClause 
    }) as DocumentWithIncludedRelations; 

    // newDocument.tags est maintenant Tag[]
    const tagNamesFromDoc = newDocument.tags.map(tag => tag.nom);

    return NextResponse.json({ 
      message: 'Document uploadé et enregistré avec succès',
      document: {
        id: newDocument.id.toString(),
        nom: newDocument.nom,
        url: newDocument.url,
        type: newDocument.type,
        taille: newDocument.taille,
        dateUpload: newDocument.createdAt.toISOString(),
        tags: tagNamesFromDoc,
        uploadedBy: newDocument.User ? newDocument.User.name || newDocument.User.email : 'Inconnu',
      }
    })
  } catch (error: unknown) {
    console.error('Erreur lors de l\'upload du document administratif:', error)
    return NextResponse.json({ error: 'Erreur serveur lors de l\'upload du document' }, { status: 500 })
  }
} 