import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

export const dynamic = 'force-dynamic'

// POST - Upload de fichiers (plan ou documents)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { id } = await params
    const formData = await request.formData()
    const file = formData.get('file') as File
    const type = formData.get('type') as string // 'plan' ou 'document'

    if (!file) {
      return NextResponse.json(
        { error: 'Aucun fichier fourni' },
        { status: 400 }
      )
    }

    // Vérifier que le choix client existe
    const choixClient = await prisma.choixClient.findUnique({
      where: { id }
    })

    if (!choixClient) {
      return NextResponse.json(
        { error: 'Choix client non trouvé' },
        { status: 404 }
      )
    }

    // Créer le dossier s'il n'existe pas
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'choix-clients', id)
    await mkdir(uploadDir, { recursive: true })

    // Générer un nom de fichier unique
    const timestamp = Date.now()
    const extension = file.name.split('.').pop()
    const filename = `${type}-${timestamp}.${extension}`
    const filepath = join(uploadDir, filename)

    // Écrire le fichier
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filepath, buffer)

    const fileUrl = `/uploads/choix-clients/${id}/${filename}`

    // Mettre à jour le choix client selon le type
    if (type === 'plan') {
      await prisma.choixClient.update({
        where: { id },
        data: {
          planOriginal: fileUrl
        }
      })
    } else {
      // Ajouter le document à la liste
      const currentDocs = (choixClient.documents as string[]) || []
      await prisma.choixClient.update({
        where: { id },
        data: {
          documents: [...currentDocs, fileUrl]
        }
      })
    }

    return NextResponse.json({
      success: true,
      url: fileUrl,
      filename
    })

  } catch (error) {
    console.error('Erreur lors de l\'upload du fichier:', error)
    return NextResponse.json(
      { error: 'Erreur lors de l\'upload du fichier' },
      { status: 500 }
    )
  }
}

