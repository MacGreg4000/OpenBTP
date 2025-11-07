'use client'
import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation'
import { DocumentExpirationAlert } from '@/components/DocumentExpirationAlert'
import { PencilSquareIcon, BuildingOfficeIcon, UserIcon, MapPinIcon, CalendarIcon, ClockIcon, CurrencyEuroIcon, EyeIcon, ArrowUpTrayIcon, MapIcon, InformationCircleIcon } from '@heroicons/react/24/outline'
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
}

export default function ChantierConsultationPage(props: { params: Promise<{ chantierId: string }> }) {
  const params = use(props.params);
  const router = useRouter()
  const [chantier, setChantier] = useState<ChantierData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
                        <span className="text-xs text-gray-500 dark:text-gray-400">Localisation:</span>
                        {chantier.latitude && chantier.longitude ? (
                          <button
                            onClick={handleShareLocation}
                            className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 active:bg-green-800 transition-colors"
                            title="Partager la localisation GPS"
                          >
                            <ArrowUpTrayIcon className="h-5 w-5" />
                          </button>
                        ) : (
                          <div className="p-2 bg-gray-200 dark:bg-gray-700 rounded-lg opacity-50" title="Aucune localisation GPS enregistrée">
                            <MapIcon className="h-5 w-5 text-gray-400" />
                          </div>
                        )}
                      </div>
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
    </div>
  )
}
