import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

const DOCUMENTS_BASE_PATH = join(process.cwd(), 'public', 'uploads', 'documents')

// POST /api/metres-plan/[id]/export
export async function POST(
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
    const pdfFile = formData.get('pdf') as Blob | null
    const fileName = formData.get('fileName') as string | null

    if (!pdfFile) {
      return NextResponse.json({ error: 'Fichier PDF requis' }, { status: 400 })
    }

    const name = fileName || `metre-plan-export-${id}.pdf`

    const metrePlan = await prisma.metrePlan.findUnique({
      where: { id },
      select: { chantierId: true, nom: true },
    })

    if (!metrePlan) {
      return NextResponse.json({ error: 'Métré sur plan non trouvé' }, { status: 404 })
    }

    const pdfBuffer = Buffer.from(await pdfFile.arrayBuffer())

    if (metrePlan.chantierId) {
      // Sauvegarder dans le dossier documents du chantier
      const chantierDir = join(DOCUMENTS_BASE_PATH, metrePlan.chantierId)
      await mkdir(chantierDir, { recursive: true })

      const filePath = join(chantierDir, name)
      await writeFile(filePath, pdfBuffer)

      // Créer l'entrée Document dans la BDD
      const document = await prisma.document.create({
        data: {
          nom: name,
          type: 'metre-plan-export',
          url: `/uploads/documents/${metrePlan.chantierId}/${name}`,
          taille: pdfBuffer.length,
          mimeType: 'application/pdf',
          chantierId: metrePlan.chantierId,
          createdBy: session.user.id,
          updatedAt: new Date(),
        },
      })

      return NextResponse.json({ success: true, document })
    } else {
      // Pas de chantier associé : retourner le fichier en téléchargement direct
      return new NextResponse(pdfBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${name}"`,
        },
      })
    }
  } catch (error) {
    console.error('Erreur POST /api/metres-plan/[id]/export:', error)
    return NextResponse.json(
      { error: "Erreur lors de l'export du métré sur plan" },
      { status: 500 }
    )
  }
}
