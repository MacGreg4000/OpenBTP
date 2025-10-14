import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

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

    console.log('DEBUG - Récupération des ouvriers pour le sous-traitant ID:', id);

    // Vérifier d'abord si le sous-traitant existe
    const sousTraitant = await prisma.soustraitant.findUnique({
      where: { id }
    });

    if (!sousTraitant) {
      console.log('DEBUG - Sous-traitant non trouvé avec ID:', id);
      return NextResponse.json(
        { error: 'Sous-traitant non trouvé' },
        { status: 404 }
      );
    }

    console.log('DEBUG - Sous-traitant trouvé:', sousTraitant.nom);

    const ouvriers = await prisma.ouvrier.findMany({
      where: { 
        sousTraitantId: id 
      },
      include: {
        _count: {
          select: { DocumentOuvrier: true }
        }
      },
      orderBy: {
        nom: 'asc'
      }
    })

    console.log(`DEBUG - Requête ouvriers exécutée. Nombre trouvés: ${ouvriers.length}`);
    if (ouvriers.length > 0) {
      console.log('DEBUG - Premier ouvrier trouvé:', JSON.stringify(ouvriers[0], null, 2));
    } else {
      console.log('DEBUG - Aucun ouvrier trouvé pour ce sous-traitant');
      
      // Vérification supplémentaire dans la base sans filtrer
      const tousOuvriers = await prisma.ouvrier.findMany();
      console.log(`DEBUG - Nombre total d'ouvriers dans la base: ${tousOuvriers.length}`);
      if (tousOuvriers.length > 0) {
        console.log('DEBUG - IDs des sous-traitants associés:', tousOuvriers.map(o => o.sousTraitantId).join(', '));
      }
    }

    return NextResponse.json(ouvriers)
  } catch (error) {
    console.error('Erreur lors de la récupération des ouvriers:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des ouvriers' },
      { status: 500 }
    )
  }
}

export async function POST(
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
    console.log('DEBUG - Données reçues pour la création de l\'ouvrier:', JSON.stringify(body, null, 2));
    console.log('DEBUG - ID du sous-traitant:', id);

    // Validation basique
    if (!body.nom || !body.prenom || !body.dateEntree) {
      console.log('DEBUG - Validation échouée, champs manquants');
      return NextResponse.json(
        { error: 'Tous les champs obligatoires doivent être remplis' },
        { status: 400 }
      )
    }

    // Vérifier si le sous-traitant existe
    const sousTraitant = await prisma.soustraitant.findUnique({
      where: { id }
    })

    if (!sousTraitant) {
      console.log('DEBUG - Sous-traitant non trouvé avec ID:', id);
      return NextResponse.json(
        { error: 'Sous-traitant non trouvé' },
        { status: 404 }
      )
    }

    console.log('DEBUG - Sous-traitant trouvé:', sousTraitant.nom);

    // Générer un ID unique pour l'ouvrier
    const uniqueId = `OUV-${Date.now()}-${Math.floor(Math.random() * 1000)}`
    console.log('DEBUG - ID généré pour l\'ouvrier:', uniqueId);

    const ouvrierData = {
      id: uniqueId,
      nom: body.nom,
      prenom: body.prenom,
      email: body.email || null,
      telephone: body.telephone || null,
      dateEntree: new Date(body.dateEntree),
      poste: body.poste,
      sousTraitantId: id,
      updatedAt: new Date()
    };
    
    console.log('DEBUG - Données formatées pour création:', JSON.stringify(ouvrierData, null, 2));

    const ouvrier = await prisma.ouvrier.create({
      data: ouvrierData
    });

    console.log('DEBUG - Ouvrier créé avec succès:', JSON.stringify(ouvrier, null, 2));
    
    // Vérification supplémentaire
    const ouvrierVerif = await prisma.ouvrier.findUnique({
      where: { id: uniqueId }
    });
    
    console.log('DEBUG - Vérification de l\'existence de l\'ouvrier après création:', ouvrierVerif ? 'Trouvé' : 'Non trouvé');
    if (ouvrierVerif) {
      console.log('DEBUG - Données de l\'ouvrier en DB:', JSON.stringify(ouvrierVerif, null, 2));
    }
    
    return NextResponse.json(ouvrier)
  } catch (error) {
    console.error('Erreur lors de la création de l\'ouvrier:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création de l\'ouvrier' },
      { status: 500 }
    )
  }
} 