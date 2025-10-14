import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'
import { writeFile } from 'fs/promises'
import { join } from 'path'
import crypto from 'crypto'

// GET /api/fiches-techniques - Récupère toutes les fiches techniques
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const fiches = await prisma.ficheTechnique.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(fiches)
  } catch (error) {
    console.error('Erreur lors de la récupération des fiches techniques:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des fiches techniques' },
      { status: 500 }
    )
  }
}

// POST /api/fiches-techniques - Crée une nouvelle fiche technique
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const formData = await request.formData()
    const titre = formData.get('titre') as string
    const categorie = formData.get('categorie') as string
    const sousCategorie = formData.get('sousCategorie') as string
    const description = formData.get('description') as string
    const referenceCSC = formData.get('referenceCSC') as string
    const fichier = formData.get('fichier') as File

    if (!titre || !categorie || !fichier) {
      return NextResponse.json(
        { error: 'Titre, catégorie et fichier sont requis' },
        { status: 400 }
      )
    }

    // Vérifier que le fichier est un PDF
    if (!fichier.type.includes('pdf')) {
      return NextResponse.json(
        { error: 'Le fichier doit être un PDF' },
        { status: 400 }
      )
    }

    // Créer un nom de fichier unique
    const timestamp = Date.now()
    const fileName = `${timestamp}-${fichier.name}`
    const filePath = join(process.cwd(), 'public', 'fiches-techniques', fileName)

    // Sauvegarder le fichier
    const bytes = await fichier.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    // Créer la fiche technique dans la base de données
    // Utiliser $executeRawUnsafe pour éviter les problèmes de typage avec le nouveau champ referenceCC
    const id = crypto.randomUUID();
    await prisma.$executeRawUnsafe(`
      INSERT INTO fiches_techniques (
        id, titre, categorie, sousCategorie, description, referenceCSC, fichierUrl, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, 
      id,
      titre, 
      categorie,
      sousCategorie || null,
      description || null,
      referenceCSC || null,
      `/fiches-techniques/${fileName}`,
      new Date(),
      new Date()
    );
    
    // Récupérer la fiche créée
    const fiche = await prisma.ficheTechnique.findUnique({
      where: { id }
    })

    return NextResponse.json(fiche)
  } catch (error) {
    console.error('Erreur lors de la création de la fiche technique:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création de la fiche technique' },
      { status: 500 }
    )
  }
} 