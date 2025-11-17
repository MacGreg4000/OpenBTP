import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { readPortalSessionFromCookie } from '@/app/public/portail/auth'

export async function GET(request: Request, props: { params: Promise<{ type: 'ouvrier'|'soustraitant'; actorId: string }> }) {
  const { type, actorId } = await props.params

  try {
    // Vérifier la session portail
    const cookieHeader = request.headers.get('cookie')
    const session = readPortalSessionFromCookie(cookieHeader)
    
    if (!session || session.t !== (type === 'ouvrier' ? 'OUVRIER_INTERNE' : 'SOUSTRAITANT') || session.id !== actorId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    let chantiers = []

    if (type === 'ouvrier') {
      // Pour les ouvriers internes : tous les chantiers actifs
      chantiers = await prisma.chantier.findMany({
        where: {
          statut: {
            in: ['EN_COURS', 'EN_PREPARATION', 'A_VENIR']
          }
        },
        select: {
          chantierId: true,
          nomChantier: true,
          numeroIdentification: true,
          adresseChantier: true,
          villeChantier: true,
          latitude: true,
          longitude: true,
          statut: true
        },
        orderBy: {
          nomChantier: 'asc'
        }
      })
    } else if (type === 'soustraitant') {
      // Pour les sous-traitants : seulement les chantiers où ils sont assignés
      chantiers = await prisma.chantier.findMany({
        where: {
          statut: {
            in: ['EN_COURS', 'EN_PREPARATION', 'A_VENIR']
          },
          commandeSousTraitant: {
            some: {
              soustraitantId: actorId
            }
          }
        },
        select: {
          chantierId: true,
          nomChantier: true,
          numeroIdentification: true,
          adresseChantier: true,
          villeChantier: true,
          latitude: true,
          longitude: true,
          statut: true
        },
        orderBy: {
          nomChantier: 'asc'
        }
      })
    }

    return NextResponse.json({ 
      success: true,
      chantiers: chantiers.map(ch => ({
        chantierId: ch.chantierId,
        nomChantier: ch.nomChantier,
        numeroIdentification: ch.numeroIdentification,
        adresse: ch.adresseChantier,
        ville: ch.villeChantier,
        latitude: ch.latitude,
        longitude: ch.longitude,
        statut: ch.statut
      }))
    })
  } catch (error) {
    console.error('Erreur lors de la récupération des chantiers:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

