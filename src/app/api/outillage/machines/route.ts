import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// GET /api/outillage/machines - Liste toutes les machines
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    const machines = await prisma.machine.findMany({
      orderBy: {
        nom: 'asc'
      }
    })

    return NextResponse.json(machines)
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des machines' },
      { status: 500 }
    )
  }
}

// POST /api/outillage/machines - Crée une nouvelle machine
export async function POST(request: Request) {
  try {
    console.log('Tentative de création d\'une nouvelle machine')
    
    const session = await getServerSession(authOptions)
    if (!session) {
      console.log('Erreur: Session non trouvée')
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    console.log(`Utilisateur: ${session.user.email}, Rôle: ${session.user.role}`)

    const body = await request.json()
    console.log('Données reçues:', body)

    // Générer un ID unique pour la machine et le QR code
    const machineId = `MACH-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`.toUpperCase()
    const qrCode = `QR-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`.toUpperCase()
    
    console.log(`ID généré: ${machineId}, QR Code: ${qrCode}`)

    try {
      const machine = await prisma.machine.create({
        data: {
          id: machineId,
          nom: body.nom,
          modele: body.modele,
          numeroSerie: body.numeroSerie || null,
          localisation: body.localisation,
          statut: 'DISPONIBLE',
          dateAchat: body.dateAchat ? new Date(body.dateAchat) : null,
          commentaire: body.commentaire || null,
          qrCode: qrCode,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })
      
      console.log('Machine créée avec succès:', machine)
      return NextResponse.json(machine)
    } catch (prismaError: unknown) {
      console.error('Erreur Prisma lors de la création:', prismaError)
      return NextResponse.json(
        { error: `Erreur de base de données: ${(prismaError as Error).message}` },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Erreur générale:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création de la machine' },
      { status: 500 }
    )
  }
} 