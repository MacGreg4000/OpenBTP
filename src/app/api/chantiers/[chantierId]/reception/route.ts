import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import crypto from 'crypto'

// Générer un code PIN aléatoire (numérique, 6 chiffres)
function generatePIN() {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// Fonction améliorée pour convertir les BigInt et booléens en types JS standards
function formatValues(data: unknown): unknown {
  if (data === null || data === undefined) {
    return data;
  }
  
  if (typeof data === 'bigint') {
    return Number(data);
  }
  
  // Conversion explicite des booléens stockés comme 0/1
  if (data === 0 || data === 1) {
    return Boolean(data);
  }
  
  if (Array.isArray(data)) {
    return (data as unknown[]).map(formatValues);
  }
  
  if (typeof data === 'object' && data !== null) {
    if (data instanceof Date) {
      return data.toISOString();
    }
    
    const result: Record<string, unknown> = {};
    const obj = data as Record<string, unknown>;
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        result[key] = formatValues(obj[key]);
      }
    }
    return result;
  }
  
  return data;
}

// (Interfaces inutilisées supprimées)

// GET /api/chantiers/[chantierId]/reception
// Récupérer toutes les réceptions d'un chantier
export async function GET(
  request: Request,
  { params }: { params: Promise<{ chantierId: string }> }
) {
  try {
    // Attendre la Promise params
    const resolvedParams = await params;
    const chantierId = resolvedParams.chantierId;
    
    console.log(`Récupération des réceptions pour le chantier: ${chantierId}`);
    
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    // Vérifier si le chantier existe
    const chantier = await prisma.chantier.findUnique({
      where: { chantierId }
    })

    if (!chantier) {
      return NextResponse.json(
        { error: 'Chantier non trouvé' },
        { status: 404 }
      )
    }

    try {
      // Utiliser uniquement Prisma typé, sans SQL brut
      const receptions = await prisma.receptionChantier.findMany({
        where: { chantierId },
        orderBy: { dateCreation: 'desc' },
        include: {
          user: {
            select: { id: true, name: true, email: true }
          },
          remarques: {
            select: { id: true, estResolue: true }
          }
        }
      });
      
      // Formater les données pour l'API
      const receptionsFormattees = receptions.map(reception => ({
        id: reception.id,
        chantierId: reception.chantierId,
        dateCreation: reception.dateCreation,
        dateLimite: reception.dateLimite,
        codePIN: reception.codePIN,
        estFinalise: reception.estFinalise,
        createdBy: {
          id: reception.user?.id,
          name: reception.user?.name,
          email: reception.user?.email
        },
        nombreRemarques: reception.remarques.length,
        nombreResolues: reception.remarques.filter(r => r.estResolue).length,
        updatedAt: reception.updatedAt
      }));

      console.log(`${receptionsFormattees.length} réception(s) trouvée(s) pour le chantier ${chantierId}`);
      return NextResponse.json(formatValues(receptionsFormattees));
    } catch (error) {
      console.error('Erreur lors de la récupération des réceptions:', error);
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des réceptions' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Erreur générale:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des réceptions' },
      { status: 500 }
    )
  }
}

// POST /api/chantiers/[chantierId]/reception
// Créer une nouvelle réception
export async function POST(
  request: Request,
  { params }: { params: Promise<{ chantierId: string }> }
) {
  try {
    // Attendre la Promise params
    const resolvedParams = await params;
    const chantierId = resolvedParams.chantierId;
    
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    const userId = session.user.id

    // Vérifier si le chantier existe
    const chantier = await prisma.chantier.findUnique({
      where: { chantierId }
    })

    if (!chantier) {
      return NextResponse.json(
        { error: 'Chantier non trouvé' },
        { status: 404 }
      )
    }

    // Récupérer les données du formulaire
    const body = await request.json()
    const { dateLimite } = body

    if (!dateLimite) {
      return NextResponse.json(
        { error: 'La date limite est requise' },
        { status: 400 }
      )
    }

    // Vérifier si la date est valide
    const dateLimiteObj = new Date(dateLimite);
    if (isNaN(dateLimiteObj.getTime())) {
      console.error('Date limite invalide:', dateLimite);
      return NextResponse.json(
        { error: 'La date limite fournie est invalide' },
        { status: 400 }
      )
    }

    console.log(`Création d'une réception avec date limite: ${dateLimiteObj.toISOString()}`);

    // Générer un code PIN
    const codePIN = generatePIN()
    
    // Générer un UUID pour la réception
    const receptionId = crypto.randomUUID();
    
    try {
      // Utiliser Prisma avec typages corrects au lieu de SQL brut
      const nouvelleReception = await prisma.receptionChantier.create({
        data: {
          id: receptionId,
          chantierId,
          dateCreation: new Date(),
          dateLimite: dateLimiteObj,
          codePIN,
          estFinalise: false,
          createdBy: userId,
          updatedAt: new Date()
        }
      });

      console.log('Réception créée avec succès:', nouvelleReception);
      return NextResponse.json(nouvelleReception, { status: 201 });
    } catch (dbError) {
      console.error('Erreur lors de la création avec Prisma:', dbError);
      
      // Fallback en cas d'erreur avec requête SQL brute
      try {
        const dateLimiteISO = dateLimiteObj.toISOString().slice(0, 19).replace('T', ' ');
        
        await prisma.$executeRaw`
          INSERT INTO reception_chantier (
            id, 
            chantierId, 
            dateCreation, 
            dateLimite, 
            codePIN, 
            estFinalise, 
            createdBy, 
            updatedAt
          ) VALUES (
            ${receptionId}, 
            ${chantierId}, 
            NOW(), 
            ${dateLimiteISO}, 
            ${codePIN}, 
            0, 
            ${userId}, 
            NOW()
          )
        `;
        
        // Construire manuellement l'objet de réponse
        const nouvelleReception = {
          id: receptionId,
          chantierId,
          dateCreation: new Date(),
          dateLimite: dateLimiteObj,
          codePIN,
          estFinalise: false,
          createdBy: userId,
          updatedAt: new Date()
        };

        console.log('Réception créée avec succès via SQL brut:', nouvelleReception);
        return NextResponse.json(nouvelleReception, { status: 201 });
      } catch (sqlError) {
        console.error('Erreur lors de la création avec SQL brut:', sqlError);
        return NextResponse.json(
          { error: 'Erreur lors de la création de la réception', details: String(sqlError) },
          { status: 500 }
        );
      }
    }
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création de la réception' },
      { status: 500 }
    )
  }
} 