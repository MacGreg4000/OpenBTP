import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
// Retrait de l'import Prisma non nécessaire

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }
    
    const { id } = (await context.params)

    // Vérifier si le sous-traitant existe
    const sousTraitant = await prisma.soustraitant.findUnique({
      where: { id }
    })

    if (!sousTraitant) {
      return NextResponse.json(
        { error: 'Sous-traitant non trouvé' },
        { status: 404 }
      )
    }

    // Supprimer le sous-traitant et tous ses ouvriers (cascade delete)
    await prisma.soustraitant.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la suppression du sous-traitant' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }
    
    const { id } = (await context.params)

    console.log('Récupération du sous-traitant avec ID:', id);

    const sousTraitant = await prisma.soustraitant.findUnique({
      where: { id },
      select: {
        id: true,
        nom: true,
        email: true,
        contact: true,
        telephone: true,
        adresse: true,
        tva: true,
        logo: true,
        actif: true,
        createdAt: true,
        updatedAt: true,
        commandes: true,
        contrats: true
      }
    })

    if (!sousTraitant) {
      console.log('Sous-traitant non trouvé avec ID:', id);
      return NextResponse.json(
        { error: 'Sous-traitant non trouvé' },
        { status: 404 }
      )
    }

    // Récupérer les ouvriers associés dans une requête séparée
    const ouvriers = await prisma.ouvrier.findMany({
      where: {
        sousTraitantId: id
      },
      include: {
        _count: {
          select: { DocumentOuvrier: true }
        }
      }
    });

    // Ajouter les ouvriers au résultat
    const result = {
      ...sousTraitant,
      ouvriers: ouvriers
    };

    console.log('Données du sous-traitant récupérées:', JSON.stringify(result, null, 2));
    return NextResponse.json(result)
  } catch (error) {
    console.error('Erreur lors de la récupération du sous-traitant:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du sous-traitant' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }
    
    const { id } = (await context.params)
    const body = await request.json()
    console.log('PATCH sous-traitant id=', id, 'payload=', body)

    // Validation souple: si on ne met à jour que "actif", on accepte sans nom/email
    if ((body.nom !== undefined || body.email !== undefined) && (!body.nom || !body.email)) {
      return NextResponse.json(
        { error: 'Le nom et l\'email sont requis pour la mise à jour des informations principales' },
        { status: 400 }
      )
    }

    // Vérifier si l'email est déjà utilisé par un autre sous-traitant
    const existingTraitant = body.email ? await prisma.soustraitant.findFirst({
      where: {
        email: body.email,
        NOT: {
          id
        }
      }
    }) : null

    if (existingTraitant) {
      return NextResponse.json(
        { error: 'Un autre sous-traitant utilise déjà cet email' },
        { status: 400 }
      )
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() }
    if (body.nom !== undefined) updateData.nom = body.nom
    if (body.email !== undefined) updateData.email = body.email
    if (body.contact !== undefined) updateData.contact = body.contact || null
    if (body.telephone !== undefined) updateData.telephone = body.telephone || null
    if (body.adresse !== undefined) updateData.adresse = body.adresse || null
    if (body.tva !== undefined) updateData.tva = body.tva || null
    if (body.actif !== undefined) updateData.actif = !!body.actif

    const sousTraitant = await prisma.soustraitant.update({
      where: { id },
      data: updateData
    })

    return NextResponse.json(sousTraitant)
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour du sous-traitant' },
      { status: 500 }
    )
  }
} 

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    const { id } = (await context.params)
    const body = await request.json()

    const exists = await prisma.soustraitant.findUnique({ where: { id } })
    if (!exists) {
      return NextResponse.json({ error: 'Sous-traitant non trouvé' }, { status: 404 })
    }

    let sousTraitant
    try {
      sousTraitant = await prisma.soustraitant.update({
        where: { id },
        data: {
          ...(body.actif !== undefined ? { actif: !!body.actif } : {}),
          updatedAt: new Date()
        }
      })
    } catch (e: unknown) {
      // Fallback si le client Prisma chargé ne connaît pas encore la colonne "actif"
      const errorMessage = e instanceof Error ? e.message : String(e)
      if (errorMessage.includes('Unknown argument `actif`')) {
        const actifValue = body.actif ? 1 : 0
        await prisma.$executeRawUnsafe(
          'UPDATE soustraitant SET actif = ?, updatedAt = NOW() WHERE id = ? LIMIT 1',
          actifValue,
          id
        )
        sousTraitant = await prisma.soustraitant.findUnique({ where: { id } })
      } else {
        throw e
      }
    }

    return NextResponse.json(sousTraitant)
  } catch (error: unknown) {
    console.error('Erreur PATCH sous-traitant:', error)
    const message = error instanceof Error ? error.message : 'Erreur lors de la mise à jour partielle du sous-traitant'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}