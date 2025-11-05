'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { EyeIcon, CalendarIcon, UserIcon, CameraIcon, TrashIcon, PencilIcon, TagIcon, XMarkIcon, PlusIcon } from '@heroicons/react/24/outline'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import toast from 'react-hot-toast'

interface PhotoExterne {
  id: string
  uploadedByName: string
  uploadedBy?: string
  uploadedByType: string
  uploadedByTypeLibelle: string
  isManual?: boolean
  urls?: string[]
  description?: string
  dateUpload?: string
  createdAt: string
}

interface PhotoRemarque {
  id: string
  url: string
  estPreuve: boolean
  remarqueId: string
  remarqueDescription: string
  uploadedBy: string
  createdAt: string
}

interface PhotoSAV {
  id: string
  url: string
  nomOriginal?: string
  description?: string
  type: string
  prisePar: string
  createdAt: string
  ticketId: string
  ticketTitre: string
}

interface PhotoChantier {
  id: string
  nom: string
  url: string
  createdAt: string
  uploadedBy: string
  documentId?: string // ID numérique du document pour l'API
  tags?: { nom: string }[] // Tags de la relation Prisma
  metadata?: {
    annotation?: string
    tags?: string[] // Tags dans metadata (ancien format)
  }
}

interface PhotosContentProps {
  chantierId: string
}

type PhotoItem = 
  | (PhotoExterne & { url: string; index: number; type: 'externe' | 'manuelle' })
  | (PhotoRemarque & { type: 'remarque' })
  | (PhotoSAV & { type: 'sav' })
  | (PhotoChantier & { type: 'chantier' })

