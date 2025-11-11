import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'

// PATCH /api/devis/[devisId]/status - Changer le statut d'un devis
export async function PATCH(
  request: NextRequest,
  props: { params: Promise<{ devisId: string }> }
) {
  const params = await props.params
  const { devisId } = params
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const body = await request.json()
    const { statut } = body

    if (!statut) {
      return NextResponse.json(
        { error: 'Le statut est obligatoire' },
        { status: 400 }
      )
    }

    const validStatuts = ['BROUILLON', 'EN_ATTENTE', 'ACCEPTE', 'REFUSE', 'EXPIRE']
    if (!validStatuts.includes(statut)) {
      return NextResponse.json(
        { error: 'Statut invalide' },
        { status: 400 }
      )
    }

    const devis = await prisma.devis.findUnique({
      where: { id: devisId }
    })

    if (!devis) {
      return NextResponse.json(
        { error: 'Devis introuvable' },
        { status: 404 }
      )
    }

    // Vérifier que le devis n'est pas déjà converti
    if (devis.statut === 'CONVERTI') {
      return NextResponse.json(
        { error: 'Impossible de modifier le statut d\'un devis converti' },
        { status: 400 }
      )
    }

    const updatedDevis = await prisma.devis.update({
      where: { id: devisId },
      data: { statut },
      include: {
        client: true,
        createur: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    return NextResponse.json(updatedDevis)
  } catch (error) {
    console.error('Erreur lors du changement de statut:', error)
    return NextResponse.json(
      { error: 'Erreur lors du changement de statut' },
      { status: 500 }
    )
  }
}

