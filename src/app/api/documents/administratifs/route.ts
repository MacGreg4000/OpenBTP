import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Vérifier si l'utilisateur est admin ou manager
    if (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 })
    }

    // Récupérer le paramètre de filtre par tag depuis l'URL
    const url = new URL(request.url)
    const tagFilter = url.searchParams.get('tag')

    // Construire la clause where pour les documents administratifs
    // Les documents administratifs sont ceux sans chantierId (null)
    const whereClause: {
      chantierId: null;
      tags?: { some: { nom: string } };
    } = {
      chantierId: null
    }

    // Ajouter le filtre par tag si présent
    if (tagFilter) {
      whereClause.tags = {
        some: {
          nom: tagFilter
        }
      }
    }

    // Récupérer les documents depuis Prisma
    const documents = await prisma.document.findMany({
      where: whereClause,
      include: {
        User: {
          select: {
            name: true,
            email: true
          }
        },
        tags: {
          select: {
            id: true,
            nom: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Formater les documents pour le frontend
    const formattedDocuments = documents.map(doc => ({
      id: doc.id.toString(),
      nom: doc.nom,
      type: doc.type,
      taille: doc.taille,
      dateUpload: doc.createdAt.toISOString(),
      url: doc.url,
      tags: doc.tags.map(tag => tag.nom),
      uploadedBy: doc.User ? (doc.User.name || doc.User.email || 'Inconnu') : 'Inconnu'
    }))

    return NextResponse.json(formattedDocuments)
  } catch (error) {
    console.error('Erreur lors de la récupération des documents administratifs:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
} 