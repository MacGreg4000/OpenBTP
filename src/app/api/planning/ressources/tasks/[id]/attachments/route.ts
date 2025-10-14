import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'
import path from 'path'
import { ensureDirectoryExists } from '@/lib/fileUploadUtils'
import fs from 'fs'

export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    const { id } = await props.params

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'Fichier requis' }, { status: 400 })

    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'tasks')
    await ensureDirectoryExists(uploadsDir)
    const fileName = `${Date.now()}-${file.name}`
    const buffer = Buffer.from(await file.arrayBuffer())
    const savePath = path.join(uploadsDir, fileName)
    await fs.promises.writeFile(savePath, buffer)

    const url = `/uploads/tasks/${fileName}`
    const created = await prisma.taskDocument.create({
      data: {
        taskId: id,
        url,
        name: file.name,
        mimeType: file.type,
        size: file.size ? Number(file.size) : null
      }
    })

    return NextResponse.json(created, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

