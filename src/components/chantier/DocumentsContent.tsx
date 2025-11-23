'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import Image from 'next/image'
import { ArrowUpTrayIcon, ArrowLeftIcon, ArrowRightIcon, XMarkIcon, TagIcon, DocumentIcon, EyeIcon, TrashIcon, ArrowDownTrayIcon, CameraIcon, DocumentTextIcon, ClipboardDocumentListIcon, SwatchIcon } from '@heroicons/react/24/outline'
import PhotosTabContent from './PhotosTabContent'
import FichesTechniquesTabContent from './FichesTechniquesTabContent'
import MetresTabContent from './MetresTabContent'
import ChoixClientTabContent from './ChoixClientTabContent'

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
  const [activeTab, setActiveTab] = useState<'documents' | 'photos' | 'fiches-techniques' | 'metres' | 'choix-client'>('documents')
  const [selectedTagsForUpload, setSelectedTagsForUpload] = useState<string[]>([])
  const [currentTagFilter, setCurrentTagFilter] = useState<string | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null)
  const [previewDocument, setPreviewDocument] = useState<Document | null>(null)

  // États pour l\'édition des tags d\'un document existant
  const [editingTagsDocId, setEditingTagsDocId] = useState<number | null>(null);
  const [tagsForModalEdit, setTagsForModalEdit] = useState<string[]>([]);
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<Set<number>>(new Set());
  const [isBulkTagEditOpen, setIsBulkTagEditOpen] = useState(false);

  // État pour le modal de sélection des tags pour l\'upload
  const [isTagUploadModalOpen, setIsTagUploadModalOpen] = useState(false);

  // Refs pour les onglets (pour calculer la position de l'indicateur)
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [indicatorStyle, setIndicatorStyle] = useState({ width: 0, left: 0 });

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

  // Écouter l'événement pour changer d'onglet vers "documents"
  useEffect(() => {
    const handleSwitchToDocumentsTab = () => {
      setActiveTab('documents')
    }
    
    window.addEventListener('switchToDocumentsTab', handleSwitchToDocumentsTab)
    
    return () => {
      window.removeEventListener('switchToDocumentsTab', handleSwitchToDocumentsTab)
    }
  }, [])

  // Réinitialiser la sélection quand le filtre change
  useEffect(() => {
    setSelectedDocumentIds(new Set())
  }, [currentTagFilter])

  // Mettre à jour la position de l'indicateur coulissant
  useEffect(() => {
    const tabs = ['documents', 'photos', 'fiches-techniques', 'metres', 'choix-client'] as const
    const currentIndex = tabs.indexOf(activeTab)
    const activeTabRef = tabRefs.current[currentIndex]

    if (activeTabRef) {
      const nav = activeTabRef.parentElement
      if (nav) {
        const navRect = nav.getBoundingClientRect()
        const tabRect = activeTabRef.getBoundingClientRect()
        setIndicatorStyle({
          width: tabRect.width,
          left: tabRect.left - navRect.left,
        })
      }
    }
  }, [activeTab])

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
    if (editingTagsDocId === null && selectedDocumentIds.size === 0) return

    try {
      // Si on modifie plusieurs documents
      if (selectedDocumentIds.size > 0) {
        const updatePromises = Array.from(selectedDocumentIds).map(docId =>
          fetch(`/api/chantiers/${chantierId}/documents/${docId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tags: tagsForModalEdit })
          })
        )

        const results = await Promise.all(updatePromises)
        const allOk = results.every(r => r.ok)

        if (allOk) {
          setSelectedDocumentIds(new Set())
          setIsBulkTagEditOpen(false)
          setTagsForModalEdit([])
          await fetchDocuments()
        } else {
          setError('Erreur lors de la mise à jour des tags pour certains documents')
        }
      } else if (editingTagsDocId) {
        // Modification d'un seul document
        const response = await fetch(`/api/chantiers/${chantierId}/documents/${editingTagsDocId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tags: tagsForModalEdit })
        })

        if (response.ok) {
          setEditingTagsDocId(null)
          setTagsForModalEdit([])
          await fetchDocuments()
        } else {
          const errorData = await response.json().catch(() => ({ error: 'Erreur inconnue' }))
          console.error('Erreur lors de la mise à jour des tags:', errorData)
          setError(errorData.error || 'Erreur lors de la mise à jour des tags')
        }
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour des tags:', error)
      setError('Erreur lors de la mise à jour des tags')
    }
  }

  // Gestion de la sélection multiple
  const toggleDocumentSelection = (docId: number) => {
    setSelectedDocumentIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(docId)) {
        newSet.delete(docId)
      } else {
        newSet.add(docId)
      }
      return newSet
    })
  }

  const toggleSelectAll = () => {
    if (selectedDocumentIds.size === filteredDocuments.length) {
      setSelectedDocumentIds(new Set())
    } else {
      setSelectedDocumentIds(new Set(filteredDocuments.map(doc => doc.id)))
    }
  }

  const handleBulkTagEdit = () => {
    // Si tous les documents sélectionnés ont les mêmes tags, les pré-remplir
    const selectedDocs = filteredDocuments.filter(doc => selectedDocumentIds.has(doc.id))
    if (selectedDocs.length > 0) {
      // Prendre les tags communs à tous les documents sélectionnés
      const commonTags = selectedDocs[0].tags?.map(t => t.nom) || []
      const allCommonTags = selectedDocs.slice(1).reduce((common, doc) => {
        const docTags = doc.tags?.map(t => t.nom) || []
        return common.filter(tag => docTags.includes(tag))
      }, commonTags)
      
      setTagsForModalEdit(allCommonTags)
      setIsBulkTagEditOpen(true)
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
      {/* Onglets centrés avec icônes et effet coulissant */}
      <div className="relative border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav className="relative -mb-px flex justify-center space-x-1 sm:space-x-4">
          {/* Indicateur coulissant animé - dégradé vert clair à vert foncé */}
          <div
            className="absolute bottom-0 h-1 bg-gradient-to-r from-emerald-400 via-teal-600 to-emerald-800 rounded-t-full transition-all duration-300 ease-in-out shadow-lg"
            style={{
              width: indicatorStyle.width || 0,
              left: indicatorStyle.left || 0,
            }}
          />
          
          <button
            ref={(el) => { tabRefs.current[0] = el }}
            onClick={() => setActiveTab('documents')}
            className={`relative py-3 px-4 sm:px-6 font-medium text-sm flex items-center gap-2 transition-all duration-300 rounded-t-lg ${
              activeTab === 'documents'
                ? 'text-emerald-700 dark:text-emerald-400 bg-gradient-to-b from-emerald-50 to-transparent dark:from-emerald-900/30 dark:to-transparent shadow-sm'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
            }`}
          >
            <DocumentIcon className={`h-5 w-5 transition-colors ${activeTab === 'documents' ? 'text-emerald-700 dark:text-emerald-400' : 'text-gray-400 dark:text-gray-500'}`} />
            <span>Documents</span>
          </button>
          <button
            ref={(el) => { tabRefs.current[1] = el }}
            onClick={() => setActiveTab('photos')}
            className={`relative py-3 px-4 sm:px-6 font-medium text-sm flex items-center gap-2 transition-all duration-300 rounded-t-lg ${
              activeTab === 'photos'
                ? 'text-emerald-700 dark:text-emerald-400 bg-gradient-to-b from-emerald-50 to-transparent dark:from-emerald-900/30 dark:to-transparent shadow-sm'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
            }`}
          >
            <CameraIcon className={`h-5 w-5 transition-colors ${activeTab === 'photos' ? 'text-emerald-700 dark:text-emerald-400' : 'text-gray-400 dark:text-gray-500'}`} />
            <span>Photos</span>
          </button>
          <button
            ref={(el) => { tabRefs.current[2] = el }}
            onClick={() => setActiveTab('fiches-techniques')}
            className={`relative py-3 px-4 sm:px-6 font-medium text-sm flex items-center gap-2 transition-all duration-300 rounded-t-lg ${
              activeTab === 'fiches-techniques'
                ? 'text-emerald-700 dark:text-emerald-400 bg-gradient-to-b from-emerald-50 to-transparent dark:from-emerald-900/30 dark:to-transparent shadow-sm'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
            }`}
          >
            <DocumentTextIcon className={`h-5 w-5 transition-colors ${activeTab === 'fiches-techniques' ? 'text-emerald-700 dark:text-emerald-400' : 'text-gray-400 dark:text-gray-500'}`} />
            <span>Fiches techniques</span>
          </button>
          <button
            ref={(el) => { tabRefs.current[3] = el }}
            onClick={() => setActiveTab('metres')}
            className={`relative py-3 px-4 sm:px-6 font-medium text-sm flex items-center gap-2 transition-all duration-300 rounded-t-lg ${
              activeTab === 'metres'
                ? 'text-emerald-700 dark:text-emerald-400 bg-gradient-to-b from-emerald-50 to-transparent dark:from-emerald-900/30 dark:to-transparent shadow-sm'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
            }`}
          >
            <ClipboardDocumentListIcon className={`h-5 w-5 transition-colors ${activeTab === 'metres' ? 'text-emerald-700 dark:text-emerald-400' : 'text-gray-400 dark:text-gray-500'}`} />
            <span>Métrés</span>
          </button>
          <button
            ref={(el) => { tabRefs.current[4] = el }}
            onClick={() => setActiveTab('choix-client')}
            className={`relative py-3 px-4 sm:px-6 font-medium text-sm flex items-center gap-2 transition-all duration-300 rounded-t-lg ${
              activeTab === 'choix-client'
                ? 'text-emerald-700 dark:text-emerald-400 bg-gradient-to-b from-emerald-50 to-transparent dark:from-emerald-900/30 dark:to-transparent shadow-sm'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
            }`}
          >
            <SwatchIcon className={`h-5 w-5 transition-colors ${activeTab === 'choix-client' ? 'text-emerald-700 dark:text-emerald-400' : 'text-gray-400 dark:text-gray-500'}`} />
            <span>Choix client</span>
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
          <div className="relative px-6 py-6 bg-gradient-to-br from-emerald-600/10 via-teal-700/10 to-cyan-800/10 dark:from-emerald-600/10 dark:via-teal-700/10 dark:to-cyan-800/10 text-emerald-900 dark:text-white overflow-hidden mb-4 rounded-lg backdrop-blur-sm">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/20 to-cyan-800/20"></div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl transform translate-x-16 -translate-y-16"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-teal-300/20 rounded-full blur-xl transform -translate-x-8 translate-y-8"></div>
            
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center">
                <div className="inline-flex items-center px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full shadow-lg ring-2 ring-white/30">
                  <DocumentIcon className="w-6 h-6 mr-3 text-emerald-900 dark:text-white" />
                  <span className="font-bold text-xl text-emerald-900 dark:text-white">📄 Documents</span>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                {selectedDocumentIds.size > 0 && (
                  <button
                    onClick={handleBulkTagEdit}
                    className="inline-flex items-center px-4 py-2 bg-white/30 backdrop-blur-sm rounded-lg text-sm font-semibold shadow-lg hover:bg-white/40 transition-all duration-200 text-emerald-900 dark:text-white"
                  >
                    <TagIcon className="h-5 w-5 mr-2" />
                    Modifier les tags ({selectedDocumentIds.size})
                  </button>
                )}
                <span className="inline-flex items-center px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm font-medium shadow-sm text-emerald-900 dark:text-white">
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
                      <input
                        type="checkbox"
                        checked={filteredDocuments.length > 0 && selectedDocumentIds.size === filteredDocuments.length}
                        onChange={toggleSelectAll}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                      />
                    </th>
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
                    <tr key={document.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${selectedDocumentIds.has(document.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedDocumentIds.has(document.id)}
                          onChange={() => toggleDocumentSelection(document.id)}
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                        />
                      </td>
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
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => setPreviewDocument(document)}
                            className="p-2 rounded-lg text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-200"
                            title="Voir le document"
                          >
                            <EyeIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingTagsDocId(document.id)
                              setTagsForModalEdit(document.tags?.map(t => t.nom) || [])
                            }}
                            className="p-2 rounded-lg text-yellow-600 hover:text-yellow-700 dark:text-yellow-400 dark:hover:text-yellow-300 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition-all duration-200"
                            title="Modifier les tags"
                          >
                            <TagIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDeleteDocument(document.id)}
                            className="p-2 rounded-lg text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200"
                            title="Supprimer"
                          >
                            <TrashIcon className="h-5 w-5" />
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
      ) : activeTab === 'fiches-techniques' ? (
        <FichesTechniquesTabContent chantierId={chantierId} />
      ) : activeTab === 'metres' ? (
        <MetresTabContent chantierId={chantierId} />
      ) : (
        <ChoixClientTabContent chantierId={chantierId} />
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

      {/* Modal de prévisualisation des documents */}
      {previewDocument && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b-2 border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-r from-blue-50/50 to-blue-50/50 dark:from-blue-900/10 dark:to-blue-900/10">
              <h3 className="text-lg font-black text-gray-900 dark:text-white">{previewDocument.nom}</h3>
              <button
                onClick={() => setPreviewDocument(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            <div className="p-4 overflow-auto max-h-[calc(90vh-4rem)]">
              {(() => {
                const fileExtension = previewDocument.nom.split('.').pop()?.toLowerCase() || ''
                const mimeType = previewDocument.mimeType?.toLowerCase() || ''
                const isImage = mimeType.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExtension)
                const isPDF = mimeType === 'application/pdf' || fileExtension === 'pdf'
                const isText = ['txt', 'md', 'csv'].includes(fileExtension)

                // Fonction helper pour convertir l'URL en URL API si nécessaire
                const getDocumentUrl = (url: string) => {
                  // Si l'URL commence par /uploads/, la convertir pour utiliser l'API
                  if (url.startsWith('/uploads/')) {
                    // Enlever le préfixe /uploads/ et utiliser l'API
                    const pathWithoutUploads = url.replace('/uploads/', '')
                    return `/api/documents/serve/${pathWithoutUploads}`
                  }
                  // Si l'URL commence déjà par /api/, la retourner telle quelle
                  if (url.startsWith('/api/')) {
                    return url
                  }
                  // Sinon, retourner l'URL telle quelle
                  return url
                }

                if (isImage) {
                  return (
                    <div className="flex justify-center">
                      <img
                        src={getDocumentUrl(previewDocument.url)}
                        alt={previewDocument.nom}
                        className="max-w-full h-auto rounded-lg shadow-lg"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.style.display = 'none'
                          const parent = target.parentElement
                          if (parent) {
                            parent.innerHTML = '<p class="text-gray-500 text-center p-4">Erreur lors du chargement de l\'image</p>'
                          }
                        }}
                      />
                    </div>
                  )
                }
                if (isPDF) {
                  const pdfUrl = getDocumentUrl(previewDocument.url)
                  return (
                    <div className="w-full h-[calc(90vh-8rem)] relative">
                      <iframe
                        src={`${pdfUrl}#toolbar=0`}
                        className="w-full h-full rounded-lg shadow-lg border-0"
                        title={previewDocument.nom}
                        style={{ minHeight: '600px' }}
                        onLoad={(e) => {
                          // Vérifier si l'iframe a chargé correctement
                          const iframe = e.target as HTMLIFrameElement
                          try {
                            // Si on peut accéder au contenu, c'est bon
                            if (iframe.contentDocument || iframe.contentWindow) {
                              console.log('PDF chargé avec succès')
                            }
                          } catch {
                            // Erreur CORS normale, mais le PDF devrait quand même se charger
                            console.log('PDF en cours de chargement (CORS normal)')
                          }
                        }}
                        onError={() => {
                          const iframe = document.querySelector('iframe[title="' + previewDocument.nom + '"]') as HTMLIFrameElement
                          if (iframe) {
                            iframe.style.display = 'none'
                            const parent = iframe.parentElement
                            if (parent) {
                              parent.innerHTML = '<div class="p-4 text-center"><p class="text-gray-500 mb-4">Erreur lors du chargement du PDF.</p><a href="' + pdfUrl + '" target="_blank" class="text-blue-600 hover:underline inline-flex items-center gap-2"><ArrowDownTrayIcon class="h-5 w-5" /> Cliquez ici pour le télécharger</a></div>'
                            }
                          }
                        }}
                      />
                    </div>
                  )
                }
                if (isText) {
                  return (
                    <div className="p-4">
                      <p className="text-gray-500 text-center">Prévisualisation non disponible pour les fichiers texte</p>
                    </div>
                  )
                }
                return (
                  <div className="p-4 text-center">
                    <DocumentIcon className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-500">Prévisualisation non disponible pour ce type de fichier</p>
                    <p className="text-sm text-gray-400 mt-2">Type: {previewDocument.mimeType || 'Inconnu'}</p>
                  </div>
                )
              })()}
            </div>
            
            <div className="flex justify-end p-4 border-t-2 border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-r from-blue-50/50 to-blue-50/50 dark:from-blue-900/10 dark:to-blue-900/10">
              <a
                href={(() => {
                  // Fonction helper pour convertir l'URL en URL API si nécessaire
                  const url = previewDocument.url
                  if (url.startsWith('/uploads/')) {
                    const pathWithoutUploads = url.replace('/uploads/', '')
                    return `/api/documents/serve/${pathWithoutUploads}`
                  }
                  return url
                })()}
                target="_blank"
                rel="noopener noreferrer"
                download={previewDocument.nom}
                className="inline-flex items-center px-4 py-2.5 border border-transparent text-sm font-semibold rounded-xl shadow-lg hover:shadow-xl text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
              >
                <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
                Télécharger
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Modal d'édition des tags (un seul document) */}
      {editingTagsDocId !== null && !isBulkTagEditOpen && (
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
                onClick={() => { 
                  setEditingTagsDocId(null)
                  setTagsForModalEdit([])
                  setIsBulkTagEditOpen(false)
                }}
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

      {/* Modal d'édition des tags (plusieurs documents) */}
      {isBulkTagEditOpen && selectedDocumentIds.size > 0 && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex justify-center items-center">
          <div className="relative p-5 border w-full max-w-md shadow-lg rounded-md bg-white dark:bg-gray-800">
            <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white mb-4">
              Modifier les tags de {selectedDocumentIds.size} document{selectedDocumentIds.size > 1 ? 's' : ''}
            </h3>
            <div className="space-y-2 mb-6">
              {DOCUMENT_TAGS.map(tag => (
                <div key={`bulk-tag-${tag}`} className="flex items-center">
                  <input
                    id={`bulk-modal-tag-${tag}`}
                    name={`bulk-modal-tag-${tag}`}
                    type="checkbox"
                    checked={tagsForModalEdit.includes(tag)}
                    onChange={() => handleTagSelectionForModal(tag)}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                  />
                  <label htmlFor={`bulk-modal-tag-${tag}`} className="ml-2 block text-sm text-gray-900 dark:text-gray-100">
                    {tag}
                  </label>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-end space-x-3">
              <button
                onClick={() => { 
                  setIsBulkTagEditOpen(false)
                  setTagsForModalEdit([])
                }}
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