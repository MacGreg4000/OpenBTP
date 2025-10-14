import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma/client';

interface TaskWhereClause {
  OR?: Array<{
    start?: { gte: Date; lte: Date };
    end?: { gte: Date; lte: Date };
  }>;
  chantierId?: string;
}

interface TaskCreateData {
  title: string;
  description?: string;
  start: Date;
  end: Date;
  status: 'PREVU' | 'EN_COURS' | 'TERMINE';
  chantierId?: string;
}

// GET - Récupérer toutes les tâches avec leurs assignations
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start');
    const endDate = searchParams.get('end');

    const whereClause: TaskWhereClause = {};
    
    if (startDate && endDate) {
      whereClause.OR = [
        {
          start: {
            gte: new Date(startDate),
            lte: new Date(endDate)
          }
        },
        {
          end: {
            gte: new Date(startDate),
            lte: new Date(endDate)
          }
        }
      ];
    }

    const tasks = await prisma.task.findMany({
      where: whereClause,
      include: {
        chantier: {
          select: {
            nomChantier: true,
            chantierId: true
          }
        },
        ouvriersInternes: {
          include: {
            ouvrierInterne: {
              select: {
                id: true,
                nom: true,
                prenom: true,
                poste: true
              }
            }
          }
        },
        sousTraitants: {
          include: {
            soustraitant: {
              select: {
                id: true,
                nom: true
              }
            }
          }
        }
      },
      orderBy: {
        start: 'asc'
      }
    });

    return NextResponse.json(tasks);

  } catch (error) {
    console.error('Erreur lors de la récupération des tâches:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des tâches' },
      { status: 500 }
    );
  }
}

// POST - Créer une nouvelle tâche
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const data = await request.json();
    const { 
      title, 
      description, 
      start, 
      end, 
      chantierId, 
      ouvrierInterneIds = [], 
      soustraitantIds = [] 
    } = data;

    if (!title || !start || !end) {
      return NextResponse.json(
        { error: 'Le titre, date de début et date de fin sont requis' },
        { status: 400 }
      );
    }

    // Normaliser les dates pour avoir des heures cohérentes
    const startDate = new Date(start);
    startDate.setHours(9, 0, 0, 0); // 9h00 par défaut
    
    const endDate = new Date(end);
    endDate.setHours(17, 0, 0, 0); // 17h00 par défaut

    // Créer la tâche
    const taskData: TaskCreateData = {
      title,
      description,
      start: startDate,
      end: endDate,
      status: 'PREVU'
    };

    // Ajouter chantierId seulement s'il n'est pas vide
    if (chantierId && chantierId.trim() !== '') {
      taskData.chantierId = chantierId;
    }

    const nouvelleTask = await prisma.task.create({
      data: taskData
    });

    // Assigner les ouvriers internes
    if (ouvrierInterneIds.length > 0) {
      await prisma.taskOuvrierInterne.createMany({
        data: ouvrierInterneIds.map((ouvrierId: string) => ({
          taskId: nouvelleTask.id,
          ouvrierInterneId: ouvrierId
        }))
      });
    }

    // Assigner les sous-traitants
    if (soustraitantIds.length > 0) {
      await prisma.taskSousTraitant.createMany({
        data: soustraitantIds.map((soustraitantId: string) => ({
          taskId: nouvelleTask.id,
          soustraitantId: soustraitantId
        }))
      });
    }

    // Récupérer la tâche complète avec les assignations
    const taskComplete = await prisma.task.findUnique({
      where: { id: nouvelleTask.id },
      include: {
        chantier: {
          select: {
            nomChantier: true,
            chantierId: true
          }
        },
        ouvriersInternes: {
          include: {
            ouvrierInterne: {
              select: {
                id: true,
                nom: true,
                prenom: true,
                poste: true
              }
            }
          }
        },
        sousTraitants: {
          include: {
            soustraitant: {
              select: {
                id: true,
                nom: true
              }
            }
          }
        }
      }
    });

    return NextResponse.json(taskComplete, { status: 201 });

  } catch (error) {
    console.error('Erreur lors de la création de la tâche:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création de la tâche' },
      { status: 500 }
    );
  }
}
