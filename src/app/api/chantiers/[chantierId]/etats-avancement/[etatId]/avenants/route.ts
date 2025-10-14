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

// POST /api/chantiers/[chantierId]/etats-avancement/[etatId]/avenants
export async function POST(
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
      return NextResponse.json({ error: 'Chantier non trouvé pour POST avenant' }, { status: 404 });
    }

    const body = await request.json()

    const etatAvancement = await prisma.etatAvancement.findFirst({
      where: {
        chantierId: chantier.id,
        numero: etatNumero
      }
    })

    if (!etatAvancement) {
      return NextResponse.json(
        { error: 'État d\'avancement non trouvé' },
        { status: 404 }
      )
    }

    const avenant = await prisma.avenantEtatAvancement.create({
      data: {
        etatAvancementId: etatAvancement.id,
        article: body.article,
        description: body.description,
        type: body.type,
        unite: body.unite,
        prixUnitaire: cleanAndParseFloat(body.prixUnitaire),
        quantite: cleanAndParseFloat(body.quantite),
        quantitePrecedente: cleanAndParseFloat(body.quantitePrecedente),
        quantiteActuelle: cleanAndParseFloat(body.quantiteActuelle),
        quantiteTotale: cleanAndParseFloat(body.quantiteTotale),
        montantPrecedent: cleanAndParseFloat(body.montantPrecedent),
        montantActuel: cleanAndParseFloat(body.montantActuel),
        montantTotal: cleanAndParseFloat(body.montantTotal)
      }
    })

    return NextResponse.json(avenant)
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création de l\'avenant' },
      { status: 500 }
    )
  }
}

// PUT /api/chantiers/[chantierId]/etats-avancement/[etatId]/avenants/[avenantId]
export async function PUT(
  request: Request,
  props: { params: Promise<{ chantierId: string; etatId: string; avenantId: string }> }
) {
  const params = await props.params;
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    const body = await request.json()

    const avenant = await prisma.avenantEtatAvancement.update({
      where: {
        id: parseInt(params.avenantId)
      },
      data: {
        article: body.article !== undefined ? body.article : undefined,
        description: body.description !== undefined ? body.description : undefined,
        type: body.type !== undefined ? body.type : undefined,
        unite: body.unite !== undefined ? body.unite : undefined,
        prixUnitaire: body.prixUnitaire !== undefined ? body.prixUnitaire : undefined,
        quantite: body.quantite !== undefined ? body.quantite : undefined,
        quantiteActuelle: body.quantiteActuelle,
        quantiteTotale: body.quantiteTotale,
        montantActuel: body.montantActuel,
        montantTotal: body.montantTotal
      }
    })

    return NextResponse.json(avenant)
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
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    await prisma.avenantEtatAvancement.delete({
      where: {
        id: parseInt(params.avenantId)
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