'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useSelectedChantier } from '@/contexts/SelectedChantierContext'
import { BottomNav } from '@/components/mobile/BottomNav'
import {
  ArrowLeftIcon,
  PhotoIcon,
  DocumentIcon,
  FolderIcon,
  EyeIcon,
} from '@heroicons/react/24/outline'

interface Document {
  id: number
  nom: string
  url: string
  type: string
  mimeType?: string
  createdAt: string
  tags?: Array<{ nom: string }>
}

export default function MobileDocumentsPage() {
  const router = useRouter()
  const { selectedChantier } = useSelectedChantier()
  const [documents, setDocuments] = useState<Document[]>([])
  const [photos, setPhotos] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'all' | 'photos' | 'documents'>('all')

  useEffect(() => {
    if (!selectedChantier) {
      router.push('/mobile')
      return
    }
    loadDocuments()
  }, [selectedChantier, router])

  const loadDocuments = async () => {
    if (!selectedChantier) return

    try {
      setLoading(true)
      const response = await fetch(
        `/api/chantiers/${selectedChantier.chantierId}/documents`
      )
      if (response.ok) {
        const data = await response.json()
        const allDocs = Array.isArray(data) ? data : []
        
        // Séparer photos et documents
        const photosList = allDocs.filter(
          (doc: Document) => doc.type === 'photo-chantier'
        )
        const documentsList = allDocs.filter(
          (doc: Document) => doc.type !== 'photo-chantier'
        )
        
        setDocuments(documentsList)
        setPhotos(photosList)
      }
    } catch (error) {
      console.error('Erreur lors du chargement des documents:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(date)
  }

  const getDisplayItems = () => {
    if (activeTab === 'photos') return photos
    if (activeTab === 'documents') return documents
    return [...photos, ...documents].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  }

  const handleViewDocument = (doc: Document) => {
    window.open(doc.url, '_blank')
  }

  if (!selectedChantier) {
    return null
  }

  const displayItems = getDisplayItems()

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-700 text-white">
        <div className="max-w-md mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => router.push('/mobile/dashboard')}
              className="p-2 -ml-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <ArrowLeftIcon className="h-6 w-6" />
            </button>
            <h1 className="text-xl font-black">Documents & Photos</h1>
            <div className="w-10"></div>
          </div>
          <p className="text-sm text-blue-100">{selectedChantier.nomChantier}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-md mx-auto px-4 pt-4">
        <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('all')}
            className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'all'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Tout ({photos.length + documents.length})
          </button>
          <button
            onClick={() => setActiveTab('photos')}
            className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'photos'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Photos ({photos.length})
          </button>
          <button
            onClick={() => setActiveTab('documents')}
            className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'documents'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Docs ({documents.length})
          </button>
        </div>
      </div>

      {/* Contenu */}
      <div className="max-w-md mx-auto px-4 py-6">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Chargement...</p>
          </div>
        ) : displayItems.length === 0 ? (
          <div className="text-center py-12">
            <FolderIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 font-medium">Aucun document</p>
            <p className="text-sm text-gray-500 mt-1">
              {activeTab === 'photos'
                ? 'Aucune photo disponible'
                : activeTab === 'documents'
                ? 'Aucun document disponible'
                : 'Aucun document ou photo disponible'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayItems.map((item) => {
              const isPhoto = item.type === 'photo-chantier'
              return (
                <div
                  key={item.id}
                  className="bg-white rounded-xl p-4 shadow-lg border border-gray-200"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        isPhoto ? 'bg-blue-100' : 'bg-gray-100'
                      }`}
                    >
                      {isPhoto ? (
                        <PhotoIcon className="h-6 w-6 text-blue-600" />
                      ) : (
                        <DocumentIcon className="h-6 w-6 text-gray-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {item.nom}
                      </h3>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatDate(item.createdAt)}
                      </p>
                      {item.tags && item.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {item.tags.map((tag, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs"
                            >
                              {tag.nom}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleViewDocument(item)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <EyeIcon className="h-5 w-5 text-gray-600" />
                    </button>
                  </div>
                  
                  {isPhoto && (
                    <div className="mt-3 rounded-lg overflow-hidden">
                      <img
                        src={item.url}
                        alt={item.nom}
                        className="w-full h-48 object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.src = '/placeholder-image.jpg'
                        }}
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  )
}

