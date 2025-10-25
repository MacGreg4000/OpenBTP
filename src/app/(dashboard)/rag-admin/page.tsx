// Page d'administration du système RAG
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { usePermission } from '@/hooks/usePermission';
import { useRouter } from 'next/navigation';
// // import { RAGConversationService } from '@/lib/rag/conversation-service'; // Supprimé pour éviter l'erreur Prisma côté client
import RAGSchedulerAdmin from '@/components/rag/RAGSchedulerAdmin'; // Supprimé pour éviter l'erreur Prisma côté client

interface RAGStats {
  totalDocuments: number;
  documentsWithEmbeddings: number;
  byType: Record<string, number>;
  conversationStats: {
    totalConversations: number;
    totalUsers: number;
    lastActivity: string | null;
  };
}

interface RAGHealth {
  ollama: {
    healthy: boolean;
    baseUrl: string;
    models: string[];
    config: {
      model: string;
      embeddingModel: string;
    };
  };
  vectorStore: {
    healthy: boolean;
    stats: RAGStats;
  };
  overall: boolean;
}

export default function RAGAdminPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const isAdmin = usePermission('admin');
  const isRAGAdmin = usePermission('rag_admin');
  const [health, setHealth] = useState<RAGHealth | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Vérifier les permissions au montage
  useEffect(() => {
    if (session && !isAdmin && !isRAGAdmin) {
      router.push('/configuration');
    }
  }, [session, isAdmin, isRAGAdmin, router]);

  // Charger l'état de santé au montage
  useEffect(() => {
    if (session && (isAdmin || isRAGAdmin)) {
      checkHealth();
    }
  }, [session, isAdmin, isRAGAdmin]);

  // Afficher un message si pas autorisé
  if (session && !isAdmin && !isRAGAdmin) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <h1 className="text-xl font-semibold text-red-800 dark:text-red-200 mb-2">
            Accès non autorisé
          </h1>
          <p className="text-red-600 dark:text-red-300">
            Vous n'avez pas les permissions nécessaires pour accéder à cette page.
          </p>
        </div>
      </div>
    );
  }

  const checkHealth = async () => {
    try {
      const response = await fetch('/api/rag/health');
      if (response.ok) {
        const data = await response.json();
        setHealth(data);
      }
    } catch (error) {
      console.error('Erreur lors de la vérification de santé:', error);
    }
  };

  const performAction = async (action: string) => {
    setIsLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/rag/index', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      });

      if (response.ok) {
        const data = await response.json();
        setMessage({ type: 'success', text: data.message });
        
        // Recharger les stats après l'action
        if (action === 'index-all' || action === 'clear') {
          setTimeout(checkHealth, 1000);
        }
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.error || 'Erreur lors de l\'opération' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Erreur de connexion' });
    } finally {
      setIsLoading(false);
    }
  };

  if (!session) {
    return <div>Non autorisé</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* En-tête */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Administration RAG
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Gestion du système de questions-réponses intelligentes
          </p>
        </div>

        {/* Message de statut */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.type === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-800' 
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            {message.text}
          </div>
        )}

        {/* État de santé */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Ollama */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Ollama API
              </h2>
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                health?.ollama.healthy 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {health?.ollama.healthy ? '✅ Opérationnel' : '❌ Indisponible'}
              </div>
            </div>
            
            {health && (
              <div className="space-y-3">
                <div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">URL:</span>
                  <span className="ml-2 text-sm font-mono text-gray-900 dark:text-white">
                    {health.ollama.baseUrl}
                  </span>
                </div>
                
                <div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Modèle principal:</span>
                  <span className="ml-2 text-sm text-gray-900 dark:text-white">
                    {health.ollama.config.model}
                  </span>
                </div>
                
                <div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Modèle d'embedding:</span>
                  <span className="ml-2 text-sm text-gray-900 dark:text-white">
                    {health.ollama.config.embeddingModel}
                  </span>
                </div>
                
                <div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Modèles disponibles:</span>
                  <span className="ml-2 text-sm text-gray-900 dark:text-white">
                    {health.ollama.models.length}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Vector Store */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Base de données vectorielle
              </h2>
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                health?.vectorStore.healthy 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {health?.vectorStore.healthy ? '✅ Opérationnel' : '❌ Indisponible'}
              </div>
            </div>
            
            {health && (
              <div className="space-y-3">
                <div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Total documents:</span>
                  <span className="ml-2 text-sm font-semibold text-gray-900 dark:text-white">
                    {health.vectorStore.stats.totalDocuments}
                  </span>
                </div>
                
                <div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Avec embeddings:</span>
                  <span className="ml-2 text-sm font-semibold text-gray-900 dark:text-white">
                    {health.vectorStore.stats.documentsWithEmbeddings}
                  </span>
                </div>
                
                <div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Par type:</span>
                  <div className="ml-2 mt-1">
                    {Object.entries(health.vectorStore.stats.byType).map(([type, count]) => (
                      <div key={type} className="text-xs text-gray-600 dark:text-gray-400">
                        {type}: {count}
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Stats de conversation */}
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Conversations RAG</h4>
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm text-gray-600 dark:text-gray-400">Utilisateurs actifs:</span>
                      <span className="ml-2 text-sm font-medium text-gray-900 dark:text-white">
                        {health.vectorStore.stats.conversationStats?.totalUsers || 0}
                      </span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600 dark:text-gray-400">Conversations:</span>
                      <span className="ml-2 text-sm font-medium text-gray-900 dark:text-white">
                        {health.vectorStore.stats.conversationStats?.totalConversations || 0}
                      </span>
                    </div>
                    {health.vectorStore.stats.conversationStats?.lastActivity && (
                      <div>
                        <span className="text-sm text-gray-600 dark:text-gray-400">Dernière activité:</span>
                        <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                          {new Date(health.vectorStore.stats.conversationStats.lastActivity).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Actions d'administration
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => performAction('index-all')}
              disabled={isLoading || !health?.ollama.healthy}
              className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 
                       disabled:opacity-50 disabled:cursor-not-allowed transition-colors
                       flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              )}
              Réindexer tout
            </button>
            
            <button
              onClick={() => performAction('stats')}
              disabled={isLoading}
              className="px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 
                       disabled:opacity-50 disabled:cursor-not-allowed transition-colors
                       flex items-center justify-center gap-2"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Actualiser stats
            </button>
            
            <button
              onClick={() => performAction('clear')}
              disabled={isLoading}
              className="px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 
                       disabled:opacity-50 disabled:cursor-not-allowed transition-colors
                       flex items-center justify-center gap-2"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Vider la base
            </button>
          </div>
          
          <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
            <p><strong>Réindexer tout:</strong> Indexe tous les chantiers, commandes et états d'avancement</p>
            <p><strong>Actualiser stats:</strong> Met à jour les statistiques de la base vectorielle</p>
            <p><strong>Vider la base:</strong> Supprime tous les documents indexés (attention!)</p>
          </div>
        </div>

        {/* Planificateur d'indexation automatique */}
        <div className="mt-8">
          <RAGSchedulerAdmin />
        </div>

        {/* Bouton de rafraîchissement */}
        <div className="mt-6 text-center">
          <button
            onClick={checkHealth}
            disabled={isLoading}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 
                     disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Actualiser l'état
          </button>
        </div>
      </div>
    </div>
  );
}
