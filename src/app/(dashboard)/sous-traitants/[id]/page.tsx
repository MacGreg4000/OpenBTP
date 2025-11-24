'use client'
import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { 
  EyeIcon, 
  PencilSquareIcon, 
  EnvelopeIcon, 
  PhoneIcon, 
  MapPinIcon,
  BuildingOfficeIcon,
  UserIcon,
  KeyIcon,
  GlobeAltIcon,
  UserGroupIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline'
import { Button } from '@/components/ui'

interface SousTraitantData {
  id: string
  nom: string
  email: string
  contact: string | null
  telephone: string | null
  adresse: string | null
  tva: string | null
  logo: string | null
  actif: boolean | null
  createdAt: string
  updatedAt: string
  ouvriers?: Array<{
    id: string
    nom: string
    prenom: string
    email: string | null
    telephone: string | null
    poste: string | null
  }>
}

export default function SousTraitantConsultationPage(
  props: { 
    params: Promise<{ id: string }> 
  }
) {
  const params = use(props.params);
  const router = useRouter()
  const { data: session } = useSession()
  const [sousTraitant, setSousTraitant] = useState<SousTraitantData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pin, setPin] = useState<string>('')

  const portalLink = typeof window !== 'undefined' 
    ? `${window.location.origin}/public/portail/soustraitant/${params.id}` 
    : `/public/portail/soustraitant/${params.id}`

  useEffect(() => {
    if (session) {
      fetch(`/api/sous-traitants/${params.id}`)
        .then(res => {
          if (!res.ok) {
            throw new Error('Sous-traitant non trouvé')
          }
          return res.json()
        })
        .then(data => {
          setSousTraitant(data)
          setLoading(false)
        })
        .then(async () => {
          try {
            const resPin = await fetch(`/api/sous-traitants/${params.id}/pin`)
            const dataPin = await resPin.json()
            setPin(dataPin.pin || '')
          } catch {}
        })
        .catch(error => {
          console.error('Erreur:', error)
          setError('Erreur lors du chargement des données')
          setLoading(false)
        })
    }
  }, [session, params.id])

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (error || !sousTraitant) {
    return (
      <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-lg border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400">
        {error || 'Sous-traitant non trouvé'}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-2 border-white/50 dark:border-gray-700/50 rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/60 via-indigo-700/60 to-purple-800/60 dark:from-blue-600/30 dark:via-indigo-700/30 dark:to-purple-800/30"></div>

            <div className="relative z-10 p-4 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-col gap-3">
                  <div className="inline-flex items-center px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full shadow-lg ring-2 ring-white/30">
                    <EyeIcon className="w-6 h-6 mr-3 text-blue-900 dark:text-white" />
                    <h1 className="text-xl font-bold text-blue-900 dark:text-white">
                      Consulter le Sous-Traitant
                    </h1>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-white/30 backdrop-blur-sm text-blue-900 dark:text-white shadow-sm text-xs sm:text-sm font-semibold inline-flex w-max">
                    {sousTraitant.nom}
                  </span>
                </div>
                <div className="flex items-center space-x-4">
                  <Button
                    variant="outline"
                    onClick={() => router.push(`/sous-traitants/${params.id}/edit`)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white/30 backdrop-blur-sm rounded-lg text-sm font-semibold shadow-lg hover:bg-white/40 transition-all duration-200 text-blue-900 dark:text-white border-white/50"
                  >
                    <PencilSquareIcon className="h-5 w-5" />
                    Éditer
                  </Button>
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
                <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-500 via-indigo-600 to-purple-700 text-white rounded-full shadow-lg ring-2 ring-blue-200 dark:ring-blue-700">
                  <InformationCircleIcon className="w-5 h-5 mr-2" />
                  <span className="font-bold text-lg">Informations du sous-traitant</span>
                </div>
              </div>
              <div className="p-6 space-y-6">
                {/* Logo */}
                {sousTraitant.logo && (
                  <div className="flex justify-center">
                    <img
                      src={sousTraitant.logo}
                      alt={`Logo ${sousTraitant.nom}`}
                      className="h-32 w-32 object-contain border border-gray-300 dark:border-gray-600 rounded-lg"
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Nom de l'entreprise
                    </label>
                    <div className="flex items-center text-gray-900 dark:text-gray-100">
                      <BuildingOfficeIcon className="h-5 w-5 mr-2 text-gray-400" />
                      {sousTraitant.nom}
                    </div>
                  </div>

                  {sousTraitant.contact && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                        Personne de contact
                      </label>
                      <div className="flex items-center text-gray-900 dark:text-gray-100">
                        <UserIcon className="h-5 w-5 mr-2 text-gray-400" />
                        {sousTraitant.contact}
                      </div>
                    </div>
                  )}

                  {sousTraitant.email && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                        Email
                      </label>
                      <div className="flex items-center text-gray-900 dark:text-gray-100">
                        <EnvelopeIcon className="h-5 w-5 mr-2 text-gray-400" />
                        <a 
                          href={`mailto:${sousTraitant.email}`}
                          className="text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          {sousTraitant.email}
                        </a>
                      </div>
                    </div>
                  )}

                  {sousTraitant.telephone && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                        Téléphone
                      </label>
                      <div className="flex items-center text-gray-900 dark:text-gray-100">
                        <PhoneIcon className="h-5 w-5 mr-2 text-gray-400" />
                        <a 
                          href={`tel:${sousTraitant.telephone}`}
                          className="text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          {sousTraitant.telephone}
                        </a>
                      </div>
                    </div>
                  )}

                  {sousTraitant.tva && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                        Numéro de TVA
                      </label>
                      <div className="flex items-center text-gray-900 dark:text-gray-100">
                        <BuildingOfficeIcon className="h-5 w-5 mr-2 text-gray-400" />
                        {sousTraitant.tva}
                      </div>
                    </div>
                  )}

                  {sousTraitant.adresse && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                        Adresse
                      </label>
                      <div className="flex items-start text-gray-900 dark:text-gray-100">
                        <MapPinIcon className="h-5 w-5 mr-2 text-gray-400 mt-0.5" />
                        <span>{sousTraitant.adresse}</span>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Statut
                    </label>
                    <div className="flex items-center">
                      {sousTraitant.actif !== false ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100">
                          Actif
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                          Inactif
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Ouvriers */}
            {sousTraitant.ouvriers && sousTraitant.ouvriers.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                  <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-500 via-indigo-600 to-purple-700 text-white rounded-full shadow-lg ring-2 ring-blue-200 dark:ring-blue-700">
                    <UserGroupIcon className="w-5 h-5 mr-2" />
                    <span className="font-bold text-lg">Ouvriers ({sousTraitant.ouvriers.length})</span>
                  </div>
                </div>
                <div className="p-6">
                  <Link 
                    href={`/sous-traitants/${params.id}/ouvriers`}
                    className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                  >
                    Voir tous les ouvriers →
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Colonne latérale */}
          <div className="space-y-6">
            {/* Accès Portail */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-full shadow-lg">
                  <KeyIcon className="w-5 h-5 mr-2" />
                  <span className="font-bold text-lg">Accès Portail</span>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                    Code PIN
                  </label>
                  <div className="flex items-center text-gray-900 dark:text-gray-100">
                    <KeyIcon className="h-5 w-5 mr-2 text-gray-400" />
                    {pin ? (
                      <span className="font-mono text-lg">{pin}</span>
                    ) : (
                      <span className="text-gray-400 italic">Non défini</span>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                    Lien d'accès public
                  </label>
                  <div className="flex items-center gap-2">
                    <GlobeAltIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
                    <a 
                      href={portalLink} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-blue-600 dark:text-blue-400 hover:underline text-sm break-all"
                    >
                      {portalLink}
                    </a>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        navigator.clipboard.writeText(portalLink)
                        alert('Lien copié dans le presse-papiers')
                      } catch {
                        alert('Impossible de copier le lien')
                      }
                    }}
                    className="mt-2 px-3 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Copier le lien
                  </button>
                </div>
              </div>
            </div>

            {/* Informations système */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Informations système</span>
              </div>
              <div className="p-6 space-y-3 text-sm">
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Créé le :</span>
                  <span className="ml-2 text-gray-900 dark:text-gray-100">
                    {new Date(sousTraitant.createdAt).toLocaleDateString('fr-FR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Modifié le :</span>
                  <span className="ml-2 text-gray-900 dark:text-gray-100">
                    {new Date(sousTraitant.updatedAt).toLocaleDateString('fr-FR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

