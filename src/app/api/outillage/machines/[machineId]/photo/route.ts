import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'
import { join } from 'path'
import { existsSync, mkdir, writeFile, unlink } from 'fs/promises'

// GET /api/outillage/machines/[machineId]/photo - Vérifie si une photo existe
export async function GET(
  request: Request,
  context: { params: Promise<{ machineId: string }> }
) {
  try {
    const params = await context.params
    const machineId = params.machineId

    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    // Vérifier si la machine existe
    const machine = await prisma.machine.findUnique({
      where: { id: machineId },
      select: { id: true }
    })

    if (!machine) {
      return NextResponse.json(
        { error: 'Machine non trouvée' },
        { status: 404 }
      )
    }

    // Vérifier si une photo existe pour cette machine
    // On essaie plusieurs extensions courantes
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'machines')
    const extensions = ['jpg', 'jpeg', 'png', 'webp']
    
    for (const ext of extensions) {
      const photoPath = join(uploadDir, `${machineId}.${ext}`)
      if (existsSync(photoPath)) {
        return NextResponse.json({
          exists: true,
          url: `/uploads/machines/${machineId}.${ext}`
        })
      }
    }

    return NextResponse.json({ exists: false })
  } catch (error) {
    console.error('Erreur lors de la vérification de la photo:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la vérification de la photo' },
      { status: 500 }
    )
  }
}

// POST /api/outillage/machines/[machineId]/photo - Upload une photo
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ machineId: string }> }
) {
  try {
    const params = await context.params
    const machineId = params.machineId

    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    // Vérifier si la machine existe
    const machine = await prisma.machine.findUnique({
      where: { id: machineId },
      select: { id: true }
    })

    if (!machine) {
      return NextResponse.json(
        { error: 'Machine non trouvée' },
        { status: 404 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json(
        { error: 'Aucun fichier fourni' },
        { status: 400 }
      )
    }

    // Vérifier que c'est une image
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Le fichier doit être une image' },
        { status: 400 }
      )
    }

    // Vérifier la taille (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Le fichier est trop volumineux (max 10MB)' },
        { status: 400 }
      )
    }

    // Créer le dossier de destination s'il n'existe pas
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'machines')
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    // Supprimer l'ancienne photo si elle existe (toutes les extensions)
    const extensions = ['jpg', 'jpeg', 'png', 'webp']
    for (const ext of extensions) {
      const oldPhotoPath = join(uploadDir, `${machineId}.${ext}`)
      if (existsSync(oldPhotoPath)) {
        await unlink(oldPhotoPath)
      }
    }

    // Déterminer l'extension du nouveau fichier
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const filename = `${machineId}.${fileExtension}`
    const filePath = join(uploadDir, filename)

    // Sauvegarder le fichier
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    const url = `/uploads/machines/${filename}`

    return NextResponse.json({
      success: true,
      url
    })
  } catch (error) {
    console.error('Erreur lors de l\'upload de la photo:', error)
    return NextResponse.json(
      { error: 'Erreur lors de l\'upload de la photo' },
      { status: 500 }
    )
  }
}

// DELETE /api/outillage/machines/[machineId]/photo - Supprime la photo
export async function DELETE(
  request: Request,
  context: { params: Promise<{ machineId: string }> }
) {
  try {
    const params = await context.params
    const machineId = params.machineId

    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    // Vérifier si la machine existe
    const machine = await prisma.machine.findUnique({
      where: { id: machineId },
      select: { id: true }
    })

    if (!machine) {
      return NextResponse.json(
        { error: 'Machine non trouvée' },
        { status: 404 }
      )
    }

    // Supprimer la photo si elle existe (toutes les extensions)
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'machines')
    const extensions = ['jpg', 'jpeg', 'png', 'webp']
    let deleted = false

    for (const ext of extensions) {
      const photoPath = join(uploadDir, `${machineId}.${ext}`)
      if (existsSync(photoPath)) {
        await unlink(photoPath)
        deleted = true
      }
    }

    if (!deleted) {
      return NextResponse.json(
        { error: 'Photo non trouvée' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erreur lors de la suppression de la photo:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la suppression de la photo' },
      { status: 500 }
    )
  }
}

