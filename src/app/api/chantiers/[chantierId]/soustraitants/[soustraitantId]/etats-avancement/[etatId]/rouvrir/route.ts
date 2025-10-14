import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

type Params = {
  params: Promise<{
    chantierId: string
    soustraitantId: string
    etatId: string
  }>
}

export async function POST(request: NextRequest, props: Params) {
  return await handleReouvrir(request, props);
}

export async function PUT(request: NextRequest, props: Params) {
  return await handleReouvrir(request, props);
}

async function handleReouvrir(request: NextRequest, props: Params) {
  const params = await props.params;
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { soustraitantId, etatId } = params

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
    
    if (!etat.estFinalise) {
      return NextResponse.json({ error: 'Cet état d\'avancement n\'est pas finalisé' }, { status: 400 })
    }
    
    // Rouvrir l'état d'avancement
    const etatRouvert = await prisma.soustraitant_etat_avancement.update({
      where: {
        id: parseInt(etatId),
      },
      data: {
        estFinalise: false,
      },
      include: {
        ligne_soustraitant_etat_avancement: true,
        avenant_soustraitant_etat_avancement: true
      }
    })
    
    // Transformer la réponse pour correspondre à l'interface SoustraitantEtat
    const formattedEtat = {
      ...etatRouvert,
      lignes: etatRouvert.ligne_soustraitant_etat_avancement,
      avenants: etatRouvert.avenant_soustraitant_etat_avancement
    };
    
    return NextResponse.json(formattedEtat)
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
} 