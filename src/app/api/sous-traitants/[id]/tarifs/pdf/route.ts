import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { generateListePrixPDF } from '@/lib/pdf/liste-prix-pdf'
import { prisma } from '@/lib/prisma/client'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { id } = await params

  const st = await prisma.soustraitant.findUnique({ where: { id }, select: { nom: true } })
  if (!st) {
    return NextResponse.json({ error: 'Sous-traitant introuvable' }, { status: 404 })
  }

  const buffer = await generateListePrixPDF(id)
  if (!buffer) {
    return NextResponse.json({ error: 'Erreur lors de la génération du PDF' }, { status: 500 })
  }

  const nomFichier = `liste-prix-${st.nom.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}.pdf`

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${nomFichier}"`,
    },
  })
}
