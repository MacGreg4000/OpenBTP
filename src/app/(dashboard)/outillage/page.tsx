'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  PlusIcon, 
  QrCodeIcon,
  EyeIcon,
  TrashIcon,
  WrenchScrewdriverIcon,
  MapPinIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  Squares2X2Icon,
  ListBulletIcon,
  MagnifyingGlassIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'

interface Machine {
  id: string
  nom: string
  modele: string
  localisation: string
  statut: 'DISPONIBLE' | 'PRETE' | 'EN_PANNE' | 'EN_REPARATION' | 'MANQUE_CONSOMMABLE'
}

export default function OutillagePage() {
  const [machines, setMachines] = useState<Machine[]>([])
  const [loading, setLoading] = useState(true)
  const [machineToDelete, setMachineToDelete] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [searchTerm, setSearchTerm] = useState('')

  const isAdmin = false

  useEffect(() => {
    fetchMachines()
  }, [])

  const fetchMachines = async () => {
    try {
      const response = await fetch('/api/outillage/machines')
      if (!response.ok) throw new Error('Erreur lors de la récupération des machines')
      const data = await response.json()
      setMachines(data)
    } catch (error) {
      console.error('Erreur:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatutLabel = (statut: Machine['statut']) => {
    const labels = {
      DISPONIBLE: 'Disponible',
      PRETE: 'Prêtée',
      EN_PANNE: 'En panne',
      EN_REPARATION: 'En réparation',
      MANQUE_CONSOMMABLE: 'Manque consommable'
    }
    return labels[statut]
  }

  // Filtrer les machines selon le terme de recherche
  const filteredMachines = machines.filter(machine => {
    if (!searchTerm.trim()) return true
    
    const searchLower = searchTerm.toLowerCase()
    return (
      machine.nom.toLowerCase().includes(searchLower) ||
      machine.modele.toLowerCase().includes(searchLower) ||
      machine.localisation.toLowerCase().includes(searchLower) ||
      getStatutLabel(machine.statut).toLowerCase().includes(searchLower)
    )
  })

  const getStatutStyle = (statut: Machine['statut']) => {
    const styles = {
      DISPONIBLE: {
        bg: 'bg-green-100 dark:bg-green-900/20',
        text: 'text-green-800 dark:text-green-200',
        icon: CheckCircleIcon
      },
      PRETE: {
        bg: 'bg-blue-100 dark:bg-blue-900/20',
        text: 'text-blue-800 dark:text-blue-200',
        icon: ClockIcon
      },
      EN_PANNE: {
        bg: 'bg-red-100 dark:bg-red-900/20',
        text: 'text-red-800 dark:text-red-200',
        icon: ExclamationCircleIcon
      },
      EN_REPARATION: {
        bg: 'bg-yellow-100 dark:bg-yellow-900/20',
        text: 'text-yellow-800 dark:text-yellow-200',
        icon: WrenchScrewdriverIcon
      },
      MANQUE_CONSOMMABLE: {
        bg: 'bg-orange-100 dark:bg-orange-900/20',
        text: 'text-orange-800 dark:text-orange-200',
        icon: ExclamationTriangleIcon
      }
    }
    return styles[statut]
  }

  const handleDeleteClick = (machineId: string) => {
    setMachineToDelete(machineId)
  }

  const confirmDelete = async () => {
    if (!machineToDelete) return
    
    try {
      setDeleteError(null)
      const response = await fetch(`/api/outillage/machines/${machineToDelete}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('Réponse d\'erreur:', response.status, errorData)
        throw new Error(errorData.error || `Erreur lors de la suppression (${response.status})`)
      }
      
      // Mettre à jour la liste des machines
      setMachines(machines.filter(machine => machine.id !== machineToDelete))
      setMachineToDelete(null)
    } catch (error: unknown) {
      console.error('Erreur lors de la suppression:', error)
      const message = error instanceof Error ? error.message : 'Erreur inconnue lors de la suppression'
      setDeleteError(message)
    }
  }

  const cancelDelete = () => {
    setMachineToDelete(null)
    setDeleteError(null)
  }

  // Calculs pour les statistiques (basés sur les machines filtrées)
  const totalMachines = filteredMachines.length
  const machinesDisponibles = filteredMachines.filter(m => m.statut === 'DISPONIBLE').length
  const machinesEnPanne = filteredMachines.filter(m => m.statut === 'EN_PANNE' || m.statut === 'EN_REPARATION').length
  const machinesPretees = filteredMachines.filter(m => m.statut === 'PRETE').length

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* En-tête avec gradient */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="md:flex md:items-center md:justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center">
                <WrenchScrewdriverIcon className="h-8 w-8 text-white mr-3" />
                <div>
                  <h1 className="text-3xl font-bold text-white">
                    Outillage
                  </h1>
                  <p className="mt-2 text-blue-100">
                    Gestion des machines et outils
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-4 md:mt-0 flex space-x-3">
              {/* Boutons de vue */}
              <div className="flex rounded-md shadow-sm">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`inline-flex items-center px-3 py-2 rounded-l-md border text-sm font-medium ${
                    viewMode === 'grid'
                      ? 'bg-white text-blue-700 border-white'
                      : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
                  } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200`}
                >
                  <Squares2X2Icon className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`inline-flex items-center px-3 py-2 rounded-r-md border-t border-r border-b text-sm font-medium ${
                    viewMode === 'list'
                      ? 'bg-white text-blue-700 border-white'
                      : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
                  } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200`}
                >
                  <ListBulletIcon className="h-4 w-4" />
                </button>
              </div>
              
              <Link
                href="/outillage/scanner"
                className="inline-flex items-center px-4 py-2 border border-white/20 rounded-md shadow-sm text-sm font-medium text-white bg-white/10 hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
              >
                <QrCodeIcon className="h-4 w-4 mr-2" />
                Scanner
              </Link>
              <Link
                href="/outillage/nouveau"
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-blue-700 bg-white hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Nouvelle machine
              </Link>
            </div>
          </div>

          {/* Statistiques */}
          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg px-5 py-3 border border-white/20">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <WrenchScrewdriverIcon className="h-6 w-6 text-white" />
                </div>
                <div className="ml-3 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-blue-100 truncate">
                      Total machines
                    </dt>
                    <dd className="text-lg font-semibold text-white">
                      {totalMachines}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-lg px-5 py-3 border border-white/20">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CheckCircleIcon className="h-6 w-6 text-white" />
                </div>
                <div className="ml-3 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-blue-100 truncate">
                      Disponibles
                    </dt>
                    <dd className="text-lg font-semibold text-white">
                      {machinesDisponibles}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-lg px-5 py-3 border border-white/20">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ClockIcon className="h-6 w-6 text-white" />
                </div>
                <div className="ml-3 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-blue-100 truncate">
                      Prêtées
                    </dt>
                    <dd className="text-lg font-semibold text-white">
                      {machinesPretees}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-lg px-5 py-3 border border-white/20">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ExclamationCircleIcon className="h-6 w-6 text-white" />
                </div>
                <div className="ml-3 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-blue-100 truncate">
                      En panne
                    </dt>
                    <dd className="text-lg font-semibold text-white">
                      {machinesEnPanne}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Barre de recherche */}
        <div className="mb-6">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Rechercher par nom, modèle, localisation ou statut..."
              className="block w-full pl-12 pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm placeholder-gray-500 dark:placeholder-gray-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            )}
          </div>
          {searchTerm && (
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              {filteredMachines.length} machine{filteredMachines.length !== 1 ? 's' : ''} trouvée{filteredMachines.length !== 1 ? 's' : ''} sur {machines.length}
            </p>
          )}
        </div>

        {filteredMachines.length === 0 ? (
          <div className="text-center py-12">
            <WrenchScrewdriverIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">
              {searchTerm ? 'Aucune machine trouvée' : 'Aucune machine'}
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {searchTerm 
                ? 'Aucune machine ne correspond à votre recherche. Essayez avec d\'autres termes.'
                : 'Commencez par ajouter une nouvelle machine à votre inventaire.'
              }
            </p>
            {!searchTerm && (
              <div className="mt-6">
                <Link
                  href="/outillage/nouveau"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Nouvelle machine
                </Link>
              </div>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredMachines.map((machine) => {
              const statutStyle = getStatutStyle(machine.statut)
              const StatutIcon = statutStyle.icon
              
              return (
                <div key={machine.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-200 overflow-hidden">
                  {/* En-tête de la carte */}
                  <div className="p-6 pb-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                          {machine.nom}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {machine.modele}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2 ml-4">
                        <Link
                          href={`/outillage/${machine.id}`}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors duration-200"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </Link>
                        {isAdmin && (
                          <button
                            onClick={() => handleDeleteClick(machine.id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors duration-200"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Localisation */}
                    <div className="mt-4 flex items-center text-sm text-gray-600 dark:text-gray-400">
                      <MapPinIcon className="h-4 w-4 mr-2 text-gray-400" />
                      <span>{machine.localisation}</span>
                    </div>

                    {/* Statut */}
                    <div className="mt-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statutStyle.bg} ${statutStyle.text}`}>
                        <StatutIcon className="h-3 w-3 mr-1" />
                        {getStatutLabel(machine.statut)}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-600">
                    <div className="flex justify-between items-center">
                      <Link
                        href={`/outillage/${machine.id}`}
                        className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium hover:underline transition-colors duration-200"
                      >
                        <EyeIcon className="h-4 w-4 mr-1" />
                        Voir détails
                      </Link>
                      
                      {machine.statut === 'DISPONIBLE' && (
                        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400">
                          <CheckCircleIcon className="h-3 w-3 mr-1" />
                          Prêt à utiliser
                        </span>
                      )}
                      
                      {machine.statut === 'EN_PANNE' && (
                        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400">
                          <ExclamationCircleIcon className="h-3 w-3 mr-1" />
                          Hors service
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Machine
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Localisation
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="relative px-6 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredMachines.map((machine) => {
                  const statutStyle = getStatutStyle(machine.statut)
                  const StatutIcon = statutStyle.icon
                  
                  return (
                    <tr key={machine.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-200">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                              <WrenchScrewdriverIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {machine.nom}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {machine.modele}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                          <MapPinIcon className="h-4 w-4 mr-2 text-gray-400" />
                          {machine.localisation}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statutStyle.bg} ${statutStyle.text}`}>
                          <StatutIcon className="h-3 w-3 mr-1" />
                          {getStatutLabel(machine.statut)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-3">
                          <Link
                            href={`/outillage/${machine.id}`}
                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors duration-200"
                          >
                            <EyeIcon className="h-5 w-5" />
                          </Link>
                          {isAdmin && (
                            <button
                              onClick={() => handleDeleteClick(machine.id)}
                              className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 transition-colors duration-200"
                            >
                              <TrashIcon className="h-5 w-5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de confirmation de suppression */}
      {machineToDelete && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 dark:bg-gray-900 dark:bg-opacity-80 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full shadow-xl">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Confirmer la suppression</h3>
            
            {deleteError && (
              <div className="mt-4 p-3 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-md text-sm">
                {deleteError}
              </div>
            )}
            
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-300">
              Êtes-vous sûr de vouloir supprimer cette machine ? Cette action est irréversible.
            </p>
            <div className="mt-4 flex justify-end space-x-3">
              <button
                onClick={cancelDelete}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800"
              >
                Annuler
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 dark:bg-red-700 border border-transparent rounded-md hover:bg-red-700 dark:hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:focus:ring-offset-gray-800"
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