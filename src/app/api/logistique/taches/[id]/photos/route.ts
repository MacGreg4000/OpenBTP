import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

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
    const files = formData.getAll('photos') as File[]

    if (!files?.length) {
      return NextResponse.json({ error: 'Aucune photo' }, { status: 400 })
    }

    await mkdir(join(LOGISTIQUE_PHOTOS_PATH, tacheId), { recursive: true })

    const count = await prisma.photoTacheMagasinier.count({ where: { tacheId } })
    const urls: string[] = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (!file.type?.startsWith('image/')) continue

      const ext = file.name.split('.').pop() || 'jpg'
      const filename = `photo-${Date.now()}-${i}.${ext}`
      const relPath = `/uploads/logistique/${tacheId}/${filename}`
      const fullPath = join(LOGISTIQUE_PHOTOS_PATH, tacheId, filename)
      const buffer = Buffer.from(await file.arrayBuffer())
      await writeFile(fullPath, buffer)

      await prisma.photoTacheMagasinier.create({
        data: {
          tacheId,
          type,
          url: relPath,
          ordre: count + i
        }
      })
      urls.push(relPath)
    }

    return NextResponse.json({ success: true, urls })
  } catch (error) {
    console.error('Erreur POST photos tache:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
