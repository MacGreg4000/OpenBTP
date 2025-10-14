'use client'

import React, { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { 
  ClipboardDocumentCheckIcon, 
  CheckIcon, 
  PhotoIcon, 
  BuildingOfficeIcon 
} from '@heroicons/react/24/outline'
import { Button } from '@/components/ui'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

interface TagProps {
  id: string
  nom: string
}

interface PhotoProps {
  id: string
  url: string
  estPreuve?: boolean
}

interface RemarqueProps {
  id: string
  description: string
  localisation: string | null
  estResolue: boolean
  estValidee: boolean
  estRejetee: boolean
  dateResolution: string | null
  tags: TagProps[]
  photos: PhotoProps[]
}

interface ReceptionProps {
  id: string
  dateLimite: string
  chantier: {
    nomChantier: string
    chantierId: string
  }
  remarques: RemarqueProps[]
  estInterne: boolean
  soustraitant?: {
    id: string
    nom: string
  } | null
}

export default function PublicReceptionDetailPage({ 
  params 
}: { 
  params: Promise<{ codePIN: string }> 
}) {
  // Utiliser React.use pour déballer la Promise params
  const resolvedParams = React.use(params)
  const { codePIN } = resolvedParams
  const router = useRouter()
  const [reception, setReception] = useState<ReceptionProps | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [remarqueEnResolution, setRemarqueEnResolution] = useState<string | null>(null)
  const [commentaire, setCommentaire] = useState('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [resolutionError, setResolutionError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const fetchReception = async () => {
      try {
        const response = await fetch('/api/public/reception', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ codePIN }),
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Code PIN invalide')
        }

        const receptionData = await response.json()
        setReception(receptionData)
      } catch (error) {
        console.error('Erreur:', error)
        setError(error instanceof Error ? error.message : 'Une erreur est survenue')
      } finally {
        setLoading(false)
      }
    }

    fetchReception()
  }, [codePIN])

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0]
      setPhotoFile(file)
      
      // Créer une URL pour la prévisualisation
      const previewUrl = URL.createObjectURL(file)
      setPhotoPreview(previewUrl)
    }
  }

  const handleStartResolution = (remarqueId: string) => {
    setRemarqueEnResolution(remarqueId)
    setCommentaire('')
    setPhotoFile(null)
    setPhotoPreview(null)
  }

  const handleCancelResolution = () => {
    setRemarqueEnResolution(null)
    if (photoPreview) {
      URL.revokeObjectURL(photoPreview)
      setPhotoPreview(null)
    }
  }

  const handleSubmitResolution = async (remarqueId: string) => {
    setSaving(true)
    setResolutionError(null)
    try {
      const formData = new FormData()
      formData.append('remarqueId', remarqueId)
      formData.append('codePIN', codePIN)
      formData.append('commentaire', commentaire)
      
      // Ajouter la photo seulement si elle existe
      if (photoFile) {
        formData.append('photo', photoFile)
      }
      
      console.log('Envoi de la requête à /api/public/reception-remarque-resolver avec:', {
        remarqueId,
        codePIN,
        commentaire: commentaire.substring(0, 20) + (commentaire.length > 20 ? '...' : ''),
        photo: photoFile ? 'présente' : 'absente'
      })
      
      // Assurons-nous que la requête est envoyée au bon format
      const response = await fetch('/api/public/reception-remarque-resolver', {
        method: 'POST',
        body: formData,
      })

      console.log('Status de la réponse:', response.status, response.statusText)

      if (!response.ok) {
        let errorData
        try {
          errorData = await response.json()
          console.error('Erreur de réponse:', {
            status: response.status,
            statusText: response.statusText,
            data: errorData
          })
        } catch (jsonError) {
          console.error('Impossible de parser la réponse en JSON:', jsonError)
          console.error('Texte de la réponse:', await response.text().catch(() => 'Impossible de lire le texte'))
        }
        const errorMessage = errorData?.error || `Erreur ${response.status}: ${response.statusText}`;
        setResolutionError(errorMessage);
        throw new Error(errorMessage);
      }

      const result = await response.json(); // Récupérer la réponse JSON

      // Mettre à jour l'UI
      setReception(prev => {
        if (!prev) return null
        
        return {
          ...prev,
          remarques: prev.remarques.map(remarque => {
            if (remarque.id === remarqueId) {
              const updatedPhotos = [...remarque.photos];
              if (result.nouvellePhoto) {
                // S'assurer de ne pas ajouter de doublon si l'ID existe déjà
                if (!updatedPhotos.find(p => p.id === result.nouvellePhoto.id)) {
                    updatedPhotos.push(result.nouvellePhoto);
                }
              }
              return { 
                ...remarque, 
                estResolue: true,
                dateResolution: new Date().toISOString(),
                photos: updatedPhotos, // Mettre à jour les photos
              };
            }
            return remarque;
          })
        }
      })

      setRemarqueEnResolution(null)
    } catch (error) {
      console.error('Erreur complète:', error)
      // Ne pas afficher d'alerte, on utilise déjà l'état resolutionError
    } finally {
      setSaving(false)
      if (photoPreview) {
        URL.revokeObjectURL(photoPreview)
        setPhotoPreview(null)
      }
    }
  }

  if (loading) return <div className="p-8 text-center">Chargement...</div>
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-md w-full text-center">
          <div className="text-red-500 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">Erreur d&apos;accès</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <Button
            variant="primary"
            onClick={() => router.push('/public/reception')}
            className="w-full"
          >
            Retour à l&apos;accueil
          </Button>
        </div>
      </div>
    )
  }

  if (!reception) return <div className="p-8 text-center">Données non disponibles</div>

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-lg border-b-2 border-gray-200 dark:border-gray-600">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div className="flex items-center mb-3 md:mb-0">
              <ClipboardDocumentCheckIcon className="h-7 w-7 text-red-600 dark:text-red-500 mr-3 flex-shrink-0" />
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 truncate">
                  Réception - {reception.chantier.nomChantier}
                </h1>
                <p className="text-sm md:text-base font-medium text-gray-700 dark:text-gray-300 mt-1">
                  Date limite: <span className="font-semibold text-gray-900 dark:text-gray-100">{format(new Date(reception.dateLimite), 'dd MMMM yyyy', { locale: fr })}</span>
                </p>
                {reception.soustraitant && (
                  <div className="mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300">
                    <BuildingOfficeIcon className="h-3 w-3 mr-1" />
                    Accès pour: {reception.soustraitant.nom}
                  </div>
                )}
                {reception.estInterne && !reception.soustraitant && (
                  <div className="mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                    <svg className="h-3 w-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z"></path>
                    </svg>
                    Accès équipe interne
                  </div>
                )}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/public/reception')}
              className="flex items-center self-start md:self-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Retour
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Afficher un message si aucune remarque n'est associée à ce sous-traitant */}
        {reception.remarques.length === 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 text-center mb-6">
            <ClipboardDocumentCheckIcon className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Aucune remarque trouvée</h2>
          <p className="text-gray-600 dark:text-gray-400">
            {reception.soustraitant 
              ? `Aucune remarque n\'est actuellement assignée à ${reception.soustraitant.nom}.` 
              : 'Aucune remarque n\'a été créée pour cette réception.'}
          </p>
          </div>
        )}

        {/* Statistiques */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-lg rounded-xl border-2 border-gray-200 dark:border-gray-600">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-green-100 dark:bg-green-900 rounded-lg p-3">
                  <CheckIcon className="h-7 w-7 text-green-600 dark:text-green-300" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm md:text-base font-semibold text-gray-800 dark:text-gray-100 truncate">
                      Remarques résolues
                    </dt>
                    <dd>
                      <div className="text-xl font-bold text-gray-900 dark:text-gray-100">
                        {reception.remarques.filter(r => r.estResolue).length} / {reception.remarques.length}
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-lg rounded-xl border-2 border-gray-200 dark:border-gray-600">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-blue-100 dark:bg-blue-900 rounded-lg p-3">
                  <ClipboardDocumentCheckIcon className="h-7 w-7 text-blue-600 dark:text-blue-300" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm md:text-base font-semibold text-gray-800 dark:text-gray-100 truncate">
                      Progression
                    </dt>
                    <dd>
                      <div className="text-xl font-bold text-gray-900 dark:text-gray-100">
                        {Math.round((reception.remarques.filter(r => r.estResolue).length / reception.remarques.length) * 100) || 0}%
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                        <div 
                          className="h-2.5 rounded-full bg-blue-600" 
                          style={{ width: `${(reception.remarques.filter(r => r.estResolue).length / reception.remarques.length) * 100 || 0}%` }}
                        ></div>
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-lg rounded-xl border-2 border-gray-200 dark:border-gray-600">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-red-100 dark:bg-red-900 rounded-lg p-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-red-600 dark:text-red-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm md:text-base font-semibold text-gray-800 dark:text-gray-100 truncate">
                      Temps restant
                    </dt>
                    <dd>
                      <div className="text-xl font-bold text-gray-900 dark:text-gray-100">
                        {Math.max(0, Math.ceil((new Date(reception.dateLimite).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))} jours
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Liste des remarques */}
        <div className="bg-white dark:bg-gray-800 shadow-lg overflow-hidden rounded-xl border-2 border-gray-200 dark:border-gray-600">
          <div className="px-5 py-5 border-b-2 border-gray-300 dark:border-gray-600 sm:px-6">
            <h3 className="text-xl leading-6 font-bold text-gray-900 dark:text-gray-100">
              Liste des remarques
            </h3>
            <p className="mt-2 text-base font-medium text-gray-700 dark:text-gray-300">
              {reception.remarques.length} remarque{reception.remarques.length > 1 ? 's' : ''} à traiter
            </p>
          </div>
          
          {reception.remarques.length === 0 ? (
            <div className="text-center py-12">
              <CheckIcon className="mx-auto h-12 w-12 text-green-500" />
              <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-white">Aucune remarque</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Toutes les remarques ont été résolues.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {reception.remarques.map((remarque) => (
                <li key={remarque.id} className={`px-4 py-5 sm:px-6 sm:py-6 ${remarqueEnResolution === remarque.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                  <div className="flex flex-col sm:flex-row sm:justify-between">
                    <div className="mb-4 sm:mb-0 sm:pr-4 sm:w-2/3">
                      <div className="flex items-start">
                        <div className={`flex-shrink-0 h-4 w-4 rounded-full mt-1.5 ${
                          remarque.estResolue ? 'bg-green-500' : 'bg-amber-500'
                        }`}></div>
                        <div className="ml-3">
                          <h4 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100">
                            {remarque.description}
                          </h4>
                          {remarque.localisation && (
                            <p className="mt-1 text-sm md:text-base font-medium text-gray-700 dark:text-gray-300 flex items-center">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              <span className="flex-1 truncate">{remarque.localisation}</span>
                            </p>
                          )}
                          
                          {remarque.tags.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {remarque.tags.map((tag) => (
                                <span
                                  key={tag.id}
                                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300"
                                >
                                  <svg className="mr-1 h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"></path>
                                  </svg>
                                  {tag.nom}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Photos existantes de la remarque */}
                      {remarque.photos.length > 0 && (
                        <div className="mt-4 ml-7">
                          <p className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-2">Photos:</p>
                          <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 gap-2">
                            {remarque.photos.map((photo) => (
                              <div key={photo.id} className="relative group">
                                <div className="aspect-w-1 aspect-h-1 rounded-md overflow-hidden bg-gray-100 dark:bg-gray-800">
                                  <Image
                                    src={photo.url}
                                    alt={photo.estPreuve ? "Photo de preuve" : "Photo de la remarque"}
                                    className="object-cover w-full h-full"
                                    width={300}
                                    height={300}
                                    onClick={() => window.open(photo.url, '_blank')}
                                  />
                                </div>
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black bg-opacity-30 transition-opacity">
                                  <div className="text-white p-1 rounded-full bg-gray-800 bg-opacity-50">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="sm:w-1/3 flex flex-col items-start sm:items-end justify-start">
                      {remarque.estResolue ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                          <CheckIcon className="h-4 w-4 mr-1" />
                          Résolu
                        </span>
                      ) : (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleStartResolution(remarque.id)}
                          className="px-4 w-full sm:w-auto"
                        >
                          Marquer comme résolu
                        </Button>
                      )}
                      
                      {remarque.dateResolution && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                          Résolu le {format(new Date(remarque.dateResolution), 'dd/MM/yyyy', { locale: fr })}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Formulaire de résolution */}
                  {remarqueEnResolution === remarque.id && (
                    <div className="mt-6 ml-3 sm:ml-7 pt-6 border-t-2 border-gray-300 dark:border-gray-600">
                      <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-xl border-2 border-gray-300 dark:border-gray-600 shadow-lg">
                        <h4 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100 mb-5">
                          Preuve de résolution
                        </h4>
                        
                        {resolutionError && (
                          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                            <p className="font-medium">Erreur:</p>
                            <p>{resolutionError}</p>
                          </div>
                        )}
                        
                        <div className="space-y-5 sm:space-y-6">
                          <div>
                            <label className="block text-base font-semibold text-gray-800 dark:text-gray-100 mb-2">
                              Commentaire <span className="text-sm font-normal text-gray-600 dark:text-gray-400">(optionnel)</span>
                            </label>
                            <textarea
                              value={commentaire}
                              onChange={(e) => setCommentaire(e.target.value)}
                              className="w-full px-4 py-3 text-base border-2 border-gray-300 dark:border-gray-500 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 transition-colors"
                              rows={3}
                              placeholder="Décrivez comment vous avez résolu cette remarque..."
                            />
                          </div>
                          
                          <div>
                            <label className="block text-base font-semibold text-gray-800 dark:text-gray-100 mb-2">
                              Photo de preuve <span className="text-sm font-normal text-gray-600 dark:text-gray-400">(optionnelle)</span>
                            </label>
                            {photoPreview ? (
                              <div className="relative w-full max-w-md">
                                <Image
                                  src={photoPreview}
                                  alt="Prévisualisation"
                                  className="w-full h-auto object-cover rounded-lg shadow-md"
                                  width={600}
                                  height={400}
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    URL.revokeObjectURL(photoPreview)
                                    setPhotoPreview(null)
                                    setPhotoFile(null)
                                  }}
                                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 shadow-md hover:bg-red-600 transition-colors"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center w-full">
                                <label
                                  htmlFor="photo-upload"
                                  className="flex flex-col items-center justify-center w-full h-32 sm:h-40 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 dark:border-gray-600 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600"
                                >
                                  <div className="flex flex-col items-center justify-center py-4 sm:py-6">
                                    <PhotoIcon className="w-8 sm:w-10 h-8 sm:h-10 mb-2 sm:mb-3 text-gray-400" />
                                    <p className="mb-1 sm:mb-2 text-sm text-gray-500 dark:text-gray-400">
                                      <span className="font-semibold">Cliquez pour ajouter</span>
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                      PNG, JPG, JPEG (max. 10Mo)
                                    </p>
                                  </div>
                                  <input 
                                    id="photo-upload" 
                                    type="file" 
                                    className="hidden" 
                                    ref={fileInputRef}
                                    onChange={handlePhotoChange}
                                    accept="image/*"
                                    capture="environment"
                                  />
                                </label>
                              </div>
                            )}
                            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                              Prenez une photo pour documenter la résolution (optionnel).
                            </p>
                          </div>
                          
                          <div className="flex flex-col sm:flex-row justify-end gap-2 sm:space-x-3">
                            <Button
                              variant="outline"
                              onClick={handleCancelResolution}
                              className="w-full sm:w-auto"
                            >
                              Annuler
                            </Button>
                            <Button
                              variant="primary"
                              onClick={() => handleSubmitResolution(remarque.id)}
                              disabled={saving}
                              isLoading={saving}
                              className="w-full sm:w-auto"
                            >
                              {saving ? 'Envoi en cours...' : 'Valider la résolution'}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  )
} 