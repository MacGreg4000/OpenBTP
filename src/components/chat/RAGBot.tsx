// Bot RAG pour le chat
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { RAGResponse } from '@/types/rag';

// Interface pour les messages RAG
interface RAGMessage {
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
  metadata?: {
    confidence?: number;
    sources?: number;
    processingTime?: number;
    ragResponse?: Record<string, unknown>;
    error?: boolean;
  };
}

interface RAGBotProps {
  onSendMessage: (message: string, metadata?: Record<string, unknown>) => void;
  disabled?: boolean;
}

export default function RAGBot({ onSendMessage: _onSendMessage, disabled = false }: RAGBotProps) {
  const { data: session } = useSession();
  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [_lastResponse, setLastResponse] = useState<RAGResponse | null>(null);
  const [_indexStatus, setIndexStatus] = useState<{totalDocuments: number, isIndexed: boolean} | null>(null);
  const [conversation, setConversation] = useState<RAGMessage[]>([]);

  // Fonctions pour gérer les conversations via API
  const loadConversation = async (): Promise<RAGMessage[]> => {
    try {
      const response = await fetch('/api/rag/conversation');
      if (response.ok) {
        const data = await response.json();
        return data.conversation || [];
      }
      return [];
    } catch (error) {
      console.error('Erreur lors du chargement de la conversation:', error);
      return [];
    }
  };

  const saveMessage = async (message: RAGMessage): Promise<void> => {
    try {
      await fetch('/api/rag/conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      });
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du message:', error);
    }
  };

  const clearConversation = async (): Promise<void> => {
    try {
      await fetch('/api/rag/conversation', {
        method: 'DELETE'
      });
    } catch (error) {
      console.error('Erreur lors de l\'effacement de la conversation:', error);
    }
  };

  // Charger la conversation et vérifier le statut au démarrage
  useEffect(() => {
    const initializeRAG = async () => {
      try {
        // Charger la conversation de l'utilisateur
        if (session?.user?.id) {
          const userConversation = await loadConversation();
          setConversation(userConversation);
        }

        // Vérifier le statut d'indexation
        const response = await fetch('/api/rag/health');
        if (response.ok) {
          const data = await response.json();
          const totalDocuments = data.vectorStore?.stats?.totalDocuments || 0;
          setIndexStatus({
            totalDocuments,
            isIndexed: totalDocuments > 0
          });
        }
      } catch (error) {
        console.error('Erreur lors de l\'initialisation RAG:', error);
      }
    };

    initializeRAG();
  }, [session?.user?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!question.trim() || isLoading || disabled) return;

    const userQuestion = question.trim();
    setIsLoading(true);
    
    // Ajouter la question utilisateur à la conversation
    const userMessage: RAGMessage = {
      type: 'user',
      content: userQuestion,
      timestamp: new Date()
    };
    setConversation(prev => [...prev, userMessage]);
    
    // Sauvegarder la question utilisateur
    await saveMessage(userMessage);
    
    try {
      // D'abord essayer la requête RAG
      const ragResponse = await fetch('/api/rag/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: userQuestion
        }),
      });

      let botMessage: RAGMessage;

      if (ragResponse.ok) {
        const ragData: RAGResponse = await ragResponse.json();
        setLastResponse(ragData);

        // Si la réponse RAG a une bonne confiance, l'utiliser (seuil augmenté à 0.5)
        if (ragData.confidence && ragData.confidence >= 0.5) {
          botMessage = {
            type: 'bot',
            content: ragData.answer,
            timestamp: new Date(),
            metadata: {
              confidence: ragData.confidence,
              sources: ragData.sources.length,
              processingTime: ragData.processingTime,
              ragResponse: ragData as unknown as Record<string, unknown>
            }
          };
        } else if (ragData.confidence && ragData.confidence >= 0.3) {
          // Confiance moyenne : afficher la réponse avec un avertissement
          botMessage = {
            type: 'bot',
            content: `⚠️ Réponse avec confiance modérée (${Math.round(ragData.confidence * 100)}%)\n\n${ragData.answer}\n\n💡 Si cette réponse ne correspond pas à votre besoin, reformulez votre question pour plus de précision.`,
            timestamp: new Date(),
            metadata: {
              confidence: ragData.confidence,
              sources: ragData.sources.length,
              processingTime: ragData.processingTime,
              ragResponse: ragData as unknown as Record<string, unknown>
            }
          };
        } else {
          // Confiance trop faible : réponse générique
          botMessage = {
            type: 'bot',
            content: `Je n'ai pas trouvé d'informations suffisamment fiables dans la base de connaissances pour votre question "${userQuestion}". 

💡 **Suggestions pour améliorer votre recherche :**
• Soyez plus spécifique (ex: nom du chantier, numéro de commande)
• Utilisez des mots-clés précis (client, matériau, machine, etc.)
• Reformulez votre question différemment

**Je peux vous aider avec :**
📋 Chantiers et leur suivi
💰 Commandes et devis  
📊 États d'avancement
👥 Clients et sous-traitants
📦 Inventaire et matériaux
🔧 Machines et équipements`,
            timestamp: new Date(),
            metadata: {
              confidence: ragData.confidence || 0,
              sources: ragData.sources?.length || 0,
              processingTime: ragData.processingTime || 0,
              ragResponse: null
            }
          };
        }
      } else {
        // En cas d'erreur RAG, donner une réponse générale
        botMessage = {
          type: 'bot',
          content: `Je suis un assistant spécialisé dans la gestion de chantiers et de projets. Je peux vous aider avec des questions sur :
          
• Les chantiers et leur suivi
• Les commandes et devis
• Les états d'avancement
• La gestion des clients et sous-traitants
• Les rapports et documents

Pour votre question "${userQuestion}", pourriez-vous me donner plus de détails ou reformuler ?`,
          timestamp: new Date(),
          metadata: {
            confidence: 0,
            sources: 0,
            processingTime: 0,
            ragResponse: null
          }
        };
      }
      setConversation(prev => [...prev, botMessage]);
      
      // Sauvegarder la réponse du bot
      await saveMessage(botMessage);

      // Vider le champ de question
      setQuestion('');

    } catch (error) {
      console.error('Erreur RAG Bot:', error);
      
      const errorMessage = 'Je rencontre un problème technique. Veuillez réessayer plus tard.';
      const errorBotMessage: RAGMessage = {
        type: 'bot',
        content: errorMessage,
        timestamp: new Date(),
        metadata: { error: true }
      };
      setConversation(prev => [...prev, errorBotMessage]);
      
      // Sauvegarder le message d'erreur
      await saveMessage(errorBotMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.7) return 'text-green-600 dark:text-green-400';
    if (confidence >= 0.4) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <div className="flex flex-col h-full">
      {/* En-tête avec bouton effacer */}
      {conversation.length > 0 && (
        <div className="flex justify-between items-center p-3 border-b border-gray-200 bg-gray-50 dark:bg-gray-700">
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Assistant IA ({conversation.length} messages)
          </div>
          <button
            onClick={async () => {
              setConversation([]);
              await clearConversation();
            }}
            className="text-xs text-red-600 hover:text-red-700 px-3 py-1 rounded-md border border-red-200 hover:border-red-300 hover:bg-red-50 transition-colors flex items-center gap-1"
          >
            🗑️ Effacer
          </button>
        </div>
      )}

      {/* Conversation RAG avec scroll amélioré */}
      <div className="flex-1 overflow-y-auto">
        {conversation.length > 0 ? (
          <div className="space-y-0">
            {conversation.map((message, index) => (
              <div key={index} className={`p-4 border-b border-gray-100 last:border-b-0 ${
                message.type === 'user' ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-gray-50 dark:bg-gray-800/50'
              }`}>
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                    message.type === 'user' 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-500 text-white'
                  }`}>
                    {message.type === 'user' ? 'U' : '🤖'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words">
                      {message.content}
                    </div>
                    {message.metadata && !message.metadata.error && (
                      <div className="mt-2 flex flex-wrap gap-2 text-xs">
                        <span className={`px-2 py-1 rounded-full ${getConfidenceColor(message.metadata.confidence)} bg-opacity-10`}>
                          Confiance: {(message.metadata.confidence * 100).toFixed(0)}%
                        </span>
                        <span className="px-2 py-1 rounded-full text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700">
                          {message.metadata.sources} source{message.metadata.sources > 1 ? 's' : ''}
                        </span>
                        <span className="px-2 py-1 rounded-full text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700">
                          {message.metadata.processingTime}ms
                        </span>
                      </div>
                    )}
                    {message.metadata?.error && (
                      <div className="mt-1 text-xs text-red-600 dark:text-red-400">
                        Erreur technique
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
            <div className="text-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-4 mx-auto" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" clipRule="evenodd" />
              </svg>
              <p className="text-sm">Posez votre question à l'assistant IA</p>
              <p className="text-xs text-gray-400 mt-1">Il vous aidera à trouver des informations sur vos chantiers et projets</p>
            </div>
          </div>
        )}
      </div>

      {/* Zone de saisie */}
      <div className="border-t border-gray-200 p-2 sm:p-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <div className="flex-1 relative min-w-0">
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Tapez votre message..."
              className="w-full px-3 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none min-h-[44px] max-h-32 text-base"
              disabled={isLoading || disabled}
              rows={1}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = Math.min(target.scrollHeight, 128) + 'px';
              }}
            />
            {isLoading && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
              </div>
            )}
          </div>
          <button
            type="submit"
            disabled={!question.trim() || isLoading || disabled}
            className="px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors min-h-[44px] min-w-[80px] flex items-center justify-center active:bg-blue-700"
          >
            {isLoading ? '...' : 'Envoyer'}
          </button>
        </form>
      </div>
    </div>
  );
}