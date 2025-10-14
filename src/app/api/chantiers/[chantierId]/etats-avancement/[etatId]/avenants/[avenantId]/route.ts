import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// Fonction helper pour nettoyer et parser les floats
const cleanAndParseFloat = (value: unknown): number => {
  if (value === null || value === undefined || String(value).trim() === '') return 0;
  // Enlève les espaces (y compris insécables), les slashs, et remplace la virgule par un point
  const stringValue = String(value).replace(/\s/g, '').replace(/\//g, '').replace(',', '.');
  const parsed = parseFloat(stringValue);
  return isNaN(parsed) ? 0 : parsed;
};

// PUT /api/chantiers/[chantierId]/etats-avancement/[etatId]/avenants/[avenantId]
export async function PUT(
  request: Request,
  props: { params: Promise<{ chantierId: string; etatId: string; avenantId: string }> }
) {
  const params = await props.params;
  const chantierReadableId = params.chantierId;
  const etatNumero = parseInt(params.etatId);
  const avenantId = parseInt(params.avenantId);

  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    // Récupérer le chantier par son ID lisible pour obtenir le CUID
    const chantier = await prisma.chantier.findUnique({
      where: { chantierId: chantierReadableId }
    });

    if (!chantier) {
      return NextResponse.json({ error: 'Chantier non trouvé pour PUT avenant' }, { status: 404 });
    }

    const body = await request.json()
    // Garder la décomposition pour vérifier les undefined, mais nettoyer les valeurs avant de les utiliser
    const dataToUpdate: Partial<{ article: string; description: string; type: string; unite: string; prixUnitaire: number; quantite: number; quantiteActuelle: number; quantiteTotale: number; montantActuel: number; montantTotal: number }> = {};

    if (body.article !== undefined) dataToUpdate.article = body.article;
    if (body.description !== undefined) dataToUpdate.description = body.description;
    if (body.type !== undefined) dataToUpdate.type = body.type;
    if (body.unite !== undefined) dataToUpdate.unite = body.unite;
    if (body.prixUnitaire !== undefined) dataToUpdate.prixUnitaire = cleanAndParseFloat(body.prixUnitaire);
    if (body.quantite !== undefined) dataToUpdate.quantite = cleanAndParseFloat(body.quantite);
    if (body.quantiteActuelle !== undefined) dataToUpdate.quantiteActuelle = cleanAndParseFloat(body.quantiteActuelle);
    if (body.quantiteTotale !== undefined) dataToUpdate.quantiteTotale = cleanAndParseFloat(body.quantiteTotale);
    if (body.montantActuel !== undefined) dataToUpdate.montantActuel = cleanAndParseFloat(body.montantActuel);
    if (body.montantTotal !== undefined) dataToUpdate.montantTotal = cleanAndParseFloat(body.montantTotal);
    // quantitePrecedente et montantPrecedent ne sont généralement pas modifiables directement dans une MàJ d'avenant,
    // mais si c'est le cas, il faudrait les ajouter ici avec cleanAndParseFloat.

    // Vérifier que l'état d'avancement existe et appartient au chantier
    const etatAvancement = await prisma.etatAvancement.findFirst({
      where: {
        chantierId: chantier.id, // Utiliser le CUID du chantier
        numero: etatNumero
      }
    })

    if (!etatAvancement) {
      return NextResponse.json(
        { error: 'État d\'avancement non trouvé' },
        { status: 404 }
      )
    }

    if (etatAvancement.estFinalise) {
      return NextResponse.json(
        { error: 'L\'état d\'avancement est finalisé' },
        { status: 400 }
      )
    }

    // Vérifier que l'avenant appartient à l'état d'avancement
    const avenant = await prisma.avenantEtatAvancement.findFirst({
      where: {
        id: avenantId,
        etatAvancementId: etatAvancement.id
      }
    })

    if (!avenant) {
      return NextResponse.json(
        { error: 'Avenant non trouvé' },
        { status: 404 }
      )
    }

    // Mettre à jour l'avenant
    const updatedAvenant = await prisma.avenantEtatAvancement.update({
      where: {
        id: avenantId
      },
      data: dataToUpdate
    })

    return NextResponse.json(updatedAvenant)
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de l\'avenant' },
      { status: 500 }
    )
  }
}

// DELETE /api/chantiers/[chantierId]/etats-avancement/[etatId]/avenants/[avenantId]
export async function DELETE(
  request: Request,
  props: { params: Promise<{ chantierId: string; etatId: string; avenantId: string }> }
) {
  const params = await props.params;
  const chantierReadableId = params.chantierId;
  const etatNumero = parseInt(params.etatId);
  const avenantId = parseInt(params.avenantId);

  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    // Récupérer le chantier par son ID lisible pour obtenir le CUID
    const chantier = await prisma.chantier.findUnique({
      where: { chantierId: chantierReadableId }
    });

    if (!chantier) {
      return NextResponse.json({ error: 'Chantier non trouvé pour DELETE avenant' }, { status: 404 });
    }

    // Vérifier que l'état d'avancement existe et appartient au chantier
    const etatAvancement = await prisma.etatAvancement.findFirst({
      where: {
        chantierId: chantier.id, // Utiliser le CUID du chantier
        numero: etatNumero
      }
    })

    if (!etatAvancement) {
      return NextResponse.json(
        { error: 'État d\'avancement non trouvé' },
        { status: 404 }
      )
    }

    if (etatAvancement.estFinalise) {
      return NextResponse.json(
        { error: 'L\'état d\'avancement est finalisé' },
        { status: 400 }
      )
    }

    // Vérifier que l'avenant appartient à l'état d'avancement
    const avenant = await prisma.avenantEtatAvancement.findFirst({
      where: {
        id: avenantId,
        etatAvancementId: etatAvancement.id
      }
    })

    if (!avenant) {
      return NextResponse.json(
        { error: 'Avenant non trouvé' },
        { status: 404 }
      )
    }

    // Supprimer l'avenant
    await prisma.avenantEtatAvancement.delete({
      where: {
        id: avenantId
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la suppression de l\'avenant' },
      { status: 500 }
    )
  }
} 