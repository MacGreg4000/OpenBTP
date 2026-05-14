import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

const METRES_PLAN_BASE_PATH = join(process.cwd(), 'public', 'uploads', 'metres-plan')

// GET /api/metres-plan/[id]/file
export async function GET(
  _request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const filePath = join(METRES_PLAN_BASE_PATH, id, 'project.mplan')

    if (!existsSync(filePath)) {
      return NextResponse.json({ error: 'Fichier non trouvé' }, { status: 404 })
    }

    const fileBuffer = await readFile(filePath)

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="project.mplan"`,
      },
    })
  } catch (error) {
    console.error('Erreur GET /api/metres-plan/[id]/file:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la lecture du fichier' },
      { status: 500 }
    )
  }
}

// PUT /api/metres-plan/[id]/file
export async function PUT(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const formData = await request.formData()
    const mplanFile = formData.get('mplan') as Blob | null
    const pdfFile = formData.get('pdf') as Blob | null

    if (!mplanFile) {
      return NextResponse.json({ error: 'Fichier .mplan requis' }, { status: 400 })
    }

    const dir = join(METRES_PLAN_BASE_PATH, id)
    await mkdir(dir, { recursive: true })

    // Écrire le fichier .mplan
    const mplanPath = join(dir, 'project.mplan')
    const mplanBuffer = Buffer.from(await mplanFile.arrayBuffer())
    await writeFile(mplanPath, mplanBuffer)

    const mplanUrl = `/uploads/metres-plan/${id}/project.mplan`
    let pdfUrl: string | null = null

    // Écrire le fichier PDF si fourni
    if (pdfFile) {
      const pdfPath = join(dir, 'original.pdf')
      const pdfBuffer = Buffer.from(await pdfFile.arrayBuffer())
      await writeFile(pdfPath, pdfBuffer)
      pdfUrl = `/uploads/metres-plan/${id}/original.pdf`
    }

    const metrePlan = await prisma.metrePlan.update({
      where: { id },
      data: {
        mplanUrl,
        ...(pdfUrl !== null && { pdfUrl }),
      },
    })

    return NextResponse.json(metrePlan)
  } catch (error) {
    console.error('Erreur PUT /api/metres-plan/[id]/file:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la sauvegarde du fichier' },
      { status: 500 }
    )
  }
}
