import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import { prisma } from '@/lib/prisma/client'
import { validateImageFile } from '@/lib/utils/image-validation'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const chantierId = formData.get('chantierId') as string
    const annotation = formData.get('annotation') as string | null
    const tags = formData.get('tags') as string | null

    if (!file || !chantierId) {
      return NextResponse.json(
        { error: 'Fichier ou chantierId manquant' },
        { status: 400 }
      )
    }

    // Vérifier que le chantier existe
    const chantier = await prisma.chantier.findUnique({
      where: { chantierId },
      select: { id: true, chantierId: true }
    })

    if (!chantier) {
      return NextResponse.json(
        { error: 'Chantier non trouvé' },
        { status: 404 }
      )
    }

    // Créer le dossier de destination (pour les rapports temporaires)
    const uploadDirTemp = join(process.cwd(), 'public', 'uploads', 'rapports-temp', chantierId)
    if (!existsSync(uploadDirTemp)) {
      await mkdir(uploadDirTemp, { recursive: true })
    }

    // Créer aussi le dossier pour les documents permanents
    const uploadDirDocs = join(process.cwd(), 'public', 'uploads', 'documents', chantierId)
    if (!existsSync(uploadDirDocs)) {
      await mkdir(uploadDirDocs, { recursive: true })
    }

    // Valider le fichier image par magic bytes
    const validation = await validateImageFile(file)
    if (!validation.isValid) {
      return NextResponse.json(
        { error: 'Le fichier doit être une image valide (JPEG, PNG ou WEBP)' },
        { status: 400 }
      )
    }

    // Générer un nom de fichier unique avec extension sécurisée
    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substring(2, 9)
    const filename = `photo-rapport-${timestamp}-${randomId}.${validation.safeExtension}`

    // MimeType basé sur le type réel détecté
    const mimeTypeMap: Record<string, string> = {
      jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp', heic: 'image/heic'
    }
    const mimeType = mimeTypeMap[validation.safeExtension!] ?? 'image/jpeg'
    
    // Sauvegarder dans le dossier temporaire (pour le PDF en cours de création)
    const filepathTemp = join(uploadDirTemp, filename)
    
    // Sauvegarder aussi dans le dossier documents (pour l'onglet Photos)
    const filepathDocs = join(uploadDirDocs, filename)

    // Écrire le fichier dans les deux emplacements
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filepathTemp, buffer)
    await writeFile(filepathDocs, buffer)

    // Créer l'entrée dans la base de données pour l'onglet Photos
    const documentUrl = `/uploads/documents/${chantierId}/${filename}`
    
    const document = await prisma.document.create({
      data: {
        chantierId: chantier.chantierId, // Utiliser chantierId directement
        nom: file.name,
        type: 'photo-chantier',
        url: documentUrl,
        taille: buffer.length,
        mimeType: mimeType,
        createdBy: session.user.id,
        updatedAt: new Date(),
        metadata: {
          annotation: annotation || '',
          tags: tags ? JSON.parse(tags) : [],
          source: 'rapport-visite'
        }
      }
    })

    // Retourner l'URL publique (celle du dossier temporaire pour le PDF)
    const publicUrl = `/uploads/rapports-temp/${chantierId}/${filename}`

    console.log(`📸 Photo uploadée: ${publicUrl}`)
    console.log(`📝 Document créé en BDD: ID=${document.id}, type=${document.type}, url=${document.url}`)

    return NextResponse.json({
      url: publicUrl,
      filename,
      documentUrl
    })
  } catch (error) {
    console.error('❌ Erreur lors de l\'upload de la photo:', error)
    return NextResponse.json(
      { error: 'Erreur lors de l\'upload' },
      { status: 500 }
    )
  }
}

