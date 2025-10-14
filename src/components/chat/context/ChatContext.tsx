import { createContext, useContext } from 'react';

// Types
export interface User {
  id: string;
  name?: string;
  email: string;
}

export interface ChatMessage {
  id: string;
  content: string;
  senderId: string;
  chatId: string;
  read: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  sender?: User;
}

export interface ChatParticipant {
  id: string;
  userId: string;
  chatId: string;
  isAdmin: boolean;
  lastReadAt?: Date;
  joinedAt: Date;
  user?: User;
}

export interface Chat {
  id: string;
  name?: string;
  isGroup: boolean;
  createdAt: Date;
  updatedAt: Date;
  messages: ChatMessage[];
  participants: ChatParticipant[];
  unreadCount?: number;
}

// État du contexte
export interface ChatContextType {
  // État
  isOpen: boolean;
  activeChat: Chat | null;
  chats: Chat[];
  loading: boolean;
  error: string | null;
  
  // Actions
  toggleChat: () => void;
  openChat: (chatId: string) => void;
  closeChat: () => void;
  backToChatList: () => void;
  sendMessage: (content: string, chatId: string, file?: File) => Promise<void>;
  createChat: (participantIds: string[], name?: string, isGroup?: boolean) => Promise<Chat | null>;
  fetchChats: () => Promise<void>;
  fetchMessages: (chatId: string) => Promise<void>;
  markAsRead: (chatId: string) => Promise<void>;
}

// Contexte par défaut
export const ChatContext = createContext<ChatContextType>({
  isOpen: false,
  activeChat: null,
  chats: [],
  loading: false,
  error: null,
  
  toggleChat: () => {},
  openChat: () => {},
  closeChat: () => {},
  backToChatList: () => {},
  sendMessage: async () => {},
  createChat: async () => null,
  fetchChats: async () => {},
  fetchMessages: async () => {},
  markAsRead: async () => {},
});

// Hook personnalisé pour utiliser le contexte
export const useChat = () => useContext(ChatContext); 