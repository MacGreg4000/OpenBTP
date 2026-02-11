import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const magasinierId = searchParams.get('magasinierId') ?? undefined
    const statut = searchParams.get('statut') ?? undefined
    const dateMin = searchParams.get('dateMin') ?? undefined
    const dateMax = searchParams.get('dateMax') ?? undefined

    const where: Record<string, unknown> = {}
    if (magasinierId?.trim()) where.magasinierId = magasinierId.trim()
    if (statut === 'A_FAIRE' || statut === 'VALIDEE') where.statut = statut

    if (dateMin || dateMax) {
      where.dateExecution = {}
      if (dateMin?.trim()) {
        (where.dateExecution as Record<string, Date>).gte = new Date(dateMin)
      }
      if (dateMax?.trim()) {
        (where.dateExecution as Record<string, Date>).lte = new Date(dateMax + 'T23:59:59.999Z')
      }
    }

    const taches = await prisma.tacheMagasinier.findMany({
      where,
      orderBy: [{ dateExecution: 'desc' }, { createdAt: 'desc' }],
      include: {
        magasinier: { select: { id: true, nom: true } },
        createur: { select: { id: true, name: true } },
        photos: { orderBy: { ordre: 'asc' } }
      }
    })

    return NextResponse.json(taches)
  } catch (error) {
    console.error('Erreur GET logistique/taches:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    let titre: string = ''
    let description: string | undefined
    let dateExecution: string | undefined
    let magasinierId: string = ''
    let photoFiles: File[] = []

    const contentType = request.headers.get('content-type') || ''
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      titre = (formData.get('titre') as string) || ''
      description = (formData.get('description') as string) || undefined
      dateExecution = (formData.get('dateExecution') as string) || undefined
      magasinierId = (formData.get('magasinierId') as string) || ''
      photoFiles = (formData.getAll('photos') as File[]).filter(f => f?.size > 0)
    } else {
      const body = await request.json()
      titre = body.titre ?? ''
      description = body.description
      dateExecution = body.dateExecution
      magasinierId = body.magasinierId ?? ''
    }

    if (!titre?.trim()) {
      return NextResponse.json({ error: 'Titre requis' }, { status: 400 })
    }
    if (!magasinierId?.trim()) {
      return NextResponse.json({ error: 'Magasinier requis' }, { status: 400 })
    }

    const magasinier = await prisma.magasinier.findUnique({
      where: { id: magasinierId },
      select: { id: true }
    })
    if (!magasinier) {
      return NextResponse.json({ error: 'Magasinier introuvable' }, { status: 404 })
    }

    const dateExec = dateExecution?.trim()
      ? new Date(dateExecution)
      : new Date()

    const tache = await prisma.tacheMagasinier.create({
      data: {
        titre: titre.trim(),
        description: description?.trim() || null,
        dateExecution: dateExec,
        magasinierId: magasinier.id,
        creePar: session.user.id
      },
      include: {
        magasinier: { select: { id: true, nom: true } },
        photos: true
      }
    })

    // Upload photos A_FAIRE si fournies
    if (photoFiles.length > 0) {
      const { writeFile, mkdir } = await import('fs/promises')
      const path = await import('path')
      const basePath = path.join(process.cwd(), 'public', 'uploads', 'logistique', tache.id)
      await mkdir(basePath, { recursive: true })
      for (let i = 0; i < photoFiles.length; i++) {
        const file = photoFiles[i]
        if (!file.type?.startsWith('image/')) continue
        const ext = file.name.split('.').pop() || 'jpg'
        const filename = `photo-${Date.now()}-${i}.${ext}`
        const relPath = `/uploads/logistique/${tache.id}/${filename}`
        await writeFile(path.join(basePath, filename), Buffer.from(await file.arrayBuffer()))
        await prisma.photoTacheMagasinier.create({
          data: { tacheId: tache.id, type: 'A_FAIRE', url: relPath, ordre: i }
        })
      }
      const withPhotos = await prisma.tacheMagasinier.findUnique({
        where: { id: tache.id },
        include: { magasinier: { select: { id: true, nom: true } }, photos: true }
      })
      return NextResponse.json(withPhotos, { status: 201 })
    }

    return NextResponse.json(tache, { status: 201 })
  } catch (error) {
    console.error('Erreur POST logistique/taches:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
