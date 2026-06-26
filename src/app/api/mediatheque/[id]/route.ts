import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'
import { unlink } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

type Params = { params: Promise<{ id: string }> }

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { id } = await params
    const docId = parseInt(id, 10)

    const doc = await prisma.document.findUnique({ where: { id: docId } })
    if (!doc) {
      return NextResponse.json({ error: 'Photo non trouvée' }, { status: 404 })
    }
    if (doc.type !== 'phototheque') {
      return NextResponse.json({ error: 'Document non accessible' }, { status: 403 })
    }

    // Seul le créateur ou un admin peut supprimer
    if (doc.createdBy !== session.user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    await prisma.document.delete({ where: { id: docId } })

    // Supprimer le fichier physique
    const filePath = path.join(process.cwd(), 'public', doc.url)
    if (existsSync(filePath)) {
      await unlink(filePath).catch(() => { /* non bloquant */ })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/mediatheque/[id] error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { id } = await params
    const docId = parseInt(id, 10)

    const doc = await prisma.document.findUnique({ where: { id: docId } })
    if (!doc || doc.type !== 'phototheque') {
      return NextResponse.json({ error: 'Photo non trouvée' }, { status: 404 })
    }

    const { tags, description } = await request.json() as { tags?: string[]; description?: string }

    // Upsert + reconnexion tags
    const tagConnects: Array<{ id: string }> = []
    for (const name of tags ?? []) {
      const normalized = name.trim().toLowerCase()
      if (!normalized) continue
      const tag = await prisma.tag.upsert({
        where: { nom: normalized },
        update: {},
        create: { nom: normalized },
        select: { id: true }
      })
      tagConnects.push({ id: tag.id })
    }

    const existingMeta = (doc.metadata ?? {}) as Record<string, unknown>
    const newMeta = description !== undefined
      ? { ...existingMeta, description }
      : existingMeta

    const updated = await prisma.document.update({
      where: { id: docId },
      data: {
        metadata: newMeta,
        tags: { set: tagConnects }
      },
      include: { tags: true }
    })

    return NextResponse.json({
      id: updated.id,
      tags: updated.tags.map(t => t.nom),
      description: (updated.metadata as Record<string, string> | null)?.description ?? ''
    })
  } catch (error) {
    console.error('PUT /api/mediatheque/[id] error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
