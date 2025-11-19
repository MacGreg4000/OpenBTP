'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import { useSelectedChantier } from '@/contexts/SelectedChantierContext'
import { BottomNav } from '@/components/mobile/BottomNav'
import toast from 'react-hot-toast'
import { useConfirmation } from '@/components/modals/confirmation-modal'
import {
  MapPinIcon,
  BuildingOfficeIcon,
  ArrowLeftIcon,
  CurrencyEuroIcon,
  CameraIcon,
  DocumentTextIcon,
  ChevronRightIcon,
  IdentificationIcon,
  UserIcon,
  PhoneIcon,
  EnvelopeIcon,
  FolderIcon,
  DocumentDuplicateIcon,
  ArrowPathIcon,
  ClipboardDocumentListIcon,
  ArrowUpTrayIcon,
  MapIcon,
} from '@heroicons/react/24/outline'

interface ChantierDetails {
  id: string
  chantierId: string
  nomChantier: string
  numeroIdentification?: string | null
  adresseChantier?: string | null
  villeChantier?: string | null
  clientNom?: string | null
  clientId?: string | null
  clientEmail?: string | null
  clientAdresse?: string | null
  clientTelephone?: string | null
  statut?: string
  latitude?: number | null
  longitude?: number | null
  contact?: {
    id: string
    nom: string
    prenom: string
    email: string | null
    telephone: string | null
  } | null
  client?: {
    id: string
    nom: string
    email: string | null
    adresse: string | null
  } | null
  commande?: {
    id: string
    total: number
    statut: string
  } | null
}

