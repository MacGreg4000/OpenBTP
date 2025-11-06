'use client'
import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation'
import { DocumentExpirationAlert } from '@/components/DocumentExpirationAlert'
import { PencilSquareIcon, BuildingOfficeIcon, UserIcon, MapPinIcon, CalendarIcon, ClockIcon, CurrencyEuroIcon, EyeIcon } from '@heroicons/react/24/outline'
import ChantierGestionnaires from '@/components/chantier/ChantierGestionnaires'

interface ChantierData {
  id?: string;
  chantierId: string;
  nomChantier: string;
  numeroIdentification?: string | null;
  dateDebut?: string | null;
  statut?: 'EN_COURS' | 'TERMINE' | 'A_VENIR' | 'EN_PREPARATION' | string;
  adresseChantier?: string | null;
  villeChantier?: string | null;
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

  const getStatutLabel = (statut: string | undefined | null) => {
    switch (statut) {
      case 'EN_COURS':
        return 'En cours'
      case 'TERMINE':
        return 'Terminé'
      case 'A_VENIR':
        return 'À venir'
      case 'EN_PREPARATION':
      default:
        return 'En préparation'
    }
  }

  const getStatutBadgeColor = (statut: string | undefined | null) => {
    switch (statut) {
      case 'EN_COURS':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'TERMINE':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'A_VENIR':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'EN_PREPARATION':
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
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
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3 flex-1">
                  <div className="inline-flex items-center px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full shadow-lg ring-2 ring-white/30">
                    <EyeIcon className="w-6 h-6 mr-3 text-sky-900 dark:text-white" />
                    <h1 className="text-xl font-bold text-sky-900 dark:text-white">
                      Consulter
                    </h1>
                  </div>
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

        {/* Informations du chantier */}
        <div className="mb-6 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {chantier.nomChantier}
                </h2>
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatutBadgeColor(chantier.statut)}`}>
                  {getStatutLabel(chantier.statut)}
                </span>
              </div>
              {chantier.numeroIdentification && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  N° {chantier.numeroIdentification}
                </p>
              )}
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
                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
                  Informations générales
                </h2>
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
                    <div className="flex items-start text-gray-900 dark:text-gray-100">
                      <MapPinIcon className="h-5 w-5 mr-2 text-gray-400 mt-0.5" />
                      <div>
                        <p>{chantier.adresseChantier}</p>
                        {chantier.villeChantier && (
                          <p className="text-sm text-gray-600 dark:text-gray-400">{chantier.villeChantier}</p>
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
