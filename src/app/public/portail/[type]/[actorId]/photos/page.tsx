'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { ArrowLeftIcon, CameraIcon, DocumentPlusIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { PortalI18nProvider, usePortalI18n } from '../../../i18n'

interface Chantier {
  id: string
  nomChantier: string
  statut: string
  statutLibelle: string
  clientNom?: string
}

interface UploadResponse {
  success: boolean
  photoId?: string
  uploadedCount?: number
  message?: string
  error?: string
}

function InnerPhotosPage(props: { params: { type: 'ouvrier'|'soustraitant'; actorId: string } }) {
  const { type, actorId } = props.params
  const router = useRouter()
  const { t } = usePortalI18n()
  const [error, setError] = useState<string | null>(null)
  const [_loading, _setLoading] = useState(false)
  
  // Données de session
  const [sessionData, setSessionData] = useState<{
    subjectType: 'OUVRIER_INTERNE' | 'SOUSTRAITANT'
    subjectId: string
    subjectName: string
  } | null>(null)

  // Vérifier la session au chargement
  useEffect(() => {
    const checkSession = async () => {
      // En développement, vérifier localStorage d'abord
      if (process.env.NODE_ENV !== 'production') {
        const localSession = localStorage.getItem('portalSession')
        if (localSession) {
          const [sessionSubjectType, sessionActorId] = localSession.split(':')
          const expectedSubjectType = type === 'ouvrier' ? 'OUVRIER_INTERNE' : 'SOUSTRAITANT'
          
          if (sessionSubjectType === expectedSubjectType && sessionActorId === actorId) {
            // Créer les données de session depuis localStorage
            const mockToken = {
              subjectType: sessionSubjectType as 'OUVRIER_INTERNE' | 'SOUSTRAITANT',
              subjectId: sessionActorId,
              subjectName: 'Utilisateur connecté' // Nom par défaut
            }
            setSessionData(mockToken)
            await loadChantiers(mockToken)
            return
          }
        }
      }
      
      try {
        const response = await fetch('/api/public/portail/login', {
          method: 'GET',
          credentials: 'include'
        })
        
        if (response.ok) {
          const data = await response.json()
          if (data.authenticated && data.token) {
            // Vérifier que le token correspond au type et actorId actuels
            if (data.token.subjectType === (type === 'ouvrier' ? 'OUVRIER_INTERNE' : 'SOUSTRAITANT') && 
                data.token.subjectId === actorId) {
              setSessionData(data.token)
              await loadChantiers(data.token)
              return
            }
          }
        }
        
        // Si pas de session, rediriger vers la page de connexion
        console.log('Pas de session valide, redirection vers le portail')
        router.push(`/public/portail/${type}/${actorId}`)
        
      } catch (error) {
        console.log('Erreur lors de la vérification de session:', error)
        router.push(`/public/portail/${type}/${actorId}`)
      }
    }

    checkSession()
  }, [type, actorId, router])
  
  // Données du formulaire
  const [chantiers, setChantiers] = useState<Chantier[]>([])
  const [selectedChantierId, setSelectedChantierId] = useState('')
  const [description, setDescription] = useState('')
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [previewUrls, setPreviewUrls] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<UploadResponse | null>(null)

  // Charger les chantiers disponibles
  const loadChantiers = async (token?: { subjectType: 'OUVRIER_INTERNE' | 'SOUSTRAITANT', subjectId: string, subjectName: string }) => {
    if (!token) return
    
    try {
      const res = await fetch(`/api/public/photos/chantiers?uploadedBy=${token.subjectId}&uploadedByType=${token.subjectType}`)
      const data = await res.json()
      
      if (data.success) {
        setChantiers(data.chantiers)
      } else {
        throw new Error(data.error || 'Erreur lors du chargement des chantiers')
      }
    } catch (error) {
      console.error('Erreur lors du chargement des chantiers:', error)
      setError('Erreur lors du chargement des chantiers')
    }
  }

  // Gestion des fichiers
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    
    // Filtrer seulement les images
    const imageFiles = files.filter(file => file.type.startsWith('image/'))
    
    // Limiter à 20 photos
    const limitedFiles = imageFiles.slice(0, 20)
    
    setSelectedFiles(limitedFiles)
    
    // Créer les URLs de prévisualisation
    const urls = limitedFiles.map(file => URL.createObjectURL(file))
    setPreviewUrls(urls)
    
    // Nettoyer les anciennes URLs
    previewUrls.forEach(url => URL.revokeObjectURL(url))
  }

  // Upload des photos
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!sessionData || !selectedChantierId || selectedFiles.length === 0) {
      setError('Veuillez sélectionner un chantier et au moins une photo')
      return
    }
    
    setUploading(true)
    setError(null)
    
    try {
      const formData = new FormData()
      formData.append('chantierId', selectedChantierId)
      formData.append('uploadedBy', sessionData.subjectId)
      formData.append('uploadedByType', sessionData.subjectType)
      formData.append('uploadedByName', sessionData.subjectName)
      
      if (description.trim()) {
        formData.append('description', description.trim())
      }
      
      selectedFiles.forEach(file => {
        formData.append('photos', file)
      })
      
      const res = await fetch('/api/public/photos/upload', {
        method: 'POST',
        body: formData
      })
      
      const data: UploadResponse = await res.json()
      
      if (data.success) {
        setUploadResult(data)
        // Réinitialiser le formulaire
        setSelectedChantierId('')
        setDescription('')
        setSelectedFiles([])
        setPreviewUrls([])
        // Nettoyer l'input file
        const fileInput = document.getElementById('photos') as HTMLInputElement
        if (fileInput) fileInput.value = ''
      } else {
        throw new Error(data.error || 'Erreur lors de l\'upload')
      }
      
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur lors de l\'upload'
      setError(message)
    } finally {
      setUploading(false)
    }
  }

  // Nettoyer les URLs de prévisualisation
  useEffect(() => {
    return () => {
      previewUrls.forEach(url => URL.revokeObjectURL(url))
    }
  }, [previewUrls])

  if (!sessionData) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">{t('loading')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 px-4 py-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <div className="h-12 w-12 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center mr-4">
              <CameraIcon className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('photos_title')}</h1>
              <p className="text-gray-600 dark:text-gray-400">{t('connect')} {sessionData?.subjectName}</p>
            </div>
          </div>
          <button
            onClick={() => router.push(`/public/portail/${type}/${actorId}`)}
            className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg px-4 py-2 flex items-center text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            {t('back_to_portal')}
          </button>
        </div>

        {/* Formulaire d'upload */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 mb-6 shadow-lg border border-purple-200 dark:border-purple-700">
          {/* Header du formulaire */}
          <div className="flex items-center mb-6">
            <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center mr-3">
              <DocumentPlusIcon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('photos_form_title')}</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('photos_form_subtitle')}</p>
            </div>
          </div>
          
          <form onSubmit={handleUpload} className="space-y-6">
            {/* Sélection du chantier */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                {t('chantier_required')}
              </label>
              <select
                value={selectedChantierId}
                onChange={(e) => setSelectedChantierId(e.target.value)}
                className="w-full rounded-lg px-3 py-3 text-gray-900 dark:text-white bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                required
              >
                <option value="">{t('chantier_select_placeholder')}</option>
                {chantiers.map((chantier) => (
                  <option key={chantier.id} value={chantier.id}>
                    {chantier.nomChantier} ({chantier.statutLibelle})
                    {chantier.clientNom && ` - ${chantier.clientNom}`}
                  </option>
                ))}
              </select>
            </div>

            {/* Sélection des photos */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                {t('photos_label')}
              </label>
              <div className="border-2 border-dashed border-purple-300 dark:border-purple-600 rounded-lg p-6 text-center hover:border-purple-500 dark:hover:border-purple-400 transition-colors bg-purple-50 dark:bg-purple-900/20">
                <input
                  id="photos"
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <label htmlFor="photos" className="cursor-pointer">
                  <DocumentPlusIcon className="h-12 w-12 mx-auto mb-2 text-gray-400 dark:text-gray-500" />
                  <p className="text-gray-700 dark:text-gray-300">{t('click_to_select_photos')}</p>
                  <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{t('or_drag_drop')}</p>
                </label>
              </div>
              {selectedFiles.length > 0 && (
                <p className="text-sm text-purple-600 dark:text-purple-400 mt-2">
                  {selectedFiles.length} {t('selected_photos_count')}
                </p>
              )}
            </div>

            {/* Prévisualisation des photos */}
            {previewUrls.length > 0 && (
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  {t('preview_label')} ({previewUrls.length} {t('selected_photos_count')})
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {previewUrls.map((url, index) => (
                    <div key={index} className="relative">
                      <Image
                        src={url}
                        alt={`preview-${index + 1}`}
                        width={200}
                        height={96}
                        className="w-full h-24 object-cover rounded-lg border border-gray-200 dark:border-gray-600"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Description optionnelle */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                {t('description_optional')}
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-lg px-3 py-3 text-gray-900 dark:text-white bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                rows={3}
                placeholder={t('description_placeholder')}
              />
            </div>

            {/* Bouton d'envoi */}
            <button
              type="submit"
              disabled={uploading || !selectedChantierId || selectedFiles.length === 0}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-lg py-3 font-medium disabled:opacity-60 flex items-center justify-center transition-colors"
            >
              {uploading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  {t('uploading')}
                </>
              ) : (
                <>
                  <CameraIcon className="h-5 w-5 mr-2" />
                  {t('send_photos')}
                </>
              )}
            </button>
          </form>

          {/* Messages d'erreur */}
          {error && (
            <div className="mt-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-center">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-600 dark:text-red-400 mr-2" />
              <span className="text-red-800 dark:text-red-200">{error}</span>
            </div>
          )}

          {/* Message de succès */}
          {uploadResult && (
            <div className="mt-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-center">
              <CheckCircleIcon className="h-5 w-5 text-green-600 dark:text-green-400 mr-2" />
              <span className="text-green-800 dark:text-green-200">{uploadResult.message}</span>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-purple-200 dark:border-purple-700">
          <div className="flex items-center mb-4">
            <div className="h-8 w-8 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center mr-3">
              <CheckCircleIcon className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('instructions')}</h3>
          </div>
          <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
            <li>{t('instruction_select_site')}</li>
            <li>{t('instruction_up_to_20')}</li>
            <li>{t('instruction_compressed')}</li>
            <li>{t('instruction_notification')}</li>
            <li>{t('instruction_visible')}</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default function PhotosPage(props: { params: Promise<{ type: 'ouvrier'|'soustraitant'; actorId: string }> }) {
  const p = React.use(props.params)
  return (
    <PortalI18nProvider>
      <InnerPhotosPage params={p} />
    </PortalI18nProvider>
  )
}
