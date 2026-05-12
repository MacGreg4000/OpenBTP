import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// PATCH /api/crm/entreprises/[id]/contacts/[contactId] - Mise à jour partielle d'un contact
export async function PATCH(
  request: Request,
  props: { params: Promise<{ id: string; contactId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { id, contactId } = await props.params
    const body = await request.json()

    const contact = await prisma.prospectContact.findFirst({
      where: { id: contactId, entrepriseId: id },
    })
    if (!contact) {
      return NextResponse.json({ error: 'Contact non trouvé' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}
    if (body.prenom !== undefined) updateData.prenom = body.prenom
    if (body.nom !== undefined) updateData.nom = body.nom
    if (body.role !== undefined) updateData.role = body.role || null
    if (body.telephone !== undefined) updateData.telephone = body.telephone || null
    if (body.mobile !== undefined) updateData.mobile = body.mobile || null
    if (body.email !== undefined) updateData.email = body.email || null
    if (body.notes !== undefined) updateData.notes = body.notes || null

    const updated = await prisma.prospectContact.update({
      where: { id: contactId },
      data: updateData,
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Erreur PATCH /api/crm/entreprises/[id]/contacts/[contactId]:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour du contact' },
      { status: 500 }
    )
  }
}

// DELETE /api/crm/entreprises/[id]/contacts/[contactId] - Supprimer un contact
export async function DELETE(
  _request: Request,
  props: { params: Promise<{ id: string; contactId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { id, contactId } = await props.params

    const contact = await prisma.prospectContact.findFirst({
      where: { id: contactId, entrepriseId: id },
    })
    if (!contact) {
      return NextResponse.json({ error: 'Contact non trouvé' }, { status: 404 })
    }

    await prisma.prospectContact.delete({ where: { id: contactId } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erreur DELETE /api/crm/entreprises/[id]/contacts/[contactId]:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la suppression du contact' },
      { status: 500 }
    )
  }
}
