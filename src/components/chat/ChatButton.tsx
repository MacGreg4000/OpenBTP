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
        className="group fixed bottom-6 right-6 z-50 bg-gradient-to-br from-amber-500 via-orange-600 to-red-600 hover:from-amber-600 hover:via-orange-700 hover:to-red-700 text-white rounded-full p-4 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-110 flex items-center justify-center backdrop-blur-sm"
        aria-label="Chat"
        style={{
          boxShadow: '0 10px 25px -5px rgba(251, 146, 60, 0.3), 0 8px 10px -6px rgba(251, 146, 60, 0.2)'
        }}
      >
        {/* Icône de message */}
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className="h-6 w-6 group-hover:scale-110 transition-transform duration-300" 
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
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center animate-pulse shadow-lg ring-2 ring-white">
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