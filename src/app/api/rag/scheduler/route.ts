import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ragScheduler } from '@/lib/tasks/cronScheduler';
import { fullRAGIndexing, incrementalRAGIndexing } from '@/lib/tasks/ragIndexingTasks';

// GET - Obtenir le statut des tâches d'indexation
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const status = ragScheduler.getTasksStatus();
    
    return NextResponse.json({
      tasks: status,
      timezone: 'Europe/Brussels',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Erreur lors de la récupération du statut des tâches:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du statut' },
      { status: 500 }
    );
  }
}

// POST - Contrôler les tâches d'indexation
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { action, taskName, time } = await request.json();

    switch (action) {
      case 'start-daily-full':
        ragScheduler.startDailyFullIndexing(time || '02:00');
        return NextResponse.json({
          message: 'Indexation complète quotidienne démarrée',
          cronTime: time || '02:00',
          taskName: 'daily-full'
        });

      case 'start-incremental':
        ragScheduler.startIncrementalIndexing();
        return NextResponse.json({
          message: 'Indexation incrémentale démarrée (toutes les 6h)'
        });

      case 'start-hourly':
        ragScheduler.startHourlyIndexing();
        return NextResponse.json({
          message: 'Indexation horaire démarrée'
        });

      case 'stop':
        if (!taskName) {
          return NextResponse.json({ error: 'Nom de tâche requis' }, { status: 400 });
        }
        ragScheduler.stopTask(taskName);
        return NextResponse.json({
          message: `Tâche ${taskName} arrêtée`
        });

      case 'stop-all':
        ragScheduler.stopAllTasks();
        return NextResponse.json({
          message: 'Toutes les tâches arrêtées'
        });

      case 'start-default':
        ragScheduler.startDefaultTasks();
        return NextResponse.json({
          message: 'Tâches par défaut démarrées'
        });

      case 'run-full-now':
        const fullResult = await fullRAGIndexing();
        return NextResponse.json({
          message: 'Indexation complète exécutée',
          result: fullResult
        });

      case 'run-incremental-now':
        const incrementalResult = await incrementalRAGIndexing();
        return NextResponse.json({
          message: 'Indexation incrémentale exécutée',
          result: incrementalResult
        });

      default:
        return NextResponse.json({ error: 'Action non reconnue' }, { status: 400 });
    }

  } catch (error) {
    console.error('Erreur lors du contrôle des tâches:', error);
    return NextResponse.json(
      { error: 'Erreur lors du contrôle des tâches' },
      { status: 500 }
    );
  }
}


