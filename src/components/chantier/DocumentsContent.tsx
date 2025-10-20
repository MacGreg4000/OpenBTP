'use client'
import { useEffect, useState, useCallback } from 'react'
import Image from 'next/image'
import { ArrowUpTrayIcon, ArrowLeftIcon, ArrowRightIcon, XMarkIcon, TagIcon, DocumentIcon } from '@heroicons/react/24/outline'
import PhotosTabContent from './PhotosTabContent'
import FichesTechniquesTabContent from './FichesTechniquesTabContent'

interface Tag {
  id: string;
  nom: string;
}

interface Document {
  id: number
  nom: string
  type: string
  url: string
  taille: number
  mimeType: string
  createdAt: string
  tags?: Tag[]
}



interface DocumentsContentProps {
  chantierId: string
}

const DOCUMENT_TAGS = [
  "Administratif",
  "Cautionnement",
  "Contrat",
  "CSC",
  "Plans",
  "Métrés",
  "Correspondance"
];

export default function DocumentsContent({ chantierId }: DocumentsContentProps) {
  const [documents, setDocuments] = useState<Document[]>([])
  const [photos, setPhotos] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [activeTab, setActiveTab] = useState<'documents' | 'photos' | 'fiches-techniques'>('documents')
  const [selectedTagsForUpload, setSelectedTagsForUpload] = useState<string[]>([])
  const [currentTagFilter, setCurrentTagFilter] = useState<string | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null)

  // États pour l\'édition des tags d\'un document existant
  const [editingTagsDocId, setEditingTagsDocId] = useState<number | null>(null);
  const [tagsForModalEdit, setTagsForModalEdit] = useState<string[]>([]);

  // État pour le modal de sélection des tags pour l\'upload
  const [isTagUploadModalOpen, setIsTagUploadModalOpen] = useState(false);

  // États pour les fiches techniques

  // Charger les documents
  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/chantiers/${chantierId}/documents`)
      const data = await response.json()
      
      // L'API peut retourner soit { success: true, documents: [...] } soit directement [...]
      const documentsList = data.success ? data.documents : Array.isArray(data) ? data : []
      
      console.log(`📦 Données reçues de l'API:`, documentsList)
      console.log(`📋 Types de documents:`, documentsList.map((d: Document) => d.type))
      
      const docs = documentsList.filter((doc: Document) => doc.type !== 'photo-chantier')
      const pics = documentsList.filter((doc: Document) => doc.type === 'photo-chantier')
      
      setDocuments(docs)
      setPhotos(pics)
      
      console.log(`📄 Documents chargés: ${docs.length} documents, ${pics.length} photos`)
      if (pics.length > 0) {
        console.log(`📸 Photos trouvées:`, pics.map((p: Document) => ({ id: p.id, nom: p.nom, type: p.type })))
      }
    } catch (error) {
      console.error('Erreur lors du chargement des documents:', error)
      setError('Erreur lors du chargement des documents')
    } finally {
      setLoading(false)
    }
  }, [chantierId])

  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  // Gestion du drag & drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileUpload({ target: { files } } as unknown as React.ChangeEvent<HTMLInputElement>)
    }
  }

  // Upload de fichiers
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    setUploading(true)
    setError(null)

    try {
      for (const file of files) {
        const formData = new FormData()
        formData.append('file', file)
        
        if (selectedTagsForUpload.length > 0) {
          formData.append('tagsJsonString', JSON.stringify(selectedTagsForUpload));
        }

        const res = await fetch(`/api/chantiers/${chantierId}/documents`, {
          method: 'POST',
          body: formData
        })

        if (!res.ok) throw new Error('Erreur lors du téléchargement')

        const newDocument = await res.json()
        
        if (newDocument.type !== 'photo-chantier') {
          setDocuments(prev => [newDocument, ...prev])
        }
      }
      
      // Recharger les documents pour s'assurer que tout est à jour
      await fetchDocuments()
    } catch (error) {
      console.error('Erreur lors de l\'upload:', error)
      setError('Erreur lors de l\'upload des fichiers')
    } finally {
      setUploading(false)
    }
  }

  // Supprimer un document
  const handleDeleteDocument = async (docId: number) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce document ?')) return

    try {
      const response = await fetch(`/api/chantiers/${chantierId}/documents/${docId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setDocuments(prev => prev.filter(doc => doc.id !== docId))
        setPhotos(prev => prev.filter(doc => doc.id !== docId))
      }
    } catch (error) {
      console.error('Erreur lors de la suppression:', error)
    }
  }

  // Gestion des tags pour l\'upload
  const handleTagSelectionForUpload = (tag: string) => {
    setSelectedTagsForUpload(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    )
  }

  // Gestion des tags pour l\'édition
  const handleTagSelectionForModal = (tag: string) => {
    setTagsForModalEdit(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    )
  }

  // Soumettre la mise à jour des tags
  const handleSubmitTagUpdate = async () => {
    if (editingTagsDocId === null) return

    try {
      const response = await fetch(`/api/chantiers/${chantierId}/documents/${editingTagsDocId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: tagsForModalEdit })
      })

      if (response.ok) {
        setEditingTagsDocId(null)
        setTagsForModalEdit([])
        await fetchDocuments() // Recharger les documents
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Erreur inconnue' }))
        console.error('Erreur lors de la mise à jour des tags:', errorData)
        setError(errorData.error || 'Erreur lors de la mise à jour des tags')
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour des tags:', error)
      setError('Erreur lors de la mise à jour des tags')
    }
  }

  // Prévisualisation des photos

  const closePreview = () => {
    setIsPreviewOpen(false)
    setSelectedPhotoIndex(null)
  }

  const goToPreviousPhoto = () => {
    if (selectedPhotoIndex !== null && selectedPhotoIndex > 0) {
      setSelectedPhotoIndex(selectedPhotoIndex - 1)
    }
  }

  const goToNextPhoto = () => {
    if (selectedPhotoIndex !== null && selectedPhotoIndex < photos.length - 1) {
      setSelectedPhotoIndex(selectedPhotoIndex + 1)
    }
  }

  // Filtrer les documents par tag
  const filteredDocuments = currentTagFilter 
    ? documents.filter(doc => doc.tags?.some(tag => tag.nom === currentTagFilter))
    : documents

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Chargement des documents...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Onglets */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('documents')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'documents'
                ? 'border-blue-500 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Documents
          </button>
          <button
            onClick={() => setActiveTab('photos')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'photos'
                ? 'border-blue-500 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Photos de chantier
          </button>
          <button
            onClick={() => setActiveTab('fiches-techniques')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'fiches-techniques'
                ? 'border-blue-500 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Fiches techniques
          </button>
        </nav>
      </div>

      {/* Zone de drag & drop - seulement pour documents */}
      {activeTab === 'documents' && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center
            transition-colors duration-200 ease-in-out
            ${isDragging 
              ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/10' 
              : 'border-gray-300 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500'
            }
          `}
        >
          <div className="flex flex-col items-center">
            <ArrowUpTrayIcon className={`h-12 w-12 mb-4 ${isDragging ? 'text-blue-500 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'}`} />
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
              {uploading 
                ? 'Téléchargement en cours...'
                : isDragging
                  ? 'Déposez les fichiers ici'
                  : 'Glissez et déposez vos fichiers ici ou'
              }
            </p>
            {!uploading && !isDragging && (
              <div className="relative">
                {/* Affichage des tags sélectionnés pour l\'upload */}
                <div className="my-3">
                  <div className="flex items-center gap-2 mb-1">
                     <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Tags pour l&apos;upload:</span>
                    <button 
                      onClick={() => setIsTagUploadModalOpen(true)}
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm p-1 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      title="Gérer les tags pour les prochains uploads"
                    >
                      <TagIcon className="h-4 w-4 inline-block mr-1" /> Gérer
                    </button>
                  </div>
                  {selectedTagsForUpload.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {selectedTagsForUpload.map(tag => (
                        <span key={tag} className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-800 dark:bg-green-700 dark:text-green-200">
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : (
                     <p className="text-xs text-gray-500 dark:text-gray-400 italic">Aucun tag sélectionné pour l&apos;upload.</p>
                  )}
                </div>

                <input
                  type="file"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                  multiple
                />
                <label
                  htmlFor="file-upload"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-500 dark:bg-blue-700 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm transition-colors cursor-pointer"
                >
                  Sélectionner des fichiers
                </label>
              </div>
            )}
            {uploading && (
              <div className="mt-3 flex items-center text-sm text-blue-600 dark:text-blue-400">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Traitement en cours...
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sélecteur de filtre de tag */}
      {activeTab === 'documents' && (
        <div className="mb-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <label htmlFor="tag-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Filtrer par tag:
          </label>
          <select
            id="tag-filter"
            name="tag-filter"
            value={currentTagFilter || ''}
            onChange={(e) => setCurrentTagFilter(e.target.value === '' ? null : e.target.value)}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md shadow-sm"
          >
            <option value="">Tous les tags</option>
            {DOCUMENT_TAGS.map(tag => (
              <option key={tag} value={tag}>{tag}</option>
            ))}
          </select>
        </div>
      )}

      {/* Contenu spécifique à l\'onglet */}
      {activeTab === 'documents' ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
          <div className="relative px-6 py-6 bg-gradient-to-br from-emerald-600 via-teal-700 to-cyan-800 text-white overflow-hidden mb-4 rounded-lg">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/20 to-cyan-800/20"></div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl transform translate-x-16 -translate-y-16"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-teal-300/20 rounded-full blur-xl transform -translate-x-8 translate-y-8"></div>
            
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center">
                <div className="inline-flex items-center px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full shadow-lg ring-2 ring-white/30">
                  <DocumentIcon className="w-6 h-6 mr-3 text-white" />
                  <span className="font-bold text-xl">📄 Documents</span>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <span className="inline-flex items-center px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm font-medium shadow-sm">
                  📊 {filteredDocuments.length} document{filteredDocuments.length > 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>
          
          {filteredDocuments.length === 0 ? (
            <div className="text-center py-8">
              <DocumentIcon className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-500 mb-3" />
              <p className="text-gray-500 dark:text-gray-400">Aucun document pour ce chantier</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Nom
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Tags
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredDocuments.map((document) => (
                    <tr key={document.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <DocumentIcon className="h-5 w-5 text-gray-400 dark:text-gray-500 mr-3" />
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {document.nom}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {(document.taille / 1024).toFixed(1)} KB
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                          {document.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-wrap gap-1">
                          {document.tags?.map((tag) => (
                            <span key={tag.id} className="inline-flex px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                              {tag.nom}
                            </span>
                          )) || <span className="text-gray-400 dark:text-gray-500 text-sm">Aucun tag</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {new Date(document.createdAt).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <a
                            href={document.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                          >
                            Voir
                          </a>
                          <button
                            onClick={() => {
                              setEditingTagsDocId(document.id)
                              setTagsForModalEdit(document.tags?.map(t => t.nom) || [])
                            }}
                            className="text-yellow-600 hover:text-yellow-900 dark:text-yellow-400 dark:hover:text-yellow-300"
                          >
                            Tags
                          </button>
                          <button
                            onClick={() => handleDeleteDocument(document.id)}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                          >
                            Supprimer
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : activeTab === 'photos' ? (
        <PhotosTabContent chantierId={chantierId} />
      ) : (
        <FichesTechniquesTabContent chantierId={chantierId} />
      )}

      {/* Modal de prévisualisation des photos */}
      {isPreviewOpen && selectedPhotoIndex !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50" onClick={closePreview}>
          <div 
            className="relative bg-white dark:bg-gray-900 p-4 rounded-lg shadow-xl max-w-3xl max-h-[90vh] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={closePreview} 
              className="absolute top-3 right-3 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white z-10"
              aria-label="Fermer"
            >
              <XMarkIcon className="h-8 w-8" />
            </button>
            
            <div className="w-full flex justify-center items-center flex-grow overflow-hidden mb-2">
              <Image 
                src={photos[selectedPhotoIndex].url} 
                alt={photos[selectedPhotoIndex].nom} 
                className="max-w-full max-h-[calc(90vh-120px)] object-contain rounded" 
                width={1200}
                height={800}
              />
            </div>

            <p className="text-center text-sm text-gray-700 dark:text-gray-300 mt-2 mb-3">
              {photos[selectedPhotoIndex].nom} ({selectedPhotoIndex + 1} / {photos.length})
            </p>

            {photos.length > 1 && (
              <div className="flex justify-between items-center w-full px-4">
                <button 
                  onClick={(e) => { e.stopPropagation(); goToPreviousPhoto(); }}
                  className="p-2 rounded-full bg-gray-800 bg-opacity-50 hover:bg-opacity-75 text-white transition-opacity"
                  aria-label="Photo précédente"
                >
                  <ArrowLeftIcon className="h-6 w-6" />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); goToNextPhoto(); }}
                  className="p-2 rounded-full bg-gray-800 bg-opacity-50 hover:bg-opacity-75 text-white transition-opacity"
                  aria-label="Photo suivante"
                >
                  <ArrowRightIcon className="h-6 w-6" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal d'édition des tags */}
      {editingTagsDocId !== null && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex justify-center items-center">
          <div className="relative p-5 border w-full max-w-md shadow-lg rounded-md bg-white dark:bg-gray-800">
            <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white mb-4">
              Modifier les tags du document
            </h3>
            <div className="space-y-2 mb-6">
              {DOCUMENT_TAGS.map(tag => (
                <div key={tag} className="flex items-center">
                  <input
                    id={`modal-tag-${tag}`}
                    name={`modal-tag-${tag}`}
                    type="checkbox"
                    checked={tagsForModalEdit.includes(tag)}
                    onChange={() => handleTagSelectionForModal(tag)}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                  />
                  <label htmlFor={`modal-tag-${tag}`} className="ml-2 block text-sm text-gray-900 dark:text-gray-100">
                    {tag}
                  </label>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-end space-x-3">
              <button
                onClick={() => { setEditingTagsDocId(null); setTagsForModalEdit([]); }}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500"
              >
                Annuler
              </button>
              <button
                onClick={handleSubmitTagUpdate}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-500"
              >
                Enregistrer les tags
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de sélection des tags pour l\'UPLOAD */}
      {isTagUploadModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex justify-center items-center">
          <div className="relative p-5 border w-full max-w-md shadow-lg rounded-md bg-white dark:bg-gray-800">
            <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white mb-4">
              Sélectionner les tags pour les prochains uploads
            </h3>
            <div className="space-y-2 mb-6">
              {DOCUMENT_TAGS.map(tag => (
                <div key={`upload-modal-${tag}`} className="flex items-center">
                  <input
                    id={`upload-modal-tag-${tag}`}
                    name={`upload-modal-tag-${tag}`}
                    type="checkbox"
                    checked={selectedTagsForUpload.includes(tag)}
                    onChange={() => handleTagSelectionForUpload(tag)}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                  />
                  <label htmlFor={`upload-modal-tag-${tag}`} className="ml-2 block text-sm text-gray-900 dark:text-gray-100">
                    {tag}
                  </label>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-end">
              <button
                onClick={() => setIsTagUploadModalOpen(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-500"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}