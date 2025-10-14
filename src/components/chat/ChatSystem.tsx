import React from 'react';
import { ChatProvider } from './context/ChatProvider';
import ChatButton from './ChatButton';

/**
 * Composant principal du système de chat.
 * Ce composant encapsule toute la logique et l'interface du chat.
 * Il peut être importé et utilisé n'importe où dans l'application.
 */
const ChatSystem: React.FC = () => {
  return (
    <ChatProvider>
      <ChatButton />
    </ChatProvider>
  );
};

export default ChatSystem; 