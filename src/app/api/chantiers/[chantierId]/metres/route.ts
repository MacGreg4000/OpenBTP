import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'

// GET: Lister tous les métrés d'un chantier
export async function GET(
  request: Request,
  props: { params: Promise<{ chantierId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const params = await props.params

    const metres = await prisma.metreChantier.findMany({
      where: {
        chantierId: params.chantierId,
      },
      include: {
        categories: {
          include: {
            lignes: {
              orderBy: { ordre: 'asc' },
            },
          },
          orderBy: { ordre: 'asc' },
        },
        createdByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        date: 'desc',
      },
    })

    return NextResponse.json(metres)
  } catch (error) {
    console.error('Erreur lors du chargement des métrés:', error)
    return NextResponse.json(
      { error: 'Erreur lors du chargement des métrés' },
      { status: 500 }
    )
  }
}

// POST: Créer un nouveau métré
export async function POST(
  request: Request,
  props: { params: Promise<{ chantierId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const params = await props.params
    const body = await request.json()

    const { date, commentaire, categories } = body as {
      date: string
      commentaire?: string | null
      categories: Array<{
        nom: string
        unite: string
        ordre: number
        lignes: Array<{
          description: string
          unite: string
          longueur?: number | null
          largeur?: number | null
          hauteur?: number | null
          quantite: number
          notes?: string | null
          ordre: number
        }>
      }>
    }

    // Vérifier que le chantier existe
    const chantier = await prisma.chantier.findUnique({
      where: { chantierId: params.chantierId },
    })

    if (!chantier) {
      return NextResponse.json(
        { error: 'Chantier non trouvé' },
        { status: 404 }
      )
    }

    // Créer le métré avec ses catégories et lignes
    const metre = await prisma.metreChantier.create({
      data: {
        chantierId: params.chantierId,
        date: new Date(date),
        commentaire: commentaire || null,
        createdBy: session.user.id,
        categories: {
          create: categories.map((cat) => ({
            nom: cat.nom,
            unite: cat.unite,
            ordre: cat.ordre,
            lignes: {
              create: cat.lignes.map((ligne) => ({
                description: ligne.description,
                unite: ligne.unite,
                longueur: ligne.longueur || null,
                largeur: ligne.largeur || null,
                hauteur: ligne.hauteur || null,
                quantite: ligne.quantite,
                notes: ligne.notes || null,
                ordre: ligne.ordre,
              })),
            },
          })),
        },
      },
      include: {
        categories: {
          include: {
            lignes: {
              orderBy: { ordre: 'asc' },
            },
          },
          orderBy: { ordre: 'asc' },
        },
        createdByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    return NextResponse.json(metre, { status: 201 })
  } catch (error) {
    console.error('Erreur lors de la création du métré:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création du métré' },
      { status: 500 }
    )
  }
}

