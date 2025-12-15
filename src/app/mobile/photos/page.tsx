'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import { useSelectedChantier } from '@/contexts/SelectedChantierContext'
import { BottomNav } from '@/components/mobile/BottomNav'
import { compressImages } from '@/lib/utils/image-compression'
import {
  CameraIcon,
  ArrowLeftIcon,
  PhotoIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'

interface Photo {
  id: number
  nom: string
  url: string
  createdAt: string
}

export default function MobilePhotosPage() {
  const router = useRouter()
  const { selectedChantier } = useSelectedChantier()
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [compressing, setCompressing] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [selectedPhotos, setSelectedPhotos] = useState<Array<{ id: string; file: File; preview: string }>>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!selectedChantier) {
      router.push('/mobile')
      return
    }
    loadPhotos()
  }, [selectedChantier, router]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadPhotos = async () => {
    if (!selectedChantier) return

    try {
      setLoading(true)
      // Charger les photos depuis l'API documents avec filtre type=photo-chantier et tag=Interne
      const response = await fetch(
        `/api/chantiers/${selectedChantier.chantierId}/documents?type=photo-chantier`
      )
      if (response.ok) {
        const data = await response.json()
        // Filtrer seulement les photos avec tag "Interne"
        interface DocumentTag {
          nom: string
        }
        interface DocumentFromAPI {
          id: number
          nom: string
          url: string
          createdAt: string
          tags?: DocumentTag[] | string[]
          metadata?: string | { annotation?: string }
        }
        const photosInterne = data.filter((doc: DocumentFromAPI) => {
          const tags = doc.tags || []
          return tags.some((tag: DocumentTag | string) => 
            (typeof tag === 'object' && tag.nom?.toLowerCase() === 'interne') || 
            (typeof tag === 'string' && tag.toLowerCase() === 'interne')
          )
        })
        setPhotos(photosInterne)
      }
    } catch (error) {
      console.error('Erreur lors du chargement des photos:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || !selectedChantier) return

    try {
      setCompressing(true)
      
      // Convertir FileList en tableau
      const fileArray = Array.from(files)
      
      // Compresser les images (max 1920px, qualité 0.8)
      const compressedFiles = await compressImages(fileArray, 1920, 1920, 0.8)
      
      // Créer les prévisualisations avec les fichiers compressés
      const newPhotos: Array<{ id: string; file: File; preview: string }> = []
      
      compressedFiles.forEach((file) => {
        const id = Math.random().toString(36).substring(2, 9)
        const preview = URL.createObjectURL(file)
        newPhotos.push({ id, file, preview })
      })

      setSelectedPhotos((prev) => [...prev, ...newPhotos])

      // Réinitialiser l'input pour permettre de sélectionner à nouveau
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      if (cameraInputRef.current) {
        cameraInputRef.current.value = ''
      }
    } catch (error) {
      console.error('Erreur lors de la compression:', error)
      // En cas d'erreur, utiliser les fichiers originaux
      const newPhotos: Array<{ id: string; file: File; preview: string }> = []
      Array.from(files).forEach((file) => {
        const id = Math.random().toString(36).substring(2, 9)
        const preview = URL.createObjectURL(file)
        newPhotos.push({ id, file, preview })
      })
      setSelectedPhotos((prev) => [...prev, ...newPhotos])
    } finally {
      setCompressing(false)
    }
  }

  const handleRemovePhoto = (id: string) => {
    setSelectedPhotos((prev) => {
      const photo = prev.find((p) => p.id === id)
      if (photo) {
        URL.revokeObjectURL(photo.preview)
      }
      return prev.filter((p) => p.id !== id)
    })
  }

  const handleUpload = async () => {
    if (selectedPhotos.length === 0 || !selectedChantier) return

    try {
      setUploading(true)
      setErrorMessage(null)

      // Uploader les photos par batch de 3 pour éviter de surcharger la connexion
      const BATCH_SIZE = 3
      const batches: Array<Array<{ id: string; file: File; preview: string }>> = []
      
      for (let i = 0; i < selectedPhotos.length; i += BATCH_SIZE) {
        batches.push(selectedPhotos.slice(i, i + BATCH_SIZE))
      }

      for (const batch of batches) {
        const uploadPromises = batch.map(async (photo) => {
          const formData = new FormData()
          formData.append('file', photo.file)
          formData.append('type', 'photo-chantier')
          formData.append('tagsJsonString', JSON.stringify(['Interne']))
          formData.append('metadata', JSON.stringify({ source: 'photo-interne' }))

          const response = await fetch(
            `/api/chantiers/${selectedChantier.chantierId}/documents`,
            {
              method: 'POST',
              body: formData,
            }
          )

          if (!response.ok) {
            throw new Error(`Erreur lors de l'upload de ${photo.file.name}`)
          }

          return response.json()
        })

        await Promise.all(uploadPromises)
      }

      // Nettoyer les URLs des prévisualisations
      selectedPhotos.forEach((photo) => {
        URL.revokeObjectURL(photo.preview)
      })

      // Réinitialiser et recharger
      setSelectedPhotos([])
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      if (cameraInputRef.current) {
        cameraInputRef.current.value = ''
      }
      await loadPhotos()
    } catch (error) {
      console.error('Erreur lors de l\'upload:', error)
      setErrorMessage(error instanceof Error ? error.message : 'Erreur lors de l\'upload des photos')
    } finally {
      setUploading(false)
    }
  }

  const handleCancelPreview = () => {
    // Nettoyer les URLs des prévisualisations
    selectedPhotos.forEach((photo) => {
      URL.revokeObjectURL(photo.preview)
    })
    setSelectedPhotos([])
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    if (cameraInputRef.current) {
      cameraInputRef.current.value = ''
    }
  }

  if (!selectedChantier) {
    return null
  }

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
            <h1 className="text-xl font-black">Photos</h1>
            <div className="w-10"></div>
          </div>
          <p className="text-sm text-blue-100">{selectedChantier.nomChantier}</p>
        </div>
      </div>

      {/* Contenu */}
      <div className="max-w-md mx-auto px-4 py-6">
        {errorMessage && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {errorMessage}
          </div>
        )}
        {/* Bouton d'upload */}
        <div className="mb-6">
          {/* Input pour la photothèque (multiple) */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          
          {/* Input pour l'appareil photo (sans multiple) */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileSelect}
            className="hidden"
          />

          {selectedPhotos.length === 0 ? (
            <div className="flex gap-3">
              <button
                onClick={() => cameraInputRef.current?.click()}
                disabled={compressing}
                className="flex-1 flex items-center justify-center gap-2 p-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium shadow-lg hover:from-blue-700 hover:to-indigo-700 transition-colors disabled:opacity-50"
              >
                {compressing ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span className="text-sm">Compression...</span>
                  </>
                ) : (
                  <>
                    <CameraIcon className="h-5 w-5" />
                    <span className="text-sm">Prendre une photo</span>
                  </>
                )}
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={compressing}
                className="flex-1 flex items-center justify-center gap-2 p-4 bg-blue-50 border-2 border-blue-200 rounded-xl text-blue-600 font-medium hover:bg-blue-100 transition-colors disabled:opacity-50"
              >
                {compressing ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                    <span className="text-sm">Compression...</span>
                  </>
                ) : (
                  <>
                    <PhotoIcon className="h-5 w-5" />
                    <span className="text-sm">Photothèque</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Grille de prévisualisations */}
              <div className="grid grid-cols-2 gap-3">
                {selectedPhotos.map((photo) => (
                  <div key={photo.id} className="relative aspect-square rounded-xl overflow-hidden bg-gray-100">
                    <img
                      src={photo.preview}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={() => handleRemovePhoto(photo.id)}
                      className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors shadow-lg"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
              
              {/* Boutons pour ajouter plus de photos */}
              <div className="flex gap-3">
                <button
                  onClick={() => cameraInputRef.current?.click()}
                  disabled={compressing}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 transition-colors disabled:opacity-50"
                >
                  {compressing ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span className="text-sm">Compression...</span>
                    </>
                  ) : (
                    <>
                      <CameraIcon className="h-5 w-5" />
                      <span className="text-sm">Prendre une photo</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={compressing}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 border-2 border-blue-200 rounded-xl text-blue-600 font-medium hover:bg-blue-100 transition-colors disabled:opacity-50"
                >
                  {compressing ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                      <span className="text-sm">Compression...</span>
                    </>
                  ) : (
                    <>
                      <PhotoIcon className="h-5 w-5" />
                      <span className="text-sm">Photothèque</span>
                    </>
                  )}
                </button>
              </div>

              {/* Boutons d'action */}
              <div className="flex gap-3">
                <button
                  onClick={handleCancelPreview}
                  className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-300 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 transition-colors disabled:opacity-50"
                >
                  {uploading ? `Envoi (${selectedPhotos.length})...` : `Enregistrer ${selectedPhotos.length} photo${selectedPhotos.length > 1 ? 's' : ''}`}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Liste des photos */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Chargement des photos...</p>
          </div>
        ) : photos.length === 0 ? (
          <div className="text-center py-12">
            <PhotoIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 font-medium">Aucune photo</p>
            <p className="text-sm text-gray-500 mt-1">Prenez votre première photo</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {photos.map((photo) => (
              <div
                key={photo.id}
                className="relative aspect-square rounded-xl overflow-hidden bg-gray-100"
              >
                <img
                  src={photo.url}
                  alt={photo.nom}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  decoding="async"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.src = '/placeholder-image.png'
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  )
}

