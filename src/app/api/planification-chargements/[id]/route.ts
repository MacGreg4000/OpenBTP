import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'

// PUT - Marquer un chargement comme chargé
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { id } = await params
    const { action } = await request.json()

    if (action === 'charger') {
      // Marquer comme chargé
      const chargement = await prisma.chargement.update({
        where: { id },
        data: {
          estCharge: true,
          dateChargement: new Date()
        }
      })

      return NextResponse.json(chargement)
    }

    if (action === 'reporter') {
      const chargementActuel = await prisma.chargement.findUnique({ where: { id } })

      if (!chargementActuel) {
        return NextResponse.json({ error: 'Chargement non trouvé' }, { status: 404 })
      }

      // Calcul de la semaine ISO courante
      const now = new Date()
      const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))
      const dayNum = d.getUTCDay() || 7
      d.setUTCDate(d.getUTCDate() + 4 - dayNum)
      const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
      const currentWeekISO = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)

      // Si le chargement est déjà dans la semaine courante ou future, reporter à la suivante
      // Sinon (chargement en retard), ramener à la semaine courante
      const targetWeek = chargementActuel.semaine < currentWeekISO
        ? currentWeekISO
        : chargementActuel.semaine + 1

      const chargement = await prisma.chargement.update({
        where: { id },
        data: { semaine: targetWeek }
      })

      return NextResponse.json(chargement)
    }

    return NextResponse.json({ error: 'Action non reconnue' }, { status: 400 })
  } catch (error) {
    console.error('Erreur lors de la mise à jour du chargement:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour du chargement' },
      { status: 500 }
    )
  }
}

// DELETE - Supprimer un chargement
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { id } = await params

    await prisma.chargement.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erreur lors de la suppression du chargement:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la suppression du chargement' },
      { status: 500 }
    )
  }
}
