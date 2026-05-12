import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// GET /api/crm/entreprises/[id]/contacts - Liste des contacts d'une entreprise
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

    const entreprise = await prisma.prospectEntreprise.findUnique({ where: { id } })
    if (!entreprise) {
      return NextResponse.json({ error: 'Entreprise non trouvée' }, { status: 404 })
    }

    const contacts = await prisma.prospectContact.findMany({
      where: { entrepriseId: id },
      orderBy: { nom: 'asc' },
    })

    return NextResponse.json(contacts)
  } catch (error) {
    console.error('Erreur GET /api/crm/entreprises/[id]/contacts:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des contacts' },
      { status: 500 }
    )
  }
}

// POST /api/crm/entreprises/[id]/contacts - Créer un contact pour une entreprise
export async function POST(
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

    if (!body.prenom || !body.nom) {
      return NextResponse.json(
        { error: 'Le prénom et le nom du contact sont requis' },
        { status: 400 }
      )
    }

    const entreprise = await prisma.prospectEntreprise.findUnique({ where: { id } })
    if (!entreprise) {
      return NextResponse.json({ error: 'Entreprise non trouvée' }, { status: 404 })
    }

    const contact = await prisma.prospectContact.create({
      data: {
        entrepriseId: id,
        prenom: body.prenom,
        nom: body.nom,
        role: body.role || null,
        telephone: body.telephone || null,
        mobile: body.mobile || null,
        email: body.email || null,
        notes: body.notes || null,
      },
    })

    return NextResponse.json(contact, { status: 201 })
  } catch (error) {
    console.error('Erreur POST /api/crm/entreprises/[id]/contacts:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création du contact' },
      { status: 500 }
    )
  }
}
