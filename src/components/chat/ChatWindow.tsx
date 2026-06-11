import React, { useRef, useState, useEffect } from 'react';
import { useChat } from './context/ChatContext';
import ConversationList from '../chat/ConversationList';
import Conversation from '../chat/Conversation';
import MessageInput from '../chat/MessageInput';
import RAGBot from './RAGBot';
import { useFeatures } from '@/hooks/useFeatures';

const ChatWindow: React.FC = () => {
  const { isOpen, closeChat, activeChat, backToChatList } = useChat();
  const { isEnabled } = useFeatures();
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [activeTab, setActiveTab] = useState<'chat' | 'rag'>('chat');
  
  // Vérifier si les modules sont activés
  const isMessagerieEnabled = isEnabled('messagerie');
  const isRagEnabled = isEnabled('chat');
  
  // Si le module RAG est désactivé et qu'on est sur l'onglet RAG, revenir au chat
  // Si le module messagerie est désactivé et qu'on est sur l'onglet chat, aller vers RAG
  useEffect(() => {
    if (!isRagEnabled && activeTab === 'rag') {
      setActiveTab('chat');
    }
    if (!isMessagerieEnabled && activeTab === 'chat' && isRagEnabled) {
      setActiveTab('rag');
    }
  }, [isRagEnabled, isMessagerieEnabled, activeTab]);
  
  // Initialiser les dimensions en fonction de l'écran
  useEffect(() => {
    const updateDimensions = () => {
      const isMobile = window.innerWidth < 768;
      if (isMobile) {
        setPosition({ x: 0, y: 0 });
        // Utiliser 100vh pour mobile, mais gérer le clavier
        setSize({ width: window.innerWidth, height: window.innerHeight });
      } else {
        setPosition({ x: window.innerWidth - 620, y: 100 });
        setSize({ width: 580, height: 600 });
      }
    };
    
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    
    // Gérer le clavier mobile
    const handleVisualViewportChange = () => {
      if (window.visualViewport) {
        const isMobile = window.innerWidth < 768;
        if (isMobile) {
          setSize({ 
            width: window.visualViewport.width, 
            height: window.visualViewport.height 
          });
        }
      }
    };
    
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleVisualViewportChange);
    }
    
    return () => {
      window.removeEventListener('resize', updateDimensions);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleVisualViewportChange);
      }
    };
  }, []);
  const chatRef = useRef<HTMLDivElement>(null);
  const resizeRef = useRef<HTMLDivElement>(null);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const dragStartSize = useRef({ width: 0, height: 0 });

  // Gérer le déplacement de la fenêtre
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartPos.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
  };

  // Gérer le redimensionnement
  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    dragStartSize.current = { ...size };
    document.addEventListener('mousemove', handleResize);
    document.addEventListener('mouseup', stopResize);
  };

  const handleResize = (e: MouseEvent) => {
    const deltaX = e.clientX - dragStartPos.current.x;
    const deltaY = e.clientY - dragStartPos.current.y;
    
    const newWidth = Math.max(480, dragStartSize.current.width + deltaX);
    const newHeight = Math.max(500, dragStartSize.current.height + deltaY);
    
    setSize({ width: newWidth, height: newHeight });
  };

  const stopResize = () => {
    document.removeEventListener('mousemove', handleResize);
    document.removeEventListener('mouseup', stopResize);
  };

  // Déplacer la fenêtre avec la souris
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const newX = e.clientX - dragStartPos.current.x;
        const newY = e.clientY - dragStartPos.current.y;
        
        // Limiter à l'intérieur de la fenêtre
        const maxX = window.innerWidth - 100;
        const maxY = window.innerHeight - 100;
        
        setPosition({
          x: Math.min(Math.max(0, newX), maxX),
          y: Math.min(Math.max(0, newY), maxY),
        });
      }
    };
    
    const handleMouseUp = () => {
      setIsDragging(false);
    };
    
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  // Si la fenêtre n'est pas ouverte, ne rien afficher
  if (!isOpen) return null;

  // Détection mobile: viewport < 768px OU appareil tactile (ex: "version bureau" sur téléphone)
  const isMobile = typeof window !== 'undefined' && (
    window.innerWidth < 768 ||
    ('ontouchstart' in window) ||
    (navigator.maxTouchPoints && navigator.maxTouchPoints > 0)
  );

  return (
    <div 
      ref={chatRef}
      className={`fixed bg-white dark:bg-gray-900 overflow-hidden flex flex-col z-50 smooth-scroll ${
        isMobile ? 'inset-0 rounded-none mobile-chat-container' : 'rounded-2xl shadow-2xl'
      }`}
      style={{
        left: isMobile ? 0 : `${position.x}px`,
        top: isMobile ? 0 : `${position.y}px`,
        width: isMobile ? '100vw' : `${size.width}px`,
        height: isMobile ? '100dvh' : `${size.height}px`, // Utiliser dvh pour mobile
        transition: isDragging ? 'none' : 'box-shadow 0.3s ease',
        boxShadow: isMobile ? 'none' : (isDragging ? '0 25px 50px -12px rgba(0, 0, 0, 0.35)' : '0 20px 40px -10px rgba(0, 0, 0, 0.25)'),
        borderRadius: isMobile ? '0' : '16px',
        border: isMobile ? 'none' : '1px solid rgba(0, 0, 0, 0.08)'
      }}
    >
      {/* Barre de titre avec onglets */}
      <div
        className={`bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white relative ${
          isMobile ? 'cursor-default' : 'cursor-move'
        }`}
        onMouseDown={isMobile ? undefined : handleMouseDown}
        style={{
          borderTopLeftRadius: isMobile ? '0' : '15px',
          borderTopRightRadius: isMobile ? '0' : '15px',
          paddingTop: isMobile ? 'max(env(safe-area-inset-top), 0.5rem)' : undefined
        }}
      >
        {/* Bouton fermer - mobile: barre dédiée bien visible ; desktop: icône en haut à droite */}
        {isMobile ? (
          <div className="flex items-center justify-between px-3 pb-2">
            <button 
              onClick={closeChat}
              className="flex items-center gap-2 min-h-[44px] min-w-[44px] text-white/95 hover:text-white p-2 rounded-xl hover:bg-white/20 transition-colors -ml-1"
              aria-label="Fermer le chat"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span className="font-semibold text-base">Fermer</span>
            </button>
            <span className="text-white/90 text-sm font-medium">Chat</span>
            <div className="w-[72px]" />
          </div>
        ) : (
          <button 
            onClick={closeChat}
            className="absolute text-white/90 hover:text-white p-2 rounded-full hover:bg-white/20 transition-colors top-2 right-2"
            aria-label="Fermer le chat"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </button>
        )}

        {/* Onglets */}
        <div className={`flex ${isMobile ? 'pt-0' : ''}`}>
          {isMessagerieEnabled && (
            <button
              onClick={() => setActiveTab('chat')}
              className={`px-4 py-4 text-sm font-medium transition-colors ${
                (isMessagerieEnabled && isRagEnabled) ? 'flex-1' : 'w-full'
              } ${
                activeTab === 'chat' 
                  ? 'bg-white/20 text-white' 
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <div className="flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                </svg>
                <span className="text-base">Chat</span>
              </div>
            </button>
          )}
          {isRagEnabled && (
            <button
              onClick={() => setActiveTab('rag')}
              className={`px-4 py-4 text-sm font-medium transition-colors ${
                (isMessagerieEnabled && isRagEnabled) ? 'flex-1' : 'w-full'
              } ${
                activeTab === 'rag' 
                  ? 'bg-white/20 text-white' 
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <div className="flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
                </svg>
                <span className="text-base">Assistant IA</span>
              </div>
            </button>
          )}
        </div>
      </div>
      
      {/* Corps du chat */}
      {activeTab === 'chat' ? (
        <div className="flex flex-1 overflow-hidden">
          {/* Liste des conversations */}
          <div className={`border-r border-gray-200 flex-shrink-0 overflow-y-auto bg-gray-50 ${
            isMobile ? (activeChat ? 'hidden' : 'w-full') : 'w-2/5 md:w-1/3'
          }`}>
            <ConversationList />
          </div>
          
          {/* Conversation active */}
          <div className={`flex flex-col flex-1 bg-white ${
            isMobile ? (activeChat ? 'w-full' : 'hidden') : 'w-3/5 md:w-2/3'
          }`}>
            {activeChat ? (
              <>
                {/* Bouton retour pour mobile */}
                {isMobile && (
                  <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200 bg-gray-50">
                    <button
                      onClick={backToChatList}
                      className="flex items-center text-gray-600 hover:text-gray-800 p-2 -ml-2 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      <span className="text-base font-medium">Retour</span>
                    </button>
                    <span className="font-medium text-gray-800 text-lg">
                      {activeChat.name || 'Discussion'}
                    </span>
                    <div className="w-20"></div> {/* Spacer pour centrer le titre */}
                  </div>
                )}
                <div className="flex-1 overflow-y-auto p-3 sm:p-4 chat-conversation-area">
                  <Conversation chat={activeChat} />
                </div>
                <div className="border-t border-gray-200 bg-gray-50">
                  <MessageInput chatId={activeChat.id} />
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500 flex-col p-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-300 mb-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                </svg>
                <p className="text-center text-gray-600">Sélectionnez une conversation pour commencer à discuter</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Onglet RAG Bot */
        <div className="flex flex-col flex-1 bg-white h-full">
          <RAGBot onSendMessage={(message, metadata) => {
            console.log('Message RAG Bot:', message, metadata);
          }} />
        </div>
      )}
      
      {/* Coin pour le redimensionnement (desktop seulement) */}
      {!isMobile && (
        <div 
          ref={resizeRef}
          className="absolute bottom-0 right-0 w-8 h-8 cursor-se-resize z-10 flex items-center justify-center"
          onMouseDown={handleResizeStart}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
            <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM14 11a1 1 0 011 1v1h1a1 1 0 110 2h-1v1a1 1 0 11-2 0v-1h-1a1 1 0 110-2h1v-1a1 1 0 011-1z" />
          </svg>
        </div>
      )}
    </div>
  );
};

export default ChatWindow; 