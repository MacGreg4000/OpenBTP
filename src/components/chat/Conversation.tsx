import React, { useEffect, useRef } from 'react';
import Image from 'next/image';
import { Chat as ChatType, ChatMessage } from './context/ChatContext';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useSession } from 'next-auth/react';

interface ConversationProps {
  chat: ChatType;
}

const Conversation: React.FC<ConversationProps> = ({ chat }) => {
  const { data: session } = useSession();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Faire défiler vers le bas à chaque nouveau message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat.messages]);
  
  // Fonction utilitaire pour vérifier si une date est valide
  const isValidDate = (dateValue: unknown): boolean => {
    if (!dateValue) return false;
    const date = new Date(dateValue as string | number | Date);
    return !isNaN(date.getTime());
  };
  
  // formatMessageDate supprimé (non utilisé)
  
  // Grouper les messages par date
  const groupMessagesByDate = (messages: ChatMessage[]) => {
    const groups: { [key: string]: ChatMessage[] } = {};
    
    // Vérifier si nous avons des messages
    if (!messages || messages.length === 0) {
      return [];
    }
    
    // Parcourir tous les messages
    messages.forEach(message => {
      if (!isValidDate(message.createdAt)) {
        // Si la date n'est pas valide, l'ajouter dans un groupe "Date inconnue"
        const day = "Date inconnue";
        if (!groups[day]) {
          groups[day] = [];
        }
        groups[day].push(message);
        return;
      }
      
      const date = new Date(message.createdAt as unknown as string | number | Date);
      const day = format(date, 'dd/MM/yyyy');
      
      if (!groups[day]) {
        groups[day] = [];
      }
      
      groups[day].push(message);
    });
    
    return Object.entries(groups).map(([date, msgs]) => ({
      date,
      messages: msgs.sort((a, b) => {
        // Si l'une des dates n'est pas valide, retourner 0 (conserver l'ordre)
        if (!isValidDate(a.createdAt) || !isValidDate(b.createdAt)) return 0;
        return new Date(a.createdAt as unknown as string | number | Date).getTime() - new Date(b.createdAt as unknown as string | number | Date).getTime();
      }),
    }));
  };
  
  // Vérifier si le message est de l'utilisateur courant
  const isCurrentUser = (senderId: string) => {
    return senderId === session?.user?.id;
  };
  
  // Formater l'heure du message
  const formatMessageTime = (date: Date | string) => {
    if (!isValidDate(date)) return "--:--";
    return format(new Date(date as unknown as string | number | Date), 'HH:mm');
  };
  
  // Formater le jour pour l'en-tête des groupes
  const formatDay = (dateStr: string) => {
    if (dateStr === "Date inconnue") return dateStr;
    
    try {
      // Pour les dates au format dd/MM/yyyy (comme retournées par la fonction format)
      if (dateStr.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
        const [day, month, year] = dateStr.split('/').map(Number);
        const date = new Date(year, month - 1, day);
        
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        if (date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear()) {
          return 'Aujourd\'hui';
        } else if (date.getDate() === yesterday.getDate() &&
                  date.getMonth() === yesterday.getMonth() &&
                  date.getFullYear() === yesterday.getFullYear()) {
          return 'Hier';
        } else {
          return format(date, 'EEEE d MMMM', { locale: fr });
        }
      }
      
      // Autre tentative avec la date directement
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        console.log('Date invalide:', dateStr);
        return 'Date inconnue';
      }
      
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      const formatCompare = 'yyyy-MM-dd';
      if (format(date, formatCompare) === format(today, formatCompare)) {
        return 'Aujourd\'hui';
      } else if (format(date, formatCompare) === format(yesterday, formatCompare)) {
        return 'Hier';
      } else {
        return format(date, 'EEEE d MMMM', { locale: fr });
      }
    } catch (error) {
      console.error('Erreur dans formatDay:', error, 'pour la date:', dateStr);
      return "Date inconnue";
    }
  };
  
  // Afficher le contenu du message (texte ou fichier)
  const renderMessageContent = (message: ChatMessage) => {
    if (message.fileUrl) {
      // Déterminer le type de fichier
      const isImage = message.fileType?.startsWith('image/');
      
      return (
        <div>
          {message.content && <p className="mb-2">{message.content}</p>}
          
          {isImage ? (
            <a href={message.fileUrl} target="_blank" rel="noopener noreferrer" className="block">
              <Image 
                src={message.fileUrl} 
                alt={message.fileName || 'Image'} 
                className="max-h-60 max-w-full rounded-lg shadow-sm hover:opacity-90 transition-opacity" 
                width={600}
                height={240}
              />
            </a>
          ) : (
            <a 
              href={message.fileUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center p-3 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-medium truncate">{message.fileName || 'Fichier'}</span>
            </a>
          )}
        </div>
      );
    }
    
    return <p className="whitespace-pre-wrap">{message.content}</p>;
  };
  
  // Grouper et trier les messages
  const sortedMessageGroups = groupMessagesByDate(chat.messages);
  
  return (
    <div className="h-full flex flex-col">
      {sortedMessageGroups.map(group => (
        <div key={group.date} className="mb-4">
          <div className="text-center my-4">
            <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs rounded-full font-medium">
              {formatDay(group.date)}
            </span>
          </div>
          
          {group.messages.map(message => (
            <div 
              key={message.id} 
              className={`flex mb-4 ${isCurrentUser(message.senderId) ? 'justify-end' : 'justify-start'}`}
            >
              <div 
                className={`max-w-xs md:max-w-md lg:max-w-lg rounded-lg px-4 py-2.5 shadow-sm ${
                  isCurrentUser(message.senderId) 
                    ? 'bg-blue-600 text-white rounded-br-none' 
                    : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none'
                }`}
              >
                {!isCurrentUser(message.senderId) && (
                  <div className="font-medium text-xs mb-1 flex items-center">
                    <span className="w-5 h-5 rounded-full bg-gray-300 mr-1 flex items-center justify-center uppercase text-xs text-gray-700">
                      {message.sender?.name?.charAt(0) || '?'}
                    </span>
                    <span>{message.sender?.name || 'Utilisateur'}</span>
                  </div>
                )}
                
                {renderMessageContent(message)}
                
                <div 
                  className={`text-xs mt-1 flex justify-end items-center ${
                    isCurrentUser(message.senderId) ? 'text-blue-200' : 'text-gray-500'
                  }`}
                >
                  {formatMessageTime(message.createdAt)}
                  {isCurrentUser(message.senderId) && (
                    <span className="ml-1">
                      {message.read ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                          <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ))}
      
      {/* Élément invisible pour faire défiler vers le bas */}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default Conversation; 