export default function MobileDashboardPage() {
  const router = useRouter()
  const { selectedChantier, setSelectedChantier } = useSelectedChantier()
  const [chantierDetails, setChantierDetails] = useState<ChantierDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [capturingLocation, setCapturingLocation] = useState(false)
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null)
  const [isLongPressing, setIsLongPressing] = useState(false)
  const longPressTriggeredRef = useRef(false)
  const { showConfirmation, ConfirmationModalComponent } = useConfirmation()

  useEffect(() => {
    if (!selectedChantier) {
      router.push('/mobile')
      return
    }
    loadChantierDetails()
  }, [selectedChantier, router]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadChantierDetails = async () => {
    if (!selectedChantier) return

    try {
      setLoading(true)
      const response = await fetch(`/api/chantiers/${selectedChantier.chantierId}`)
      if (response.ok) {
        const data = await response.json()
        setChantierDetails({
          id: data.id || selectedChantier.id,
          chantierId: data.chantierId || selectedChantier.chantierId,
          nomChantier: data.nomChantier || selectedChantier.nomChantier,
          numeroIdentification: data.numeroIdentification,
          adresseChantier: data.adresseChantier || selectedChantier.adresseChantier,
          villeChantier: data.villeChantier,
          clientNom: data.clientNom || data.client?.nom || selectedChantier.clientNom,
          clientId: data.clientId || data.client?.id || selectedChantier.clientId,
          clientEmail: data.clientEmail || data.client?.email,
          clientAdresse: data.clientAdresse || data.client?.adresse,
          clientTelephone: data.clientTelephone,
          statut: data.statut || selectedChantier.statut,
          latitude: data.latitude,
          longitude: data.longitude,
          contact: data.contact,
          client: data.client,
        })

        // Charger la commande validée
        try {
          const commandeResponse = await fetch(
            `/api/chantiers/${selectedChantier.chantierId}/commande`
          )
          if (commandeResponse.ok) {
            const commande = await commandeResponse.json()
            setChantierDetails((prev) =>
              prev ? { ...prev, commande } : null
            )
          }
        } catch (error) {
          console.error('Erreur lors du chargement de la commande:', error)
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement du chantier:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleChangeChantier = () => {
    setSelectedChantier(null)
    router.push('/mobile')
  }

  const formatEuros = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const handleViewCommande = () => {
    if (!chantierDetails?.commande) return
    
    // Naviguer vers la page de visualisation PDF avec barre de navigation
    router.push(`/mobile/commande/${chantierDetails.commande.id}`)
  }

  const handleCaptureLocation = async () => {
    if (!selectedChantier) return

    try {
      setCapturingLocation(true)
      
      // Demander la permission et obtenir la position
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        })
      })

      const { latitude, longitude } = position.coords

      // Enregistrer la position via l'API
      const response = await fetch(`/api/chantiers/${selectedChantier.chantierId}/geolocation`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude, longitude })
      })

      if (response.ok) {
        // Mettre à jour l'état local
        setChantierDetails(prev => prev ? { ...prev, latitude, longitude } : null)
        toast.success('Localisation enregistrée avec succès !')
      } else {
        throw new Error('Erreur lors de l\'enregistrement')
      }
    } catch (error) {
      console.error('Erreur lors de la capture de la localisation:', error)
      if (error && typeof error === 'object' && 'code' in error && error.code === 1) {
        toast.error('Permission de géolocalisation refusée. Veuillez autoriser l\'accès à votre position.')
      } else {
        toast.error('Erreur lors de la capture de la localisation. Veuillez réessayer.')
      }
    } finally {
      setCapturingLocation(false)
    }
  }

  const handleShareLocation = (_e?: React.MouseEvent | React.TouchEvent) => {
    // Empêcher le partage si un long press a été déclenché
    if (longPressTriggeredRef.current) {
      longPressTriggeredRef.current = false
      return
    }
    
    if (!chantierDetails?.latitude || !chantierDetails?.longitude) return

    const { latitude, longitude } = chantierDetails
    
    // Créer les liens Google Maps et Waze
    const googleMapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`
    const wazeUrl = `https://waze.com/ul?ll=${latitude},${longitude}&navigate=yes`
    
    // Texte à partager
    const shareText = `Localisation du chantier "${chantierDetails.nomChantier}":\n\nGoogle Maps: ${googleMapsUrl}\nWaze: ${wazeUrl}`

    // Utiliser l'API Web Share si disponible (mobile)
    if (navigator.share) {
      navigator.share({
        title: `Localisation - ${chantierDetails.nomChantier}`,
        text: shareText
      }).catch((error) => {
        // Ignorer l'erreur si l'utilisateur a simplement annulé le partage
        if (error.name !== 'AbortError') {
          console.error('Erreur lors du partage:', error)
        }
      })
    } else {
      // Fallback : copier dans le presse-papiers
      navigator.clipboard.writeText(shareText).then(() => {
        toast.success('Lien de localisation copié dans le presse-papiers !')
      }).catch(() => {
        // Fallback ultime : afficher les liens
        toast.error('Impossible de copier le lien. Veuillez réessayer.')
      })
    }
  }

  const handleLongPressStart = () => {
    if (!chantierDetails?.latitude || !chantierDetails?.longitude) return

    setIsLongPressing(true)
    longPressTriggeredRef.current = false

    const timer = setTimeout(() => {
      if (!selectedChantier) return

      longPressTriggeredRef.current = true
      setIsLongPressing(false)

      showConfirmation({
        title: 'Gérer la localisation',
        message: 'Que souhaitez-vous faire avec la localisation GPS ?',
        type: 'info',
        confirmText: 'Modifier',
        cancelText: 'Supprimer',
        onConfirm: async () => {
          // Modifier : recapturer la localisation
          handleCaptureLocation()
        },
        onCancel: async () => {
          // Supprimer
          try {
            const response = await fetch(`/api/chantiers/${selectedChantier.chantierId}/geolocation`, {
              method: 'DELETE'
            })

            if (response.ok) {
              setChantierDetails(prev => prev ? { ...prev, latitude: null, longitude: null } : null)
              toast.success('Localisation supprimée avec succès !')
            } else {
              throw new Error('Erreur lors de la suppression')
            }
          } catch (error) {
            console.error('Erreur lors de la suppression de la localisation:', error)
            toast.error('Erreur lors de la suppression de la localisation.')
          }
        }
      })
    }, 2000) // 2 secondes

    setLongPressTimer(timer)
  }

  const handleLongPressEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer)
      setLongPressTimer(null)
    }
    setIsLongPressing(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    )
  }

  if (!selectedChantier || !chantierDetails) {
    return null
  }

  return (
    <>
      {ConfirmationModalComponent}
      <div className="min-h-screen pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-700 text-white">
        <div className="max-w-md mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            {/* Bouton retour */}
            <button
              onClick={() => router.push('/mobile')}
              className="p-2 -ml-2 hover:bg-white/20 rounded-lg transition-colors flex-shrink-0"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </button>

            {/* Icône et nom du chantier */}
            <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center border border-white/30 flex-shrink-0">
              <BuildingOfficeIcon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-black truncate">{chantierDetails.nomChantier}</h1>
              {chantierDetails.clientNom && (
                <p className="text-xs text-blue-100 truncate">{chantierDetails.clientNom}</p>
              )}
            </div>

            {/* Bouton changement de chantier */}
            <button
              onClick={handleChangeChantier}
              className="p-2 -mr-2 hover:bg-white/20 rounded-lg transition-colors group flex-shrink-0"
              title="Changer de chantier"
            >
              <ArrowPathIcon className="h-5 w-5 group-hover:animate-spin transition-transform" />
            </button>
          </div>
        </div>
      </div>

      {/* Contenu */}
      <div className="max-w-md mx-auto px-4 py-6 space-y-4">
        {/* Informations du chantier */}
        <div className="bg-white rounded-xl p-4 shadow-lg border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-3">Informations du chantier</h3>
          <div className="space-y-3">
            {chantierDetails.numeroIdentification && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <IdentificationIcon className="h-4 w-4 text-indigo-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500">Numéro d'identification</p>
                  <p className="text-sm font-medium text-gray-900">{chantierDetails.numeroIdentification}</p>
                </div>
              </div>
            )}
            
            {chantierDetails.adresseChantier && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <MapPinIcon className="h-4 w-4 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500">Adresse</p>
                  <p className="text-sm font-medium text-gray-900">
                    {chantierDetails.adresseChantier}
                    {chantierDetails.villeChantier && `, ${chantierDetails.villeChantier}`}
                  </p>
                </div>
                {/* Bouton GPS sur la même ligne */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs text-gray-500">Localisation:</span>
                  {chantierDetails.latitude && chantierDetails.longitude ? (
                    <button
                      onTouchStart={(e) => {
                        e.preventDefault()
                        handleLongPressStart()
                      }}
                      onTouchEnd={(e) => {
                        e.preventDefault()
                        const wasLongPressTriggered = longPressTriggeredRef.current
                        handleLongPressEnd()
                        // Ne partager que si le long press n'a pas été déclenché
                        setTimeout(() => {
                          if (!wasLongPressTriggered && !longPressTriggeredRef.current) {
                            handleShareLocation(e)
                          }
                        }, 50)
                      }}
                      onMouseDown={handleLongPressStart}
                      onMouseUp={(e) => {
                        const wasLongPressTriggered = longPressTriggeredRef.current
                        handleLongPressEnd()
                        // Ne partager que si le long press n'a pas été déclenché
                        setTimeout(() => {
                          if (!wasLongPressTriggered && !longPressTriggeredRef.current) {
                            handleShareLocation(e)
                          }
                        }, 50)
                      }}
                      onMouseLeave={handleLongPressEnd}
                      className={`p-2 text-white rounded-lg transition-all relative ${
                        isLongPressing 
                          ? 'bg-orange-600 scale-110' 
                          : 'bg-green-600 hover:bg-green-700 active:bg-green-800'
                      }`}
                      title="Partager la localisation (maintenir 2s pour modifier/supprimer)"
                    >
                      {isLongPressing ? (
                        <div className="flex items-center gap-1">
                          <div className="animate-pulse">⏱</div>
                        </div>
                      ) : (
                        <ArrowUpTrayIcon className="h-5 w-5" />
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={handleCaptureLocation}
                      disabled={capturingLocation}
                      className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      title="Capturer la localisation GPS"
                    >
                      {capturingLocation ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      ) : (
                        <MapIcon className="h-5 w-5" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Contact */}
        {chantierDetails.contact && (
          <div className="bg-white rounded-xl p-4 shadow-lg border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-3">Contact</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <UserIcon className="h-4 w-4 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500">Nom</p>
                  <p className="text-sm font-medium text-gray-900">
                    {chantierDetails.contact.prenom} {chantierDetails.contact.nom}
                  </p>
                </div>
              </div>
              
              {chantierDetails.contact.email && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <EnvelopeIcon className="h-4 w-4 text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500">Email</p>
                    <a href={`mailto:${chantierDetails.contact.email}`} className="text-sm font-medium text-blue-600 hover:underline">
                      {chantierDetails.contact.email}
                    </a>
                  </div>
                </div>
              )}
              
              {chantierDetails.contact.telephone && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <PhoneIcon className="h-4 w-4 text-orange-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500">Téléphone</p>
                    <a href={`tel:${chantierDetails.contact.telephone}`} className="text-sm font-medium text-blue-600 hover:underline">
                      {chantierDetails.contact.telephone}
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Commande client */}
        <div className="bg-white rounded-xl p-4 shadow-lg border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                <CurrencyEuroIcon className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Commande client</h3>
                <p className="text-xs text-gray-500">Accès rapide à la commande</p>
              </div>
            </div>
          </div>

          {chantierDetails.commande ? (
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-3 mb-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 mb-1">Total commande</p>
                  <p className="text-lg font-bold text-gray-900">
                    {formatEuros(chantierDetails.commande.total)}
                  </p>
                </div>
                <span className="px-2 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-semibold">
                  Validée
                </span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500 mb-3">Aucune commande validée</p>
          )}

          <button
            onClick={handleViewCommande}
            disabled={!chantierDetails.commande}
            className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>Voir la commande (PDF)</span>
            <ChevronRightIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Accès rapides */}
        <div className="bg-white rounded-xl p-4 shadow-lg border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-3">Accès rapides</h3>
          <div className="space-y-2">
            <button
              onClick={() => router.push('/mobile/documents')}
              className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <FolderIcon className="h-5 w-5 text-blue-600" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-gray-900">Documents & Photos</p>
                  <p className="text-xs text-gray-500">Voir tous les documents</p>
                </div>
              </div>
              <ChevronRightIcon className="h-5 w-5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Actions rapides */}
        <div className="bg-white rounded-xl p-4 shadow-lg border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-3">Actions rapides</h3>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => router.push('/mobile/photos')}
              className="flex flex-col items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200 hover:border-blue-300 transition-colors"
            >
              <CameraIcon className="h-8 w-8 text-blue-600 mb-2" />
              <span className="text-sm font-medium text-gray-900">Prendre une photo</span>
            </button>

            <button
              onClick={() => router.push('/mobile/notes/nouveau')}
              className="flex flex-col items-center justify-center p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border-2 border-green-200 hover:border-green-300 transition-colors"
            >
              <DocumentTextIcon className="h-8 w-8 text-green-600 mb-2" />
              <span className="text-sm font-medium text-gray-900">Créer une note</span>
            </button>

            <button
              onClick={() => router.push('/mobile/rapports/nouveau')}
              className="flex flex-col items-center justify-center p-4 bg-gradient-to-br from-orange-50 to-red-50 rounded-xl border-2 border-orange-200 hover:border-orange-300 transition-colors"
            >
              <DocumentDuplicateIcon className="h-8 w-8 text-orange-600 mb-2" />
              <span className="text-sm font-medium text-gray-900">Créer un rapport</span>
            </button>

            <button
              onClick={() => router.push('/mobile/metres/nouveau')}
              className="flex flex-col items-center justify-center p-4 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border-2 border-indigo-200 hover:border-indigo-300 transition-colors"
            >
              <ClipboardDocumentListIcon className="h-8 w-8 text-indigo-600 mb-2" />
              <span className="text-sm font-medium text-gray-900">Nouveau métré</span>
            </button>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
    </>
  )
}

