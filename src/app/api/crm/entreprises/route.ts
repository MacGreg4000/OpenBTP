import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// GET /api/crm/entreprises - Liste des entreprises prospects
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')?.trim() || ''
    const type = searchParams.get('type')?.trim() || ''

    const entreprises = await prisma.prospectEntreprise.findMany({
      where: {
        AND: [
          search
            ? {
                OR: [
                  { nom: { contains: search } },
                  { ville: { contains: search } },
                  { email: { contains: search } },
                ],
              }
            : {},
          type ? { type } : {},
        ],
      },
      include: {
        _count: {
          select: {
            contacts: true,
            rappels: true,
          },
        },
      },
      orderBy: { nom: 'asc' },
    })

    return NextResponse.json(entreprises)
  } catch (error) {
    console.error('Erreur GET /api/crm/entreprises:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des entreprises' },
      { status: 500 }
    )
  }
}

// POST /api/crm/entreprises - Créer une entreprise prospect
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const body = await request.json()

    if (!body.nom) {
      return NextResponse.json(
        { error: 'Le nom de l\'entreprise est requis' },
        { status: 400 }
      )
    }

    const entreprise = await prisma.prospectEntreprise.create({
      data: {
        nom: body.nom,
        type: body.type || 'AUTRE',
        adresse: body.adresse || null,
        codePostal: body.codePostal || null,
        ville: body.ville || null,
        pays: body.pays || 'Belgique',
        telephone: body.telephone || null,
        email: body.email || null,
        siteWeb: body.siteWeb || null,
        notes: body.notes || null,
      },
    })

    return NextResponse.json(entreprise, { status: 201 })
  } catch (error) {
    console.error('Erreur POST /api/crm/entreprises:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création de l\'entreprise' },
      { status: 500 }
    )
  }
}
