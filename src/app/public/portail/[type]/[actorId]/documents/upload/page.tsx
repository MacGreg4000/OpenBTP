'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { 
  ArrowLeftIcon, 
  CameraIcon,
  PhotoIcon,
  XMarkIcon,
  ArrowUpTrayIcon,
  CheckCircleIcon,
  DocumentArrowUpIcon
} from '@heroicons/react/24/outline'
import { PortalI18nProvider, usePortalI18n } from '../../../../i18n'

interface UploadResponse {
  message?: string
  document?: {
    id: string
    nom: string
    url: string
    tags: string[]
  }
  error?: string
}

function InnerDocumentsPage(props: { params: { type: 'ouvrier'|'soustraitant'; actorId: string } }) {
  const { type, actorId } = props.params
  const router = useRouter()
  const [_t] = usePortalI18n()
  const [error, setError] = useState<string | null>(null)
  
  // Données de session
  const [sessionData, setSessionData] = useState<{
    subjectType: 'OUVRIER_INTERNE' | 'SOUSTRAITANT'
    subjectId: string
    subjectName: string
  } | null>(null)

  // État du formulaire
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [nomDocument, setNomDocument] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

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
            const mockToken = {
              subjectType: sessionSubjectType as 'OUVRIER_INTERNE' | 'SOUSTRAITANT',
              subjectId: sessionActorId,
              subjectName: 'Utilisateur connecté'
            }
            setSessionData(mockToken)
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
            if (data.token.subjectType === (type === 'ouvrier' ? 'OUVRIER_INTERNE' : 'SOUSTRAITANT') && 
                data.token.subjectId === actorId) {
              setSessionData(data.token)
              return
            }
          }
        }
        
        router.push(`/public/portail/${type}/${actorId}`)
      } catch (error) {
        console.log('Erreur lors de la vérification de session:', error)
        router.push(`/public/portail/${type}/${actorId}`)
      }
    }

    checkSession()
  }, [type, actorId, router])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onloadend = () => {
          setPreview(reader.result as string)
        }
        reader.readAsDataURL(file)
      } else {
        setPreview(null)
      }
    }
  }

  const handleTakePhoto = () => {
    cameraInputRef.current?.click()
  }

  const handleChooseFromGallery = () => {
    fileInputRef.current?.click()
  }

  const handleRemoveFile = () => {
    setSelectedFile(null)
    setPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (cameraInputRef.current) cameraInputRef.current.value = ''
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Veuillez sélectionner un fichier')
      return
    }

    if (type !== 'ouvrier') {
      setError('Seuls les ouvriers internes peuvent uploader des documents')
      return
    }

    setUploading(true)
    setError(null)
    const formData = new FormData()
    formData.append('file', selectedFile)
    if (nomDocument.trim()) {
      formData.append('nom', nomDocument.trim())
    }

    try {
      const response = await fetch('/api/documents/administratifs/upload-ouvrier', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erreur lors de l\'upload' }))
        throw new Error(errorData.error || 'Erreur lors de l\'upload du document')
      }

      const _data: UploadResponse = await response.json()
      setUploadSuccess(true)
      
      // Réinitialiser le formulaire
      setSelectedFile(null)
      setPreview(null)
      setNomDocument('')
      if (fileInputRef.current) fileInputRef.current.value = ''
      if (cameraInputRef.current) cameraInputRef.current.value = ''

      // Rediriger après un court délai
      setTimeout(() => {
        router.push(`/public/portail/${type}/${actorId}`)
      }, 2000)
    } catch (err) {
      console.error('Erreur:', err)
      setError(err instanceof Error ? err.message : 'Impossible d\'uploader le document')
    } finally {
      setUploading(false)
    }
  }

  if (!sessionData) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    )
  }

  if (type !== 'ouvrier') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-gray-600">Cette fonctionnalité est réservée aux ouvriers internes.</p>
          <button
            onClick={() => router.push(`/public/portail/${type}/${actorId}`)}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg"
          >
            Retour
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 px-4 py-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center mr-4">
              <DocumentArrowUpIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Envoyer un document</h1>
              <p className="text-gray-600">Facture ou document comptable</p>
            </div>
          </div>
          <button
            onClick={() => router.push(`/public/portail/${type}/${actorId}`)}
            className="bg-white hover:bg-gray-50 rounded-lg px-4 py-2 flex items-center text-gray-700 border border-gray-200"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Retour
          </button>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <p className="text-sm text-blue-800">
            📄 Prenez une photo ou sélectionnez un document depuis votre galerie. 
            Le document sera automatiquement tagué "Comptabilité" et visible par les managers.
          </p>
        </div>

        {/* Boutons de sélection */}
        {!selectedFile && (
          <div className="grid grid-cols-2 gap-4 mb-6">
            <button
              onClick={handleTakePhoto}
              className="flex flex-col items-center justify-center p-6 bg-white rounded-xl shadow-lg border-2 border-blue-200 hover:border-blue-400 transition-all"
            >
              <CameraIcon className="h-12 w-12 text-blue-600 mb-2" />
              <span className="text-sm font-semibold text-gray-700">Prendre une photo</span>
            </button>
            <button
              onClick={handleChooseFromGallery}
              className="flex flex-col items-center justify-center p-6 bg-white rounded-xl shadow-lg border-2 border-blue-200 hover:border-blue-400 transition-all"
            >
              <PhotoIcon className="h-12 w-12 text-blue-600 mb-2" />
              <span className="text-sm font-semibold text-gray-700">Galerie</span>
            </button>
          </div>
        )}

        {/* Inputs cachés */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileSelect}
          className="hidden"
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Preview et formulaire */}
        {selectedFile && !uploadSuccess && (
          <div className="bg-white rounded-xl shadow-lg p-6 space-y-4">
            {/* Preview */}
            {preview && (
              <div className="relative">
                <img
                  src={preview}
                  alt="Preview"
                  className="w-full h-64 object-contain rounded-lg border-2 border-gray-200"
                />
                <button
                  onClick={handleRemoveFile}
                  className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
            )}

            {/* Info fichier */}
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Fichier sélectionné :</p>
              <p className="font-semibold text-gray-900">{selectedFile.name}</p>
              <p className="text-xs text-gray-500 mt-1">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>

            {/* Nom du document (optionnel) */}
            <div>
              <label htmlFor="nom" className="block text-sm font-medium text-gray-700 mb-2">
                Nom du document (optionnel)
              </label>
              <input
                id="nom"
                type="text"
                value={nomDocument}
                onChange={(e) => setNomDocument(e.target.value)}
                placeholder="Ex: Facture fournisseur décembre 2024"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Si non renseigné, un nom automatique sera généré
              </p>
            </div>

            {/* Erreur */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* Boutons d'action */}
            <div className="flex gap-3">
              <button
                onClick={handleRemoveFile}
                className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                {uploading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Envoi...</span>
                  </>
                ) : (
                  <>
                    <ArrowUpTrayIcon className="h-5 w-5" />
                    <span>Envoyer</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Message de succès */}
        {uploadSuccess && (
          <div className="bg-white rounded-xl shadow-lg p-6 text-center">
            <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Document envoyé avec succès !
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Le document a été tagué "Comptabilité" et est maintenant visible par les managers.
            </p>
            <p className="text-xs text-gray-500">Redirection en cours...</p>
          </div>
        )}

        {/* Message d'information si aucun fichier */}
        {!selectedFile && !uploadSuccess && (
          <div className="bg-white rounded-xl shadow-lg p-6 text-center">
            <CheckCircleIcon className="h-16 w-16 text-blue-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Documents comptables
            </h3>
            <p className="text-sm text-gray-600">
              Envoyez vos factures et documents comptables. Ils seront automatiquement organisés et accessibles aux managers.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function DocumentsUploadPage(props: { params: Promise<{ type: 'ouvrier'|'soustraitant'; actorId: string }> }) {
  const p = React.use(props.params)
  return (
    <PortalI18nProvider>
      <InnerDocumentsPage params={p} />
    </PortalI18nProvider>
  )
}

