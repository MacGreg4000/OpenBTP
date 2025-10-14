import { ReactNode, useEffect, useState } from 'react';
import { Chat, ChatContext } from './ChatContext';

// Configuration de base pour les requêtes
const baseHeaders = {
  'Content-Type': 'application/json',
};

// Propriétés du composant
interface ChatProviderProps {
  children: ReactNode;
}

export const ChatProvider = ({ children }: ChatProviderProps) => {
  // États
  const [isOpen, setIsOpen] = useState(false);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Récupérer les chats au chargement
  useEffect(() => {
    fetchChats();
  }, []);

  // Toggle l'état d'ouverture du chat
  const toggleChat = () => {
    setIsOpen(prev => {
      const newState = !prev;
      // Si on ouvre le chat, récupérer les conversations
      if (newState) {
        fetchChats();
      }
      return newState;
    });
  };

  // Ouvrir un chat spécifique
  const openChat = async (chatId: string) => {
    setLoading(true);
    try {
      // Trouver le chat dans la liste
      const chat = chats.find(c => c.id === chatId);
      
      if (chat) {
        // Récupérer les messages complets
        await fetchMessages(chatId);
        
        // Définir le chat actif
        setActiveChat(chat);
        
        // Si le chat est fermé, l'ouvrir
        if (!isOpen) {
          setIsOpen(true);
        }
        
        // Marquer les messages comme lus
        await markAsRead(chatId);
      }
    } catch (err) {
      setError('Erreur lors de l\'ouverture du chat');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Fermer le chat
  const closeChat = () => {
    setIsOpen(false);
  };

  // Revenir à la liste des conversations (pour mobile)
  const backToChatList = () => {
    setActiveChat(null);
  };

  // Récupérer tous les chats
  const fetchChats = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/messaging/conversations');
      if (!response.ok) {
        throw new Error('Erreur lors de la récupération des chats');
      }
      
      const data = await response.json();

      // S'assurer que les messages sont dans l'ordre chronologique
      const processedData = data.map((chat: Chat) => ({
        ...chat,
        messages: chat.messages ? chat.messages.reverse() : []
      }));
      
      setChats(processedData);
    } catch (err) {
      setError('Erreur lors de la récupération des chats');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Récupérer les messages d'un chat
  const fetchMessages = async (chatId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/messaging/messages?chatId=${chatId}`);
      if (!response.ok) {
        throw new Error('Erreur lors de la récupération des messages');
      }
      
      const messages = await response.json();
      
      // Mettre à jour le chat avec les messages complets
      setChats(prevChats => 
        prevChats.map(chat => 
          chat.id === chatId 
            ? { ...chat, messages } 
            : chat
        )
      );
      
      // Si c'est le chat actif, le mettre à jour aussi
      if (activeChat?.id === chatId) {
        setActiveChat(prev => prev ? { ...prev, messages } : null);
      }
    } catch (err) {
      setError('Erreur lors de la récupération des messages');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Créer un nouveau chat
  const createChat = async (participantIds: string[], name?: string, isGroup: boolean = false): Promise<Chat | null> => {
    setLoading(true);
    try {
      const response = await fetch('/api/messaging/conversations', {
        method: 'POST',
        headers: baseHeaders,
        body: JSON.stringify({ participantIds, name, isGroup }),
      });
      
      if (!response.ok) {
        throw new Error('Erreur lors de la création du chat');
      }
      
      const newChat = await response.json();
      
      // Ajouter le nouveau chat à la liste
      setChats(prev => [newChat, ...prev]);
      
      return newChat;
    } catch (err) {
      setError('Erreur lors de la création du chat');
      console.error(err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Envoyer un message
  const sendMessage = async (content: string, chatId: string, file?: File) => {
    setLoading(true);
    try {
      // Si un fichier est fourni, nous devons utiliser FormData
      let response;
      
      if (file) {
        const formData = new FormData();
        formData.append('content', content);
        formData.append('chatId', chatId);
        formData.append('file', file);
        
        response = await fetch('/api/messaging/messages', {
          method: 'POST',
          body: formData,
        });
      } else {
        response = await fetch('/api/messaging/messages', {
          method: 'POST',
          headers: baseHeaders,
          body: JSON.stringify({ content, chatId }),
        });
      }
      
      if (!response.ok) {
        throw new Error('Erreur lors de l\'envoi du message');
      }
      
      const newMessage = await response.json();
      
      // Mettre à jour le chat avec le nouveau message
      setChats(prevChats => 
        prevChats.map(chat => 
          chat.id === chatId 
            ? { 
                ...chat, 
                messages: [...chat.messages, newMessage],
                updatedAt: new Date(),
              } 
            : chat
        )
      );
      
      // Si c'est le chat actif, le mettre à jour aussi
      if (activeChat?.id === chatId) {
        setActiveChat(prev => prev ? { 
          ...prev, 
          messages: [...prev.messages, newMessage],
          updatedAt: new Date(),
        } : null);
      }
      
      // Récupérer les conversations mises à jour
      fetchChats();
    } catch (err) {
      setError('Erreur lors de l\'envoi du message');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Marquer les messages comme lus
  const markAsRead = async (chatId: string) => {
    try {
      const response = await fetch(`/api/messaging/messages/read`, {
        method: 'POST',
        headers: baseHeaders,
        body: JSON.stringify({ chatId }),
      });
      
      if (!response.ok) {
        throw new Error('Erreur lors du marquage des messages');
      }
      
      // Mettre à jour les chats pour refléter le statut de lecture
      setChats(prevChats => 
        prevChats.map(chat => 
          chat.id === chatId 
            ? { 
                ...chat, 
                unreadCount: 0,
                messages: chat.messages.map(msg => ({ ...msg, read: true }))
              } 
            : chat
        )
      );
      
      // Mettre à jour le chat actif aussi
      if (activeChat?.id === chatId) {
        setActiveChat(prev => prev ? {
          ...prev,
          unreadCount: 0,
          messages: prev.messages.map(msg => ({ ...msg, read: true }))
        } : null);
      }
    } catch (err) {
      console.error('Erreur lors du marquage des messages comme lus:', err);
    }
  };

  // Valeur du contexte
  const contextValue = {
    isOpen,
    activeChat,
    chats,
    loading,
    error,
    toggleChat,
    openChat,
    closeChat,
    backToChatList,
    sendMessage,
    createChat,
    fetchChats,
    fetchMessages,
    markAsRead,
  };

  return (
    <ChatContext.Provider value={contextValue}>
      {children}
    </ChatContext.Provider>
  );
}; 