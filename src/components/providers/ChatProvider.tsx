'use client'

import ChatSystem from '@/components/chat/ChatSystem';
import { useSession } from 'next-auth/react';

/**
 * Provider global pour le système de chat.
 * Ce composant n'ajoute le système de chat que pour les utilisateurs authentifiés.
 */
export default function ChatSystemProvider() {
  const { status } = useSession();
  
  // Ne montrer le chat que pour les utilisateurs connectés
  if (status !== 'authenticated') {
    return null;
  }
  
  return <ChatSystem />;
} 