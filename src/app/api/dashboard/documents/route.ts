import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// GET /api/dashboard/documents - Récupère les documents et rapports récents pour le dashboard
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    // Récupérer les 5 derniers rapports de visite
    const rapports = await prisma.document.findMany({
      where: {
        type: 'rapport-visite'
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 5,
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    })

    // Récupérer les 5 derniers documents (hors rapports de visite)
    const documents = await prisma.document.findMany({
      where: {
        type: {
          not: 'rapport-visite'
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 5,
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    })

    // Formater les rapports pour le frontend
    const formattedRapports = rapports.map(rapport => ({
      id: rapport.id.toString(),
      nom: rapport.nom,
      type: rapport.type,
      date: new Date(rapport.createdAt).toLocaleDateString('fr-FR'),
      createdBy: rapport.user.name || rapport.user.email
    }))

    // Formater les documents pour le frontend
    const formattedDocuments = documents.map(document => ({
      id: document.id.toString(),
      nom: document.nom,
      type: document.type,
      date: new Date(document.createdAt).toLocaleDateString('fr-FR'),
      createdBy: document.user.name || document.user.email
    }))

    return NextResponse.json({
      rapports: formattedRapports,
      documents: formattedDocuments
    })
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des documents' },
      { status: 500 }
    )
  }
} 