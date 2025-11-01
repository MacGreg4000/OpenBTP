'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  PlusIcon, 
  MagnifyingGlassIcon, 
  EyeIcon, 
  PencilIcon, 
  TrashIcon,
  DocumentTextIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import toast, { Toaster } from 'react-hot-toast'

interface ChoixClient {
  id: string
  nomClient: string
  telephoneClient?: string
  emailClient?: string
  dateVisite: string
  statut: 'BROUILLON' | 'PRE_CHOIX' | 'CHOIX_DEFINITIF'
  chantier?: {
    chantierId: string
    nomChantier: string
  }
  detailsChoix: Array<{
    id: string
    numeroChoix: number
    marque: string
    modele: string
    couleurPlan: string
  }>
  createdAt: string
}

const STATUTS = {
  BROUILLON: { label: 'Brouillon', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' },
  PRE_CHOIX: { label: 'Pré-choix', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
  CHOIX_DEFINITIF: { label: 'Choix définitif', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' }
}

export default function ChoixClientsPage() {
  const [choixClients, setChoixClients] = useState<ChoixClient[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatut, setFilterStatut] = useState<string>('all')
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; id: string; nom: string }>({
    show: false,
    id: '',
    nom: ''
  })

  useEffect(() => {
    fetchChoixClients()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatut])

  const fetchChoixClients = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filterStatut !== 'all') {
        params.append('statut', filterStatut)
      }
      
      const response = await fetch(`/api/choix-clients?${params}`)
      const data = await response.json()
      
      if (data.success) {
        setChoixClients(data.choixClients)
      }
    } catch (error) {
      console.error('Erreur lors du chargement des choix clients:', error)
      toast.error('Erreur lors du chargement des choix clients')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/choix-clients/${id}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        toast.success('Choix client supprimé avec succès')
        fetchChoixClients()
      } else {
        toast.error('Erreur lors de la suppression')
      }
    } catch (error) {
      console.error('Erreur lors de la suppression:', error)
      toast.error('Erreur lors de la suppression')
    } finally {
      setDeleteConfirm({ show: false, id: '', nom: '' })
    }
  }

  const filteredChoixClients = choixClients.filter(choix =>
    choix.nomClient.toLowerCase().includes(searchTerm.toLowerCase()) ||
    choix.chantier?.nomChantier.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Calculer les statistiques pour les KPIs
  const totalChoix = filteredChoixClients.length
  const choixBrouillons = filteredChoixClients.filter(c => c.statut === 'BROUILLON').length
  const choixPreChoix = filteredChoixClients.filter(c => c.statut === 'PRE_CHOIX').length
  const choixDefinitifs = filteredChoixClients.filter(c => c.statut === 'CHOIX_DEFINITIF').length

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Toaster position="top-right" />
      
      {/* En-tête avec gradient */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-700 shadow-lg">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center min-w-0">
              <DocumentTextIcon className="h-5 w-5 text-white mr-2 flex-shrink-0" />
              <div>
                <h1 className="text-xl font-bold text-white">
                  Choix Clients
                </h1>
                <p className="mt-0.5 text-xs text-purple-100 hidden sm:block">
                  Gestion des choix de carrelage en showroom
                </p>
              </div>
            </div>

            {/* Statistiques compactes */}
            <div className="flex items-center gap-2 flex-1 justify-center">
              <div className="bg-white/10 backdrop-blur-sm rounded px-2.5 py-1.5 border border-white/20 flex-1 min-w-0 max-w-[120px]">
                <div className="flex items-center gap-1.5">
                  <DocumentTextIcon className="h-4 w-4 text-white flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] font-medium text-purple-100 truncate">Total</div>
                    <div className="text-sm font-semibold text-white truncate">{totalChoix}</div>
                  </div>
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded px-2.5 py-1.5 border border-white/20 flex-1 min-w-0 max-w-[120px]">
                <div className="flex items-center gap-1.5">
                  <PencilIcon className="h-4 w-4 text-white flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] font-medium text-purple-100 truncate">Brouillons</div>
                    <div className="text-sm font-semibold text-white truncate">{choixBrouillons}</div>
                  </div>
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded px-2.5 py-1.5 border border-white/20 flex-1 min-w-0 max-w-[120px]">
                <div className="flex items-center gap-1.5">
                  <EyeIcon className="h-4 w-4 text-white flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] font-medium text-purple-100 truncate">Pré-choix</div>
                    <div className="text-sm font-semibold text-white truncate">{choixPreChoix}</div>
                  </div>
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded px-2.5 py-1.5 border border-white/20 flex-1 min-w-0 max-w-[120px]">
                <div className="flex items-center gap-1.5">
                  <CheckCircleIcon className="h-4 w-4 text-white flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] font-medium text-purple-100 truncate">Définitifs</div>
                    <div className="text-sm font-semibold text-white truncate">{choixDefinitifs}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-shrink-0">
              <Link
                href="/choix-clients/nouveau"
                className="inline-flex items-center px-3 py-1.5 border border-transparent rounded-md shadow-sm text-xs font-medium text-purple-700 bg-white hover:bg-purple-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors duration-200"
              >
                <PlusIcon className="h-3.5 w-3.5 mr-1.5" />
                <span className="hidden sm:inline">Nouveau choix</span>
                <span className="sm:hidden">Nouveau</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Filtres */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border-2 border-gray-200 dark:border-gray-700 p-6 mb-6">

          {/* Filtres et recherche */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative w-full sm:max-w-lg">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher par nom client ou chantier..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <select
              value={filterStatut}
              onChange={(e) => setFilterStatut(e.target.value)}
              className="w-full sm:w-56 px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tous les statuts</option>
              <option value="BROUILLON">Brouillon</option>
              <option value="PRE_CHOIX">Pré-choix</option>
              <option value="CHOIX_DEFINITIF">Choix définitif</option>
            </select>
          </div>
        </div>
      </div>

      {/* Contenu */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Liste */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600 dark:text-gray-400">Chargement...</span>
        </div>
      ) : filteredChoixClients.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow-lg border-2 border-gray-200 dark:border-gray-700">
          <DocumentTextIcon className="h-12 w-12 mx-auto text-gray-400 mb-3" />
          <p className="text-gray-600 dark:text-gray-400">
            {searchTerm ? 'Aucun résultat trouvé' : 'Aucun choix client enregistré'}
          </p>
          {!searchTerm && (
            <Link
              href="/choix-clients/nouveau"
              className="inline-flex items-center mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Créer le premier choix
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border-2 border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Chantier
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Date visite
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Nb choix
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredChoixClients.map((choix) => (
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
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {choix.chantier ? (
                        <Link
                          href={`/chantiers/${choix.chantier.chantierId}`}
                          className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          {choix.chantier.nomChantier}
                        </Link>
                      ) : (
                        <span className="text-sm text-gray-400 dark:text-gray-500 italic">
                          Non associé
                        </span>
                      )}
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
                          <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-xs">
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
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm({ show: false, id: '', nom: '' })}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm.id)}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}

