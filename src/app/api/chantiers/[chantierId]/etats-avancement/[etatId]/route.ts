import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
// Types locaux minimalistes pour éviter la dépendance aux types Prisma générés
type LigneEtatAvancement = {
  montantPrecedent: number
  montantActuel: number
  montantTotal: number
  ligneCommandeId?: number
}
type AvenantEtatAvancement = {
  montantTotal: number
}
type EtatAvancement = {
  id: number
  numero: number
}

// Définition des types avec les relations
type EtatAvancementWithRelations = EtatAvancement & {
  lignes: LigneEtatAvancement[];
  avenants: AvenantEtatAvancement[];
}

// GET /api/chantiers/[chantierId]/etats-avancement/[etatId]
export async function GET(
  request: Request,
  props: { params: Promise<{ chantierId: string; etatId: string }> }
) {
  const params = await props.params;
  const chantierReadableId = params.chantierId;
  const etatNumero = parseInt(params.etatId);

  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    const chantier = await prisma.chantier.findUnique({
      where: { chantierId: chantierReadableId }
    });

    if (!chantier) {
      return NextResponse.json({ error: 'Chantier non trouvé pour GET etatId' }, { status: 404 });
    }

    const etatAvancement = await prisma.etatAvancement.findFirst({
      where: {
        chantierId: chantier.id,
        numero: etatNumero
      },
      include: {
        lignes: {
          orderBy: {
            ligneCommandeId: 'asc'
          }
        },
        avenants: {
          orderBy: {
            id: 'asc'
          }
        }
      }
    }) as EtatAvancementWithRelations | null

    if (!etatAvancement) {
      return NextResponse.json(
        { error: 'État d\'avancement non trouvé' },
        { status: 404 }
      )
    }

    // Calculer les totaux
    const totaux = {
      montantPrecedent: etatAvancement.lignes.reduce((sum: number, ligne: LigneEtatAvancement) => sum + ligne.montantPrecedent, 0),
      montantActuel: etatAvancement.lignes.reduce((sum: number, ligne: LigneEtatAvancement) => sum + ligne.montantActuel, 0),
      montantTotal: etatAvancement.lignes.reduce((sum: number, ligne: LigneEtatAvancement) => sum + ligne.montantTotal, 0),
      montantAvenants: etatAvancement.avenants.reduce((sum: number, avenant: AvenantEtatAvancement) => sum + avenant.montantTotal, 0)
    }

    return NextResponse.json({
      ...etatAvancement,
      totaux
    })
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération de l\'état d\'avancement' },
      { status: 500 }
    )
  }
}

// PUT /api/chantiers/[chantierId]/etats-avancement/[etatId]
export async function PUT(
  request: Request,
  props: { params: Promise<{ chantierId: string; etatId: string }> }
) {
  const params = await props.params;
  const chantierReadableId = params.chantierId;
  const etatNumero = parseInt(params.etatId);

  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    const chantier = await prisma.chantier.findUnique({
      where: { chantierId: chantierReadableId }
    });

    if (!chantier) {
      return NextResponse.json({ error: 'Chantier non trouvé pour PUT etatId' }, { status: 404 });
    }

    const body = await request.json()

    // Construire dynamiquement l'objet data en fonction des champs présents dans la requête
    const updateData: Partial<{ commentaires: string; estFinalise: boolean; mois: number }> = {};
    
    if (body.commentaires !== undefined) updateData.commentaires = body.commentaires;
    if (body.estFinalise !== undefined) updateData.estFinalise = body.estFinalise;
    if (body.mois !== undefined) updateData.mois = body.mois;

    const etatAvancement = await prisma.etatAvancement.update({
      where: {
        chantierId_numero: {
          chantierId: chantier.id,
          numero: etatNumero
        }
      },
      data: updateData,
      include: {
        lignes: {
          orderBy: {
            ligneCommandeId: 'asc'
          }
        },
        avenants: {
          orderBy: {
            id: 'asc'
          }
        }
      }
    }) as EtatAvancementWithRelations

    return NextResponse.json(etatAvancement)
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de l\'état d\'avancement' },
      { status: 500 }
    )
  }
}

// DELETE /api/chantiers/[chantierId]/etats-avancement/[etatId]
export async function DELETE(
  request: Request,
  props: { params: Promise<{ chantierId: string; etatId: string }> }
) {
  const params = await props.params;
  const chantierReadableId = params.chantierId;
  const etatNumeroToDelete = parseInt(params.etatId);

  try {
    const session = await getServerSession(authOptions)
    if (!session || !['ADMIN', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    const chantier = await prisma.chantier.findUnique({
      where: { chantierId: chantierReadableId }
    });

    if (!chantier) {
      return NextResponse.json({ error: 'Chantier non trouvé pour DELETE etatId' }, { status: 404 });
    }

    // Vérifier si c'est le dernier état d'avancement
    const latestEtat = await prisma.etatAvancement.findFirst({
      where: { chantierId: chantier.id },
      orderBy: { numero: 'desc' }
    });

    if (!latestEtat) {
      return NextResponse.json({ error: 'Aucun état d\'avancement trouvé pour ce chantier.' }, { status: 404 });
    }

    if (latestEtat.numero !== etatNumeroToDelete) {
      return NextResponse.json({ error: 'Seul le dernier état d\'avancement peut être supprimé.' }, { status: 400 });
    }

    // Si l'état à supprimer est bien le dernier, procéder à la suppression
    // La vérification de l'existence est implicitement faite par la logique ci-dessus (latestEtat.numero === etatNumeroToDelete)
    await prisma.etatAvancement.delete({
      where: {
        chantierId_numero: {
          chantierId: chantier.id,
          numero: etatNumeroToDelete
        }
      }
    });

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la suppression de l\'état d\'avancement' },
      { status: 500 }
    )
  }
} 