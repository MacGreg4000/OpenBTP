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
      // Reporter à la semaine suivante (calculer la prochaine semaine de l'année)
      const chargementActuel = await prisma.chargement.findUnique({
        where: { id }
      })

      if (!chargementActuel) {
        return NextResponse.json({ error: 'Chargement non trouvé' }, { status: 404 })
      }

      // Calculer la prochaine semaine
      const now = new Date()
      const currentYear = now.getFullYear()
      const startOfYear = new Date(currentYear, 0, 1)
      const days = Math.floor((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000))
      const currentWeek = Math.ceil((days + startOfYear.getDay() + 1) / 7)
      
      const nextWeek = chargementActuel.semaine + 1

      const chargement = await prisma.chargement.update({
        where: { id },
        data: {
          semaine: nextWeek
        }
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
