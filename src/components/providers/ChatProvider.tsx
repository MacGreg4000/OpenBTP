'use client'

import ChatSystem from '@/components/chat/ChatSystem';
import { useSession } from 'next-auth/react';
import { useFeatures } from '@/hooks/useFeatures';

/**
 * Provider global pour le système de chat.
 * Ce composant n'ajoute le système de chat que pour les utilisateurs authentifiés
 * et si au moins un module de communication (messagerie ou assistant IA) est activé.
 */
export default function ChatSystemProvider() {
  const { status } = useSession();
  const { isEnabled } = useFeatures();
  
  // Ne montrer le chat que pour les utilisateurs connectés
  if (status !== 'authenticated') {
    return null;
  }
  
  // Vérifier si au moins un module de communication est activé
  const hasMessagerie = isEnabled('messagerie');
  const hasAssistantIA = isEnabled('chat');
  
  if (!hasMessagerie && !hasAssistantIA) {
    return null;
  }
  
  return <ChatSystem />;
} 