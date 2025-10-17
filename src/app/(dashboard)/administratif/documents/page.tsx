'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
  DocumentIcon, 
  ArrowUpTrayIcon,
  TrashIcon,
  FolderIcon,
  XMarkIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  
  PlusCircleIcon,
  PencilSquareIcon
} from '@heroicons/react/24/outline'

interface Document {
  id: string
  nom: string
  type: string
  taille: number
  dateUpload: string
  url: string
  tags: string[]
  uploadedBy?: string
}

interface ApiTag {
  id: number; // ou string si l'ID est un UUID
  nom: string;
}

export default function DocumentsAdministratifsPage() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [previewDocument, setPreviewDocument] = useState<Document | null>(null)

  const [allTags, setAllTags] = useState<string[]>([])
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>('')
  const [showTagModal, setShowTagModal] = useState(false)
  const [currentTagsInModal, setCurrentTagsInModal] = useState<string[]>([])
  const [fileToUpload, setFileToUpload] = useState<File | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [newTagInput, setNewTagInput] = useState('');
  const [editingDocument, setEditingDocument] = useState<Document | null>(null);

  const fetchDocuments = useCallback(async (tagFilter: string = selectedTagFilter, currentSearchTerm: string = searchTerm) => {
    setLoading(true)
    try {
      let apiUrl = '/api/documents/administratifs'
      const params = new URLSearchParams()
      if (tagFilter) {
        params.append('tag', tagFilter)
      }
      
      if (params.toString()) {
        apiUrl += `?${params.toString()}`
      }
      
      const response = await fetch(apiUrl)
      if (!response.ok) {
        throw new Error('Erreur lors de la récupération des documents')
      }
      let data: Document[] = await response.json()

      if (currentSearchTerm) {
        data = data.filter(doc => doc.nom.toLowerCase().includes(currentSearchTerm.toLowerCase()))
      }

      setDocuments(data)

    } catch (err: unknown) {
      console.error('Erreur:', err)
      setError(err instanceof Error ? err.message : 'Impossible de charger les documents')
    } finally {
      setLoading(false)
    }
  }, [selectedTagFilter, searchTerm])

  const fetchAllTagsFromApi = useCallback(async () => {
    try {
      const response = await fetch('/api/tags');
      if (!response.ok) {
        console.error('Erreur API fetchAllTagsFromApi:', await response.text());
        throw new Error('Erreur lors de la récupération des tags');
      }
      const apiTags: ApiTag[] = await response.json();
      setAllTags(apiTags.map(tag => tag.nom).sort());
    } catch (err: unknown) {
      console.error('Erreur fetchAllTagsFromApi:', err);
    }
  }, []);

  useEffect(() => {
    fetchDocuments()
    fetchAllTagsFromApi()
  }, [fetchDocuments, fetchAllTagsFromApi])

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      fetchDocuments(selectedTagFilter, searchTerm)
    }, 300)
    return () => clearTimeout(debounceTimer)
  }, [selectedTagFilter, searchTerm, fetchDocuments])

  const handleFileUpload = async () => {
    if (!fileToUpload) return

    setUploading(true)
    const formData = new FormData()
    formData.append('file', fileToUpload)
    formData.append('tags', JSON.stringify(currentTagsInModal))

    try {
      const response = await fetch('/api/documents/administratifs/upload', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erreur lors de l\'upload du document' }))
        throw new Error(errorData.error || 'Erreur lors de l\'upload du document')
      }

      await fetchDocuments()
      await fetchAllTagsFromApi()
      setShowTagModal(false)
      setFileToUpload(null)
      setCurrentTagsInModal([])
      setEditingDocument(null)
      const fileInput = document.getElementById('file-upload-input') as HTMLInputElement
      if (fileInput) fileInput.value = ''

    } catch (err: unknown) {
      console.error('Erreur:', err)
      setError(err instanceof Error ? err.message : 'Impossible d\'uploader le document')
    } finally {
      setUploading(false)
    }
  }

  const handleUpdateDocumentTags = async () => {
    if (!editingDocument) return;
    setUploading(true);
    try {
      const response = await fetch(`/api/documents/administratifs/${editingDocument.id}/tags`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tags: currentTagsInModal }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erreur lors de la mise à jour des tags' }));
        throw new Error(errorData.error || 'Erreur lors de la mise à jour des tags');
      }
      await fetchDocuments();
      await fetchAllTagsFromApi();

      setShowTagModal(false);
      setCurrentTagsInModal([]);
      setEditingDocument(null);

    } catch (err: unknown) {
      console.error('Erreur update tags:', err);
      setError(err instanceof Error ? err.message : 'Impossible de mettre à jour les tags');
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelectedForUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setEditingDocument(null)
      setFileToUpload(file)
      setCurrentTagsInModal([])
      setShowTagModal(true)
    }
  }

  const handleDelete = async (documentId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce document ?')) return

    try {
      console.log('🗑️ Suppression du document:', documentId)
      const response = await fetch(`/api/documents/administratifs/${documentId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erreur inconnue' }))
        console.error('❌ Erreur de suppression:', errorData)
        throw new Error(errorData.details || errorData.error || 'Erreur lors de la suppression du document')
      }

      console.log('✅ Document supprimé avec succès')
      await fetchDocuments()
    } catch (err) {
      console.error('❌ Erreur:', err)
      const errorMessage = err instanceof Error ? err.message : 'Impossible de supprimer le document'
      setError(errorMessage)
      alert(errorMessage)
    }
  }

  const handlePreview = (doc: Document) => {
    setPreviewDocument(doc)
  }

  const closePreview = () => {
    setPreviewDocument(null)
  }

  const renderPreview = () => {
    if (!previewDocument) return null

    const fileType = previewDocument.type.toLowerCase()
    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileType)
    const isPDF = fileType === 'pdf'
    const isText = ['txt', 'md', 'csv'].includes(fileType)

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          <div className="flex justify-between items-center p-4 border-b">
            <h3 className="text-lg font-medium">{previewDocument.nom}</h3>
            <button
              onClick={closePreview}
              className="text-gray-400 hover:text-gray-500"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
          
          <div className="p-4 overflow-auto max-h-[calc(90vh-4rem)]">
            {isImage && (
              <div className="flex justify-center">
                <img
                  src={previewDocument.url}
                  alt={previewDocument.nom}
                  className="max-w-full h-auto rounded-lg shadow-lg"
                />
              </div>
            )}
            {isPDF && (
              <div className="w-full h-[calc(90vh-8rem)]">
                <iframe
                  src={`${previewDocument.url}#toolbar=0`}
                  className="w-full h-full rounded-lg shadow-lg"
                  title={previewDocument.nom}
                />
              </div>
            )}
            {isText && (
              <pre className="whitespace-pre-wrap font-sans text-sm">
                <p className="text-gray-500">Prévisualisation non disponible pour les fichiers texte</p>
              </pre>
            )}
            {!isImage && !isPDF && !isText && (
              <p className="text-gray-500">Prévisualisation non disponible pour ce type de fichier</p>
            )}
          </div>
          
          <div className="flex justify-end p-4 border-t">
            <a
              href={previewDocument.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Télécharger
            </a>
          </div>
        </div>
      </div>
    )
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const openEditTagsModal = (doc: Document) => {
    setFileToUpload(null)
    setEditingDocument(doc)
    setCurrentTagsInModal([...doc.tags])
    setShowTagModal(true)
  }

  const TagManagementModal = () => {
    const isEditing = !!editingDocument;
    const modalTitle = isEditing 
      ? `Modifier les tags pour : ${editingDocument?.nom}` 
      : `Gérer les tags pour : ${fileToUpload?.name}`;

    if (!showTagModal || (!fileToUpload && !isEditing)) return null;

    const handleToggleTagForModal = (tag: string) => {
      setCurrentTagsInModal(prev => 
        prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
      );
    };

    const handleAddNewTagToModal = () => {
      const trimmedTag = newTagInput.trim().toLowerCase();
      if (trimmedTag && !currentTagsInModal.includes(trimmedTag)) {
        setCurrentTagsInModal(prev => [...prev, trimmedTag]);
        if (!allTags.includes(trimmedTag)) {
          setAllTags(prev => [...prev, trimmedTag].sort());
        }
      }
      setNewTagInput('');
    };

    const handleSubmitModal = () => {
      if (isEditing) {
        handleUpdateDocumentTags();
      } else {
        handleFileUpload();
      }
    };

    const handleCloseModal = () => {
      setShowTagModal(false);
      setFileToUpload(null);
      setCurrentTagsInModal([]);
      setEditingDocument(null);
      setNewTagInput('');
      if (!isEditing) {
        const fileInput = document.getElementById('file-upload-input') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
      }
    }

    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-lg">
          <h3 className="text-lg font-semibold mb-2 dark:text-white">{modalTitle}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Sélectionnez des tags existants ou ajoutez-en de nouveaux.</p>

          <div className="mb-4">
            <h4 className="text-sm font-medium mb-2 dark:text-gray-300">Tags disponibles :</h4>
            {allTags.length > 0 ? (
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 border dark:border-gray-600 rounded">
                {allTags.map(tag => (
                  <button 
                    key={tag}
                    onClick={() => handleToggleTagForModal(tag)}
                    className={`px-3 py-1 text-sm rounded-full border 
                      ${currentTagsInModal.includes(tag) 
                        ? 'bg-blue-500 text-white border-blue-500' 
                        : 'bg-gray-100 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600'}
                    `}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500 dark:text-gray-400">Aucun tag disponible.</p>
            )}
          </div>

          <div className="mb-4">
            <label htmlFor="new-tag-modal" className="block text-sm font-medium mb-1 dark:text-gray-300">Ajouter un nouveau tag :</label>
            <div className="flex gap-2">
              <input 
                type="text"
                id="new-tag-modal"
                value={newTagInput}
                onChange={(e) => setNewTagInput(e.target.value)}
                onKeyPress={(e) => { if (e.key === 'Enter') handleAddNewTagToModal(); }}
                className="flex-grow mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-gray-200"
                placeholder="Nom du tag"
              />
              <button 
                onClick={handleAddNewTagToModal}
                className="mt-1 px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 text-sm inline-flex items-center"
              >
                <PlusCircleIcon className="h-5 w-5 mr-1" /> Ajouter
              </button>
            </div>
          </div>

          <div className="mb-6">
            <h4 className="text-sm font-medium mb-2 dark:text-gray-300">Tags pour ce document :</h4>
            {currentTagsInModal.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {currentTagsInModal.map(tag => (
                  <span key={tag} className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full flex items-center">
                    {tag}
                    <button onClick={() => handleToggleTagForModal(tag)} className="ml-1 text-blue-600 hover:text-blue-800">
                      <XMarkIcon className="h-3 w-3"/>
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500 dark:text-gray-400">Aucun tag sélectionné.</p>
            )}
          </div>

          <div className="flex justify-end gap-3">
            <button 
              onClick={handleCloseModal}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-500 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              Annuler
            </button>
            <button 
              onClick={handleSubmitModal}
              disabled={uploading}
              className={`px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                uploading ? 'opacity-50 cursor-not-allowed bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {uploading ? (isEditing ? 'Mise à jour...' : 'Upload en cours...') : (isEditing ? 'Mettre à jour les tags' : 'Confirmer et Uploader')}
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-7xl mx-auto">
      <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
            <FolderIcon className="h-8 w-8 mr-2 text-blue-500" />
            Documents administratifs
          </h1>
          <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
            Gérez les documents administratifs de l'entreprise.
          </p>
        </div>

        <div className="relative">
          <input
            type="file"
            id="file-upload-input"
            className="hidden"
            onChange={handleFileSelectedForUpload}
            disabled={uploading}
          />
          <label
            htmlFor="file-upload-input"
            className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer ${
              uploading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <ArrowUpTrayIcon className="h-5 w-5 mr-2" />
            Ajouter un document
          </label>
        </div>
      </div>

      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <label htmlFor="search-doc" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Rechercher par nom:
          </label>
          <input 
            type="text"
            id="search-doc"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-gray-200"
            placeholder="Nom du document..."
          />
        </div>
        <div className="flex-1">
          <label htmlFor="tag-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Filtrer par tag:
          </label>
          <select 
            id="tag-filter"
            value={selectedTagFilter}
            onChange={(e) => setSelectedTagFilter(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-gray-200"
          >
            <option value="">Tous les tags</option>
            {allTags.map(tag => (
              <option key={tag} value={tag}>{tag}</option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 p-4 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">{error}</h3>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {documents.length === 0 && !loading ? (
            <li className="px-4 py-8 text-center text-gray-500">
              Aucun document administratif disponible {selectedTagFilter && `avec le tag "${selectedTagFilter}"` } {searchTerm && `contenant "${searchTerm}"` }.
            </li>
          ) : (
            documents.map((doc) => (
              <li key={doc.id} className="px-4 py-4 hover:bg-gray-50 dark:hover:bg-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <DocumentIcon className="h-6 w-6 text-gray-400 dark:text-gray-500 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{doc.nom}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {formatFileSize(doc.taille)} • {new Date(doc.dateUpload).toLocaleDateString('fr-FR')}
                        {doc.uploadedBy && <span className="italic"> • Par: {doc.uploadedBy}</span>}
                      </p>
                      {doc.tags && doc.tags.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {doc.tags.map(tag => (
                            <span key={tag} className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => openEditTagsModal(doc)}
                      className="text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-500"
                      title="Modifier les tags"
                    >
                      <PencilSquareIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handlePreview(doc)}
                      className="text-blue-600 hover:text-blue-800"
                      title="Prévisualiser"
                    >
                      <EyeIcon className="h-5 w-5" />
                    </button>
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800"
                      title="Télécharger"
                    >
                      <ArrowDownTrayIcon className="h-5 w-5" />
                    </a>
                    <button
                      onClick={() => handleDelete(doc.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>

      <TagManagementModal />

      {renderPreview()}
    </div>
  )
} 