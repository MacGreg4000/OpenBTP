import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// DELETE /api/crm/entreprises/[id]/activites/[activiteId] - Supprimer une activité
export async function DELETE(
  _request: Request,
  props: { params: Promise<{ id: string; activiteId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { id, activiteId } = await props.params

    const activite = await prisma.prospectActivite.findFirst({
      where: { id: activiteId, entrepriseId: id },
    })
    if (!activite) {
      return NextResponse.json({ error: 'Activité non trouvée' }, { status: 404 })
    }

    await prisma.prospectActivite.delete({ where: { id: activiteId } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erreur DELETE /api/crm/entreprises/[id]/activites/[activiteId]:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la suppression de l\'activité' },
      { status: 500 }
    )
  }
}
