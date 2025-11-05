'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import { useSelectedChantier } from '@/contexts/SelectedChantierContext'
import { BottomNav } from '@/components/mobile/BottomNav'
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
  const [preview, setPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!selectedChantier) {
      router.push('/mobile')
      return
    }
    loadPhotos()
  }, [selectedChantier, router])

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
        const photosInterne = data.filter((doc: any) => {
          const tags = doc.tags || []
          return tags.some((tag: any) => 
            tag.nom?.toLowerCase() === 'interne' || 
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !selectedChantier) return

    // Créer une prévisualisation
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleUpload = async () => {
    if (!fileInputRef.current?.files?.[0] || !selectedChantier || !preview) return

    const file = fileInputRef.current.files[0]

    try {
      setUploading(true)

      const formData = new FormData()
      formData.append('file', file)
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
        throw new Error('Erreur lors de l\'upload')
      }

      // Réinitialiser et recharger
      setPreview(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      await loadPhotos()
    } catch (error) {
      console.error('Erreur lors de l\'upload:', error)
      alert('Erreur lors de l\'upload de la photo')
    } finally {
      setUploading(false)
    }
  }

  const handleCancelPreview = () => {
    setPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
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
        {/* Bouton d'upload */}
        <div className="mb-6">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileSelect}
            className="hidden"
          />

          {!preview ? (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-3 p-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium shadow-lg hover:from-blue-700 hover:to-indigo-700 transition-colors"
            >
              <CameraIcon className="h-6 w-6" />
              <span>Prendre une photo</span>
            </button>
          ) : (
            <div className="space-y-3">
              <div className="relative">
                <img
                  src={preview}
                  alt="Preview"
                  className="w-full h-64 object-cover rounded-xl"
                />
                <button
                  onClick={handleCancelPreview}
                  className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
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
                  {uploading ? 'Envoi...' : 'Enregistrer'}
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

