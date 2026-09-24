import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { renouvellementConseille } from '@/lib/contrats/echeance'
import { normaliserRepresentant } from '@/lib/soustraitants/representant-serveur'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    const sousTraitants = await prisma.soustraitant.findMany({
      include: {
        _count: {
          select: {
            commandes: true,
            contrats: true
          }
        }
      },
      orderBy: { nom: 'asc' }
    })

    // Récupérer la colonne 'actif' même si le client Prisma ne la connaît pas
    let actifById: Record<string, boolean> = {}
    try {
      const rows = await prisma.$queryRawUnsafe('SELECT id, actif FROM soustraitant') as Array<{ id: string, actif: number | null }>
      actifById = Object.fromEntries(rows.map(r => [r.id, r.actif === null ? true : !!r.actif]))
    } catch {}

    // Récupérer les contrats et compter les ouvriers pour chaque sous-traitant
    const sousTraitantsWithContrats = await Promise.all(
      sousTraitants.map(async (st) => {
        const [tousLesContrats, ouvriersCount] = await Promise.all([
          // Tous les contrats, pas seulement le dernier généré : un contrat
          // régénéré (nouveau clic sur « Générer », par exemple pour obtenir
          // une simple copie) crée un nouvel enregistrement SANS jamais
          // toucher au précédent. Si celui-ci avait déjà été signé, prendre
          // seulement le plus récent par date de génération masquait un
          // contrat bel et bien signé derrière un doublon jamais envoyé ni
          // signé — vécu sur 2 sous-traitants, l'un depuis juillet.
          prisma.contrat.findMany({
            where: { soustraitantId: st.id },
            select: {
              id: true,
              url: true,
              estSigne: true,
              dateGeneration: true,
              dateSignature: true,
              dateFin: true
            },
            orderBy: {
              dateGeneration: 'desc'
            }
          }),
          prisma.ouvrier.count({
            where: { sousTraitantId: st.id }
          })
        ])

        // Le contrat à afficher : un contrat SIGNÉ (le plus récemment signé,
        // s'il y en a plusieurs) prime toujours sur un contrat non signé plus
        // récemment généré. À défaut d'aucun contrat signé, on retombe sur le
        // comportement précédent — le plus récemment généré.
        const contratSigne = tousLesContrats
          .filter(c => c.estSigne)
          .sort((a, b) => (b.dateSignature?.getTime() ?? 0) - (a.dateSignature?.getTime() ?? 0))[0]
        const contratAffiche = contratSigne ?? tousLesContrats[0]
        const contrats = contratAffiche
          ? [{
              ...contratAffiche,
              // Renouvellement conseillé UNIQUEMENT si le contrat affiché est
              // signé : une échéance proche sur un contrat encore en attente
              // de signature n'a pas le même sens (il faut relancer la
              // signature, pas régénérer des dates).
              renouvellementConseille:
                contratAffiche.estSigne && renouvellementConseille(contratAffiche.dateFin)
            }]
          : []
        const nombreContratsTotal = tousLesContrats.length

        return {
          ...st,
          actif: actifById[st.id] ?? true,
          contrats,
          nombreContratsTotal,
          _count: {
            ...st._count,
            ouvriers: ouvriersCount
          }
        }
      })
    )

    return NextResponse.json(sousTraitantsWithContrats)
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des sous-traitants' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    const body = await request.json()
    console.log('Données reçues pour la création du sous-traitant:', body)

    // Validation basique
    if (!body.nom || !body.email) {
      return NextResponse.json(
        { error: 'Le nom et l\'email sont requis' },
        { status: 400 }
      )
    }

    // Vérifier si l'email est déjà utilisé
    const existingTraitant = await prisma.soustraitant.findUnique({
      where: { email: body.email }
    })

    if (existingTraitant) {
      return NextResponse.json(
        { error: 'Un sous-traitant avec cet email existe déjà' },
        { status: 400 }
      )
    }

    // Représentant légal (facultatif à la création, exigé pour générer un contrat)
    const representant = await normaliserRepresentant(body)
    if (representant.erreur) {
      return NextResponse.json({ error: representant.erreur }, { status: 400 })
    }

    // Générer un ID unique pour le sous-traitant
    const uniqueId = `ST-${Date.now()}-${Math.floor(Math.random() * 1000)}`
    console.log('ID généré pour le sous-traitant:', uniqueId)

    const sousTraitant = await prisma.soustraitant.create({
      data: {
        id: uniqueId,
        nom: body.nom,
        email: body.email,
        contact: body.contact || null,
        telephone: body.telephone || null,
        adresse: body.adresse || null,
        tva: body.tva || null,
        ...representant.data,
        updatedAt: new Date()
      }
    })

    console.log('Sous-traitant créé avec succès:', sousTraitant)
    return NextResponse.json(sousTraitant)
  } catch (error) {
    console.error('Erreur lors de la création du sous-traitant:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création du sous-traitant' },
      { status: 500 }
    )
  }
} 