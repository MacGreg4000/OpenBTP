import { ragService } from '../rag/rag-service';
import { vectorStore } from '../rag/vector-store';

// Tâche d'indexation complète du système RAG
export async function fullRAGIndexing() {
  try {
    console.log('🔄 [TÂCHE PLANIFIÉE] Début de l\'indexation RAG automatique');
    
    // Vérifier la santé du système avant l'indexation
    const stats = await vectorStore.getStats();
    console.log(`📊 Documents actuels: ${stats.totalDocuments}`);
    
    // Effectuer l'indexation complète
    await ragService.indexAllChantiers();
    
    // Vérifier le résultat
    const newStats = await vectorStore.getStats();
    console.log(`✅ [TÂCHE PLANIFIÉE] Indexation terminée - ${newStats.totalDocuments} documents indexés`);
    
    return {
      success: true,
      documentsBefore: stats.totalDocuments,
      documentsAfter: newStats.totalDocuments,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('❌ [TÂCHE PLANIFIÉE] Erreur lors de l\'indexation RAG:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
      timestamp: new Date().toISOString()
    };
  }
}

// Tâche d'indexation incrémentale (seulement les nouveaux/modifiés)
export async function incrementalRAGIndexing() {
  try {
    console.log('🔄 [TÂCHE PLANIFIÉE] Début de l\'indexation RAG incrémentale');
    
    const { prisma } = await import('@/lib/prisma/client');
    
    // Trouver les chantiers modifiés dans les dernières 24h
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const chantiersModifies = await prisma.chantier.findMany({
      where: {
        OR: [
          { updatedAt: { gte: yesterday } },
          { notes: { some: { updatedAt: { gte: yesterday } } } },
          { documents: { some: { updatedAt: { gte: yesterday } } } }
        ]
      },
      include: {
        client: true,
        etatsAvancement: {
          include: {
            lignes: true,
            avenants: true
          }
        },
        commandes: {
          include: {
            lignes: true
          }
        },
        notes: true,
        documents: true,
        receptionsChantier: {
          include: {
            remarques: true
          }
        }
      }
    });
    
    console.log(`📝 ${chantiersModifies.length} chantiers modifiés trouvés`);
    
    // Réindexer seulement les chantiers modifiés
    for (const chantier of chantiersModifies) {
      await ragService.indexChantier(chantier);
      
      // Indexer les notes, documents, etc.
      for (const note of chantier.notes) {
        await ragService.indexNote(note, chantier);
      }
      
      for (const document of chantier.documents) {
        await ragService.indexDocumentAttache(document, chantier);
      }
      
      for (const reception of chantier.receptionsChantier) {
        for (const remarque of reception.remarques) {
          await ragService.indexRemarqueReception(remarque, chantier);
        }
      }
    }
    
    console.log(`✅ [TÂCHE PLANIFIÉE] Indexation incrémentale terminée`);
    
    return {
      success: true,
      chantiersIndexes: chantiersModifies.length,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('❌ [TÂCHE PLANIFIÉE] Erreur lors de l\'indexation incrémentale:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
      timestamp: new Date().toISOString()
    };
  }
}

// Cette fonction peut être appelée par un planificateur de tâches comme node-cron