export default function PhotosContent({ chantierId }: PhotosContentProps) {
  const [photosExternes, setPhotosExternes] = useState<PhotoExterne[]>([])
  const [photosRemarques, setPhotosRemarques] = useState<PhotoRemarque[]>([])
  const [photosSAV, setPhotosSAV] = useState<PhotoSAV[]>([])
  const [photosChantier, setPhotosChantier] = useState<PhotoChantier[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoItem | null>(null)
  const [activeTab, setActiveTab] = useState<'all' | 'externes' | 'internes' | 'remarques' | 'sav' | 'chantier'>('all')
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; photoId: string; photoName: string }>({ 
    show: false, 
    photoId: '', 
    photoName: '' 
  })
  const [deleting, setDeleting] = useState(false)
  
  // État pour l'édition des tags
  const [editTagsModal, setEditTagsModal] = useState<{ show: boolean; photo: PhotoChantier | null }>({
    show: false,
    photo: null
  })
  const [editingTags, setEditingTags] = useState<string[]>([])
  const [newTagName, setNewTagName] = useState('')
  const [savingTags, setSavingTags] = useState(false)

  // Type guards
  const isExtOrManuelle = (p: PhotoItem): p is (PhotoExterne & { url: string; index: number; type: 'externe' | 'manuelle' }) =>
    p.type === 'externe' || p.type === 'manuelle'

  // Charger toutes les photos
  useEffect(() => {
    const fetchAllPhotos = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // Charger les photos externes
        const responseExternes = await fetch(`/api/chantiers/${chantierId}/photos-externes`)
        
        if (responseExternes.ok) {
          const dataExternes = await responseExternes.json()
          
          if (dataExternes.success && Array.isArray(dataExternes.photos)) {
            setPhotosExternes(dataExternes.photos)
          } else {
            console.error('Erreur lors du chargement des photos externes:', dataExternes)
            setPhotosExternes([])
          }
        } else {
          console.error('Erreur HTTP lors du chargement des photos externes:', responseExternes.status, responseExternes.statusText)
          setPhotosExternes([])
        }

        // Charger les photos des remarques (via l'API des réceptions)
        const responseRemarques = await fetch(`/api/chantiers/${chantierId}/reception`)
        
        if (responseRemarques.ok) {
          const dataRemarques = await responseRemarques.json()
          
          if (dataRemarques.success) {
            const photosRemarques: PhotoRemarque[] = []
            dataRemarques.receptions.forEach((reception: { remarques?: Array<{ id: string; description: string; photos?: Array<{ id: string; url: string; estPreuve: boolean; createdAt: string }>; createdBy?: string; createdAt: string }> }) => {
              reception.remarques?.forEach((remarque: { id: string; description: string; photos?: Array<{ id: string; url: string; estPreuve: boolean; createdAt: string }>; createdBy?: string; createdAt: string }) => {
                remarque.photos?.forEach((photo: { id: string; url: string; estPreuve: boolean; createdAt: string }) => {
                  photosRemarques.push({
                    id: photo.id,
                    url: photo.url,
                    estPreuve: photo.estPreuve,
                    remarqueId: remarque.id,
                    remarqueDescription: remarque.description,
                    uploadedBy: remarque.createdBy || 'Inconnu',
                    createdAt: photo.createdAt || remarque.createdAt
                  })
                })
              })
            })
            setPhotosRemarques(photosRemarques)
          }
        } else {
          console.error('Erreur HTTP lors du chargement des réceptions:', responseRemarques.status, responseRemarques.statusText)
          setPhotosRemarques([])
        }

        // Charger les photos SAV - API pas encore implémentée
        // TODO: Implémenter l'API /api/chantiers/[chantierId]/sav pour récupérer les photos SAV du chantier
        setPhotosSAV([])

        // Charger les photos de chantier (type photo-chantier depuis les documents)
        const responseChantier = await fetch(`/api/chantiers/${chantierId}/documents?type=photo-chantier`)
        
        if (responseChantier.ok) {
          const dataChantier = await responseChantier.json()
          
          // L'API peut retourner soit { success: true, documents: [...] } soit directement [...]
          const documentsList = Array.isArray(dataChantier) ? dataChantier : (dataChantier.documents || [])
          
          const photosChantierList: PhotoChantier[] = documentsList.map((doc: {
            id: string | number
            nom: string
            url: string
            type: string
            taille: number
            createdAt: string
            metadata?: { [key: string]: unknown }
            User?: { name?: string }
            tags?: { nom: string }[]
          }) => {
            // 🔍 DEBUG : Log des tags pour chaque photo
            console.log(`🔍 PhotosContent - Photo ${doc.nom}:`, {
              tags: doc.tags?.map(t => t.nom) || [],
              metadataTags: (doc.metadata as any)?.tags || [],
              metadataSource: (doc.metadata as any)?.source
            });
            
            return {
              id: doc.id.toString(),
              documentId: typeof doc.id === 'number' ? doc.id.toString() : doc.id,
              nom: doc.nom,
              url: doc.url,
              createdAt: doc.createdAt,
              uploadedBy: doc.User?.name || 'Inconnu',
              tags: doc.tags || [],
              metadata: doc.metadata || {}
            };
          })
          
          setPhotosChantier(photosChantierList)
          console.log(`📸 ${photosChantierList.length} photos de chantier chargées`)
        } else {
          console.error('Erreur HTTP lors du chargement des photos de chantier:', responseChantier.status, responseChantier.statusText)
          setPhotosChantier([])
        }

      } catch (error) {
        console.error('Erreur lors du chargement des photos:', error)
        setError('Erreur lors du chargement des photos')
      } finally {
        setLoading(false)
      }
    }

    fetchAllPhotos()
  }, [chantierId])

  // Filtrer les photos selon l'onglet actif
  const getFilteredPhotos = (): PhotoItem[] => {
    switch (activeTab) {
      case 'externes':
        return photosExternes
          .filter(photo => !photo.isManual) // Seulement les photos externes (pas manuelles)
          .flatMap(photo => 
            (photo.urls || []).map((url, index) => ({
              ...photo,
              url,
              index,
              type: 'externe' as const
            }))
          )
      case 'internes':
        // Photos manuelles (internes) + photos de chantier avec tag "Interne"
        return [
          ...photosExternes
            .filter(photo => photo.isManual)
            .flatMap(photo => 
              (photo.urls || []).map((url, index) => ({
                ...photo,
                url,
                index,
                type: 'manuelle' as const
              }))
            ),
          ...photosChantier
            .filter(photo => {
              // Inclure les photos avec le tag "Interne"
              const hasInterneTag = photo.tags?.some(tag => tag.nom.toLowerCase() === 'interne');
              return hasInterneTag;
            })
            .map(photo => ({
              ...photo,
              type: 'chantier' as const
            }))
        ]
      case 'remarques':
        return photosRemarques.map(photo => ({
          ...photo,
          type: 'remarque' as const
        }))
      case 'sav':
        return photosSAV.map(photo => ({
          ...photo,
          type: 'sav' as const
        }))
      case 'chantier':
        // Onglet "Rapports" : seulement les photos de chantier avec tag "Rapport" ou sans tag "Interne"
        return photosChantier
          .filter(photo => {
            const hasInterneTag = photo.tags?.some(tag => tag.nom.toLowerCase() === 'interne');
            const hasRapportTag = photo.tags?.some(tag => tag.nom.toLowerCase() === 'rapport');
            // Inclure si pas de tag "Interne" OU si tag "Rapport" présent
            return !hasInterneTag || hasRapportTag;
          })
          .map(photo => ({
            ...photo,
            type: 'chantier' as const
          }))
      default:
        return [
          ...photosExternes.flatMap(photo => 
            (photo.urls || []).map((url, index) => ({
              ...photo,
              url,
              index,
              type: photo.isManual ? 'manuelle' as const : 'externe' as const
            }))
          ),
          ...photosRemarques.map(photo => ({
            ...photo,
            type: 'remarque' as const
          })),
          ...photosSAV.map(photo => ({
            ...photo,
            type: 'sav' as const
          })),
          ...photosChantier.map(photo => ({
            ...photo,
            type: 'chantier' as const
          }))
        ]
    }
  }

  const filteredPhotos = getFilteredPhotos()

  // Ouvrir la modal de visualisation
  const openPhotoModal = (photo: PhotoItem, _type: string) => {
    setSelectedPhoto(photo)
  }

  // Navigation entre les photos
  const goToPreviousPhoto = useCallback(() => {
    if (!selectedPhoto) return
    
    const currentIndex = filteredPhotos.findIndex(p => {
      if (!selectedPhoto) return false
      if (isExtOrManuelle(p) && isExtOrManuelle(selectedPhoto)) {
        return p.id === selectedPhoto.id && p.type === selectedPhoto.type && p.index === selectedPhoto.index
      }
      return p.id === selectedPhoto.id && p.type === selectedPhoto.type
    })
    
    if (currentIndex > 0) {
      setSelectedPhoto(filteredPhotos[currentIndex - 1])
    }
  }, [selectedPhoto, filteredPhotos])

  const goToNextPhoto = useCallback(() => {
    if (!selectedPhoto) return
    
    const currentIndex = filteredPhotos.findIndex(p => {
      if (!selectedPhoto) return false
      if (isExtOrManuelle(p) && isExtOrManuelle(selectedPhoto)) {
        return p.id === selectedPhoto.id && p.type === selectedPhoto.type && p.index === selectedPhoto.index
      }
      return p.id === selectedPhoto.id && p.type === selectedPhoto.type
    })
    
    if (currentIndex < filteredPhotos.length - 1) {
      setSelectedPhoto(filteredPhotos[currentIndex + 1])
    }
  }, [selectedPhoto, filteredPhotos])

  const getCurrentPhotoIndex = () => {
    if (!selectedPhoto) return 0
    
    const currentIndex = filteredPhotos.findIndex(p => {
      if (!selectedPhoto) return false
      if (isExtOrManuelle(p) && isExtOrManuelle(selectedPhoto)) {
        return p.id === selectedPhoto.id && p.type === selectedPhoto.type && p.index === selectedPhoto.index
      }
      return p.id === selectedPhoto.id && p.type === selectedPhoto.type
    })
    
    return currentIndex + 1 // +1 car l'index commence à 0
  }

  // Fonction pour demander la confirmation de suppression
  const confirmDeletePhoto = (photoId: string, photoName: string) => {
    setDeleteConfirm({ show: true, photoId, photoName })
  }

  // Fonction pour supprimer une photo
  const deletePhoto = async () => {
    if (!deleteConfirm.photoId) return

    try {
      setDeleting(true)
      
      const response = await fetch(`/api/chantiers/${chantierId}/photos-externes`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ photoId: deleteConfirm.photoId }),
      })

      if (!response.ok) {
        throw new Error('Erreur lors de la suppression')
      }

      const result = await response.json()
      
      if (result.success) {
        // Recharger les photos après suppression
        const responseExternes = await fetch(`/api/chantiers/${chantierId}/photos-externes`)
        if (responseExternes.ok) {
          const dataExternes = await responseExternes.json()
          if (dataExternes.success && Array.isArray(dataExternes.photos)) {
            setPhotosExternes(dataExternes.photos)
          }
        }
        
        // Fermer la modal de visualisation si la photo supprimée était affichée
        if (selectedPhoto && (selectedPhoto.type === 'externe' || selectedPhoto.type === 'manuelle') && selectedPhoto.id === deleteConfirm.photoId) {
          setSelectedPhoto(null)
        }
      } else {
        throw new Error(result.error || 'Erreur lors de la suppression')
      }
    } catch (error) {
      console.error('Erreur lors de la suppression de la photo:', error)
      alert('Erreur lors de la suppression de la photo. Veuillez réessayer.')
    } finally {
      setDeleting(false)
      setDeleteConfirm({ show: false, photoId: '', photoName: '' })
    }
  }

  // Fonction pour annuler la suppression
  const cancelDelete = () => {
    setDeleteConfirm({ show: false, photoId: '', photoName: '' })
  }

  // Gestion des touches clavier
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!selectedPhoto) return
      
      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault()
          goToPreviousPhoto()
          break
        case 'ArrowRight':
          event.preventDefault()
          goToNextPhoto()
          break
        case 'Escape':
          event.preventDefault()
          setSelectedPhoto(null)
          break
      }
    }

    if (selectedPhoto) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [selectedPhoto, filteredPhotos, goToPreviousPhoto, goToNextPhoto])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Chargement des photos...</span>
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
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
      {/* Header avec statistiques */}
      <div className="relative px-6 py-6 bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 text-white overflow-hidden mb-6 rounded-lg">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-800/20"></div>
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl transform translate-x-16 -translate-y-16"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-300/20 rounded-full blur-xl transform -translate-x-8 translate-y-8"></div>
        
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center">
            <div className="inline-flex items-center px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full shadow-lg ring-2 ring-white/30">
              <CameraIcon className="w-6 h-6 mr-3 text-white" />
              <span className="font-bold text-xl">📸 Photos de chantier</span>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <span className="inline-flex items-center px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm font-medium shadow-sm">
              📊 {filteredPhotos.length} photo{filteredPhotos.length > 1 ? 's' : ''}
            </span>
            {/* Bouton pour vider les photos - visible uniquement sur l'onglet chantier */}
            {activeTab === 'chantier' && (
              <button
                onClick={async (e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  
                  console.log('🗑️ Bouton "Vider toutes les photos" cliqué', { chantierId, count: photosChantier.length })
                  
                  const confirmed = window.confirm(`Êtes-vous sûr de vouloir supprimer toutes les ${photosChantier.length} photos de chantier ? Cette action est irréversible.`)
                  
                  if (!confirmed) {
                    console.log('❌ Suppression annulée par l\'utilisateur')
                    return
                  }
                  
                  console.log('✅ Confirmation reçue, suppression en cours...')
                  
                  try {
                    const url = `/api/chantiers/${chantierId}/documents/cleanup-photos`
                    console.log('📡 Appel API:', url)
                    
                    const response = await fetch(url, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                    })
                    
                    console.log('📥 Réponse API:', response.status, response.statusText)
                    
                    if (!response.ok) {
                      const errorData = await response.json().catch(() => ({ error: 'Erreur inconnue' }))
                      console.error('❌ Erreur API:', errorData)
                      throw new Error(errorData.error || 'Erreur lors de la suppression')
                    }
                    
                    const result = await response.json()
                    console.log('✅ Résultat:', result)
                    
                    toast.success(`✅ ${result.deleted || result.message || 'Toutes les photos ont été supprimées'}`)
                    
                    // Recharger les photos après un court délai
                    setTimeout(() => {
                      window.location.reload()
                    }, 1000)
                  } catch (error) {
                    console.error('❌ Erreur:', error)
                    const errorMessage = error instanceof Error ? error.message : 'Erreur lors de la suppression des photos'
                    toast.error(`❌ ${errorMessage}`)
                  }
                }}
                className="inline-flex items-center px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-full text-sm font-medium shadow-sm transition-colors cursor-pointer"
                type="button"
              >
                <TrashIcon className="h-4 w-4 mr-1" />
                Vider toutes les photos {photosChantier.length > 0 ? `(${photosChantier.length})` : ''}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Onglets de filtrage */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav className="-mb-px flex space-x-8">
          {[
            { key: 'all', label: 'Toutes', count: photosExternes.flatMap(p => p.urls || []).length + photosRemarques.length + photosSAV.length + photosChantier.length },
            { key: 'chantier', label: 'Rapports', count: photosChantier.filter(p => {
                const hasInterneTag = p.tags?.some(tag => tag.nom.toLowerCase() === 'interne');
                const hasRapportTag = p.tags?.some(tag => tag.nom.toLowerCase() === 'rapport');
                return !hasInterneTag || hasRapportTag;
              }).length },
            { key: 'externes', label: 'Externes', count: photosExternes.filter(p => !p.isManual).flatMap(p => p.urls || []).length },
            { key: 'internes', label: 'Internes', count: photosExternes.filter(p => p.isManual).flatMap(p => p.urls || []).length + photosChantier.filter(p => {
                const hasInterneTag = p.tags?.some(tag => tag.nom.toLowerCase() === 'interne');
                return hasInterneTag;
              }).length },
            { key: 'remarques', label: 'Remarques', count: photosRemarques.length },
            { key: 'sav', label: 'SAV', count: photosSAV.length }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as 'all' | 'externes' | 'internes' | 'remarques' | 'sav' | 'chantier')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </nav>
      </div>

      {/* Grille de photos */}
      {filteredPhotos.length === 0 ? (
        <div className="text-center py-8">
          <CameraIcon className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-500 mb-3" />
          <p className="text-gray-500 dark:text-gray-400">
            {activeTab === 'all' ? 'Aucune photo pour ce chantier' :
             activeTab === 'externes' ? 'Aucune photo externe' :
             activeTab === 'internes' ? 'Aucune photo interne' :
             activeTab === 'remarques' ? 'Aucune photo de remarque' :
             'Aucune photo SAV'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {filteredPhotos.map((photo, _index) => (
            <div
              key={`${photo.type}-${photo.id}-${photo.type === 'externe' ? photo.index : 0}`}
              className="aspect-square bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity group relative"
              onClick={() => openPhotoModal(photo, photo.type)}
            >
              <img
                src={photo.url}
                alt="Photo"
                className="w-full h-full object-cover"
              />
              
              {/* Badge du type */}
              <div className="absolute top-2 left-2">
                {(() => {
                  // Pour les photos de chantier, afficher le tag réel au lieu du type
                  if (photo.type === 'chantier' && photo.tags && photo.tags.length > 0) {
                    const tagNom = photo.tags[0].nom;
                    const isInterne = tagNom.toLowerCase() === 'interne';
                    return (
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        isInterne 
                          ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                          : 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
                      }`}>
                        {tagNom}
                      </span>
                    );
                  }
                  
                  // Pour les autres types, afficher le type comme avant
                  return (
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      photo.type === 'externe' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                      photo.type === 'manuelle' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
                      photo.type === 'remarque' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                      photo.type === 'chantier' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' :
                      'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    }`}>
                      {photo.type === 'externe' ? 'Externe' :
                       photo.type === 'manuelle' ? 'Interne' :
                       photo.type === 'remarque' ? 'Remarque' :
                       photo.type === 'chantier' ? 'Rapport' : 'SAV'}
                    </span>
                  );
                })()}
              </div>

              {/* Icône de visualisation */}
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center">
                <EyeIcon className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>

              {/* Bouton de suppression (pour les photos externes et manuelles) */}
              {(photo.type === 'externe' || photo.type === 'manuelle') && (
                <div className="absolute top-2 right-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      confirmDeletePhoto(photo.id, `Photo de ${photo.uploadedByName}`)
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg"
                    title="Supprimer la photo"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal de visualisation */}
      {selectedPhoto && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl max-h-[90vh] overflow-hidden">
            {/* Header du modal */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Photo {selectedPhoto.type === 'externe' ? 'externe' : 
                           selectedPhoto.type === 'manuelle' ? 'interne' :
                           selectedPhoto.type === 'remarque' ? 'de remarque' :
                           selectedPhoto.type === 'chantier' ? 'de rapport' : 'SAV'}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {(selectedPhoto.type === 'externe' || selectedPhoto.type === 'manuelle') && `${selectedPhoto.uploadedByName} • ${selectedPhoto.uploadedByTypeLibelle}`}
                    {selectedPhoto.type === 'remarque' && `Remarque: ${selectedPhoto.remarqueDescription?.substring(0, 50)}...`}
                    {selectedPhoto.type === 'chantier' && `Par ${selectedPhoto.uploadedBy}`}
                    {selectedPhoto.type === 'sav' && `Ticket: ${selectedPhoto.ticketTitre}`}
                  </p>
                </div>
                
                {/* Navigation et compteur */}
                {filteredPhotos.length > 1 && (
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={goToPreviousPhoto}
                      className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={getCurrentPhotoIndex() === 1}
                    >
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    
                    <span className="text-sm text-gray-500 dark:text-gray-400 px-2">
                      {getCurrentPhotoIndex()} / {filteredPhotos.length}
                    </span>
                    
                    <button
                      onClick={goToNextPhoto}
                      className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={getCurrentPhotoIndex() === filteredPhotos.length}
                    >
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
              
              <div className="flex items-center space-x-2">
                {/* Bouton de suppression (pour les photos externes et manuelles) */}
                {(selectedPhoto.type === 'externe' || selectedPhoto.type === 'manuelle') && (
                  <button
                    onClick={() => confirmDeletePhoto(selectedPhoto.id, `Photo de ${selectedPhoto.uploadedByName}`)}
                    className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
                    title="Supprimer la photo"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                )}
                
                {/* Bouton de fermeture */}
                <button
                  onClick={() => setSelectedPhoto(null)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Image */}
            <div className="bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden relative">
              <img
                src={selectedPhoto.url}
                alt="Photo"
                className="w-full h-auto cursor-pointer"
                onClick={(e) => {
                  // Navigation par clic : gauche = précédent, droite = suivant
                  const rect = e.currentTarget.getBoundingClientRect()
                  const clickX = e.clientX - rect.left
                  const imageWidth = rect.width
                  
                  if (clickX < imageWidth / 2) {
                    goToPreviousPhoto()
                  } else {
                    goToNextPhoto()
                  }
                }}
              />
              
              {/* Indicateurs de navigation sur l'image */}
              {filteredPhotos.length > 1 && (
                <>
                  {/* Zone de clic gauche */}
                  <div 
                    className="absolute left-0 top-0 w-1/2 h-full cursor-w-resize opacity-0 hover:opacity-10 hover:bg-blue-500 transition-opacity"
                    onClick={goToPreviousPhoto}
                    title="Photo précédente (←)"
                  />
                  
                  {/* Zone de clic droite */}
                  <div 
                    className="absolute right-0 top-0 w-1/2 h-full cursor-e-resize opacity-0 hover:opacity-10 hover:bg-blue-500 transition-opacity"
                    onClick={goToNextPhoto}
                    title="Photo suivante (→)"
                  />
                </>
              )}
            </div>

            {/* Informations détaillées */}
            <div className="mt-4 space-y-2 text-sm text-gray-600 dark:text-gray-400">
              {(selectedPhoto.type === 'externe' || selectedPhoto.type === 'manuelle') && (
                <>
                  <div className="flex items-center space-x-2">
                    <UserIcon className="h-4 w-4" />
                    <span>Envoyé par: {selectedPhoto.uploadedByName}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CalendarIcon className="h-4 w-4" />
                    <span>
                      {(() => {
                        try {
                        const dateValue = (selectedPhoto.type === 'externe' || selectedPhoto.type === 'manuelle') ? 
                          (selectedPhoto.dateUpload || selectedPhoto.createdAt) : 
                          selectedPhoto.createdAt;
                          
                          // Vérifier que la date est valide
                          if (!dateValue) {
                            return 'Date non disponible';
                          }
                          
                          const date = new Date(dateValue);
                          if (isNaN(date.getTime())) {
                            return 'Date invalide';
                          }
                          
                          return format(date, 'dd/MM/yyyy à HH:mm', { locale: fr });
                        } catch (error) {
                          console.error('Erreur de formatage de date:', error, 'dateValue:', (selectedPhoto.type === 'externe' || selectedPhoto.type === 'manuelle') ? 
                            (selectedPhoto.dateUpload || selectedPhoto.createdAt) : 
                            selectedPhoto.createdAt);
                          return 'Date non disponible';
                        }
                      })()}
                    </span>
                  </div>
                  {selectedPhoto.description && (
                    <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-600 rounded-lg">
                      <p className="text-gray-700 dark:text-gray-300">{selectedPhoto.description}</p>
                    </div>
                  )}
                </>
              )}
              
              {selectedPhoto.type === 'remarque' && (
                <>
                  <div className="flex items-center space-x-2">
                    <UserIcon className="h-4 w-4" />
                    <span>Ajouté par: {selectedPhoto.uploadedBy}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CalendarIcon className="h-4 w-4" />
                    <span>
                      {(() => {
                        try {
                          if (!selectedPhoto.createdAt) {
                            return 'Date non disponible';
                          }
                          
                          const date = new Date(selectedPhoto.createdAt);
                          if (isNaN(date.getTime())) {
                            return 'Date invalide';
                          }
                          
                          return format(date, 'dd/MM/yyyy à HH:mm', { locale: fr });
                        } catch (error) {
                          console.error('Erreur de formatage de date:', error, 'dateValue:', selectedPhoto.createdAt);
                          return 'Date non disponible';
                        }
                      })()}
                    </span>
                  </div>
                  {selectedPhoto.estPreuve && (
                    <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                      Preuve de résolution
                    </div>
                  )}
                </>
              )}
              
              {selectedPhoto.type === 'sav' && (
                <>
                  <div className="flex items-center space-x-2">
                    <UserIcon className="h-4 w-4" />
                    <span>Prise par: {selectedPhoto.prisePar}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CalendarIcon className="h-4 w-4" />
                    <span>
                      {(() => {
                        try {
                          if (!selectedPhoto.createdAt) {
                            return 'Date non disponible';
                          }
                          
                          const date = new Date(selectedPhoto.createdAt);
                          if (isNaN(date.getTime())) {
                            return 'Date invalide';
                          }
                          
                          return format(date, 'dd/MM/yyyy à HH:mm', { locale: fr });
                        } catch (error) {
                          console.error('Erreur de formatage de date:', error, 'dateValue:', selectedPhoto.createdAt);
                          return 'Date non disponible';
                        }
                      })()}
                    </span>
                  </div>
                  {selectedPhoto.description && (
                    <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-600 rounded-lg">
                      <p className="text-gray-700 dark:text-gray-300">{selectedPhoto.description}</p>
                    </div>
                  )}
                </>
              )}
              
              {selectedPhoto.type === 'chantier' && (
                <>
                  <div className="flex items-center space-x-2">
                    <UserIcon className="h-4 w-4" />
                    <span>Ajouté par: {selectedPhoto.uploadedBy}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CalendarIcon className="h-4 w-4" />
                    <span>
                      {(() => {
                        try {
                          if (!selectedPhoto.createdAt) {
                            return 'Date non disponible';
                          }
                          
                          const date = new Date(selectedPhoto.createdAt);
                          if (isNaN(date.getTime())) {
                            return 'Date invalide';
                          }
                          
                          return format(date, 'dd/MM/yyyy à HH:mm', { locale: fr });
                        } catch (error) {
                          console.error('Erreur de formatage de date:', error, 'dateValue:', selectedPhoto.createdAt);
                          return 'Date non disponible';
                        }
                      })()}
                    </span>
                  </div>
                  {selectedPhoto.metadata?.annotation && (
                    <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-600 rounded-lg">
                      <p className="text-gray-700 dark:text-gray-300">📝 {selectedPhoto.metadata.annotation}</p>
                    </div>
                  )}
                  {/* Tags de la relation Prisma (prioritaires) */}
                  {selectedPhoto.type === 'chantier' && selectedPhoto.tags && selectedPhoto.tags.length > 0 && (
                    <div className="mt-2">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Tags:</span>
                        <button
                          onClick={() => {
                            if (selectedPhoto.type === 'chantier' && selectedPhoto.documentId) {
                              setEditingTags(selectedPhoto.tags?.map(t => t.nom) || [])
                              setEditTagsModal({ show: true, photo: selectedPhoto })
                            }
                          }}
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium flex items-center gap-1"
                        >
                          <PencilIcon className="h-4 w-4" />
                          Modifier
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {selectedPhoto.tags.map((tag, idx) => (
                          <span key={idx} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                            <TagIcon className="h-3 w-3 mr-1" />
                            {tag.nom}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Tags dans metadata (ancien format, à afficher seulement si pas de tags Prisma) */}
                  {selectedPhoto.type === 'chantier' && (!selectedPhoto.tags || selectedPhoto.tags.length === 0) && selectedPhoto.metadata?.tags && selectedPhoto.metadata.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {selectedPhoto.metadata.tags.map((tag, idx) => (
                        <span key={idx} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmation de suppression */}
      {deleteConfirm.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0 w-10 h-10 mx-auto bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                <TrashIcon className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
            
            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Supprimer la photo
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                Êtes-vous sûr de vouloir supprimer <strong>{deleteConfirm.photoName}</strong> ? 
                Cette action est irréversible.
              </p>
              
              <div className="flex space-x-3 justify-center">
                <button
                  onClick={cancelDelete}
                  disabled={deleting}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  onClick={deletePhoto}
                  disabled={deleting}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors disabled:opacity-50 flex items-center"
                >
                  {deleting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Suppression...
                    </>
                  ) : (
                    'Supprimer'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal d'édition des tags */}
      {editTagsModal.show && editTagsModal.photo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Modifier les tags
              </h3>
              <button
                onClick={() => setEditTagsModal({ show: false, photo: null })}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Photo: <strong>{editTagsModal.photo.nom}</strong>
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tags actuels:
              </label>
              <div className="flex flex-wrap gap-2 mb-3">
                {editingTags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                  >
                    {tag}
                    <button
                      onClick={() => setEditingTags(editingTags.filter((_, i) => i !== idx))}
                      className="ml-2 text-blue-600 hover:text-blue-800"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  </span>
                ))}
              </div>
              
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && newTagName.trim()) {
                      e.preventDefault()
                      if (!editingTags.includes(newTagName.trim())) {
                        setEditingTags([...editingTags, newTagName.trim()])
                        setNewTagName('')
                      }
                    }
                  }}
                  placeholder="Ajouter un tag..."
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
                <button
                  onClick={() => {
                    if (newTagName.trim() && !editingTags.includes(newTagName.trim())) {
                      setEditingTags([...editingTags, newTagName.trim()])
                      setNewTagName('')
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  <PlusIcon className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="flex space-x-3 justify-end">
              <button
                onClick={() => setEditTagsModal({ show: false, photo: null })}
                disabled={savingTags}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={async () => {
                  if (!editTagsModal.photo?.documentId || !chantierId) return
                  
                  setSavingTags(true)
                  try {
                    const response = await fetch(
                      `/api/chantiers/${chantierId}/documents/${editTagsModal.photo.documentId}`,
                      {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ tags: editingTags }),
                      }
                    )

                    if (!response.ok) {
                      throw new Error('Erreur lors de la mise à jour des tags')
                    }

                    toast.success('Tags mis à jour avec succès')
                    
                    // Recharger les photos pour afficher les nouveaux tags
                    const fetchAllPhotos = async () => {
                      const responseChantier = await fetch(`/api/chantiers/${chantierId}/documents?type=photo-chantier`)
                      if (responseChantier.ok) {
                        const dataChantier = await responseChantier.json()
                        const documentsList = Array.isArray(dataChantier) ? dataChantier : (dataChantier.documents || [])
                        const photosChantierList: PhotoChantier[] = documentsList.map((doc: {
                          id: string | number
                          nom: string
                          url: string
                          type: string
                          taille: number
                          createdAt: string
                          metadata?: { [key: string]: unknown }
                          User?: { name?: string }
                          tags?: { nom: string }[]
                        }) => ({
                          id: doc.id.toString(),
                          documentId: typeof doc.id === 'number' ? doc.id.toString() : doc.id,
                          nom: doc.nom,
                          url: doc.url,
                          createdAt: doc.createdAt,
                          uploadedBy: doc.User?.name || 'Inconnu',
                          tags: doc.tags || [],
                          metadata: doc.metadata || {}
                        }))
                        setPhotosChantier(photosChantierList)
                      }
                    }
                    await fetchAllPhotos()
                    
                    setEditTagsModal({ show: false, photo: null })
                  } catch (error) {
                    console.error('Erreur:', error)
                    toast.error('Erreur lors de la mise à jour des tags')
                  } finally {
                    setSavingTags(false)
                  }
                }}
                disabled={savingTags}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50 flex items-center"
              >
                {savingTags ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Enregistrement...
                  </>
                ) : (
                  'Enregistrer'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
