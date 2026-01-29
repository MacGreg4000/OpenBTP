'use client'
import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation'
import { DocumentExpirationAlert } from '@/components/DocumentExpirationAlert'
import { PencilSquareIcon, BuildingOfficeIcon, UserIcon, MapPinIcon, CalendarIcon, ClockIcon, CurrencyEuroIcon, EyeIcon, ArrowUpTrayIcon, MapIcon, InformationCircleIcon, XMarkIcon, EnvelopeIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline'
import ChantierGestionnaires from '@/components/chantier/ChantierGestionnaires'
import toast from 'react-hot-toast'

interface ChantierData {
  id?: string;
  chantierId: string;
  nomChantier: string;
  numeroIdentification?: string | null;
  dateDebut?: string | null;
  statut?: 'EN_COURS' | 'TERMINE' | 'A_VENIR' | 'EN_PREPARATION' | string;
  adresseChantier?: string | null;
  villeChantier?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  dureeEnJours?: number | null;
  typeDuree?: 'CALENDRIER' | 'OUVRABLE' | string | null;
  budget?: number | null;
  clientId?: string | null;
  contactId?: string | null;
  client?: {
    id: string;
    nom: string;
    email: string | null;
    adresse: string | null;
  } | null;
  contact?: {
    id: string;
    nom: string;
    prenom: string;
    email: string | null;
    telephone: string | null;
  } | null;
  maitreOuvrageNom?: string | null;
  maitreOuvrageAdresse?: string | null;
  maitreOuvrageLocalite?: string | null;
  bureauArchitectureNom?: string | null;
  bureauArchitectureAdresse?: string | null;
  bureauArchitectureLocalite?: string | null;
}

interface Soustraitant {
  id: string
  nom: string
}

interface Contact {
  id: string
  prenom: string
  nom: string
  email: string | null
}

interface Ouvrier {
  id: string
  nom: string
  prenom: string
  documents: Array<{
    id: string
    nom: string
    type: string
  }>
}

interface SelectedSoustraitant {
  id: string
  nom: string
  ouvriers: Ouvrier[]
  selectedDocuments: Record<string, string[]> // ouvrierId -> documentIds[]
}

export default function ChantierConsultationPage(props: { params: Promise<{ chantierId: string }> }) {
  const params = use(props.params);
  const router = useRouter()
  const [chantier, setChantier] = useState<ChantierData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // États pour la modal de déclaration
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [soustraitants, setSoustraitants] = useState<Soustraitant[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [selectedSoustraitants, setSelectedSoustraitants] = useState<SelectedSoustraitant[]>([])
  const [destinataireType, setDestinataireType] = useState<'contact' | 'libre'>('contact')
  const [selectedContactId, setSelectedContactId] = useState<string>('')
  const [emailLibre, setEmailLibre] = useState<string>('')
  const [loadingSoustraitants, setLoadingSoustraitants] = useState(false)
  const [loadingContacts, setLoadingContacts] = useState(false)
  const [loadingOuvriers, setLoadingOuvriers] = useState<Record<string, boolean>>({})
  const [sending, setSending] = useState(false)

  useEffect(() => {
    const fetchChantier = async () => {
      setLoading(true);
      try {
        const chantierResponse = await fetch(`/api/chantiers/${params.chantierId}`)
        if (!chantierResponse.ok) {
          throw new Error('Chantier non trouvé')
        }
        const chantierData = await chantierResponse.json()
        setChantier(chantierData)
      } catch (error) {
        console.error('Erreur:', error)
        setError('Erreur lors du chargement du chantier')
      } finally {
        setLoading(false)
      }
    }

    fetchChantier()
  }, [params.chantierId])

  const handleShareLocation = () => {
    if (!chantier?.latitude || !chantier?.longitude) return

    const { latitude, longitude } = chantier
    
    // Créer les liens Google Maps et Waze
    const googleMapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`
    const wazeUrl = `https://waze.com/ul?ll=${latitude},${longitude}&navigate=yes`
    
    // Texte à partager
    const shareText = `Localisation du chantier "${chantier.nomChantier}":\n\nGoogle Maps: ${googleMapsUrl}\nWaze: ${wazeUrl}`

    // Utiliser l'API Web Share si disponible
    if (navigator.share) {
      navigator.share({
        title: `Localisation - ${chantier.nomChantier}`,
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

  // Charger les sous-traitants et contacts quand la modal s'ouvre
  useEffect(() => {
    if (isModalOpen && chantier) {
      // Charger les sous-traitants actifs
      setLoadingSoustraitants(true)
      fetch('/api/soustraitants?activeOnly=1')
        .then(res => res.json())
        .then(data => {
          setSoustraitants(data.filter((st: any) => st.actif !== false))
        })
        .catch(err => {
          console.error('Erreur lors du chargement des sous-traitants:', err)
          toast.error('Erreur lors du chargement des sous-traitants')
        })
        .finally(() => setLoadingSoustraitants(false))

      // Charger les contacts du client si un client est associé
      if (chantier.clientId) {
        setLoadingContacts(true)
        fetch(`/api/clients/${chantier.clientId}/contacts`)
          .then(res => res.json())
          .then(data => {
            setContacts(data.filter((c: Contact) => c.email)) // Seulement ceux avec email
          })
          .catch(err => {
            console.error('Erreur lors du chargement des contacts:', err)
          })
          .finally(() => setLoadingContacts(false))
      }
    }
  }, [isModalOpen, chantier])

  // Charger les ouvriers d'un sous-traitant
  const loadOuvriers = async (soustraitantId: string) => {
    if (loadingOuvriers[soustraitantId]) return

    setLoadingOuvriers(prev => ({ ...prev, [soustraitantId]: true }))
    try {
      const res = await fetch(`/api/sous-traitants/${soustraitantId}/ouvriers`)
      if (!res.ok) throw new Error('Erreur lors du chargement des ouvriers')
      
      const ouvriers = await res.json()
      
      // Pour chaque ouvrier, charger ses documents
      const ouvriersWithDocs = await Promise.all(
        ouvriers.map(async (ouvrier: any) => {
          try {
            const docRes = await fetch(`/api/sous-traitants/${soustraitantId}/ouvriers/${ouvrier.id}`)
            if (docRes.ok) {
              const ouvrierData = await docRes.json()
              return {
                ...ouvrier,
                documents: ouvrierData.documents || []
              }
            }
          } catch (err) {
            console.error(`Erreur lors du chargement des documents de l'ouvrier ${ouvrier.id}:`, err)
          }
          return { ...ouvrier, documents: [] }
        })
      )

      // Ajouter le sous-traitant avec ses ouvriers
      const soustraitant = soustraitants.find(st => st.id === soustraitantId)
      if (soustraitant) {
        setSelectedSoustraitants(prev => [
          ...prev,
          {
            id: soustraitantId,
            nom: soustraitant.nom,
            ouvriers: ouvriersWithDocs,
            selectedDocuments: {}
          }
        ])
      }
    } catch (err) {
      console.error('Erreur:', err)
      toast.error('Erreur lors du chargement des ouvriers')
    } finally {
      setLoadingOuvriers(prev => ({ ...prev, [soustraitantId]: false }))
    }
  }

  // Retirer un sous-traitant de la sélection
  const removeSoustraitant = (soustraitantId: string) => {
    setSelectedSoustraitants(prev => prev.filter(st => st.id !== soustraitantId))
  }

  // Toggle un document d'ouvrier
  const toggleDocument = (soustraitantId: string, ouvrierId: string, documentId: string) => {
    setSelectedSoustraitants(prev => prev.map(st => {
      if (st.id !== soustraitantId) return st
      
      const currentDocs = st.selectedDocuments[ouvrierId] || []
      const isSelected = currentDocs.includes(documentId)
      
      return {
        ...st,
        selectedDocuments: {
          ...st.selectedDocuments,
          [ouvrierId]: isSelected
            ? currentDocs.filter(id => id !== documentId)
            : [...currentDocs, documentId]
        }
      }
    }))
  }

  // Envoyer la déclaration
  const handleSendDeclaration = async () => {
    if (selectedSoustraitants.length === 0) {
      toast.error('Veuillez sélectionner au moins un sous-traitant')
      return
    }

    let destinataireEmail = ''
    if (destinataireType === 'contact') {
      if (!selectedContactId) {
        toast.error('Veuillez sélectionner un contact')
        return
      }
      const contact = contacts.find(c => c.id === selectedContactId)
      if (!contact || !contact.email) {
        toast.error('Le contact sélectionné n\'a pas d\'email')
        return
      }
      destinataireEmail = contact.email
    } else {
      if (!emailLibre.trim()) {
        toast.error('Veuillez saisir une adresse email')
        return
      }
      // Validation basique de l'email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(emailLibre.trim())) {
        toast.error('Adresse email invalide')
        return
      }
      destinataireEmail = emailLibre.trim()
    }

    setSending(true)
    try {
      const payload = {
        soustraitants: selectedSoustraitants.map(st => ({
          id: st.id,
          documentsOuvriers: Object.entries(st.selectedDocuments).map(([ouvrierId, documentIds]) => ({
            ouvrierId,
            documentIds
          })).filter(item => item.documentIds.length > 0)
        })),
        destinataireEmail,
        destinataireType
      }

      const res = await fetch(`/api/chantiers/${params.chantierId}/declaration-sous-traitance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erreur lors de l\'envoi')
      }

      toast.success('Déclaration de sous-traitance envoyée avec succès !')
      setIsModalOpen(false)
      // Réinitialiser le formulaire
      setSelectedSoustraitants([])
      setSelectedContactId('')
      setEmailLibre('')
      setDestinataireType('contact')
    } catch (err) {
      console.error('Erreur:', err)
      toast.error(err instanceof Error ? err.message : 'Erreur lors de l\'envoi de la déclaration')
    } finally {
      setSending(false)
    }
  }

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
    </div>
  )

  if (error || !chantier) return (
    <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-lg border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400">
      {error || 'Chantier non trouvé'}
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <DocumentExpirationAlert />
      
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header léger style backdrop-blur */}
        <div className="mb-6">
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-2 border-white/50 dark:border-gray-700/50 rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
            {/* Effet de fond subtil avec dégradé sky blue (couleur pour Consulter) - opacité 60% */}
            <div className="absolute inset-0 bg-gradient-to-br from-sky-600/60 via-sky-700/60 to-cyan-800/60 dark:from-sky-600/30 dark:via-sky-700/30 dark:to-cyan-800/30"></div>

            <div className="relative z-10 p-4 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-col gap-3">
                  <div className="inline-flex items-center px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full shadow-lg ring-2 ring-white/30">
                    <EyeIcon className="w-6 h-6 mr-3 text-sky-900 dark:text-white" />
                    <h1 className="text-xl font-bold text-sky-900 dark:text-white">
                      Consulter
                    </h1>
                  </div>
                  {chantier.numeroIdentification && (
                    <span className="px-3 py-1 rounded-full bg-white/30 backdrop-blur-sm text-sky-900 dark:text-white shadow-sm text-xs sm:text-sm font-semibold inline-flex w-max">
                      N° {chantier.numeroIdentification}
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white/30 backdrop-blur-sm rounded-lg text-sm font-semibold shadow-lg hover:bg-white/40 transition-all duration-200 text-sky-900 dark:text-white"
                  >
                    <EnvelopeIcon className="h-5 w-5" />
                    Déclarer sous-traitance
                  </button>
                  <button
                    onClick={() => router.push(`/chantiers/${params.chantierId}/edit`)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white/30 backdrop-blur-sm rounded-lg text-sm font-semibold shadow-lg hover:bg-white/40 transition-all duration-200 text-sky-900 dark:text-white"
                  >
                    <PencilSquareIcon className="h-5 w-5" />
                    Éditer
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Contenu principal */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Colonne principale */}
          <div className="lg:col-span-2 space-y-6">
            {/* Informations générales */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-sky-500 via-sky-600 to-cyan-700 text-white rounded-full shadow-lg ring-2 ring-sky-200 dark:ring-sky-700">
                  <InformationCircleIcon className="w-5 h-5 mr-2" />
                  <span className="font-bold text-lg">Informations du chantier</span>
                </div>
              </div>
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {chantier.dateDebut && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                        Date de commencement
                      </label>
                      <div className="flex items-center text-gray-900 dark:text-gray-100">
                        <CalendarIcon className="h-5 w-5 mr-2 text-gray-400" />
                        {new Date(chantier.dateDebut).toLocaleDateString('fr-FR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </div>
                    </div>
                  )}

                  {chantier.dureeEnJours && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                        Durée
                      </label>
                      <div className="flex items-center text-gray-900 dark:text-gray-100">
                        <ClockIcon className="h-5 w-5 mr-2 text-gray-400" />
                        {chantier.dureeEnJours} jour{chantier.dureeEnJours > 1 ? 's' : ''} ({chantier.typeDuree === 'OUVRABLE' ? 'ouvrables' : 'calendrier'})
                      </div>
                    </div>
                  )}

                  {chantier.budget && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                        Budget
                      </label>
                      <div className="flex items-center text-gray-900 dark:text-gray-100">
                        <CurrencyEuroIcon className="h-5 w-5 mr-2 text-gray-400" />
                        {new Intl.NumberFormat('fr-FR', {
                          style: 'currency',
                          currency: 'EUR'
                        }).format(chantier.budget)}
                      </div>
                    </div>
                  )}
                </div>

                {chantier.adresseChantier && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Adresse du chantier
                    </label>
                    <div className="flex items-start gap-3">
                      <MapPinIcon className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-900 dark:text-gray-100">{chantier.adresseChantier}</p>
                        {chantier.villeChantier && (
                          <p className="text-sm text-gray-600 dark:text-gray-400">{chantier.villeChantier}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {(() => {
                          // Construire l'URL Google Maps
                          let googleMapsUrl = '';
                          if (chantier.latitude && chantier.longitude) {
                            // Utiliser les coordonnées GPS si disponibles (plus précis)
                            googleMapsUrl = `https://www.google.com/maps?q=${chantier.latitude},${chantier.longitude}`;
                          } else {
                            // Sinon utiliser l'adresse textuelle (fonctionne très bien avec Google Maps)
                            const address = [chantier.adresseChantier, chantier.villeChantier].filter(Boolean).join(', ');
                            googleMapsUrl = `https://www.google.com/maps?q=${encodeURIComponent(address)}`;
                          }
                          
                          return (
                            <>
                              <a
                                href={googleMapsUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 active:bg-red-800 transition-colors text-sm font-medium shadow-md hover:shadow-lg"
                                title="Ouvrir dans Google Maps"
                              >
                                <MapIcon className="h-4 w-4" />
                                <span className="hidden sm:inline">Google Maps</span>
                              </a>
                              {chantier.latitude && chantier.longitude && (
                                <button
                                  onClick={handleShareLocation}
                                  className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 active:bg-green-800 transition-colors"
                                  title="Partager la localisation GPS"
                                >
                                  <ArrowUpTrayIcon className="h-5 w-5" />
                                </button>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                )}

                {/* Section Maître d'ouvrage */}
                {(chantier.maitreOuvrageNom || chantier.maitreOuvrageAdresse || chantier.maitreOuvrageLocalite) && (
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-6 mt-6">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                      Maître d'ouvrage
                    </label>
                    <div className="space-y-2">
                      {chantier.maitreOuvrageNom && (
                        <div className="flex items-start gap-3">
                          <UserIcon className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Nom</p>
                            <p className="text-gray-900 dark:text-gray-100">{chantier.maitreOuvrageNom}</p>
                          </div>
                        </div>
                      )}
                      {chantier.maitreOuvrageAdresse && (
                        <div className="flex items-start gap-3">
                          <MapPinIcon className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Adresse</p>
                            <p className="text-gray-900 dark:text-gray-100">{chantier.maitreOuvrageAdresse}</p>
                          </div>
                        </div>
                      )}
                      {chantier.maitreOuvrageLocalite && (
                        <div className="flex items-start gap-3">
                          <MapPinIcon className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Localité / Province</p>
                            <p className="text-gray-900 dark:text-gray-100">{chantier.maitreOuvrageLocalite}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Section Bureau d'architecture */}
                {(chantier.bureauArchitectureNom || chantier.bureauArchitectureAdresse || chantier.bureauArchitectureLocalite) && (
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-6 mt-6">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                      Bureau d'architecture
                    </label>
                    <div className="space-y-2">
                      {chantier.bureauArchitectureNom && (
                        <div className="flex items-start gap-3">
                          <BuildingOfficeIcon className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Nom</p>
                            <p className="text-gray-900 dark:text-gray-100">{chantier.bureauArchitectureNom}</p>
                          </div>
                        </div>
                      )}
                      {chantier.bureauArchitectureAdresse && (
                        <div className="flex items-start gap-3">
                          <MapPinIcon className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Adresse</p>
                            <p className="text-gray-900 dark:text-gray-100">{chantier.bureauArchitectureAdresse}</p>
                          </div>
                        </div>
                      )}
                      {chantier.bureauArchitectureLocalite && (
                        <div className="flex items-start gap-3">
                          <MapPinIcon className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Localité / Province</p>
                            <p className="text-gray-900 dark:text-gray-100">{chantier.bureauArchitectureLocalite}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Gestionnaires du chantier */}
            <ChantierGestionnaires chantierId={params.chantierId} />
          </div>

          {/* Colonne latérale */}
          <div className="space-y-6">
            {/* Client */}
            {chantier.client && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                  <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 flex items-center">
                    <BuildingOfficeIcon className="h-5 w-5 mr-2 text-blue-500" />
                    Client
                  </h2>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-lg">
                        {chantier.client.nom}
                      </h3>
                    </div>
                    {chantier.client.email && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                          Email
                        </label>
                        <a 
                          href={`mailto:${chantier.client.email}`}
                          className="text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          {chantier.client.email}
                        </a>
                      </div>
                    )}
                    {chantier.client.adresse && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                          Adresse
                        </label>
                        <p className="text-gray-900 dark:text-gray-100">
                          {chantier.client.adresse}
                        </p>
                      </div>
                    )}
                    {chantier.clientId && (
                      <button
                        onClick={() => router.push(`/clients/${chantier.clientId}`)}
                        className="w-full mt-4 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors text-sm font-medium"
                      >
                        Voir la fiche client
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Contact principal */}
            {chantier.contact && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                  <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 flex items-center">
                    <UserIcon className="h-5 w-5 mr-2 text-green-500" />
                    Contact principal
                  </h2>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-lg">
                        {chantier.contact.prenom} {chantier.contact.nom}
                      </h3>
                    </div>
                    {chantier.contact.email && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                          Email
                        </label>
                        <a 
                          href={`mailto:${chantier.contact.email}`}
                          className="text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          {chantier.contact.email}
                        </a>
                      </div>
                    )}
                    {chantier.contact.telephone && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                          Téléphone
                        </label>
                        <a 
                          href={`tel:${chantier.contact.telephone}`}
                          className="text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          {chantier.contact.telephone}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de déclaration de sous-traitance */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Déclaration de sous-traitance
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Sélection des sous-traitants */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Sous-traitants à déclarer
                </label>
                <div className="flex gap-2">
                  <select
                    value=""
                    onChange={(e) => {
                      const soustraitantId = e.target.value
                      if (soustraitantId && !selectedSoustraitants.find(st => st.id === soustraitantId)) {
                        loadOuvriers(soustraitantId)
                      }
                      e.target.value = ''
                    }}
                    disabled={loadingSoustraitants}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    <option value="">Sélectionner un sous-traitant...</option>
                    {soustraitants
                      .filter(st => !selectedSoustraitants.find(selected => selected.id === st.id))
                      .map(st => (
                        <option key={st.id} value={st.id}>{st.nom}</option>
                      ))}
                  </select>
                </div>

                {/* Liste des sous-traitants sélectionnés */}
                {selectedSoustraitants.length > 0 && (
                  <div className="mt-4 space-y-4">
                    {selectedSoustraitants.map(st => (
                      <div key={st.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100">{st.nom}</h3>
                          <button
                            onClick={() => removeSoustraitant(st.id)}
                            className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </div>

                        {/* Ouvriers et documents */}
                        {loadingOuvriers[st.id] ? (
                          <div className="text-sm text-gray-500 dark:text-gray-400">Chargement des ouvriers...</div>
                        ) : st.ouvriers.length > 0 ? (
                          <div className="space-y-3">
                            {st.ouvriers.map(ouvrier => (
                              <div key={ouvrier.id} className="ml-4 border-l-2 border-gray-200 dark:border-gray-700 pl-4">
                                <div className="font-medium text-sm text-gray-700 dark:text-gray-300 mb-2">
                                  {ouvrier.prenom} {ouvrier.nom}
                                </div>
                                {ouvrier.documents.length > 0 ? (
                                  <div className="space-y-1">
                                    {ouvrier.documents.map(doc => (
                                      <label key={doc.id} className="flex items-center space-x-2 text-sm">
                                        <input
                                          type="checkbox"
                                          checked={(st.selectedDocuments[ouvrier.id] || []).includes(doc.id)}
                                          onChange={() => toggleDocument(st.id, ouvrier.id, doc.id)}
                                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="text-gray-600 dark:text-gray-400">
                                          {doc.type} - {doc.nom}
                                        </span>
                                      </label>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="text-xs text-gray-500 dark:text-gray-500">Aucun document disponible</div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-sm text-gray-500 dark:text-gray-400 ml-4">Aucun ouvrier trouvé</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Destinataire */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Destinataire
                </label>
                <div className="space-y-3">
                  <div className="flex gap-4">
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        value="contact"
                        checked={destinataireType === 'contact'}
                        onChange={(e) => setDestinataireType(e.target.value as 'contact')}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Contact du client</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        value="libre"
                        checked={destinataireType === 'libre'}
                        onChange={(e) => setDestinataireType(e.target.value as 'libre')}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Adresse email libre</span>
                    </label>
                  </div>

                  {destinataireType === 'contact' ? (
                    <select
                      value={selectedContactId}
                      onChange={(e) => setSelectedContactId(e.target.value)}
                      disabled={loadingContacts || !chantier?.clientId}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    >
                      <option value="">Sélectionner un contact...</option>
                      {contacts.map(contact => (
                        <option key={contact.id} value={contact.id}>
                          {contact.prenom} {contact.nom} {contact.email ? `(${contact.email})` : ''}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="email"
                      value={emailLibre}
                      onChange={(e) => setEmailLibre(e.target.value)}
                      placeholder="email@example.com"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setIsModalOpen(false)}
                disabled={sending}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleSendDeclaration}
                disabled={sending || selectedSoustraitants.length === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {sending ? 'Envoi...' : 'Envoyer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
