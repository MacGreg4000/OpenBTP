import cron, { ScheduledTask } from 'node-cron';
import { fullRAGIndexing, incrementalRAGIndexing } from './ragIndexingTasks';

// Planificateur de tâches pour l'indexation RAG
export class RAGIndexingScheduler {
  private static instance: RAGIndexingScheduler;
  private tasks: Map<string, ScheduledTask> = new Map();

  private constructor() {}

  static getInstance(): RAGIndexingScheduler {
    if (!RAGIndexingScheduler.instance) {
      RAGIndexingScheduler.instance = new RAGIndexingScheduler();
    }
    return RAGIndexingScheduler.instance;
  }

  // Démarrer l'indexation complète quotidienne
  startDailyFullIndexing(time: string = '02:00') {
    const [hour, minute] = time.split(':');
    const cronExpression = `${minute} ${hour} * * *`; // Tous les jours à l'heure spécifiée
    
    console.log(`🕐 [CRON] Planification de l'indexation complète RAG: ${cronExpression}`);
    
    const task = cron.schedule(cronExpression, async () => {
      console.log('⏰ [CRON] Exécution de l\'indexation complète RAG');
      await fullRAGIndexing();
    }, {
      timezone: "Europe/Brussels"
    });

    this.tasks.set('daily-full', task);
    task.start();
    
    return task;
  }

  // Démarrer l'indexation incrémentale toutes les 6 heures
  startIncrementalIndexing() {
    const cronExpression = '0 */6 * * *'; // Toutes les 6 heures
    
    console.log(`🕐 [CRON] Planification de l'indexation incrémentale RAG: ${cronExpression}`);
    
    const task = cron.schedule(cronExpression, async () => {
      console.log('⏰ [CRON] Exécution de l\'indexation incrémentale RAG');
      await incrementalRAGIndexing();
    }, {
      timezone: "Europe/Brussels"
    });

    this.tasks.set('incremental', task);
    task.start();
    
    return task;
  }

  // Démarrer l'indexation incrémentale toutes les heures (pour les environnements très actifs)
  startHourlyIndexing() {
    const cronExpression = '0 * * * *'; // Toutes les heures
    
    console.log(`🕐 [CRON] Planification de l'indexation horaire RAG: ${cronExpression}`);
    
    const task = cron.schedule(cronExpression, async () => {
      console.log('⏰ [CRON] Exécution de l\'indexation horaire RAG');
      await incrementalRAGIndexing();
    }, {
      timezone: "Europe/Brussels"
    });

    this.tasks.set('hourly', task);
    task.start();
    
    return task;
  }

  // Arrêter une tâche spécifique
  stopTask(taskName: string) {
    const task = this.tasks.get(taskName);
    if (task) {
      task.stop();
      this.tasks.delete(taskName);
      console.log(`🛑 [CRON] Tâche ${taskName} arrêtée`);
    }
  }

  // Arrêter toutes les tâches
  stopAllTasks() {
    this.tasks.forEach((task, name) => {
      task.stop();
      console.log(`🛑 [CRON] Tâche ${name} arrêtée`);
    });
    this.tasks.clear();
  }

  // Obtenir le statut des tâches
  getTasksStatus() {
    const status: Record<string, { running: boolean; nextRun?: Date }> = {};
    
    this.tasks.forEach((task, name) => {
      status[name] = {
        running: true, // Les tâches sont considérées comme running si elles sont dans la map
        nextRun: undefined // Pas de prochaine exécution disponible
      };
    });
    
    return status;
  }

  // Démarrer toutes les tâches par défaut
  startDefaultTasks() {
    console.log('🚀 [CRON] Démarrage des tâches RAG par défaut');
    
    // Indexation complète tous les jours à 2h du matin
    this.startDailyFullIndexing('02:00');
    
    // Indexation incrémentale toutes les 6 heures
    this.startIncrementalIndexing();
    
    console.log('✅ [CRON] Toutes les tâches RAG démarrées');
  }
}

// Instance singleton
export const ragScheduler = RAGIndexingScheduler.getInstance();


