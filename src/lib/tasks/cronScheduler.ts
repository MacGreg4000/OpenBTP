import cron, { ScheduledTask } from 'node-cron';
import { fullRAGIndexing, incrementalRAGIndexing } from './ragIndexingTasks';
import { sendMonthlyReport } from '@/lib/email/monthly-report';
import { spawn } from 'child_process';
import path from 'path';

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

  // Rapport états d'avancement : chaque vendredi à 12h00 (mois en cours)
  startMonthlyReport() {
    const cronExpression = '0 12 * * 5'; // Vendredi à 12h00

    console.log(`🕐 [CRON] Planification rapport états d'avancement: ${cronExpression} (chaque vendredi midi)`);

    const task = cron.schedule(cronExpression, async () => {
      console.log('⏰ [CRON] Exécution du rapport états d\'avancement (mois en cours)');
      try {
        const result = await sendMonthlyReport();
        console.log(`📧 [CRON] Rapport états: ${result.message}`);
      } catch (error) {
        console.error('❌ [CRON] Erreur rapport états:', error);
      }
    }, {
      timezone: "Europe/Brussels"
    });

    this.tasks.set('monthly-report', task);
    task.start();

    return task;
  }

  // Sauvegarde automatique de la base de données chaque jour à 20h00
  startDailyBackup() {
    const cronExpression = '0 20 * * *'; // Tous les jours à 20h00

    console.log(`🕐 [CRON] Planification sauvegarde base de données: ${cronExpression} (chaque jour à 20h00)`);

    const task = cron.schedule(cronExpression, () => {
      console.log('⏰ [CRON] Démarrage de la sauvegarde automatique de la base de données...');

      const scriptPath = path.join(process.cwd(), 'scripts', 'backup-database.js');
      const proc = spawn('node', [scriptPath], {
        env: { ...process.env },
        stdio: ['ignore', 'pipe', 'pipe']
      });

      proc.stdout?.on('data', (data: Buffer) => {
        console.log(`[BACKUP] ${data.toString().trim()}`);
      });

      proc.stderr?.on('data', (data: Buffer) => {
        console.error(`[BACKUP] ⚠️ ${data.toString().trim()}`);
      });

      proc.on('close', (code: number) => {
        if (code === 0) {
          console.log('✅ [CRON] Sauvegarde terminée avec succès');
        } else {
          console.error(`❌ [CRON] Sauvegarde échouée (code: ${code})`);
        }
      });
    }, {
      timezone: "Europe/Brussels"
    });

    this.tasks.set('daily-backup', task);
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

    // Rapport états d'avancement chaque vendredi à midi (mois en cours)
    this.startMonthlyReport();

    // Sauvegarde automatique de la base de données chaque jour à 20h00
    this.startDailyBackup();

    console.log('✅ [CRON] Toutes les tâches démarrées (RAG + rapport vendredi midi + sauvegarde 20h00)');
  }
}

// Instance singleton
export const ragScheduler = RAGIndexingScheduler.getInstance();


