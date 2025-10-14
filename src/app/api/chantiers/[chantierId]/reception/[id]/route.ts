import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Removed unused BigInt formatting helper

// Fonction pour formater correctement les dates
function formatDate(date: unknown): string | null {
  if (!date) return null;
  
  try {
    // Si c'est déjà une chaîne formatée, la retourner
    if (typeof date === 'string') {
      // Convertir les dates MySQL en format ISO
      if (date.includes(' ') && !date.includes('T')) {
        return date.replace(' ', 'T');
      }
      return date;
    }
    
    // Si c'est un objet Date, convertir en ISO string
    if (date instanceof Date) {
      return date.toISOString();
    }
    
    // Sinon, ne gérer que number, sinon null
    const d = (typeof date === 'number') ? new Date(date) : new Date(NaN);
    return isNaN(d.getTime()) ? null : d.toISOString();
  } catch (e) {
    console.error("Erreur lors du formatage de la date:", e, date);
    return null;
  }
}

// GET /api/chantiers/[chantierId]/reception/[id]
// Récupérer une réception spécifique
export async function GET(
  request: Request,
  { params }: { params: Promise<{ chantierId: string; id: string }> }
) {
  try {
    const resolvedParams = await params
    const { chantierId, id } = resolvedParams

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

    // Récupérer les données de la réception avec les informations du créateur
    const receptions = await prisma.$queryRaw`
      SELECT 
        r.id, r.chantierId, r.dateCreation, r.dateLimite, r.codePIN, r.estFinalise, r.createdBy,
        c.nomChantier,
        u.id as userId, u.name as userName, u.email as userEmail
      FROM reception_chantier r
      INNER JOIN chantier c ON r.chantierId = c.chantierId
      INNER JOIN user u ON r.createdBy = u.id
      WHERE r.id = ${id} AND r.chantierId = ${chantierId}
    `;

    if (!receptions || (receptions as unknown[]).length === 0) {
      return NextResponse.json(
        { error: 'Réception non trouvée' },
        { status: 404 }
      )
    }

    const receptionData = (receptions as unknown as Array<{ id: string; chantierId: string; dateCreation: unknown; dateLimite: unknown; codePIN: string | null; estFinalise: number; userId: string; userName: string; userEmail: string; nomChantier: string }>)[0];

    // Récupérer les PINs de sous-traitants associés
    const pins = await prisma.$queryRaw`
      SELECT sp.*, s.id as soustraitantId, s.nom as soustraitantNom, s.email as soustraitantEmail
      FROM soustraitant_pin sp
      LEFT JOIN soustraitant s ON sp.soustraitantId = s.id
      WHERE sp.receptionId = ${id}
    `;

    // Formater les résultats des PINs
    const formattedPins = (pins as unknown as Array<{ id: string; codePIN: string; estInterne: number | boolean; soustraitantId?: string | null; soustraitantNom?: string | null; soustraitantEmail?: string | null }>).map(pin => ({
      id: pin.id,
      codePIN: pin.codePIN,
      estInterne: Boolean(pin.estInterne),
      soustraitant: pin.soustraitantId ? { id: pin.soustraitantId, nom: pin.soustraitantNom || '', email: pin.soustraitantEmail || '' } : null
    }));

    // Construire et retourner la réponse formatée
    return NextResponse.json({
      id: receptionData.id,
      chantierId: receptionData.chantierId,
      dateCreation: formatDate(receptionData.dateCreation),
      dateLimite: formatDate(receptionData.dateLimite),
      codePIN: receptionData.codePIN,
      estFinalise: !!receptionData.estFinalise,
      createdBy: {
        id: receptionData.userId,
        name: receptionData.userName,
        email: receptionData.userEmail
      },
      chantier: {
        chantierId: receptionData.chantierId,
        nomChantier: receptionData.nomChantier
      },
      soustraitantPINs: formattedPins
    })
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération de la réception' },
      { status: 500 }
    )
  }
} 