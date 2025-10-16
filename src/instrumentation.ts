/**
 * Instrumentation Next.js
 * Ce fichier s'exécute au démarrage de l'application
 * https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Synchroniser le template professionnel au démarrage
    const { syncProfessionalTemplate } = await import('./lib/services/template-sync')
    await syncProfessionalTemplate()
  }
}

