import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'

// PATCH /api/etats-avancement/[id]/facture - Met à jour le numéro de facture (option B: null/vide = non facturé)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { id } = await params
    const etatId = parseInt(id, 10)
    if (Number.isNaN(etatId)) {
      return NextResponse.json({ error: 'ID invalide' }, { status: 400 })
    }

    const body = await request.json()
    const factureNumero = body.factureNumero === undefined
      ? undefined
      : (body.factureNumero === null || body.factureNumero === '')
        ? null
        : String(body.factureNumero).trim() || null

    const updated = await prisma.etatAvancement.update({
      where: { id: etatId },
      data: { factureNumero }
    })

    return NextResponse.json({
      id: updated.id,
      factureNumero: updated.factureNumero
    })
  } catch (error) {
    console.error('Erreur PATCH /api/etats-avancement/[id]/facture:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
