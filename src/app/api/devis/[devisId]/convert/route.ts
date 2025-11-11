import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'

// POST /api/devis/[devisId]/convert - Convertir un devis en commande
export async function POST(
  request: NextRequest,
  props: { params: Promise<{ devisId: string }> }
) {
  const params = await props.params
  const { devisId } = params
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const body = await request.json()
    const { chantierId } = body

    if (!chantierId) {
      return NextResponse.json(
        { error: 'Le chantier est obligatoire pour la conversion' },
        { status: 400 }
      )
    }

    const devis = await prisma.devis.findUnique({
      where: { id: devisId },
      include: {
        lignes: {
          orderBy: {
            ordre: 'asc'
          }
        }
      }
    })

    if (!devis) {
      return NextResponse.json(
        { error: 'Devis introuvable' },
        { status: 404 }
      )
    }

    // Vérifier le statut
    if (devis.statut === 'CONVERTI') {
      return NextResponse.json(
        { error: 'Ce devis a déjà été converti en commande' },
        { status: 400 }
      )
    }

    if (devis.statut !== 'ACCEPTE') {
      return NextResponse.json(
        { error: 'Seuls les devis acceptés peuvent être convertis en commande' },
        { status: 400 }
      )
    }

    // Vérifier que le chantier existe et appartient au même client
    const chantier = await prisma.chantier.findUnique({
      where: { id: chantierId }
    })

    if (!chantier) {
      return NextResponse.json(
        { error: 'Chantier introuvable' },
        { status: 404 }
      )
    }

    if (chantier.clientId !== devis.clientId) {
      return NextResponse.json(
        { error: 'Le chantier doit appartenir au même client que le devis' },
        { status: 400 }
      )
    }

    // Générer le numéro de commande
    const year = new Date().getFullYear()
    const lastCommande = await prisma.commande.findFirst({
      where: {
        numeroCommande: {
          startsWith: `CMD-${year}-`
        }
      },
      orderBy: {
        numeroCommande: 'desc'
      }
    })

    let nextNumber = 1
    if (lastCommande) {
      const lastNumber = parseInt(lastCommande.numeroCommande.split('-')[2])
      nextNumber = lastNumber + 1
    }

    const numeroCommande = `CMD-${year}-${nextNumber.toString().padStart(4, '0')}`

    // Créer la commande
    const commande = await prisma.commande.create({
      data: {
        numeroCommande,
        chantierId,
        type: 'CLIENT',
        statut: 'VALIDEE',
        dateCommande: new Date(),
        montantHT: devis.montantHT,
        tauxTVA: 20, // Valeur par défaut, à ajuster si nécessaire
        montantTTC: devis.montantTTC,
        observations: devis.observations,
        lignes: {
          create: devis.lignes.map((ligne) => ({
            ordre: ligne.ordre,
            type: ligne.type,
            article: ligne.article,
            description: ligne.description,
            unite: ligne.unite,
            quantite: ligne.quantite || 0,
            prixUnitaire: ligne.prixUnitaire || 0,
            total: ligne.total || 0,
            estOption: false
          }))
        }
      },
      include: {
        lignes: {
          orderBy: {
            ordre: 'asc'
          }
        },
        chantier: {
          include: {
            client: true
          }
        }
      }
    })

    // Marquer le devis comme converti
    await prisma.devis.update({
      where: { id: params.devisId },
      data: {
        statut: 'CONVERTI',
        convertedToCommandeId: commande.id
      }
    })

    return NextResponse.json({
      success: true,
      commande,
      message: 'Devis converti en commande avec succès'
    })
  } catch (error) {
    console.error('Erreur lors de la conversion du devis:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la conversion du devis' },
      { status: 500 }
    )
  }
}

