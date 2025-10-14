'use client'

import React, { useState, useEffect } from 'react'
import { TrashIcon, EyeIcon, CalendarIcon, UserIcon, DocumentIcon } from '@heroicons/react/24/outline'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

interface PhotoExterne {
  id: string
  uploadedByName: string
  uploadedByType: string
  uploadedByTypeLibelle: string
  urls: string[]
  description?: string
  dateUpload: string
  createdAt: string
}

interface PhotosExternesContentProps {
  chantierId: string
}

export default function PhotosExternesContent({ chantierId }: PhotosExternesContentProps) {
  const [photos, setPhotos] = useState<PhotoExterne[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoExterne | null>(null)

  // Charger les photos externes
  useEffect(() => {
    const fetchPhotos = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/chantiers/${chantierId}/photos-externes`)
        const data = await response.json()
        
        if (data.success) {
          setPhotos(data.photos)
        } else {
          throw new Error(data.error || 'Erreur lors du chargement des photos')
        }
      } catch (error) {
        console.error('Erreur lors du chargement des photos externes:', error)
        setError('Erreur lors du chargement des photos')
      } finally {
        setLoading(false)
      }
    }

    fetchPhotos()
  }, [chantierId])

  // Supprimer une photo
  const handleDeletePhoto = async (photoId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette photo ?')) {
      return
    }

    try {
      setDeleting(photoId)
      const response = await fetch(`/api/photos-externes/${photoId}`, {
        method: 'DELETE'
      })
      
      const data = await response.json()
      
      if (data.success) {
        setPhotos(prev => prev.filter(photo => photo.id !== photoId))
      } else {
        throw new Error(data.error || 'Erreur lors de la suppression')
      }
    } catch (error) {
      console.error('Erreur lors de la suppression:', error)
      alert('Erreur lors de la suppression de la photo')
    } finally {
      setDeleting(null)
    }
  }

  // Ouvrir la modal de visualisation
  const openPhotoModal = (photo: PhotoExterne) => {
    setSelectedPhoto(photo)
  }

  // Fermer la modal
  const closePhotoModal = () => {
    setSelectedPhoto(null)
  }

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

  if (photos.length === 0) {
    return (
      <div className="text-center py-12">
        <DocumentIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune photo externe</h3>
        <p className="text-gray-500">Aucune photo n'a encore été envoyée par les ouvriers ou sous-traitants.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header avec statistiques */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Photos externes</h3>
        <p className="text-sm text-gray-600">
          {photos.length} envoi(s) de photos par les équipes terrain
        </p>
      </div>

      {/* Liste des photos */}
      <div className="space-y-4">
        {photos.map((photo) => (
          <div key={photo.id} className="bg-white border border-gray-200 rounded-lg p-4">
            {/* Header de la photo */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <UserIcon className="h-4 w-4 text-gray-400" />
                  <span className="font-medium text-gray-900">{photo.uploadedByName}</span>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {photo.uploadedByTypeLibelle}
                  </span>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => openPhotoModal(photo)}
                  className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors"
                >
                  <EyeIcon className="h-4 w-4 mr-1" />
                  Voir
                </button>
                <button
                  onClick={() => handleDeletePhoto(photo.id)}
                  disabled={deleting === photo.id}
                  className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {deleting === photo.id ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600 mr-1"></div>
                  ) : (
                    <TrashIcon className="h-4 w-4 mr-1" />
                  )}
                  Supprimer
                </button>
              </div>
            </div>

            {/* Informations de la photo */}
            <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
              <div className="flex items-center space-x-1">
                <CalendarIcon className="h-4 w-4" />
                <span>
                  {format(new Date(photo.dateUpload), 'dd/MM/yyyy à HH:mm', { locale: fr })}
                </span>
              </div>
              <div className="flex items-center space-x-1">
                <DocumentIcon className="h-4 w-4" />
                <span>{photo.urls.length} photo(s)</span>
              </div>
            </div>

            {/* Description */}
            {photo.description && (
              <div className="mb-3">
                <p className="text-sm text-gray-700 bg-gray-50 rounded p-3">
                  {photo.description}
                </p>
              </div>
            )}

            {/* Aperçu des photos */}
            <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
              {photo.urls.slice(0, 6).map((url, index) => (
                <div
                  key={index}
                  className="aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => openPhotoModal(photo)}
                >
                  <img
                    src={url}
                    alt={`Photo ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
              {photo.urls.length > 6 && (
                <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
                  <span className="text-sm font-medium text-gray-600">
                    +{photo.urls.length - 6}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modal de visualisation */}
      {selectedPhoto && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-hidden">
            {/* Header de la modal */}
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h3 className="text-lg font-semibold">Photos de {selectedPhoto.uploadedByName}</h3>
                <p className="text-sm text-gray-600">
                  {format(new Date(selectedPhoto.dateUpload), 'dd/MM/yyyy à HH:mm', { locale: fr })} • 
                  {selectedPhoto.uploadedByTypeLibelle}
                </p>
              </div>
              <button
                onClick={closePhotoModal}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            {/* Contenu de la modal */}
            <div className="p-4 max-h-[calc(90vh-120px)] overflow-y-auto">
              {selectedPhoto.description && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-700">{selectedPhoto.description}</p>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedPhoto.urls.map((url, index) => (
                  <div key={index} className="bg-gray-100 rounded-lg overflow-hidden">
                    <img
                      src={url}
                      alt={`Photo ${index + 1}`}
                      className="w-full h-auto"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


