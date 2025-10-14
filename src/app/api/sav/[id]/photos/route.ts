import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'
import path from 'path'
import fs from 'fs'

// POST /api/sav/[id]/photos (multipart)
export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { id } = await props.params
    const form = await request.formData()
    const file = form.get('file') as File | null
    const type = (form.get('type') as string) || 'CONSTAT'
    const description = (form.get('description') as string) || null
    if (!file) return NextResponse.json({ error: 'Fichier image requis' }, { status: 400 })

    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'sav')
    await fs.promises.mkdir(uploadsDir, { recursive: true })
    const fileName = `${Date.now()}-${file.name}`
    const buffer = Buffer.from(await file.arrayBuffer())
    await fs.promises.writeFile(path.join(uploadsDir, fileName), buffer)
    const url = `/uploads/sav/${fileName}`

    const created = await prisma.photoSAV.create({
      data: {
        ticketSAVId: id,
        url,
        nomOriginal: file.name,
        description,
        type: type as 'CONSTAT' | 'REPARATION' | 'AUTRE',
        prisePar: session.user.id,
      }
    })
    return NextResponse.json(created, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

