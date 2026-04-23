import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { validateImageBuffer } from '@/lib/utils/image-validation'

const LOGISTIQUE_PHOTOS_PATH = join(process.cwd(), 'public', 'uploads', 'logistique')

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { id: tacheId } = await props.params
    const tache = await prisma.tacheMagasinier.findUnique({
      where: { id: tacheId },
      select: { id: true }
    })
    if (!tache) {
      return NextResponse.json({ error: 'Tâche introuvable' }, { status: 404 })
    }

    const formData = await request.formData()
    const type = (formData.get('type') as string) || 'A_FAIRE'
    const rawFiles = formData.getAll('photos') as File[]

    if (!rawFiles?.length) {
      return NextResponse.json({ error: 'Aucune photo' }, { status: 400 })
    }

    // Lire TOUS les buffers en mémoire d'un seul coup avant tout traitement.
    // Les File objects de FormData sont parfois backed par un stream qui ne peut
    // être lu qu'une fois — on matérialise tout ici pour éviter ce problème.
    const entries = await Promise.all(
      rawFiles
        .filter(f => f.size > 0)
        .map(async (f) => ({
          buffer: Buffer.from(await f.arrayBuffer()),
          name: f.name,
          type: f.type,
        }))
    )

    await mkdir(join(LOGISTIQUE_PHOTOS_PATH, tacheId), { recursive: true })

    const count = await prisma.photoTacheMagasinier.count({ where: { tacheId } })
    const urls: string[] = []
    let rejected = 0
    let ordreOffset = 0

    for (const entry of entries) {
      const validation = validateImageBuffer(entry.buffer, entry.type, entry.name)
      if (!validation.isValid) {
        rejected++
        continue
      }

      const filename = `photo-${Date.now()}-${ordreOffset}.${validation.safeExtension}`
      const relPath = `/uploads/logistique/${tacheId}/${filename}`
      const fullPath = join(LOGISTIQUE_PHOTOS_PATH, tacheId, filename)
      await writeFile(fullPath, entry.buffer)

      await prisma.photoTacheMagasinier.create({
        data: {
          tacheId,
          type,
          url: relPath,
          ordre: count + ordreOffset
        }
      })
      urls.push(relPath)
      ordreOffset++
    }

    if (urls.length === 0) {
      return NextResponse.json(
        { error: `Aucune photo valide. ${rejected} fichier(s) rejeté(s) : format non supporté (acceptés : JPEG, PNG, WebP, HEIC, AVIF).` },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      urls,
      ...(rejected > 0 && { warning: `${rejected} photo(s) ignorée(s) : format non supporté.` })
    })
  } catch (error) {
    console.error('Erreur POST photos tache:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
