'use client'

import React, { useState, useEffect } from 'react'
import { CameraIcon, CloudArrowUpIcon, XMarkIcon, TrashIcon } from '@heroicons/react/24/outline'
import PhotosContent from './PhotosContent'
import toast from 'react-hot-toast'
import { useNotification } from '@/hooks/useNotification'

interface PhotosTabContentProps {
  chantierId: string
}

interface UploadedFile {
  file: File
  preview: string
  id: string
}

export default function PhotosTabContent({ chantierId }: PhotosTabContentProps) {
  const { showNotification, NotificationComponent } = useNotification()
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [description, setDescription] = useState('')
  const [dragActive, setDragActive] = useState(false)
  const [photosCount, setPhotosCount] = useState(0)

  // Charger le nombre de photos de chantier
  useEffect(() => {
    const loadPhotosCount = async () => {
      try {
        const response = await fetch(`/api/chantiers/${chantierId}/documents?type=photo-chantier`)
        if (response.ok) {
          const data = await response.json()
          const documentsList = Array.isArray(data) ? data : (data.documents || [])
          setPhotosCount(documentsList.length)
        }
      } catch (error) {
        console.error('Erreur lors du chargement du nombre de photos:', error)
      }
    }
    loadPhotosCount()
  }, [chantierId])

  // Gestion du drag & drop
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files)
    }
  }

  // Gestion de la sélection de fichiers
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files)
    }
  }

  const handleFiles = (files: FileList) => {
    const newFiles: UploadedFile[] = []
    
    Array.from(files).forEach((file) => {
      // Vérifier le type de fichier
      if (!file.type.startsWith('image/')) {
        showNotification('Erreur', `Le fichier ${file.name} n'est pas une image valide.`, 'error')
        return
      }

      // Vérifier la taille (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        showNotification('Erreur', `Le fichier ${file.name} est trop volumineux (max 10MB).`, 'error')
        return
      }

      const id = Math.random().toString(36).substr(2, 9)
      const preview = URL.createObjectURL(file)
      
      newFiles.push({
        file,
        preview,
        id
      })
    })

    setUploadedFiles(prev => [...prev, ...newFiles])
  }

  // Supprimer un fichier de la liste
  const removeFile = (id: string) => {
    setUploadedFiles(prev => {
      const fileToRemove = prev.find(f => f.id === id)
      if (fileToRemove) {
        URL.revokeObjectURL(fileToRemove.preview)
      }
      return prev.filter(f => f.id !== id)
    })
  }

  // Upload des photos
  const uploadPhotos = async () => {
    if (uploadedFiles.length === 0) {
      showNotification('Attention', 'Veuillez sélectionner au moins une photo à uploader.', 'warning')
      return
    }

    try {
      setUploading(true)
      setUploadProgress(0)

      const formData = new FormData()
      
      // Ajouter les fichiers
      uploadedFiles.forEach((uploadedFile) => {
        formData.append('photos', uploadedFile.file)
      })

      // Ajouter la description si fournie
      if (description.trim()) {
        formData.append('description', description.trim())
      }

      // Ajouter le chantierId
      formData.append('chantierId', chantierId)

      // Simuler le progrès
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return prev
          }
          return prev + 10
        })
      }, 200)

      const response = await fetch('/api/chantiers/photos/upload', {
        method: 'POST',
        body: formData,
      })

      clearInterval(progressInterval)
      setUploadProgress(100)

      if (!response.ok) {
        throw new Error('Erreur lors de l\'upload')
      }

      const result = await response.json()

      if (result.success) {
        // Nettoyer les URLs d'aperçu
        uploadedFiles.forEach(file => {
          URL.revokeObjectURL(file.preview)
        })
        
        // Réinitialiser le formulaire
        setUploadedFiles([])
        setDescription('')
        
        showNotification('Succès', `${result.uploadedCount} photo(s) uploadée(s) avec succès !`, 'success')
        
        // Recharger la page pour voir les nouvelles photos
        window.location.reload()
      } else {
        throw new Error(result.error || 'Erreur lors de l\'upload')
      }

    } catch (error) {
      console.error('Erreur lors de l\'upload:', error)
      showNotification('Erreur', `Erreur lors de l'upload: ${error instanceof Error ? error.message : 'Erreur inconnue'}`, 'error')
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  return (
    <div className="space-y-6">
      {/* Zone de drag & drop (toujours visible) */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
        {/* Zone de drag & drop */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive
                ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <CameraIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" />
            <div className="space-y-2">
              <p className="text-lg font-medium text-gray-900 dark:text-white">
                Glissez-déposez vos photos ici
              </p>
              <p className="text-gray-500 dark:text-gray-400">
                ou{' '}
                <label className="text-green-600 dark:text-green-400 hover:text-green-500 cursor-pointer font-medium">
                  cliquez pour sélectionner
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileInput}
                    className="hidden"
                  />
                </label>
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500">
                PNG, JPG, JPEG jusqu'à 10MB par fichier
              </p>
            </div>
          </div>

          {/* Description */}
          {uploadedFiles.length > 0 && (
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description (optionnelle)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ajoutez une description pour ces photos..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:text-white"
                rows={3}
              />
            </div>
          )}

          {/* Liste des fichiers sélectionnés */}
          {uploadedFiles.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Photos sélectionnées ({uploadedFiles.length})
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {uploadedFiles.map((uploadedFile) => (
                  <div key={uploadedFile.id} className="relative group">
                    <div className="aspect-square bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                      <img
                        src={uploadedFile.preview}
                        alt="Aperçu"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <button
                      onClick={() => removeFile(uploadedFile.id)}
                      className="absolute top-2 right-2 p-1 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Supprimer"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 truncate">
                      {uploadedFile.file.name}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bouton d'upload et barre de progression */}
          {uploadedFiles.length > 0 && (
            <div className="mt-6">
              {/* Barre de progression */}
              {uploading && (
                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
                    <span>Upload en cours...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {/* Bouton d'upload */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => {
                    setUploadedFiles([])
                    setDescription('')
                  }}
                  disabled={uploading}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors disabled:opacity-50"
                >
                  Réinitialiser
                </button>
                
                <button
                  onClick={uploadPhotos}
                  disabled={uploading || uploadedFiles.length === 0}
                  className="flex items-center px-6 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Upload en cours...
                    </>
                  ) : (
                    <>
                      <CloudArrowUpIcon className="h-4 w-4 mr-2" />
                      Uploader {uploadedFiles.length} photo{uploadedFiles.length > 1 ? 's' : ''}
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

      {/* Bouton pour vider toutes les photos */}
      {photosCount > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                Photos de chantier dans la base de données
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {photosCount} photo{photosCount > 1 ? 's' : ''} trouvée{photosCount > 1 ? 's' : ''}
              </p>
            </div>
            <button
              onClick={async () => {
                if (!window.confirm(`Êtes-vous sûr de vouloir supprimer toutes les ${photosCount} photos de chantier ? Cette action est irréversible.`)) {
                  return
                }
                
                try {
                  const response = await fetch(`/api/chantiers/${chantierId}/documents/cleanup-photos`, {
                    method: 'POST',
                  })
                  
                  if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ error: 'Erreur inconnue' }))
                    throw new Error(errorData.error || 'Erreur lors de la suppression')
                  }
                  
                  const result = await response.json()
                  toast.success(`✅ ${result.deleted || result.message || 'Toutes les photos ont été supprimées'}`)
                  
                  setPhotosCount(0)
                  
                  // Recharger la page après un court délai
                  setTimeout(() => {
                    window.location.reload()
                  }, 1000)
                } catch (error) {
                  console.error('Erreur:', error)
                  const errorMessage = error instanceof Error ? error.message : 'Erreur lors de la suppression des photos'
                  toast.error(`❌ ${errorMessage}`)
                }
              }}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
            >
              <TrashIcon className="h-4 w-4 mr-2" />
              Vider toutes les photos ({photosCount})
            </button>
          </div>
        </div>
      )}

      {/* Affichage de toutes les photos */}
      <PhotosContent chantierId={chantierId} />
      <NotificationComponent />
    </div>
  )
}
