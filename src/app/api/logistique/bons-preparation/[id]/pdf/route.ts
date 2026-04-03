import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { generateBonPreparationPDF } from '@/lib/pdf/bon-preparation-pdf'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { id } = await props.params
    const pdfBuffer = await generateBonPreparationPDF(id)

    if (!pdfBuffer) {
      return NextResponse.json({ error: 'Bon de préparation introuvable' }, { status: 404 })
    }

    // NextResponse attend un BodyInit (Uint8Array / ArrayBuffer, etc.)
    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="bon-preparation-${id.slice(0, 8)}.pdf"`,
      },
    })
  } catch (error) {
    console.error('Erreur génération PDF bon-preparation:', error)
    return NextResponse.json({ error: 'Erreur serveur lors de la génération du PDF' }, { status: 500 })
  }
}
