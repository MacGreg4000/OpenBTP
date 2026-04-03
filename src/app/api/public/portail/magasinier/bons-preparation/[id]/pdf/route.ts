import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { getMagasinierIdFromCookie } from '@/app/public/portail/auth'
import { generateBonPreparationPDF } from '@/lib/pdf/bon-preparation-pdf'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const magasinierId = getMagasinierIdFromCookie(request.headers.get('cookie'))
    if (!magasinierId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { id } = await props.params

    // Vérifier que le bon appartient bien à ce magasinier
    const bon = await prisma.bonPreparation.findUnique({
      where: { id },
      select: { id: true, magasinierId: true },
    })

    if (!bon || bon.magasinierId !== magasinierId) {
      return NextResponse.json({ error: 'Bon de préparation introuvable' }, { status: 404 })
    }

    const pdfBuffer = await generateBonPreparationPDF(id)
    if (!pdfBuffer) {
      return NextResponse.json({ error: 'Impossible de générer le PDF' }, { status: 500 })
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
    console.error('Erreur PDF bon-preparation portail magasinier:', error)
    return NextResponse.json({ error: 'Erreur serveur lors de la génération du PDF' }, { status: 500 })
  }
}

