import { NextRequest, NextResponse } from 'next/server'
// import { prisma } from '@/lib/prisma/client'
import { prismaWithExtensions } from '@/lib/prisma/types'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// Obtenir tous les racks
export async function GET() {
  try {
    // Vérifier l'authentification
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Récupérer les racks avec leurs emplacements
    const racks = await prismaWithExtensions.rack.findMany({
      include: {
        emplacements: {
          include: {
            materiaux: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    })

    return NextResponse.json(racks)
  } catch (error) {
    console.error('Erreur lors de la récupération des racks:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des racks' },
      { status: 500 }
    )
  }
}

// Créer un nouveau rack
export async function POST(request: NextRequest) {
  try {
    // Vérifier l'authentification
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Vérifier les droits d'administration
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Autorisation insuffisante' },
        { status: 403 }
      )
    }

    // Récupérer les données du rack
    const data = await request.json()
    const { nom, position, lignes, colonnes } = data

    if (!nom || !position || !lignes || !colonnes) {
      return NextResponse.json(
        { error: 'Informations incomplètes' },
        { status: 400 }
      )
    }

    // Créer le rack
    const rack = await prismaWithExtensions.rack.create({
      data: {
        nom,
        position,
        lignes,
        colonnes
      }
    })

    // Créer automatiquement les emplacements
    const emplacements = []
    for (let ligne = 1; ligne <= lignes; ligne++) {
      for (let colonne = 1; colonne <= colonnes; colonne++) {
        // Générer un code QR unique pour chaque emplacement
        const codeQR = `${rack.id}-${ligne}-${colonne}`
        
        emplacements.push({
          rackId: rack.id,
          ligne,
          colonne,
          codeQR
        })
      }
    }

    // Insérer tous les emplacements
    await prismaWithExtensions.emplacement.createMany({
      data: emplacements
    })

    // Récupérer le rack avec les emplacements créés
    const rackWithEmplacements = await prismaWithExtensions.rack.findUnique({
      where: { id: rack.id },
      include: {
        emplacements: true
      }
    })

    return NextResponse.json(rackWithEmplacements)
  } catch (error) {
    console.error('Erreur lors de la création du rack:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création du rack' },
      { status: 500 }
    )
  }
} 