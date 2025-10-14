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

// DELETE /api/chantiers/[chantierId]/etats-avancement/[etatId]/lignes/[ligneId]
export async function DELETE(
  request: Request,
  props: { params: Promise<{ chantierId: string; etatId: string; ligneId: string }> }
) {
  const params = await props.params;
  const chantierReadableId = params.chantierId;
  const etatNumero = parseInt(params.etatId);
  const ligneId = parseInt(params.ligneId);

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
      return NextResponse.json({ error: 'Chantier non trouvé pour DELETE ligne' }, { status: 404 });
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

    // Vérifier que la ligne appartient à l'état d'avancement
    const ligne = await prisma.ligneEtatAvancement.findFirst({
      where: {
        id: ligneId,
        etatAvancementId: etatAvancement.id
      }
    })

    if (!ligne) {
      return NextResponse.json(
        { error: 'Ligne non trouvée' },
        { status: 404 }
      )
    }

    // Supprimer la ligne
    await prisma.ligneEtatAvancement.delete({
      where: {
        id: ligneId
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la suppression de la ligne' },
      { status: 500 }
    )
  }
}

// PUT /api/chantiers/[chantierId]/etats-avancement/[etatId]/lignes/[ligneId]
export async function PUT(
  request: Request,
  props: { params: Promise<{ chantierId: string; etatId: string; ligneId: string }> }
) {
  const params = await props.params;
  const chantierReadableId = params.chantierId;
  const etatNumero = parseInt(params.etatId);
  const ligneId = parseInt(params.ligneId);

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
      return NextResponse.json({ error: 'Chantier non trouvé pour PUT ligne' }, { status: 404 });
    }

    const body = await request.json();

    // Utilisation de la fonction helper pour nettoyer et parser
    const quantiteActuelle = cleanAndParseFloat(body.quantiteActuelle);
    const quantiteTotale = cleanAndParseFloat(body.quantiteTotale);
    const montantActuel = cleanAndParseFloat(body.montantActuel);
    const montantTotal = cleanAndParseFloat(body.montantTotal);

    // Optionnel: Log pour vérifier les valeurs après parsing si le problème persiste
    // console.log('Valeurs parsées pour MàJ ligne:', { quantiteActuelle, quantiteTotale, montantActuel, montantTotal });

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

    // Vérifier que la ligne appartient à l'état d'avancement
    const ligne = await prisma.ligneEtatAvancement.findFirst({
      where: {
        id: ligneId,
        etatAvancementId: etatAvancement.id
      }
    })

    if (!ligne) {
      return NextResponse.json(
        { error: 'Ligne non trouvée' },
        { status: 404 }
      )
    }

    // Mettre à jour la ligne
    const updatedLigne = await prisma.ligneEtatAvancement.update({
      where: {
        id: ligneId
      },
      data: {
        quantiteActuelle: quantiteActuelle, // Utiliser directement les valeurs nettoyées
        quantiteTotale: quantiteTotale,
        montantActuel: montantActuel,
        montantTotal: montantTotal
      }
    })

    return NextResponse.json(updatedLigne)
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de la ligne' },
      { status: 500 }
    )
  }
} 