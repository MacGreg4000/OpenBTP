import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { validateMediaBuffer } from '@/lib/utils/image-validation'

const PHOTOTHEQUE_DIR = path.join(process.cwd(), 'public', 'uploads', 'documents', 'phototheque')
const MAX_IMAGE_SIZE = 15 * 1024 * 1024   // 15 Mo
const MAX_VIDEO_SIZE = 200 * 1024 * 1024  // 200 Mo

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { searchParams } = request.nextUrl
    const tagsParam = searchParams.get('tags')
    const search = searchParams.get('search')?.toLowerCase()

    const tagFilter = tagsParam
      ? tagsParam.split(',').map(t => t.trim()).filter(Boolean)
      : []

    const docs = await prisma.document.findMany({
      where: {
        type: 'phototheque',
        ...(tagFilter.length > 0 && {
          tags: { some: { nom: { in: tagFilter } } }
        })
      },
      include: { tags: true, User: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' }
    })

    const results = docs
      .filter(d => {
        if (!search) return true
        const tagMatch = d.tags.some(t => t.nom.includes(search))
        const nameMatch = d.nom.toLowerCase().includes(search)
        const descMatch = (d.metadata as Record<string, string> | null)?.description
          ?.toLowerCase().includes(search)
        return tagMatch || nameMatch || descMatch
      })
      .map(d => {
        const meta = (d.metadata ?? {}) as Record<string, string>
        return {
          id: d.id,
          nom: d.nom,
          url: d.url,
          taille: d.taille,
          mimeType: d.mimeType,
          isVideo: d.mimeType?.startsWith('video/') ?? false,
          description: meta.description ?? '',
          tags: d.tags.map(t => t.nom),
          uploadedBy: d.User?.name ?? 'Inconnu',
          createdAt: d.createdAt.toISOString()
        }
      })

    return NextResponse.json(results)
  } catch (error) {
    console.error('GET /api/mediatheque error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const tagsRaw = formData.get('tags') as string | null
    const description = (formData.get('description') as string | null) ?? ''

    if (!file) {
      return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 })
    }

    const isVideo = file.type.startsWith('video/')
    const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE
    if (file.size > maxSize) {
      return NextResponse.json({
        error: `Fichier trop volumineux (max ${isVideo ? '200' : '15'} Mo)`
      }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const validation = validateMediaBuffer(buffer, file.type, file.name)
    if (!validation.isValid) {
      return NextResponse.json({
        error: 'Format non supporté (images : JPEG, PNG, WebP, HEIC, AVIF — vidéos : MP4, MOV, WebM, AVI)'
      }, { status: 400 })
    }

    let tagNames: string[] = []
    if (tagsRaw) {
      try { tagNames = JSON.parse(tagsRaw) }
      catch { return NextResponse.json({ error: 'Format tags invalide' }, { status: 400 }) }
    }

    if (!existsSync(PHOTOTHEQUE_DIR)) {
      await mkdir(PHOTOTHEQUE_DIR, { recursive: true })
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const uniqueName = `${Date.now()}_${safeName}`
    const filePath = path.join(PHOTOTHEQUE_DIR, uniqueName)
    const fileUrl = `/uploads/documents/phototheque/${uniqueName}`

    await writeFile(filePath, buffer)

    const tagsToConnect: Array<{ id: string }> = []
    for (const name of tagNames) {
      const normalized = name.trim().toLowerCase()
      if (!normalized) continue
      const tag = await prisma.tag.upsert({
        where: { nom: normalized },
        update: {},
        create: { nom: normalized },
        select: { id: true }
      })
      tagsToConnect.push({ id: tag.id })
    }

    const doc = await prisma.document.create({
      data: {
        nom: file.name,
        url: fileUrl,
        type: 'phototheque',
        mimeType: file.type || `${validation.mediaType}/${validation.safeExtension}`,
        taille: file.size,
        metadata: description ? { description } : undefined,
        User: { connect: { id: session.user.id } },
        ...(tagsToConnect.length > 0 && { tags: { connect: tagsToConnect } })
      },
      include: { tags: true }
    })

    return NextResponse.json({
      id: doc.id,
      nom: doc.nom,
      url: doc.url,
      taille: doc.taille,
      mimeType: doc.mimeType,
      isVideo: doc.mimeType?.startsWith('video/') ?? false,
      description,
      tags: doc.tags.map(t => t.nom),
      createdAt: doc.createdAt.toISOString()
    })
  } catch (error) {
    console.error('POST /api/mediatheque error:', error)
    return NextResponse.json({ error: 'Erreur serveur lors de l\'upload' }, { status: 500 })
  }
}
