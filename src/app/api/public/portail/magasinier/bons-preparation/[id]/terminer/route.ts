import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { getMagasinierIdFromCookie } from '@/app/public/portail/auth'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const magasinierId = getMagasinierIdFromCookie(request.headers.get('cookie'))
    if (!magasinierId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { id } = await params

    // Vérifier que le bon appartient bien à ce magasinier
    const bon = await prisma.bonPreparation.findFirst({
      where: { id, magasinierId },
    })

    if (!bon) {
      return NextResponse.json({ error: 'Bon non trouvé' }, { status: 404 })
    }

    await prisma.bonPreparation.update({
      where: { id },
      data: { statut: 'TERMINE' },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erreur POST terminer bon-preparation:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
