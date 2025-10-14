import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: Request, props: { params: Promise<{ chantierId: string }> }) {
  const params = await props.params;
  try {
    console.log('Récupération des tâches pour le chantier:', params.chantierId)
    
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
        chantierId: params.chantierId
      }
    })

    if (!chantier) {
      console.log(`Erreur: Chantier ${params.chantierId} non trouvé`)
      return NextResponse.json(
        { error: 'Chantier non trouvé' },
        { status: 404 }
      )
    }

    console.log('Recherche des tâches pour le chantier:', params.chantierId)

    try {
      // 1. Récupérer tous les types de tâches administratives actifs, triés par ordre
      const activeTaskTypes = await prisma.adminTaskType.findMany({
        where: {
          isActive: true
        },
        orderBy: {
          ordre: 'asc'
        }
      });

      // 2. Récupérer les tâches (admintask) existantes pour ce chantier
      const existingAdminTasks = await prisma.admintask.findMany({
        where: {
          chantierId: params.chantierId
        },
        include: {
          user: {
            select: {
              name: true,
              email: true
            }
          }
        }
      });

      // 3. Récupérer tous les utilisateurs pour les tâches qui ont un completedBy
      const userIds = existingAdminTasks
        .filter(task => task.completedBy)
        .map(task => task.completedBy)
        .filter((id): id is string => id !== null);

      const users = await prisma.user.findMany({
        where: {
          id: {
            in: userIds
          }
        },
        select: {
          id: true,
          name: true,
          email: true
        }
      });

      // Créer un map pour un accès rapide aux utilisateurs
      const userMap = new Map(users.map(user => [user.id, user]));

      // 4. Combiner les types de tâches avec les tâches existantes
      const tasksToReturn = activeTaskTypes.map(taskType => {
        const existingTask = existingAdminTasks.find(et => et.taskType === taskType.taskType);
        
        // Récupérer l'utilisateur qui a complété la tâche
        let user = null;
        if (existingTask?.completedBy) {
          user = userMap.get(existingTask.completedBy) || null;
        }
        
        return {
          id: existingTask?.id, // Peut être undefined si la tâche n'existe pas encore pour ce chantier
          chantierId: params.chantierId,
          taskType: taskType.taskType,
          title: taskType.label, // Utiliser le label du type de tâche comme titre
          completed: existingTask?.completed || false,
          completedAt: existingTask?.completedAt || null,
          completedBy: existingTask?.completedBy || null,
          user: user, // L'utilisateur qui a complété la tâche
          category: taskType.category,
        };
      });

      console.log('Tâches combinées à retourner:', tasksToReturn);

      return NextResponse.json(tasksToReturn);
    } catch (prismaError: unknown) {
      console.error('Erreur Prisma:', prismaError)
      return NextResponse.json(
        { 
          error: 'Erreur lors de la récupération des tâches dans la base de données',
          details: (prismaError as Error).message 
        },
        { status: 500 }
      )
    }
  } catch (error: unknown) {
    console.error('Erreur générale:', error)
    return NextResponse.json(
      { 
        error: 'Erreur lors de la récupération des tâches',
        details: (error as Error).message 
      },
      { status: 500 }
    )
  }
} 