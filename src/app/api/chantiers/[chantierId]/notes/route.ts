import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'

export async function GET(
  request: Request,
  context: { params: Promise<{ chantierId: string }> }
) {
  try {
    // Récupérer et attendre les paramètres
    const params = await context.params;
    const chantierId = params.chantierId;
    
    console.log('Récupération des notes pour le chantier:', chantierId)
    
    const session = await getServerSession(authOptions)
    if (!session) {
      console.log('Erreur: Utilisateur non authentifié')
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }
    
    console.log('Session utilisateur:', {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      role: session.user.role
    })

    // Vérifier si le chantier existe
    const chantier = await prisma.chantier.findUnique({
      where: {
        chantierId: chantierId
      }
    })

    if (!chantier) {
      console.log(`Erreur: Chantier ${chantierId} non trouvé`)
      return NextResponse.json(
        { error: 'Chantier non trouvé' },
        { status: 404 }
      )
    }

    try {
      console.log('Exécution de la requête prisma.note.findMany avec include User')
      const notes = await prisma.note.findMany({
        where: {
          chantierId: chantierId
        },
        include: {
          User: {
            select: {
              name: true,
              email: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      })

      console.log(`${notes.length} notes trouvées pour le chantier ${chantierId}`)
      console.log('Premier élément des notes (si disponible):', notes.length > 0 ? JSON.stringify(notes[0], null, 2) : 'Aucune note')
      
      return NextResponse.json(notes)
    } catch (prismaError: unknown) {
      console.error('Erreur Prisma lors de la récupération des notes:', prismaError)
      console.error('Stack trace complète:', (prismaError as Error).stack)
      
      if (typeof prismaError === 'object' && prismaError && 'meta' in prismaError) {
        console.error('Métadonnées d\'erreur Prisma:', (prismaError as { meta?: unknown }).meta)
      }
      
      return NextResponse.json(
        { 
          error: 'Erreur lors de la récupération des notes dans la base de données',
          details: (prismaError as Error).message,
          code: (prismaError as { code?: string }).code || 'UNKNOWN' 
        },
        { status: 500 }
      )
    }
  } catch (error: unknown) {
    console.error('Erreur générale lors de la récupération des notes:', error)
    console.error('Stack trace complète:', (error as Error).stack)
    return NextResponse.json(
      { 
        error: 'Erreur lors de la récupération des notes',
        details: (error as Error).message,
        stack: (error as Error).stack
      },
      { status: 500 }
    )
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ chantierId: string }> }
) {
  try {
    // Récupérer et attendre les paramètres
    const params = await context.params;
    const chantierId = params.chantierId;
    
    console.log('Création d\'une note pour le chantier:', chantierId)
    
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      console.log('Erreur: Utilisateur non authentifié')
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }
    
    console.log('Session utilisateur:', {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      role: session.user.role
    })

    // Vérifier si le chantier existe
    const chantier = await prisma.chantier.findUnique({
      where: {
        chantierId: chantierId
      }
    })

    if (!chantier) {
      console.log(`Erreur: Chantier ${chantierId} non trouvé`)
      return NextResponse.json(
        { error: 'Chantier non trouvé' },
        { status: 404 }
      )
    }

    const body = await request.json()
    console.log('Contenu de la note:', body)
    
    // Vérifier que le contenu est présent
    if (!body.contenu) {
      console.log('Erreur: Contenu de la note manquant')
      return NextResponse.json(
        { error: 'Le contenu de la note est requis' },
        { status: 400 }
      )
    }

    try {
      const note = await prisma.note.create({
        data: {
          contenu: body.contenu,
          chantierId: chantierId,
          createdBy: session.user.id,
          updatedAt: new Date() // Assurez-vous que updatedAt est défini
        },
        include: {
          User: {
            select: {
              name: true,
              email: true
            }
          }
        }
      })

      console.log('Note créée avec succès:', note)
      return NextResponse.json(note)
    } catch (prismaError: unknown) {
      console.error('Erreur Prisma lors de la création de la note:', prismaError)
      return NextResponse.json(
        { 
          error: 'Erreur lors de la création de la note dans la base de données',
          details: (prismaError as Error).message 
        },
        { status: 500 }
      )
    }
  } catch (error: unknown) {
    console.error('Erreur générale lors de la création de la note:', error)
    return NextResponse.json(
      { 
        error: 'Erreur lors de la création de la note',
        details: (error as Error).message 
      },
      { status: 500 }
    )
  }
} 