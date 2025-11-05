import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useChat } from './context/ChatContext';
import { createPortal } from 'react-dom';
import ChatWindow from '../chat/ChatWindow';

const ChatButton: React.FC = () => {
  const { toggleChat, isOpen, chats } = useChat();
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  
  // Masquer le chat sur les pages mobiles
  const isMobilePage = pathname?.startsWith('/mobile');
  
  // Compter les messages non lus
  const unreadCount = chats.reduce((acc, chat) => {
    return acc + (chat.unreadCount || 0);
  }, 0);
  
  // S'assurer que le composant est monté côté client
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || isMobilePage) return null;

  return (
    <>
      <button
        onClick={toggleChat}
        className="fixed bottom-6 right-6 z-50 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-3 shadow-lg transition-transform transform hover:scale-105 flex items-center justify-center"
        aria-label="Chat"
      >
        {/* Icône de message */}
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className="h-6 w-6" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" 
          />
        </svg>
        
        {/* Badge de notification */}
        {unreadCount > 0 && (
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Fenêtre de chat en utilisant Portal pour le rendre en dehors de la hiérarchie DOM */}
      {mounted && isOpen && createPortal(
        <ChatWindow />,
        document.body
      )}
    </>
  );
};

export default ChatButton; 