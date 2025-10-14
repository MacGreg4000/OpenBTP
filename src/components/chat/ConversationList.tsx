import React, { useState } from 'react';
import { useChat, User } from './context/ChatContext';
import type { Chat as ChatType } from './context/ChatContext';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useSession } from 'next-auth/react';

const ConversationList: React.FC = () => {
  const { data: session } = useSession();
  const { chats, openChat, activeChat, loading, createChat } = useChat();
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGroup, setIsGroup] = useState(false);
  const [groupName, setGroupName] = useState('');

  // Charger les utilisateurs disponibles pour un nouveau chat
  const searchUsers = async (term: string) => {
    if (term.length < 2) {
      setAvailableUsers([]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/messaging/users?search=${encodeURIComponent(term)}`);
      if (response.ok) {
        const users = await response.json();
        setAvailableUsers(users);
      }
    } catch (error) {
      console.error('Erreur lors de la recherche d\'utilisateurs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Ajouter un utilisateur à la sélection
  const addUser = (user: User) => {
    if (!selectedUsers.find(u => u.id === user.id)) {
      setSelectedUsers([...selectedUsers, user]);
    }
    setSearchTerm('');
    setAvailableUsers([]);
  };

  // Supprimer un utilisateur de la sélection
  const removeUser = (userId: string) => {
    setSelectedUsers(selectedUsers.filter(user => user.id !== userId));
  };

  // Créer une nouvelle conversation
  const handleCreateChat = async () => {
    if (selectedUsers.length === 0) return;

    const userIds = selectedUsers.map(user => user.id);
    const name = isGroup ? groupName || `Groupe (${selectedUsers.length + 1})` : undefined;

    const newChat = await createChat(userIds, name, isGroup);
    if (newChat) {
      setShowNewChatModal(false);
      setSelectedUsers([]);
      setIsGroup(false);
      setGroupName('');
      openChat(newChat.id);
    }
  };

  // Formater la date du dernier message
  const formatDate = (date: Date | string | null | undefined) => {
    // Vérifier si la date est valide
    if (!date) return '';
    
    try {
      const now = new Date();
      const messageDate = new Date(date as unknown as string | number | Date);
      
      // Vérifier si la date est valide
      if (isNaN(messageDate.getTime())) {
        return '';
      }
      
      const diffDays = Math.floor((now.getTime() - messageDate.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        return format(messageDate, 'HH:mm');
      } else if (diffDays === 1) {
        return 'Hier';
      } else if (diffDays < 7) {
        return format(messageDate, 'EEEE', { locale: fr });
      } else {
        return format(messageDate, 'dd/MM/yyyy');
      }
    } catch (error) {
      console.error('Erreur lors du formatage de la date:', error);
      return '';
    }
  };

  // Obtenir le nom d'affichage pour la conversation
  const getDisplayName = (chat: ChatType) => {
    if (chat.name) return chat.name;
    
    // Pour les chats 1:1, afficher le nom de l'autre participant
    if (!chat.isGroup && chat.participants?.length === 2) {
      const currentUserId = session?.user?.id;
      const otherParticipant = chat.participants.find(
        (p) => p.user?.id !== currentUserId
      );
      return otherParticipant?.user?.name || otherParticipant?.user?.email || 'Chat';
    }
    
    return `Groupe (${chat.participants?.length || 0})`;
  };

  return (
    <div className="h-full flex flex-col">
      {/* En-tête avec bouton pour nouveau chat */}
      <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
        <h4 className="font-semibold text-gray-700 flex items-center text-lg">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
            <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
            <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
          </svg>
          Conversations
        </h4>
        <button 
          onClick={() => setShowNewChatModal(true)}
          className="text-blue-600 hover:text-blue-800 p-3 rounded-full hover:bg-blue-100 transition-colors min-h-[48px] min-w-[48px] flex items-center justify-center"
          aria-label="Nouvelle conversation"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
      
      {/* Liste des conversations */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center items-center h-20">
            <svg className="animate-spin h-6 w-6 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        ) : chats.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-gray-500 p-8 h-full">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-300 mb-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
            </svg>
            <p>Aucune conversation</p>
            <button 
              onClick={() => setShowNewChatModal(true)}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors text-sm"
            >
              Démarrer une conversation
            </button>
          </div>
        ) : (
          <ul>
            {chats.map(chat => (
              <li 
                key={chat.id}
                onClick={() => openChat(chat.id)}
                className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors min-h-[72px] flex flex-col justify-center ${
                  activeChat?.id === chat.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                }`}
              >
                <div className="flex justify-between items-center">
                  <div className="font-semibold truncate flex-1 text-gray-800 text-base">
                    {getDisplayName(chat)}
                  </div>
                  {chat.messages && chat.messages[0] && (
                    <div className="text-sm text-gray-500 whitespace-nowrap ml-3">
                      {formatDate(chat.messages[0].createdAt)}
                    </div>
                  )}
                </div>
                <div className="flex items-center mt-2">
                  <p className="text-base text-gray-600 truncate flex-1">
                    {chat.messages && chat.messages[0] ? (
                      <>
                        <span className="font-medium mr-2">{chat.messages[0].sender?.name}:</span> 
                        <span className="text-gray-500">{chat.messages[0].content || (chat.messages[0].fileUrl ? 'Fichier partagé' : '')}</span>
                      </>
                    ) : (
                      <span className="text-gray-400 italic">Pas de messages</span>
                    )}
                  </p>
                  {chat.unreadCount ? (
                    <span className="ml-3 bg-blue-600 text-white text-sm rounded-full h-6 w-6 flex items-center justify-center font-medium shadow-sm">
                      {chat.unreadCount > 9 ? '9+' : chat.unreadCount}
                    </span>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      
      {/* Modal pour créer une nouvelle conversation */}
      {showNewChatModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-6">Nouvelle conversation</h3>
            
            {/* Type de chat (1:1 ou groupe) */}
            <div className="mb-6">
              <label className="flex items-center mb-3 text-base">
                <input 
                  type="checkbox" 
                  checked={isGroup} 
                  onChange={e => setIsGroup(e.target.checked)} 
                  className="mr-3 w-5 h-5" 
                />
                Créer un groupe
              </label>
              
              {isGroup && (
                <input 
                  type="text" 
                  value={groupName} 
                  onChange={e => setGroupName(e.target.value)} 
                  placeholder="Nom du groupe" 
                  className="w-full p-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-300" 
                />
              )}
            </div>
            
            {/* Recherche d'utilisateurs */}
            <div className="mb-6">
              <label className="block text-base font-medium text-gray-700 mb-2">
                Ajouter des participants
              </label>
              <div className="relative">
                <input 
                  type="text" 
                  value={searchTerm} 
                  onChange={e => {
                    setSearchTerm(e.target.value);
                    searchUsers(e.target.value);
                  }} 
                  placeholder="Rechercher un utilisateur..." 
                  className="w-full p-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-300" 
                />
                {isLoading && (
                  <div className="absolute right-3 top-3">
                    <svg className="animate-spin h-6 w-6 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                )}
                
                {/* Résultats de recherche */}
                {availableUsers.length > 0 && (
                  <ul className="absolute z-10 bg-white border border-gray-300 rounded-lg shadow-lg mt-1 w-full max-h-60 overflow-y-auto">
                    {availableUsers.map(user => (
                      <li 
                        key={user.id} 
                        onClick={() => addUser(user)}
                        className="p-3 hover:bg-gray-100 cursor-pointer text-base"
                      >
                        {user.name || user.email}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            
            {/* Utilisateurs sélectionnés */}
            <div className="mb-4">
              <div className="flex flex-wrap gap-2">
                {selectedUsers.map(user => (
                  <div key={user.id} className="bg-blue-100 rounded-full px-3 py-1 text-sm flex items-center">
                    <span className="mr-1">{user.name || user.email}</span>
                    <button 
                      onClick={() => removeUser(user.id)}
                      className="text-gray-500 hover:text-red-500"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex justify-end space-x-3 mt-6">
              <button 
                onClick={() => {
                  setShowNewChatModal(false);
                  setSelectedUsers([]);
                  setSearchTerm('');
                  setAvailableUsers([]);
                  setIsGroup(false);
                  setGroupName('');
                }}
                className="px-6 py-3 text-gray-600 hover:text-gray-800 text-base font-medium"
              >
                Annuler
              </button>
              <button 
                onClick={handleCreateChat}
                disabled={selectedUsers.length === 0}
                className={`px-6 py-3 rounded-lg bg-blue-600 text-white text-base font-medium ${
                  selectedUsers.length === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'
                }`}
              >
                Créer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConversationList; 