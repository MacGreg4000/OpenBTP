import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'

export async function POST(_request: Request, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  try {
    const metre = await prisma.metreSoustraitant.update({
      where: { id },
      data: { statut: 'VALIDE' },
      include: { lignes: true }
    })

    // TODO: Intégrer dans soustraitant_etat_avancement (lignes/avenants) selon logique métier

    return NextResponse.json(metre)
  } catch {
    return NextResponse.json({ error: 'Validation impossible' }, { status: 400 })
  }
}
