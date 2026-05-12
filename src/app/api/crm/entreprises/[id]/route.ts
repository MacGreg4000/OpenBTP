import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// GET /api/crm/entreprises/[id] - Détail d'une entreprise prospect
export async function GET(
  _request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { id } = await props.params

    const entreprise = await prisma.prospectEntreprise.findUnique({
      where: { id },
      include: {
        contacts: {
          orderBy: { nom: 'asc' },
        },
        rappels: {
          where: { statut: 'EN_ATTENTE' },
          orderBy: { dateRappel: 'asc' },
        },
        activites: {
          include: {
            createur: {
              select: { name: true },
            },
          },
          orderBy: { date: 'desc' },
        },
      },
    })

    if (!entreprise) {
      return NextResponse.json(
        { error: 'Entreprise non trouvée' },
        { status: 404 }
      )
    }

    return NextResponse.json(entreprise)
  } catch (error) {
    console.error('Erreur GET /api/crm/entreprises/[id]:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération de l\'entreprise' },
      { status: 500 }
    )
  }
}

// PATCH /api/crm/entreprises/[id] - Mise à jour partielle d'une entreprise prospect
export async function PATCH(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { id } = await props.params
    const body = await request.json()

    const exists = await prisma.prospectEntreprise.findUnique({ where: { id } })
    if (!exists) {
      return NextResponse.json({ error: 'Entreprise non trouvée' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}
    if (body.nom !== undefined) updateData.nom = body.nom
    if (body.type !== undefined) updateData.type = body.type
    if (body.adresse !== undefined) updateData.adresse = body.adresse || null
    if (body.codePostal !== undefined) updateData.codePostal = body.codePostal || null
    if (body.ville !== undefined) updateData.ville = body.ville || null
    if (body.pays !== undefined) updateData.pays = body.pays || null
    if (body.telephone !== undefined) updateData.telephone = body.telephone || null
    if (body.email !== undefined) updateData.email = body.email || null
    if (body.siteWeb !== undefined) updateData.siteWeb = body.siteWeb || null
    if (body.notes !== undefined) updateData.notes = body.notes || null

    const entreprise = await prisma.prospectEntreprise.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(entreprise)
  } catch (error) {
    console.error('Erreur PATCH /api/crm/entreprises/[id]:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de l\'entreprise' },
      { status: 500 }
    )
  }
}

// DELETE /api/crm/entreprises/[id] - Supprimer une entreprise prospect
export async function DELETE(
  _request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { id } = await props.params

    const exists = await prisma.prospectEntreprise.findUnique({ where: { id } })
    if (!exists) {
      return NextResponse.json({ error: 'Entreprise non trouvée' }, { status: 404 })
    }

    await prisma.prospectEntreprise.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erreur DELETE /api/crm/entreprises/[id]:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la suppression de l\'entreprise' },
      { status: 500 }
    )
  }
}
