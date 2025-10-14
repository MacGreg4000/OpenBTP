import React, { useState } from 'react';
import { RichTextEditor } from '../ui';

/**
 * Exemple d'utilisation du composant RichTextEditor
 */
const RichTextExample: React.FC = () => {
  const [content, setContent] = useState<string>('');

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    // Ici, vous pouvez faire d'autres opérations avec le contenu, 
    // comme l'enregistrer dans une base de données
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Éditeur de texte riche</h2>
      
      <RichTextEditor 
        value={content}
        onChange={handleContentChange}
        placeholder="Écrivez votre contenu ici..."
      />
      
      <div className="mt-4">
        <h3 className="text-lg font-semibold">Prévisualisation :</h3>
        {content ? (
          <div 
            className="p-4 border rounded-md bg-gray-50"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        ) : (
          <p className="text-gray-500 italic">Aucun contenu pour le moment</p>
        )}
      </div>
    </div>
  );
};

export default RichTextExample; 