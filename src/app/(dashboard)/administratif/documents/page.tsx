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
  PencilSquareIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline'
import { PageHeader } from '@/components/PageHeader'

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
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 max-w-4xl w-full max-h-[90vh] overflow-hidden">
          <div className="flex justify-between items-center p-4 border-b-2 border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-r from-purple-50/50 to-indigo-50/50 dark:from-purple-900/10 dark:to-indigo-900/10">
            <h3 className="text-lg font-black text-gray-900 dark:text-white">{previewDocument.nom}</h3>
            <button
              onClick={closePreview}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200"
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
          
          <div className="flex justify-end p-4 border-t-2 border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-r from-purple-50/50 to-indigo-50/50 dark:from-purple-900/10 dark:to-indigo-900/10">
            <a
              href={previewDocument.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-4 py-2.5 border border-transparent text-sm font-semibold rounded-xl shadow-lg hover:shadow-xl text-white bg-gradient-to-r from-purple-600 to-indigo-700 hover:from-purple-700 hover:to-indigo-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all duration-200"
            >
              <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
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
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 w-full max-w-lg">
          <div className="mb-4">
            <h3 className="text-xl font-black text-gray-900 dark:text-white mb-1">{modalTitle}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Sélectionnez des tags existants ou ajoutez-en de nouveaux.</p>
          </div>

          <div className="mb-4">
            <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">Tags disponibles :</h4>
            {allTags.length > 0 ? (
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700/30">
                {allTags.map(tag => (
                  <button 
                    key={tag}
                    onClick={() => handleToggleTagForModal(tag)}
                    className={`px-3 py-1.5 text-sm font-semibold rounded-full border-2 transition-all duration-200 ${
                      currentTagsInModal.includes(tag) 
                        ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white border-purple-500 shadow-md' 
                        : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:border-purple-300 dark:hover:border-purple-600'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500 dark:text-gray-400 italic">Aucun tag disponible.</p>
            )}
          </div>

          <div className="mb-4">
            <label htmlFor="new-tag-modal" className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Ajouter un nouveau tag :</label>
            <div className="flex gap-2">
              <input 
                type="text"
                id="new-tag-modal"
                value={newTagInput}
                onChange={(e) => setNewTagInput(e.target.value)}
                onKeyPress={(e) => { if (e.key === 'Enter') handleAddNewTagToModal(); }}
                className="flex-grow block w-full px-4 py-2.5 border-2 border-gray-300 dark:border-gray-600 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 sm:text-sm dark:bg-gray-700 dark:text-gray-200 transition-all duration-200"
                placeholder="Nom du tag"
              />
              <button 
                onClick={handleAddNewTagToModal}
                className="px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 text-sm font-semibold inline-flex items-center shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <PlusCircleIcon className="h-5 w-5 mr-1" /> Ajouter
              </button>
            </div>
          </div>

          <div className="mb-6">
            <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">Tags pour ce document :</h4>
            {currentTagsInModal.length > 0 ? (
              <div className="flex flex-wrap gap-2 p-3 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-xl border-2 border-purple-200/50 dark:border-purple-700/50">
                {currentTagsInModal.map(tag => (
                  <span key={tag} className="px-3 py-1.5 text-xs font-bold bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-full flex items-center shadow-md">
                    {tag}
                    <button onClick={() => handleToggleTagForModal(tag)} className="ml-2 text-white hover:text-red-200 transition-colors">
                      <XMarkIcon className="h-3.5 w-3.5"/>
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500 dark:text-gray-400 italic">Aucun tag sélectionné.</p>
            )}
          </div>

          <div className="flex justify-end gap-3">
            <button 
              onClick={handleCloseModal}
              className="px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-500 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-600 transition-all duration-200"
            >
              Annuler
            </button>
            <button 
              onClick={handleSubmitModal}
              disabled={uploading}
              className={`px-4 py-2.5 text-sm font-semibold text-white rounded-xl shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all duration-200 ${
                uploading ? 'opacity-50 cursor-not-allowed bg-purple-400' : 'bg-gradient-to-r from-purple-600 to-indigo-700 hover:from-purple-700 hover:to-indigo-800'
              }`}
            >
              {uploading ? (isEditing ? 'Mise à jour...' : 'Upload en cours...') : (isEditing ? 'Mettre à jour les tags' : 'Confirmer et Uploader')}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Calculer les statistiques
  const totalDocuments = documents.length
  const totalSize = documents.reduce((sum, doc) => sum + doc.taille, 0)
  const uniqueTags = new Set(documents.flatMap(doc => doc.tags || [])).size

  // Stats cards pour le header
  const statsCards = !loading ? (
    <div className="flex items-center gap-2">
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl px-3 py-2 border border-gray-200/50 dark:border-gray-700/50 shadow-lg">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center">
            <DocumentTextIcon className="h-4 w-4 text-white" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase">Documents</div>
            <div className="text-sm font-black text-gray-900 dark:text-white">{totalDocuments}</div>
          </div>
        </div>
      </div>
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl px-3 py-2 border border-gray-200/50 dark:border-gray-700/50 shadow-lg">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
            <FolderIcon className="h-4 w-4 text-white" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase">Tags</div>
            <div className="text-sm font-black text-gray-900 dark:text-white">{uniqueTags}</div>
          </div>
        </div>
      </div>
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl px-3 py-2 border border-gray-200/50 dark:border-gray-700/50 shadow-lg">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
            <ArrowUpTrayIcon className="h-4 w-4 text-white" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase">Taille</div>
            <div className="text-sm font-black text-gray-900 dark:text-white">{formatFileSize(totalSize)}</div>
          </div>
        </div>
      </div>
    </div>
  ) : undefined

  if (loading && documents.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-purple-50/20 to-indigo-50/10 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
        <PageHeader
          title="Documents Administratifs"
          subtitle="Gérez les documents administratifs de l'entreprise"
          icon={DocumentTextIcon}
          badgeColor="from-purple-600 via-indigo-600 to-pink-700"
          gradientColor="from-purple-600/10 via-indigo-600/10 to-pink-700/10"
        />
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-purple-50/20 to-indigo-50/10 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
      <PageHeader
        title="Documents Administratifs"
        subtitle="Gérez les documents administratifs de l'entreprise"
        icon={DocumentTextIcon}
        badgeColor="from-purple-600 via-indigo-600 to-pink-700"
        gradientColor="from-purple-600/10 via-indigo-600/10 to-pink-700/10"
        stats={statsCards}
        actions={
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
              className={`inline-flex items-center px-3 py-2 bg-gradient-to-r from-purple-600 to-indigo-700 hover:from-purple-700 hover:to-indigo-800 text-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 text-sm font-semibold cursor-pointer ${
                uploading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <ArrowUpTrayIcon className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">Ajouter un document</span>
              <span className="sm:hidden">Ajouter</span>
            </label>
          </div>
        }
      />

      {/* Contenu principal */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Filtres de recherche */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label htmlFor="search-doc" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Rechercher par nom
            </label>
            <input 
              type="text"
              id="search-doc"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full px-4 py-2.5 border-2 border-gray-300 dark:border-gray-600 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 sm:text-sm dark:bg-gray-700 dark:text-gray-200 transition-all duration-200"
              placeholder="Nom du document..."
            />
          </div>
          <div className="flex-1">
            <label htmlFor="tag-filter" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Filtrer par tag
            </label>
            <select 
              id="tag-filter"
              value={selectedTagFilter}
              onChange={(e) => setSelectedTagFilter(e.target.value)}
              className="block w-full px-4 py-2.5 border-2 border-gray-300 dark:border-gray-600 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 sm:text-sm dark:bg-gray-700 dark:text-gray-200 transition-all duration-200"
            >
              <option value="">Tous les tags</option>
              {allTags.map(tag => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Message d'erreur */}
        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-xl p-4 shadow-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-semibold text-red-800 dark:text-red-300">{error}</h3>
              </div>
            </div>
          </div>
        )}

        {/* Liste des documents */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
          <ul className="divide-y divide-gray-200/50 dark:divide-gray-700/50">
            {documents.length === 0 && !loading ? (
              <li className="px-6 py-12 text-center">
                <FolderIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400 font-medium">
                  Aucun document administratif disponible {selectedTagFilter && `avec le tag "${selectedTagFilter}"`} {searchTerm && `contenant "${searchTerm}"`}.
                </p>
              </li>
            ) : (
              documents.map((doc) => (
                <li key={doc.id} className="px-6 py-4 hover:bg-gradient-to-r hover:from-purple-50/50 hover:to-indigo-50/50 dark:hover:from-purple-900/10 dark:hover:to-indigo-900/10 transition-all duration-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center flex-1 min-w-0">
                      <div className="flex-shrink-0 mr-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-500/20 to-indigo-500/20 dark:from-purple-500/30 dark:to-indigo-500/30 rounded-xl flex items-center justify-center">
                          <DocumentIcon className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{doc.nom}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {formatFileSize(doc.taille)} • {new Date(doc.dateUpload).toLocaleDateString('fr-FR')}
                          {doc.uploadedBy && <span className="italic"> • Par: {doc.uploadedBy}</span>}
                        </p>
                        {doc.tags && doc.tags.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {doc.tags.map(tag => (
                              <span key={tag} className="px-2.5 py-0.5 text-xs font-semibold bg-gradient-to-r from-purple-100 to-indigo-100 dark:from-purple-900/30 dark:to-indigo-900/30 text-purple-700 dark:text-purple-300 rounded-full border border-purple-200/50 dark:border-purple-700/50">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => openEditTagsModal(doc)}
                        className="p-2 rounded-lg text-gray-500 hover:text-purple-600 dark:text-gray-400 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all duration-200"
                        title="Modifier les tags"
                      >
                        <PencilSquareIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handlePreview(doc)}
                        className="p-2 rounded-lg text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all duration-200"
                        title="Prévisualiser"
                      >
                        <EyeIcon className="h-5 w-5" />
                      </button>
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-lg text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all duration-200"
                        title="Télécharger"
                      >
                        <ArrowDownTrayIcon className="h-5 w-5" />
                      </a>
                      <button
                        onClick={() => handleDelete(doc.id)}
                        className="p-2 rounded-lg text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200"
                        title="Supprimer"
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
      </div>

      <TagManagementModal />

      {renderPreview()}
    </div>
  )
} 