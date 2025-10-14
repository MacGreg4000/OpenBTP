import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest, context: { params: Promise<{ chantierId: string; soustraitantId: string; etatId: string }> }) {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }
  
  const { soustraitantId, etatId } = await context.params
  
  try {
    // Vérifier l'accès au chantier
    const userHasAccess = await prisma.user.findFirst({
      where: {
        id: session.user.id,
        OR: [
          { role: 'ADMIN' },
          { role: 'MANAGER' },
        ]
      }
    })
    
    if (!userHasAccess) {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 })
    }
    
    // Récupérer l'état d'avancement
    const etat = await prisma.soustraitant_etat_avancement.findUnique({
      where: {
        id: parseInt(etatId),
        soustraitantId: soustraitantId,
      },
    })
    
    if (!etat) {
      return NextResponse.json({ error: 'État d\'avancement non trouvé' }, { status: 404 })
    }
    
    if (etat.estFinalise) {
      return NextResponse.json({ error: 'Cet état d\'avancement est déjà finalisé' }, { status: 400 })
    }
    
    // Finaliser l'état d'avancement
    const etatFinalise = await prisma.soustraitant_etat_avancement.update({
      where: {
        id: parseInt(etatId),
      },
      data: {
        estFinalise: true,
      },
      include: {
        ligne_soustraitant_etat_avancement: true,
        avenant_soustraitant_etat_avancement: true
      }
    })
    
    // Transformer la réponse pour correspondre à l'interface SoustraitantEtat
    const formattedEtat = {
      ...etatFinalise,
      lignes: etatFinalise.ligne_soustraitant_etat_avancement,
      avenants: etatFinalise.avenant_soustraitant_etat_avancement
    };
    
    return NextResponse.json(formattedEtat)
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
} 