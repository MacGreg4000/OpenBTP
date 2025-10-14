import { notifyDeadlineApproaching } from '../services/emailService';

// Fonction pour vérifier les dates limites des réceptions
export async function checkReceptionDeadlines() {
  try {
    console.log('[TÂCHE PLANIFIÉE] Vérification des dates limites des réceptions');
    await notifyDeadlineApproaching();
    console.log('[TÂCHE PLANIFIÉE] Vérification terminée');
  } catch (error) {
    console.error('[TÂCHE PLANIFIÉE] Erreur lors de la vérification des dates limites:', error);
  }
}

// Cette fonction peut être appelée par un planificateur de tâches comme node-cron
// Exemple d'utilisation avec node-cron :
//
// import cron from 'node-cron';
// 
// // Exécuter tous les jours à 8h du matin
// cron.schedule('0 8 * * *', async () => {
//   await checkReceptionDeadlines();
// });
//
// Note: Dans un environnement de production réel, cette configuration serait
// généralement placée dans un fichier séparé pour la configuration du serveur. 