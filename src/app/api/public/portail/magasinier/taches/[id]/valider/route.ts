import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

const LOGISTIQUE_PHOTOS_PATH = join(process.cwd(), 'public', 'uploads', 'logistique')

function getMagasinierFromCookie(request: NextRequest): string | null {
  const cookieHeader = request.headers.get('cookie')
  if (!cookieHeader) return null
  const m = /portalSession=([^;]+)/.exec(cookieHeader)
  if (!m) return null
  try {
    const decoded = decodeURIComponent(m[1])
    const [type, id] = decoded.split(':')
    if (type === 'MAGASINIER' && id) return id
    return null
  } catch {
    return null
  }
}

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const magasinierId = getMagasinierFromCookie(request)
    if (!magasinierId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { id: tacheId } = await props.params
    const tache = await prisma.tacheMagasinier.findUnique({
      where: { id: tacheId },
      select: { id: true, magasinierId: true, statut: true }
    })

    if (!tache || tache.magasinierId !== magasinierId) {
      return NextResponse.json({ error: 'Tâche introuvable' }, { status: 404 })
    }

    if (tache.statut === 'VALIDEE') {
      return NextResponse.json({ error: 'Déjà validée' }, { status: 400 })
    }

    let photoFiles: File[] = []
    let commentaire: string | undefined

    const contentType = request.headers.get('content-type') || ''
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      commentaire = (formData.get('commentaire') as string) || undefined
      photoFiles = (formData.getAll('photos') as File[]).filter(f => f?.size > 0)
    } else {
      try {
        const body = await request.json()
        commentaire = body.commentaire
      } catch {
        // Pas de body
      }
    }

    await prisma.tacheMagasinier.update({
      where: { id: tacheId },
      data: {
        statut: 'VALIDEE',
        dateValidation: new Date(),
        commentaire: commentaire?.trim() || null
      }
    })

    if (photoFiles.length > 0) {
      await mkdir(join(LOGISTIQUE_PHOTOS_PATH, tacheId), { recursive: true })
      const count = await prisma.photoTacheMagasinier.count({ where: { tacheId } })
      for (let i = 0; i < photoFiles.length; i++) {
        const file = photoFiles[i]
        if (!file.type?.startsWith('image/')) continue
        const ext = file.name.split('.').pop() || 'jpg'
        const filename = `preuve-${Date.now()}-${i}.${ext}`
        const relPath = `/uploads/logistique/${tacheId}/${filename}`
        await writeFile(
          join(LOGISTIQUE_PHOTOS_PATH, tacheId, filename),
          Buffer.from(await file.arrayBuffer())
        )
        await prisma.photoTacheMagasinier.create({
          data: { tacheId, type: 'PREUVE', url: relPath, ordre: count + i }
        })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erreur valider tache:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
