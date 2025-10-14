import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import crypto from 'crypto'

// Types de documents autorisés
const ALLOWED_TYPES = [
  'carte_identite', 
  'limosa', 
  'a1', 
  'livre_parts', 
  'attestation_onss',
  'permis_travail',
  'diplome',
  'certificat_medical',
  'autre'
]

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string, ouvrierId: string }> }
) {
  const params = await props.params;
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const type = formData.get('type') as string
    const dateExpiration = formData.get('dateExpiration') as string

    // Validation basique
    if (!file || !type) {
      return NextResponse.json(
        { error: 'Le fichier et le type sont requis' },
        { status: 400 }
      )
    }

    if (!ALLOWED_TYPES.includes(type)) {
      return NextResponse.json(
        { error: 'Type de document non valide' },
        { status: 400 }
      )
    }

    // Vérifier si l'ouvrier existe
    const ouvrier = await prisma.ouvrier.findUnique({
      where: { 
        id: params.ouvrierId,
        sousTraitantId: params.id
      }
    })

    if (!ouvrier) {
      return NextResponse.json(
        { error: 'Ouvrier non trouvé' },
        { status: 404 }
      )
    }

    // Créer le dossier de stockage si nécessaire
    const uploadDir = join(process.cwd(), 'public', 'documents', 'ouvriers', params.ouvrierId)
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    // Générer un nom de fichier unique
    const fileExtension = file.name.split('.').pop()
    const fileName = `${type}_${Date.now()}.${fileExtension}`
    const filePath = join(uploadDir, fileName)

    // Lire et écrire le fichier
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    // Créer l'entrée dans la base de données
    const document = await prisma.documentOuvrier.create({
      data: {
        id: crypto.randomUUID(),
        nom: file.name,
        type: type,
        url: `/documents/ouvriers/${params.ouvrierId}/${fileName}`,
        dateExpiration: dateExpiration ? new Date(dateExpiration) : null,
        ouvrierId: params.ouvrierId,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })

    return NextResponse.json(document)
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur lors de l\'upload du document' },
      { status: 500 }
    )
  }
} 