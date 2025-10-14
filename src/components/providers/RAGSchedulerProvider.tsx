'use client';

import { useEffect } from 'react';
import { ragScheduler } from '@/lib/tasks/cronScheduler';

interface RAGSchedulerProviderProps {
  children: React.ReactNode;
}

export function RAGSchedulerProvider({ children }: RAGSchedulerProviderProps) {
  useEffect(() => {
    // Démarrer les tâches d'indexation RAG seulement côté serveur
    if (typeof window === 'undefined') {
      console.log('🕐 [RAG SCHEDULER] Démarrage des tâches d\'indexation automatique');
      
      // Configuration par défaut
      ragScheduler.startDefaultTasks();
      
      // Log du statut des tâches
      const status = ragScheduler.getTasksStatus();
      console.log('📊 [RAG SCHEDULER] Statut des tâches:', status);
      
      // Nettoyage à l'arrêt
      const cleanup = () => {
        console.log('🛑 [RAG SCHEDULER] Arrêt des tâches');
        ragScheduler.stopAllTasks();
      };
      
      process.on('SIGTERM', cleanup);
      process.on('SIGINT', cleanup);
      
      return () => {
        cleanup();
      };
    }
  }, []);

  return <>{children}</>;
}


