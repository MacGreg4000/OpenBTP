'use client'
import { useState, useEffect, use } from 'react';
import Link from 'next/link'
import { PlusIcon, DocumentTextIcon, TrashIcon, PencilIcon, EyeIcon, EnvelopeIcon } from '@heroicons/react/24/outline'
import { DocumentExpirationAlert } from '@/components/DocumentExpirationAlert'
import { SendRapportEmailModal } from '@/components/modals/SendRapportEmailModal'
import toast from 'react-hot-toast'

interface RapportVisite {
  id: number
  nom: string
  url: string
  createdAt: string
  createdBy: string
  User: {
    name: string | null
    email: string
  }
}

export default function RapportsVisitePage(props: { params: Promise<{ chantierId: string }> }) {
  const params = use(props.params);
  const [rapports, setRapports] = useState<RapportVisite[]>([])
  const [chantier, setChantier] = useState<{ nomChantier?: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [emailModalOpen, setEmailModalOpen] = useState(false)
  const [selectedRapport, setSelectedRapport] = useState<{ id: number; nom: string } | null>(null)

  useEffect(() => {
    const fetchChantier = async () => {
      try {
        const res = await fetch(`/api/chantiers/${params.chantierId}`)
        if (!res.ok) throw new Error('Erreur lors de la récupération du chantier')
        const data = await res.json()
        setChantier(data)
      } catch (error) {
        console.error('Erreur:', error)
        setError('Erreur lors du chargement du chantier')
      }
    }

    const fetchRapports = async () => {
      try {
        const res = await fetch(`/api/chantiers/${params.chantierId}/documents`)
        if (!res.ok) throw new Error('Erreur lors de la récupération des documents')
        const data = await res.json()
        
        if (Array.isArray(data)) {
          const rapportsVisite = data.filter(doc => doc.type === 'rapport-visite')
          setRapports(rapportsVisite)
        }
      } catch (error) {
        console.error('Erreur:', error)
        setError('Erreur lors du chargement des rapports')
      } finally {
        setLoading(false)
      }
    }

    fetchChantier()
    fetchRapports()
  }, [params.chantierId])

  const handleDeleteRapport = async (id: number) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce rapport ?')) return

    try {
      const res = await fetch(`/api/chantiers/${params.chantierId}/documents/${id}`, {
        method: 'DELETE'
      })

      if (!res.ok) throw new Error('Erreur lors de la suppression')

      setRapports(prev => prev.filter(rapport => rapport.id !== id))
      toast.success('Rapport supprimé avec succès')
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors de la suppression du rapport')
    }
  }

  const handleOpenEmailModal = (rapportId: number, rapportNom: string) => {
    setSelectedRapport({ id: rapportId, nom: rapportNom })
    setEmailModalOpen(true)
  }

  const handleCloseEmailModal = () => {
    setEmailModalOpen(false)
    setSelectedRapport(null)
  }

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
    </div>
  )

  if (error) return (
    <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-lg border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400">
      {error}
    </div>
  )

  if (!chantier) return (
    <div className="bg-yellow-50 dark:bg-yellow-900/10 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-400">
      Chantier non trouvé
    </div>
  )

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <DocumentExpirationAlert />
      
      {/* Header léger style backdrop-blur */}
      <div className="mb-6">
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-2 border-white/50 dark:border-gray-700/50 rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
          {/* Effet de fond subtil avec dégradé orange/red (couleur de l'icône Rapports) - opacité 60% */}
          <div className="absolute inset-0 bg-gradient-to-br from-orange-600/60 via-orange-700/60 to-red-800/60 dark:from-orange-600/30 dark:via-orange-700/30 dark:to-red-800/30"></div>
          
          <div className="relative z-10 p-4 sm:p-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3 flex-1">
                <div className="inline-flex items-center px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full shadow-lg ring-2 ring-white/30">
                  <DocumentTextIcon className="w-6 h-6 mr-3 text-orange-900 dark:text-white" />
                  <h1 className="text-xl font-bold text-orange-900 dark:text-white">
                    Rapports de visite
                  </h1>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <Link
                  href={`/chantiers/${params.chantierId}/rapports/nouveau`}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white/30 backdrop-blur-sm rounded-lg text-sm font-semibold shadow-lg hover:bg-white/40 transition-all duration-200 text-orange-900 dark:text-white"
                >
                  <PlusIcon className="h-5 w-5" />
                  Nouveau rapport
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Contenu principal */}
      <div className="space-y-8">
          {/* Section Rapports de visite */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-6">
              {rapports.length === 0 ? (
                <div className="text-center py-12 bg-gradient-to-br from-orange-50 via-amber-100 to-rose-100 dark:from-orange-900/20 dark:via-amber-900/25 dark:to-rose-900/30 rounded-xl border border-orange-200/80 dark:border-amber-800/60">
                  <div className="mx-auto w-20 h-20 flex items-center justify-center rounded-full bg-gradient-to-r from-orange-500 via-orange-600 to-red-600 mb-6 shadow-lg ring-2 ring-white/40">
                    <DocumentTextIcon className="h-10 w-10 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-orange-900 dark:text-white mb-2">
                    Aucun rapport de visite
                  </h3>
                  <p className="text-orange-800/80 dark:text-orange-200/80 mb-6 max-w-md mx-auto">
                    Créez votre premier rapport de visite pour documenter l'avancement des travaux.
                  </p>
                  <Link
                    href={`/chantiers/${params.chantierId}/rapports/nouveau`}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 via-orange-600 to-red-600 text-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 hover:from-orange-600 hover:to-red-700 transform hover:-translate-y-0.5"
                  >
                    <PlusIcon className="h-5 w-5" />
                    Créer un rapport
                  </Link>
                </div>
              ) : (
                <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">Nom du rapport</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">Créé par</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">Date de création</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-900 dark:divide-gray-700">
                      {rapports.map((rapport) => (
                        <tr key={rapport.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                            <a
                              href={rapport.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center"
                            >
                              <DocumentTextIcon className="h-5 w-5 mr-2" />
                              {rapport.nom}
                            </a>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {rapport.User?.name || rapport.User?.email || 'Utilisateur inconnu'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {new Date(rapport.createdAt).toLocaleDateString('fr-FR')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right space-x-2">
                            <a
                              href={rapport.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                              title="Voir le rapport"
                            >
                              <EyeIcon className="h-5 w-5 inline" />
                            </a>
                            <button
                              onClick={() => handleOpenEmailModal(rapport.id, rapport.nom)}
                              className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 ml-2"
                              title="Envoyer par email"
                            >
                              <EnvelopeIcon className="h-5 w-5 inline" />
                            </button>
                            <Link
                              href={`/chantiers/${params.chantierId}/rapports/nouveau?edit=${rapport.id}`}
                              className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 ml-2"
                              title="Modifier ce rapport"
                            >
                              <PencilIcon className="h-5 w-5 inline" />
                            </Link>
                            <button
                              onClick={() => handleDeleteRapport(rapport.id)}
                              className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 ml-2"
                              title="Supprimer ce rapport"
                            >
                              <TrashIcon className="h-5 w-5 inline" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

      {/* Modale d'envoi par email */}
      {selectedRapport && (
        <SendRapportEmailModal
          isOpen={emailModalOpen}
          onClose={handleCloseEmailModal}
          rapportId={selectedRapport.id}
          rapportNom={selectedRapport.nom}
          chantierId={params.chantierId}
        />
      )}
    </div>
  )
} 