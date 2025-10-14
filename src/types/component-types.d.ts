// Déclarations de type pour les composants de chat
declare module './ChatWindow' {
  import { FC } from 'react';
  const ChatWindow: FC;
  export default ChatWindow;
}

declare module './ConversationList' {
  import { FC } from 'react';
  const ConversationList: FC;
  export default ConversationList;
}

declare module './Conversation' {
  import { FC } from 'react';
  interface ConversationProps {
    chat: unknown;
  }
  const Conversation: FC<ConversationProps>;
  export default Conversation;
}

declare module './MessageInput' {
  import { FC } from 'react';
  interface MessageInputProps {
    chatId: string;
  }
  const MessageInput: FC<MessageInputProps>;
  export default MessageInput;
} 