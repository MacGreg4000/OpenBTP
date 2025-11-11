import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'

// GET /api/devis/[devisId] - Récupérer un devis
export async function GET(
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

    const devis = await prisma.devis.findUnique({
      where: { id: devisId },
      include: {
        client: true,
        createur: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        lignes: {
          orderBy: {
            ordre: 'asc'
          }
        }
      }
    })

    if (!devis) {
      return NextResponse.json(
        { error: 'Devis introuvable' },
        { status: 404 }
      )
    }

    return NextResponse.json(devis)
  } catch (error) {
    console.error('Erreur lors de la récupération du devis:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du devis' },
      { status: 500 }
    )
  }
}

// PATCH /api/devis/[devisId] - Mettre à jour un devis
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

    const devis = await prisma.devis.findUnique({
      where: { id: devisId }
    })

    if (!devis) {
      return NextResponse.json(
        { error: 'Devis introuvable' },
        { status: 404 }
      )
    }

    // Vérifier que le devis est modifiable (BROUILLON uniquement)
    if (devis.statut !== 'BROUILLON') {
      return NextResponse.json(
        { error: 'Seuls les devis en brouillon peuvent être modifiés' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { 
      clientId, 
      observations, 
      conditionsGenerales, 
      remiseGlobale,
      montantHT,
      montantTVA,
      montantTTC,
      lignes 
    } = body

    // Si des lignes sont fournies, les mettre à jour
    if (lignes !== undefined) {
      // Supprimer les anciennes lignes
      await prisma.ligneDevis.deleteMany({
        where: { devisId }
      })

      // Créer les nouvelles lignes
      await prisma.ligneDevis.createMany({
        data: lignes.map((ligne: any, index: number) => ({
          devisId,
          ordre: index + 1,
          type: ligne.type || 'QP',
          article: ligne.type === 'TITRE' || ligne.type === 'SOUS_TITRE' 
            ? (ligne.type === 'TITRE' ? 'ARTICLE_TITRE' : 'ARTICLE_SOUS_TITRE')
            : ligne.article,
          description: ligne.description,
          unite: ligne.type === 'TITRE' || ligne.type === 'SOUS_TITRE' ? '' : ligne.unite,
          quantite: ligne.type === 'TITRE' || ligne.type === 'SOUS_TITRE' ? 0 : ligne.quantite,
          prixUnitaire: ligne.type === 'TITRE' || ligne.type === 'SOUS_TITRE' ? 0 : ligne.prixUnitaire,
          remise: ligne.remise || 0,
          total: ligne.type === 'TITRE' || ligne.type === 'SOUS_TITRE' ? 0 : ligne.total
        }))
      })
    }

    // Mettre à jour le devis
    const updatedDevis = await prisma.devis.update({
      where: { id: devisId },
      data: {
        ...(clientId && { clientId }),
        ...(observations !== undefined && { observations }),
        ...(conditionsGenerales !== undefined && { conditionsGenerales }),
        ...(remiseGlobale !== undefined && { remiseGlobale }),
        ...(montantHT !== undefined && { montantHT }),
        ...(montantTVA !== undefined && { montantTVA }),
        ...(montantTTC !== undefined && { montantTTC })
      },
      include: {
        client: true,
        lignes: {
          orderBy: {
            ordre: 'asc'
          }
        }
      }
    })

    return NextResponse.json(updatedDevis)
  } catch (error) {
    console.error('Erreur lors de la mise à jour du devis:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour du devis' },
      { status: 500 }
    )
  }
}

// DELETE /api/devis/[devisId] - Supprimer un devis
export async function DELETE(
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

    // Seuls les admins peuvent supprimer
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
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

    // Vérifier que le devis n'a pas été converti
    if (devis.statut === 'CONVERTI') {
      return NextResponse.json(
        { error: 'Impossible de supprimer un devis converti en commande' },
        { status: 400 }
      )
    }

    await prisma.devis.delete({
      where: { id: devisId }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erreur lors de la suppression du devis:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la suppression du devis' },
      { status: 500 }
    )
  }
}

