'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { 
  PhotoIcon, 
  XMarkIcon
} from '@heroicons/react/24/outline'
import { TypePhotoSAV, LABELS_TYPE_PHOTO_SAV } from '@/types/sav'
// import { Button } from '@/components/ui'

interface PhotoUploadProps {
  onPhotosChange: (photos: PhotoFile[]) => void
  existingPhotos?: PhotoFile[]
  maxPhotos?: number
}

export interface PhotoFile {
  id?: string
  file?: File
  url: string
  description?: string
  type: TypePhotoSAV
  preview?: string
}

export default function PhotoUpload({ 
  onPhotosChange, 
  existingPhotos = [], 
  maxPhotos = 10
}: PhotoUploadProps) {
  const [photos, setPhotos] = useState<PhotoFile[]>(existingPhotos)
  const [isDragging, setIsDragging] = useState(false)
  // const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (files: FileList) => {
    const newPhotos: PhotoFile[] = []
    
    Array.from(files).forEach(file => {
      if (file.type.startsWith('image/') && photos.length + newPhotos.length < maxPhotos) {
        const preview = URL.createObjectURL(file)
        newPhotos.push({
          id: `temp-${Date.now()}-${Math.random()}`,
          file,
          url: preview,
          preview,
          type: TypePhotoSAV.CONSTAT,
          description: ''
        })
      }
    })

    const updatedPhotos = [...photos, ...newPhotos]
    setPhotos(updatedPhotos)
    onPhotosChange(updatedPhotos)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    if (e.dataTransfer.files) {
      handleFileSelect(e.dataTransfer.files)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const removePhoto = (index: number) => {
    const photo = photos[index]
    if (photo.preview) {
      URL.revokeObjectURL(photo.preview)
    }
    
    const updatedPhotos = photos.filter((_, i) => i !== index)
    setPhotos(updatedPhotos)
    onPhotosChange(updatedPhotos)
  }

  const updatePhotoDetails = (index: number, field: keyof PhotoFile, value: string | TypePhotoSAV) => {
    const updatedPhotos = photos.map((photo, i) => 
      i === index ? { ...photo, [field]: value } : photo
    )
    setPhotos(updatedPhotos)
    onPhotosChange(updatedPhotos)
  }

  return (
    <div className="space-y-4">
      {/* Zone d'upload */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          isDragging 
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <PhotoIcon className="mx-auto h-12 w-12 text-gray-400" />
        <div className="mt-2">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Glissez-déposez vos photos ici ou{' '}
            <button
              type="button"
              className="text-blue-600 hover:text-blue-500 underline"
              onClick={() => fileInputRef.current?.click()}
            >
              parcourez
            </button>
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            PNG, JPG, JPEG jusqu&apos;à 10MB ({photos.length}/{maxPhotos} photos)
          </p>
        </div>
        
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
        />
      </div>

      {/* Liste des photos */}
      {photos.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Photos ajoutées ({photos.length})
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {photos.map((photo, index) => (
              <div key={photo.id || index} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 p-4">
                <div className="flex items-start space-x-4">
                  {/* Miniature */}
                  <div className="relative flex-shrink-0">
                    <Image
                      src={photo.url}
                      alt={`Photo ${index + 1}`}
                      className="w-20 h-20 object-cover rounded-lg"
                      width={80}
                      height={80}
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(index)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  </div>
                  
                  {/* Détails */}
                  <div className="flex-1 space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Type de photo
                      </label>
                      <select
                        value={photo.type}
                        onChange={(e) => updatePhotoDetails(index, 'type', e.target.value as TypePhotoSAV)}
                        className="w-full text-sm p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      >
                        {Object.values(TypePhotoSAV).map(type => (
                          <option key={type} value={type}>
                            {LABELS_TYPE_PHOTO_SAV[type]}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Description
                      </label>
                      <textarea
                        rows={2}
                        value={photo.description || ''}
                        onChange={(e) => updatePhotoDetails(index, 'description', e.target.value)}
                        placeholder="Description de la photo..."
                        className="w-full text-sm p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
} 