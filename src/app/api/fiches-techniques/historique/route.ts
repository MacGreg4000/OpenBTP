import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'

interface DossierTechnique {
  id: number
  chantierId: string
  nomChantier: string
  dateCreation: string
  nombreFiches: number
  fichierUrl: string
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Récupérer tous les documents de type DOSSIER_TECHNIQUE
    const documents = await prisma.document.findMany({
      where: {
        type: 'DOSSIER_TECHNIQUE'
      },
      include: {
        chantier: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    const dossiers: DossierTechnique[] = documents.map(doc => {
      // Extraire le nombre de fiches du nom du document si disponible
      let nombreFiches = 0;
      const match = doc.nom.match(/(\d+) fiches/);
      if (match && match[1]) {
        nombreFiches = parseInt(match[1], 10);
      }
      
      return {
        id: doc.id,
        chantierId: doc.chantierId,
        nomChantier: doc.chantier.nomChantier,
        dateCreation: doc.createdAt.toISOString(),
        nombreFiches: nombreFiches,
        fichierUrl: doc.url
      };
    })

    return NextResponse.json(dossiers)
  } catch (error) {
    console.error('Erreur lors de la lecture de l\'historique:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la lecture de l\'historique des dossiers' },
      { status: 500 }
    )
  }
} 