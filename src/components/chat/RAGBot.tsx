// Assistant IA agentique (tool calling via Ollama)
'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { Remarkable } from 'remarkable';

interface ToolCallInfo {
  name: string;
  durationMs: number;
}

interface RAGMessage {
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
  metadata?: {
    toolCalls?: ToolCallInfo[];
    processingTime?: number;
    model?: string;
    error?: boolean;
    [key: string]: unknown;
  };
}

interface PendingAction {
  tool: string;
  args: Record<string, unknown>;
  resume: string;
}

interface RAGBotProps {
  onSendMessage?: (message: string, metadata?: Record<string, unknown>) => void;
  disabled?: boolean;
}

const SUGGESTIONS = [
  'Quels chantiers sont en cours ?',
  'Résumé du chantier…',
  'Crée une note sur le chantier…',
  'Tarifs du sous-traitant…',
];

const LOADING_STEPS = [
  'Analyse de la question…',
  'Consultation de la base de données…',
  'Croisement des informations…',
  'Rédaction de la réponse…',
];

const md = new Remarkable({ breaks: true, html: false });

function ToolChips({ toolCalls, processingTime }: { toolCalls: ToolCallInfo[]; processingTime?: number }) {
  const [open, setOpen] = useState(false);
  if (!toolCalls || toolCalls.length === 0) return null;
  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen(!open)}
        className="text-[11px] text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors flex items-center gap-1"
      >
        <svg className={`h-3 w-3 transition-transform ${open ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        {toolCalls.length} outil{toolCalls.length > 1 ? 's' : ''} utilisé{toolCalls.length > 1 ? 's' : ''}
        {processingTime ? ` (${(processingTime / 1000).toFixed(1).replace('.', ',')} s)` : ''}
      </button>
      {open && (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {toolCalls.map((t, i) => (
            <span
              key={i}
              className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 border border-blue-100 dark:border-blue-800"
            >
              {t.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function RAGBot({ onSendMessage: _onSendMessage, disabled = false }: RAGBotProps) {
  const { data: session } = useSession();
  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [conversation, setConversation] = useState<RAGMessage[]>([]);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [health, setHealth] = useState<{ model: string; supportsTools: boolean } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Rotation des messages d'attente
  useEffect(() => {
    if (!isLoading) {
      setLoadingStep(0);
      return;
    }
    const interval = setInterval(() => {
      setLoadingStep((s) => Math.min(s + 1, LOADING_STEPS.length - 1));
    }, 4000);
    return () => clearInterval(interval);
  }, [isLoading]);

  // Scroll automatique vers le bas
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [conversation, isLoading, pendingAction]);

  const loadConversation = async (): Promise<RAGMessage[]> => {
    try {
      const response = await fetch('/api/rag/conversation');
      if (response.ok) {
        const data = await response.json();
        return data.conversation || [];
      }
      return [];
    } catch {
      return [];
    }
  };

  const saveMessage = async (message: RAGMessage): Promise<void> => {
    try {
      await fetch('/api/rag/conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });
    } catch {
      /* non bloquant */
    }
  };

  const clearConversation = async (): Promise<void> => {
    try {
      await fetch('/api/rag/conversation', { method: 'DELETE' });
    } catch {
      /* non bloquant */
    }
  };

  useEffect(() => {
    const initialize = async () => {
      if (session?.user?.id) {
        setConversation(await loadConversation());
      }
      try {
        const res = await fetch('/api/chatbot/health');
        if (res.ok) {
          const data = await res.json();
          setHealth({ model: data.model, supportsTools: data.supportsTools });
        }
      } catch {
        /* pastille reste grise */
      }
    };
    initialize();
  }, [session?.user?.id]);

  const pushBotMessage = async (message: RAGMessage) => {
    setConversation((prev) => [...prev, message]);
    await saveMessage(message);
  };

  const ask = async (userQuestion: string) => {
    if (!userQuestion.trim() || isLoading || disabled) return;
    setIsLoading(true);
    setPendingAction(null);

    const userMessage: RAGMessage = { type: 'user', content: userQuestion, timestamp: new Date() };
    setConversation((prev) => [...prev, userMessage]);
    setQuestion('');
    await saveMessage(userMessage);

    try {
      const response = await fetch('/api/chatbot/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ question: userQuestion }),
      });

      if (!response.ok) {
        let detail = '';
        try {
          const err = (await response.json()) as { error?: string };
          if (err?.error) detail = err.error;
        } catch {
          /* ignore */
        }
        await pushBotMessage({
          type: 'bot',
          content:
            detail ||
            `La requête vers l'assistant a échoué (HTTP ${response.status}). Vérifiez la connexion au serveur Ollama via la page d'administration.`,
          timestamp: new Date(),
          metadata: { error: true },
        });
        return;
      }

      const data = await response.json();

      if (data.pendingAction) {
        setPendingAction(data.pendingAction as PendingAction);
        return;
      }

      await pushBotMessage({
        type: 'bot',
        content: data.answer || '(réponse vide)',
        timestamp: new Date(),
        metadata: {
          toolCalls: data.toolCalls,
          processingTime: data.processingTime,
          model: data.model,
        },
      });
    } catch {
      await pushBotMessage({
        type: 'bot',
        content: 'Je rencontre un problème technique. Veuillez réessayer plus tard.',
        timestamp: new Date(),
        metadata: { error: true },
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    ask(question.trim());
  };

  const confirmAction = async () => {
    if (!pendingAction || confirming) return;
    setConfirming(true);
    try {
      const response = await fetch('/api/chatbot/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: pendingAction.tool, args: pendingAction.args }),
      });
      const data = await response.json();
      await pushBotMessage({
        type: 'bot',
        content: response.ok ? data.answer || '✓ Action exécutée.' : data.error || "L'action a échoué.",
        timestamp: new Date(),
        metadata: response.ok ? {} : { error: true },
      });
    } catch {
      await pushBotMessage({
        type: 'bot',
        content: "Erreur technique lors de l'exécution de l'action.",
        timestamp: new Date(),
        metadata: { error: true },
      });
    } finally {
      setPendingAction(null);
      setConfirming(false);
    }
  };

  const cancelAction = async () => {
    if (!pendingAction) return;
    setPendingAction(null);
    await pushBotMessage({
      type: 'bot',
      content: 'Action annulée — rien n\'a été créé.',
      timestamp: new Date(),
    });
  };

  const isEmpty = conversation.length === 0 && !isLoading && !pendingAction;

  const renderedConversation = useMemo(
    () =>
      conversation.map((message, index) => {
        const isUser = message.type === 'user';
        return (
          <div key={index} className={`flex ${isUser ? 'justify-end' : 'justify-start'} px-4 py-1.5`}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                isUser
                  ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-br-md'
                  : message.metadata?.error
                    ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-100 dark:border-red-800 rounded-bl-md'
                    : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-100 dark:border-gray-700 rounded-bl-md'
              }`}
            >
              {isUser ? (
                <span className="whitespace-pre-wrap break-words">{message.content}</span>
              ) : (
                <div
                  className="chatbot-markdown break-words [&_table]:my-2 [&_table]:w-full [&_table]:text-xs [&_th]:text-left [&_th]:font-semibold [&_th]:border-b [&_th]:border-gray-200 dark:[&_th]:border-gray-600 [&_th]:px-2 [&_th]:py-1 [&_td]:px-2 [&_td]:py-1 [&_td]:border-b [&_td]:border-gray-100 dark:[&_td]:border-gray-700 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-1 [&_strong]:font-semibold"
                  dangerouslySetInnerHTML={{ __html: md.render(message.content) }}
                />
              )}
              {!isUser && message.metadata?.toolCalls && (
                <ToolChips
                  toolCalls={message.metadata.toolCalls}
                  processingTime={message.metadata.processingTime}
                />
              )}
            </div>
          </div>
        );
      }),
    [conversation]
  );

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      {/* Bandeau : modèle actif + effacer */}
      <div className="flex justify-between items-center px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <span
            className={`inline-block w-2 h-2 rounded-full ${
              health ? (health.supportsTools ? 'bg-emerald-500' : 'bg-amber-500') : 'bg-gray-300'
            }`}
            title={health ? (health.supportsTools ? 'Modèle prêt (outils OK)' : 'Modèle sans support des outils') : 'Statut inconnu'}
          />
          <span className="font-medium">{health?.model || 'Assistant IA'}</span>
        </div>
        {conversation.length > 0 && (
          <button
            onClick={async () => {
              setConversation([]);
              setPendingAction(null);
              await clearConversation();
            }}
            className="text-xs text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors flex items-center gap-1"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Effacer
          </button>
        )}
      </div>

      {/* Conversation */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto py-3">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full px-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg mb-4">
              <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Assistant OpenBTP</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 mb-5 max-w-[260px]">
              Je consulte vos chantiers, commandes, états d&apos;avancement… et je peux créer des notes, tâches et commandes.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => (s.endsWith('…') ? setQuestion(s.replace('…', ' ')) : ask(s))}
                  className="text-xs px-3 py-1.5 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-blue-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors shadow-sm"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {renderedConversation}

            {/* Indicateur de chargement */}
            {isLoading && (
              <div className="flex justify-start px-4 py-1.5">
                <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm flex items-center gap-3">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:0ms]" />
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:150ms]" />
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:300ms]" />
                  </div>
                  <span className="text-xs text-gray-400 dark:text-gray-500">{LOADING_STEPS[loadingStep]}</span>
                </div>
              </div>
            )}

            {/* Carte de confirmation d'action */}
            {pendingAction && (
              <div className="px-4 py-2">
                <div className="rounded-2xl border-2 border-amber-300 dark:border-amber-600 bg-amber-50 dark:bg-amber-900/20 p-4 shadow-md">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-800/50 flex items-center justify-center flex-shrink-0">
                      <svg className="h-5 w-5 text-amber-600 dark:text-amber-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">Confirmation requise</p>
                      <p className="text-sm text-amber-700 dark:text-amber-300 mt-1 break-words">{pendingAction.resume}</p>
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={confirmAction}
                          disabled={confirming}
                          className="px-4 py-1.5 text-sm font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors disabled:opacity-60 flex items-center gap-1.5"
                        >
                          {confirming ? (
                            <span className="inline-block h-3.5 w-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                          ) : (
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                          Confirmer
                        </button>
                        <button
                          onClick={cancelAction}
                          disabled={confirming}
                          className="px-4 py-1.5 text-sm font-medium rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-60"
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Zone de saisie */}
      <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3">
        <form onSubmit={handleSubmit} className="flex gap-2 items-end">
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                ask(question.trim());
              }
            }}
            placeholder="Posez votre question…"
            className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-2xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white dark:focus:bg-gray-700 resize-none min-h-[44px] max-h-32 text-sm transition-colors"
            disabled={isLoading || disabled || !!pendingAction}
            rows={1}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = Math.min(target.scrollHeight, 128) + 'px';
            }}
          />
          <button
            type="submit"
            disabled={!question.trim() || isLoading || disabled || !!pendingAction}
            className="h-[44px] w-[44px] flex-shrink-0 bg-gradient-to-br from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-full disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center shadow-md hover:shadow-lg active:scale-95"
            aria-label="Envoyer"
          >
            <svg className="h-5 w-5 translate-x-[1px]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M3.478 2.404a.75.75 0 00-.926.941l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.404z" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}
