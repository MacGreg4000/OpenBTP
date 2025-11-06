'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { EyeIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

interface ChoixClient {
  id: string
  nomClient: string
  telephoneClient?: string | null
  emailClient?: string | null
  dateVisite: string
  statut: 'BROUILLON' | 'PRE_CHOIX' | 'CHOIX_DEFINITIF'
  detailsChoix: Array<{
    id: string
    numeroChoix: number
    couleurPlan: string
    localisations: unknown
    marque: string
    modele: string
  }>
}

interface ChoixClientTabContentProps {
  chantierId: string
}

const STATUTS = {
  BROUILLON: {
    label: 'Brouillon',
    color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
  },
  PRE_CHOIX: {
    label: 'Pré-choix',
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
  },
  CHOIX_DEFINITIF: {
    label: 'Choix définitif',
    color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
  }
}

export default function ChoixClientTabContent({ chantierId }: ChoixClientTabContentProps) {
  const [choixClients, setChoixClients] = useState<ChoixClient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; id: string | null; nom: string }>({
    show: false,
    id: null,
    nom: ''
  })

  const fetchChoixClients = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch(`/api/choix-clients?chantierId=${chantierId}`)
      
      if (!response.ok) {
        throw new Error('Erreur lors du chargement des choix clients')
      }
      
      const data = await response.json()
      setChoixClients(data.choixClients || [])
    } catch (error) {
      console.error('Erreur:', error)
      setError('Erreur lors du chargement des choix clients')
    } finally {
      setLoading(false)
    }
  }, [chantierId])

  useEffect(() => {
    fetchChoixClients()
  }, [fetchChoixClients])

  const handleDelete = async () => {
    if (!deleteConfirm.id) return

    try {
      const response = await fetch(`/api/choix-clients/${deleteConfirm.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setChoixClients(prev => prev.filter(c => c.id !== deleteConfirm.id))
        setDeleteConfirm({ show: false, id: null, nom: '' })
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Erreur lors de la suppression')
      }
    } catch (error) {
      console.error('Erreur:', error)
      setError('Erreur lors de la suppression')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
        <span className="ml-2 text-gray-600 dark:text-gray-400">Chargement des choix clients...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p className="text-red-800 dark:text-red-200">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header avec style cohérent */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-6">
        <div className="mb-4 pb-3 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-bold text-emerald-900 dark:text-white">Choix clients</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Liste des choix clients associés à ce chantier
          </p>
        </div>
      </div>

      {choixClients.length === 0 ? (
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-12 text-center">
          <p className="text-gray-500 dark:text-gray-400">
            Aucun choix client associé à ce chantier
          </p>
        </div>
      ) : (
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Client
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Date de visite
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Choix
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Statut
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {choixClients.map((choix) => (
                  <tr key={choix.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {choix.nomClient}
                        </div>
                        {choix.telephoneClient && (
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {choix.telephoneClient}
                          </div>
                        )}
                        {choix.emailClient && (
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {choix.emailClient}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {format(new Date(choix.dateVisite), 'dd/MM/yyyy', { locale: fr })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex gap-1">
                        {choix.detailsChoix.slice(0, 3).map((detail) => (
                          <div
                            key={detail.id}
                            className="w-6 h-6 rounded-full border-2 border-white dark:border-gray-800"
                            style={{ backgroundColor: detail.couleurPlan }}
                            title={`${detail.marque} ${detail.modele}`}
                          />
                        ))}
                        {choix.detailsChoix.length > 3 && (
                          <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-xs text-gray-700 dark:text-gray-300">
                            +{choix.detailsChoix.length - 3}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${STATUTS[choix.statut].color}`}>
                        {STATUTS[choix.statut].label}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/choix-clients/${choix.id}`}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                          title="Voir"
                        >
                          <EyeIcon className="h-5 w-5" />
                        </Link>
                        <Link
                          href={`/choix-clients/${choix.id}/edit`}
                          className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300"
                          title="Modifier"
                        >
                          <PencilIcon className="h-5 w-5" />
                        </Link>
                        <button
                          onClick={() => setDeleteConfirm({ show: true, id: choix.id, nom: choix.nomClient })}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                          title="Supprimer"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de confirmation de suppression */}
      {deleteConfirm.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Confirmer la suppression
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              Êtes-vous sûr de vouloir supprimer le choix de <strong>{deleteConfirm.nom}</strong> ? 
              Cette action est irréversible.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm({ show: false, id: null, nom: '' })}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

