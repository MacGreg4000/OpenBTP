'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { ClipboardDocumentCheckIcon, LockClosedIcon, ArrowPathIcon } from '@heroicons/react/24/outline'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

interface RemarqueProps {
  id: string
  description: string
  localisation: string | null
  estResolue: boolean
  dateResolution: string | null
  estValidee: boolean
  estRejetee: boolean
  raisonRejet: string | null
  createdAt: string
  photos: {
    id: string
    url: string
    estPreuve: boolean
  }[]
  tags: {
    id: string
    nom: string
    email: string | null
    typeTag: string
  }[]
}

interface ReceptionProps {
  id: string
  dateCreation: string
  dateLimite: string
  estFinalise: boolean
  chantier: {
    nomChantier: string
    adresseChantier: string
  }
  createdBy: {
    name: string | null
    email: string
  }
}

export default function ExternalReceptionPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  // Utiliser React.use pour déballer la Promise params
  const resolvedParams = React.use(params)
  const id = resolvedParams.id
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const urlPin = searchParams.get('pin')
  
  // Vérifier si nous avons un PIN dans l'URL
  useEffect(() => {
    if (!urlPin) {
      // Si aucun PIN n'est fourni, rediriger vers la page principale des réceptions
      router.push('/public/reception')
    }
  }, [urlPin, router])
  
  const [pin, setPin] = useState<string>(urlPin || '')
  const [isVerifying, setIsVerifying] = useState<boolean>(false)
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [reception, setReception] = useState<ReceptionProps | null>(null)
  const [remarques, setRemarques] = useState<RemarqueProps[]>([])
  const [loading, setLoading] = useState<boolean>(true)

  // Vérifier automatiquement le PIN s'il est fourni dans l'URL
  useEffect(() => {
    if (urlPin) {
      verifyPin(urlPin)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlPin])

  const fetchReceptionData = useCallback(async () => {
    setLoading(true)
    try {
      const receptionRes = await fetch(`/api/reception/externe/${id}?pin=${pin}`)
      if (!receptionRes.ok) throw new Error('Erreur lors du chargement de la réception')
      const receptionData = await receptionRes.json()
      setReception(receptionData)
      const remarquesRes = await fetch(`/api/reception/externe/${id}/remarques?pin=${pin}`)
      if (!remarquesRes.ok) throw new Error('Erreur lors du chargement des remarques')
      const remarquesData = await remarquesRes.json()
      setRemarques(remarquesData)
    } catch (error) {
      console.error('Erreur:', error)
      setError(error instanceof Error ? error.message : 'Une erreur est survenue')
    } finally {
      setLoading(false)
    }
  }, [id, pin])

  const verifyPin = useCallback(async (pinToVerify: string) => {
    setIsVerifying(true)
    setError(null)
    try {
      const response = await fetch(`/api/reception/externe/verify?id=${id}&pin=${pinToVerify}`)
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Code PIN invalide')
      }
      setIsAuthorized(true)
      fetchReceptionData()
    } catch (error) {
      console.error('Erreur de vérification du PIN:', error)
      setError(error instanceof Error ? error.message : 'Une erreur est survenue lors de la vérification')
      setIsAuthorized(false)
    } finally {
      setIsVerifying(false)
    }
  }, [fetchReceptionData, id])

  // fetchReceptionData est mémoïsé ci-dessus

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (pin.length < 4) {
      setError('Veuillez entrer un code PIN valide')
      return
    }
    verifyPin(pin)
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <div className="flex justify-center mb-6">
              <ClipboardDocumentCheckIcon className="h-12 w-12 text-red-500" />
            </div>
            <h2 className="mt-2 text-center text-3xl font-extrabold text-gray-900">
              Accès à la réception
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Veuillez entrer le code PIN pour accéder aux remarques de réception
            </p>
            
            {error && (
              <div className="mt-4 rounded-md bg-red-50 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">{error}</h3>
                  </div>
                </div>
              </div>
            )}
            
            <form className="mt-6 space-y-6" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="pin" className="block text-sm font-medium text-gray-700">
                  Code PIN
                </label>
                <div className="mt-1 relative">
                  <input
                    id="pin"
                    name="pin"
                    type="text"
                    autoComplete="off"
                    required
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-red-500 focus:border-red-500 text-center text-2xl font-bold tracking-wider"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    maxLength={6}
                    placeholder="******"
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <LockClosedIcon className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isVerifying}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:bg-red-300"
                >
                  {isVerifying ? (
                    <>
                      <ArrowPathIcon className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" />
                      Vérification...
                    </>
                  ) : (
                    'Accéder à la réception'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <ArrowPathIcon className="animate-spin h-10 w-10 text-red-500" />
      </div>
    )
  }

  if (!reception) {
    return (
      <div className="min-h-screen flex justify-center items-center flex-col">
        <ClipboardDocumentCheckIcon className="h-16 w-16 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900">Réception non trouvée</h2>
        <p className="mt-2 text-gray-600">La réception que vous recherchez n&apos;existe pas ou a été supprimée.</p>
      </div>
    )
  }

  // Calculer le pourcentage de résolution
  const totalRemarques = remarques.length
  const resolvedRemarques = remarques.filter(r => r.estResolue).length
  const percentResolved = totalRemarques > 0 ? (resolvedRemarques / totalRemarques) * 100 : 0

  // Fonction pour formater les dates de manière sécurisée
  const formatDate = (dateString: string | null) => {
    if (!dateString) {
      return "Date non disponible";
    }
    
    try {
      // Afficher le format brut de la date pour débogage
      console.log('Format date brut externe:', dateString, typeof dateString);
      
      // Essayer différentes méthodes de parsing
      let date;
      
      // Si c'est une date au format ISO
      if (typeof dateString === 'string' && dateString.includes('T')) {
        date = new Date(dateString);
      }
      // Si c'est une date au format MySQL (YYYY-MM-DD HH:MM:SS)
      else if (typeof dateString === 'string' && dateString.includes('-')) {
        date = new Date(dateString.replace(' ', 'T'));
      }
      // Si c'est un timestamp
      else if (!isNaN(Number(dateString))) {
        date = new Date(Number(dateString));
      }
      // Méthode par défaut
      else {
        date = new Date(dateString);
      }
      
      if (isNaN(date.getTime())) {
        console.error("Date invalide externe:", dateString);
        return "Date non disponible";
      }
      
      return format(date, 'dd MMMM yyyy', { locale: fr });
    } catch (error) {
      console.error("Erreur lors du formatage de la date externe:", error, "pour la valeur:", dateString);
      return "Date non disponible";
    }
  };

  return (
    <div className="bg-gray-100 min-h-screen">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center">
            <ClipboardDocumentCheckIcon className="h-8 w-8 text-red-500 mr-3" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Réception - {reception.chantier.nomChantier}
              </h1>
              <p className="text-sm text-gray-500">
                {reception.chantier.adresseChantier}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Informations de la réception</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm font-medium text-gray-500">Date de création</p>
              <p className="mt-1">{formatDate(reception.dateCreation)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Date limite</p>
              <p className="mt-1">{formatDate(reception.dateLimite)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">État</p>
              <p className="mt-1">
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                  reception.estFinalise 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {reception.estFinalise ? 'Finalisé' : 'En cours'}
                </span>
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Créé par</p>
              <p className="mt-1">{reception.createdBy.name || reception.createdBy.email}</p>
            </div>
          </div>

          <div className="mt-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Progression de résolution</h3>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className={`h-2.5 rounded-full ${percentResolved === 100 ? 'bg-green-600' : 'bg-blue-600'}`}
                style={{ width: `${percentResolved}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-500 mt-1">{resolvedRemarques} sur {totalRemarques} remarques résolues</p>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Remarques</h2>
          
          {remarques.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Aucune remarque n&apos;a été ajoutée pour cette réception.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {remarques.map((remarque) => (
                <div key={remarque.id} className="py-4">
                  <div className="flex items-start">
                    <div className={`flex-shrink-0 h-4 w-4 rounded-full mt-1 ${
                      remarque.estResolue ? 'bg-green-500' : remarque.estRejetee ? 'bg-red-500' : 'bg-yellow-500'
                    }`}></div>
                    <div className="ml-3 flex-1">
                      <div className="text-sm">
                        <p className="font-medium text-gray-900">{remarque.description}</p>
                        {remarque.localisation && (
                          <p className="text-gray-500 mt-1">Localisation: {remarque.localisation}</p>
                        )}
                      </div>
                      
                      {remarque.photos && remarque.photos.length > 0 && (
                        <div className="mt-2 flex space-x-2 overflow-x-auto pb-2">
                          {remarque.photos.map((photo) => (
                            <div key={photo.id} className="flex-shrink-0">
                              <Image 
                                src={photo.url} 
                                alt="Photo de la remarque" 
                                className={`h-24 w-24 object-cover rounded-md ${photo.estPreuve ? 'border-2 border-green-500' : ''}`} 
                                width={96}
                                height={96}
                              />
                              {photo.estPreuve && (
                                <span className="text-xs text-green-600 mt-1 block">Preuve de résolution</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {remarque.tags && remarque.tags.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs text-gray-500 mb-1">Assigné à:</p>
                          <div className="flex flex-wrap gap-1">
                            {remarque.tags.map((tag) => (
                              <span 
                                key={tag.id}
                                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                              >
                                {tag.nom}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {remarque.estResolue && (
                        <div className="mt-2 text-sm text-green-600">
                          <p>Résolu le {remarque.dateResolution ? formatDate(remarque.dateResolution) : 'Date non disponible'}</p>
                        </div>
                      )}
                      
                      {remarque.estRejetee && remarque.raisonRejet && (
                        <div className="mt-2 text-sm text-red-600">
                          <p>Rejeté: {remarque.raisonRejet}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
} 