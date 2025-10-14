import React, { useState, useRef, useEffect } from 'react';
import { useChat } from './context/ChatContext';

interface MessageInputProps {
  chatId: string;
}

const MessageInput: React.FC<MessageInputProps> = ({ chatId }) => {
  const { sendMessage, loading } = useChat();
  const [message, setMessage] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  
  // Gérer l'envoi du message
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if ((!message.trim() && !file) || loading) return;
    
    try {
      await sendMessage(message, chatId, file || undefined);
      setMessage('');
      setFile(null);
    } catch (error) {
      console.error('Erreur lors de l\'envoi du message:', error);
    }
  };
  
  // Gérer la sélection de fichier
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    setFile(selectedFile);
  };
  
  // Supprimer le fichier sélectionné
  const removeFile = () => {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  // Taille maximale du fichier (5 Mo)
  const MAX_FILE_SIZE = 5 * 1024 * 1024;

  // Gestion simple du clavier mobile
  useEffect(() => {
    const isMobile = window.innerWidth < 768;
    if (!isMobile) return;

    const handleFocus = () => {
      // Délai pour laisser le clavier apparaître
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'end',
            inline: 'nearest'
          });
        }
      }, 300);
    };

    const handleBlur = () => {
      setIsKeyboardVisible(false);
    };

    const textarea = textareaRef.current;
    if (textarea) {
      textarea.addEventListener('focus', handleFocus);
      textarea.addEventListener('blur', handleBlur);
    }

    return () => {
      if (textarea) {
        textarea.removeEventListener('focus', handleFocus);
        textarea.removeEventListener('blur', handleBlur);
      }
    };
  }, []);
  
  return (
    <form onSubmit={handleSubmit} className={`flex flex-col p-3 sm:p-4 ${isKeyboardVisible ? 'message-input-container' : ''}`}>
      {/* Prévisualisation du fichier */}
      {file && (
        <div className="px-4 py-3 mb-3 bg-blue-50 rounded-lg border border-blue-100 flex items-center justify-between">
          <div className="flex items-center overflow-hidden min-w-0 flex-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-500 mr-3 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z" clipRule="evenodd" />
            </svg>
            <span className="text-base truncate font-medium">{file.name}</span>
            {file.size > MAX_FILE_SIZE && (
              <span className="text-sm text-red-500 ml-2 font-medium">Fichier trop volumineux (max 5 Mo)</span>
            )}
          </div>
          <button 
            type="button" 
            onClick={removeFile}
            className="text-gray-500 hover:text-red-500 ml-3 p-2 rounded-full hover:bg-blue-100 transition-colors flex-shrink-0"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      )}
      
      {/* Zone de saisie et boutons */}
      <div className="flex items-end gap-3">
        <div className="relative flex-grow min-w-0">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Tapez votre message..."
            className={`w-full py-4 px-4 pr-14 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-300 transition-colors resize-none text-base leading-relaxed mobile-textarea ${
              isKeyboardVisible ? 'min-h-[48px] max-h-24' : 'min-h-[52px] max-h-36'
            }`}
            disabled={loading}
            rows={1}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              const maxHeight = isKeyboardVisible ? 96 : 144;
              target.style.height = Math.min(target.scrollHeight, maxHeight) + 'px';
            }}
            onFocus={() => {
              // Scroll simple vers le bas sur mobile
              if (window.innerWidth < 768) {
                setTimeout(() => {
                  textareaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
                }, 100);
              }
            }}
          />
          
          {/* Bouton de fichier */}
          <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileChange}
              className="hidden"
              id="file-upload"
              disabled={loading}
            />
            <label 
              htmlFor="file-upload" 
              className="cursor-pointer text-gray-400 hover:text-blue-500 p-2 hover:bg-gray-100 rounded-full transition-colors block"
              title="Joindre un fichier"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z" clipRule="evenodd" />
              </svg>
            </label>
          </div>
        </div>
        
        <button
          type="submit"
          className={`bg-blue-600 text-white rounded-xl ${
            ((!message.trim() && !file) || loading || (!!file && file.size > MAX_FILE_SIZE))
              ? 'opacity-50 cursor-not-allowed'
              : 'hover:bg-blue-700 shadow-sm active:bg-blue-800'
          } transition-colors flex items-center justify-center ${
            isKeyboardVisible ? 'p-3 min-h-[48px] min-w-[48px]' : 'p-4 min-h-[52px] min-w-[52px]'
          }`}
          disabled={(!message.trim() && !file) || loading || (!!file && file.size > MAX_FILE_SIZE)}
        >
          {loading ? (
            <svg className="animate-spin h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
            </svg>
          )}
        </button>
      </div>
    </form>
  );
};

export default MessageInput; 