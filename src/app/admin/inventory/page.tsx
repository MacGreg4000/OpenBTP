'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { RackWithEmplacements } from '@/types/inventory'
import { 
  PlusIcon,
  Cog6ToothIcon,
  BuildingStorefrontIcon,
  ChartBarIcon,
  CubeIcon,
  ArchiveBoxIcon,
  EyeIcon,
  PencilSquareIcon,
  TrashIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'

export default function RackAdminPage() {
  const router = useRouter()
  const [racks, setRacks] = useState<RackWithEmplacements[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // État pour le nouveau rack
  const [showForm, setShowForm] = useState(false)
  const [nom, setNom] = useState('')
  const [position, setPosition] = useState('')
  const [lignes, setLignes] = useState(4)
  const [colonnes, setColonnes] = useState(5)
  const [submitting, setSubmitting] = useState(false)
  const [rackToDelete, setRackToDelete] = useState<RackWithEmplacements | null>(null)
  const [deleting, setDeleting] = useState(false)
  
  // Chargement des racks
  useEffect(() => {
    const loadRacks = async () => {
      try {
        const response = await fetch('/api/inventory/racks')
        if (!response.ok) {
          throw new Error('Erreur lors du chargement des racks')
        }
        const data = await response.json()
        setRacks(data)
      } catch (err) {
        setError('Erreur lors du chargement des racks')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    
    loadRacks()
  }, [])
  
  // Créer un nouveau rack
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    
    try {
      const response = await fetch('/api/inventory/racks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nom,
          position,
          lignes: Number(lignes),
          colonnes: Number(colonnes),
        }),
      })
      
      if (!response.ok) {
        throw new Error('Erreur lors de la création du rack')
      }
      
      const newRack = await response.json()
      const newRackTyped: RackWithEmplacements = { ...newRack, emplacements: [] }
      setRacks([newRackTyped, ...racks])
      
      // Réinitialiser le formulaire
      setNom('')
      setPosition('')
      setLignes(4)
      setColonnes(5)
      setShowForm(false)
    } catch (err) {
      setError('Erreur lors de la création du rack')
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }
  
  // Générer la prévisualisation du rack
  const renderRackPreview = () => {
    const grid = []
    
    // En-têtes des colonnes
    const colHeaders = []
    for (let col = 1; col <= colonnes; col++) {
      colHeaders.push(
        <div key={`col-${col}`} className="w-10 h-8 flex items-center justify-center text-xs font-medium text-gray-600 dark:text-gray-400">
          {col}
        </div>
      )
    }
    
    grid.push(
      <div key="col-headers" className="flex">
        <div className="w-8"></div>
        {colHeaders}
      </div>
    )
    
    // Lignes du rack
    for (let ligne = 1; ligne <= lignes; ligne++) {
      const rowCells = []
      for (let col = 1; col <= colonnes; col++) {
        rowCells.push(
          <div key={`cell-${ligne}-${col}`} className="w-10 h-10 border-2 border-gray-300 dark:border-gray-600 rounded bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center text-xs font-medium transition-colors hover:bg-emerald-200 dark:hover:bg-emerald-900/40">
            {String.fromCharCode(64 + ligne)}{col}
          </div>
        )
      }
      
      grid.push(
        <div key={`row-${ligne}`} className="flex items-center">
          <div className="w-8 h-10 flex items-center justify-center text-sm font-medium text-gray-600 dark:text-gray-400">
            {String.fromCharCode(64 + ligne)}
          </div>
          <div className="flex gap-1">
            {rowCells}
          </div>
        </div>
      )
    }
    
    return (
      <div className="space-y-1 p-4">
        {grid}
      </div>
    )
  }

  const handleDeleteRack = async () => {
    if (!rackToDelete) return
    
    try {
      setDeleting(true)
      const response = await fetch(`/api/inventory/racks/${rackToDelete.id}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erreur lors de la suppression')
      }
      
      // Rafraîchir la liste des racks
      const racksResponse = await fetch('/api/inventory/racks')
      if (racksResponse.ok) {
        const data = await racksResponse.json()
        setRacks(data)
      }
      
      // Fermer la modal
      setRackToDelete(null)
      alert('Rack supprimé avec succès')
    } catch (err) {
      console.error('Erreur:', err)
      alert(err instanceof Error ? err.message : 'Erreur lors de la suppression du rack')
    } finally {
      setDeleting(false)
    }
  }

  const isRackEmpty = (rack: RackWithEmplacements): boolean => {
    // Considérer vide si pas d'emplacements fournis
    if (!rack.emplacements) return true
    return rack.emplacements.every((emp) => (emp.materiaux?.length || 0) === 0)
  }
  
  // Calculs des statistiques
  const stats = {
    totalRacks: racks.length,
    totalEmplacements: racks.reduce((total, rack) => total + (rack.lignes * rack.colonnes), 0),
    moyenneTaille: racks.length > 0 
      ? Math.round(racks.reduce((total, rack) => total + (rack.lignes * rack.colonnes), 0) / racks.length)
      : 0
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* En-tête avec gradient */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">          
          <div className="md:flex md:items-center md:justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center">
                <Cog6ToothIcon className="h-8 w-8 text-white mr-3" />
                <div>
                  <h1 className="text-3xl font-bold text-white">
                    Administration des Racks
                  </h1>
                  <p className="mt-2 text-emerald-100">
                    Créez et gérez vos espaces de stockage
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-4 md:mt-0 flex space-x-3">
              <Link
                href="/inventory"
                className="inline-flex items-center px-4 py-2 border border-white/20 rounded-md shadow-sm text-sm font-medium text-white bg-white/10 hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-colors duration-200"
              >
                <ArchiveBoxIcon className="h-4 w-4 mr-2" />
                Voir l'inventaire
              </Link>
              <button
                onClick={() => setShowForm(!showForm)}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-emerald-700 bg-white hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-colors duration-200"
              >
                {showForm ? (
                  <>
                    <XMarkIcon className="h-4 w-4 mr-2" />
                    Annuler
                  </>
                ) : (
                  <>
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Nouveau rack
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Statistiques */}
          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg px-5 py-3 border border-white/20">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <BuildingStorefrontIcon className="h-6 w-6 text-white" />
                </div>
                <div className="ml-3 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-emerald-100 truncate">
                      Racks configurés
                    </dt>
                    <dd className="text-lg font-semibold text-white">
                      {stats.totalRacks}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-lg px-5 py-3 border border-white/20">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CubeIcon className="h-6 w-6 text-white" />
                </div>
                <div className="ml-3 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-emerald-100 truncate">
                      Total emplacements
                    </dt>
                    <dd className="text-lg font-semibold text-white">
                      {stats.totalEmplacements}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-lg px-5 py-3 border border-white/20">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ChartBarIcon className="h-6 w-6 text-white" />
                </div>
                <div className="ml-3 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-emerald-100 truncate">
                      Taille moyenne
                    </dt>
                    <dd className="text-lg font-semibold text-white">
                      {stats.moyenneTaille} empl.
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
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <XMarkIcon className="h-5 w-5 text-red-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-red-700 dark:text-red-400">{error}</p>
              </div>
            </div>
          </div>
        )}
        
        {showForm && (
          <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-8">
            <div className="flex items-center mb-6">
              <PlusIcon className="h-6 w-6 text-emerald-600 mr-3" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Créer un nouveau rack</h2>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
                      <Cog6ToothIcon className="h-5 w-5 mr-2 text-emerald-600" />
                      Informations générales
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="nom" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Nom du rack *
                        </label>
                        <input
                          type="text"
                          id="nom"
                          value={nom}
                          onChange={(e) => setNom(e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white transition-colors"
                          placeholder="Ex: Rack A - Outillage"
                          required
                        />
                      </div>
                      <div>
                        <label htmlFor="position" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Position/Localisation *
                        </label>
                        <input
                          type="text"
                          id="position"
                          value={position}
                          onChange={(e) => setPosition(e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white transition-colors"
                          placeholder="Ex: Atelier principal - Mur est"
                          required
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
                      <ChartBarIcon className="h-5 w-5 mr-2 text-emerald-600" />
                      Configuration des dimensions
                    </h3>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="lignes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Lignes (max 26)
                          </label>
                          <input
                            type="number"
                            id="lignes"
                            min="1"
                            max="26"
                            value={lignes}
                            onChange={(e) => setLignes(parseInt(e.target.value))}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white transition-colors"
                            required
                          />
                        </div>
                        <div>
                          <label htmlFor="colonnes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Colonnes (max 20)
                          </label>
                          <input
                            type="number"
                            id="colonnes"
                            min="1"
                            max="20"
                            value={colonnes}
                            onChange={(e) => setColonnes(parseInt(e.target.value))}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white transition-colors"
                            required
                          />
                        </div>
                      </div>
                      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                          💡 <strong>Total d'emplacements :</strong> {lignes * colonnes} emplacements
                        </p>
                        <p className="text-xs text-emerald-600 dark:text-blue-400 mt-1">
                          Les lignes sont étiquetées A-Z et les colonnes 1-{colonnes}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="lg:col-span-2 mt-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
                    <EyeIcon className="h-5 w-5 mr-2 text-emerald-600" />
                    Prévisualisation du rack
                  </h3>
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 overflow-auto">
                    <div className="inline-block">
              </div>
              
                      {renderRackPreview()}
                    </div>
                  </div>
                </div>
                
                <div className="lg:col-span-2 flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-600">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="px-6 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors flex items-center"
                  >
                    {submitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                        Création en cours...
                      </>
                    ) : (
                      <>
                        <PlusIcon className="h-4 w-4 mr-2" />
                        Créer le rack
                      </>
                    )}
                  </button>
                </div>
          </form>
        </div>
      )}
        
        {loading ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-12">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500 mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Chargement des racks...</p>
            </div>
          </div>
        ) : (
          <>
            {racks.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
                <BuildingStorefrontIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Aucun rack configuré
                </h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
                  Commencez par créer votre premier rack pour organiser votre inventaire.
                </p>
                <button
                  onClick={() => setShowForm(true)}
                  className="inline-flex items-center px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Créer mon premier rack
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {racks.map((rack) => (
                  <div key={rack.id} className="bg-white dark:bg-gray-800 shadow-lg rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-xl transition-all duration-200">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center">
                        <BuildingStorefrontIcon className="h-6 w-6 text-emerald-600 mr-2" />
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{rack.nom}</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{rack.position}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 mb-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-emerald-600">{rack.lignes}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Lignes</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-emerald-600">{rack.colonnes}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Colonnes</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-emerald-600">{rack.lignes * rack.colonnes}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Total</div>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      <button
                        onClick={() => router.push(`/admin/inventory/${rack.id}`)}
                        className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-colors"
                      >
                        <EyeIcon className="h-4 w-4 mr-1" />
                        Voir détails
                      </button>
                      <button
                        onClick={() => router.push(`/admin/inventory/${rack.id}`)}
                        className="inline-flex items-center px-3 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-colors"
                      >
                        <PencilSquareIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setRackToDelete(rack)}
                        disabled={!isRackEmpty(rack)}
                        className={`inline-flex items-center px-3 py-2 border border-transparent rounded-md text-sm font-medium transition-colors ${
                          isRackEmpty(rack)
                            ? 'text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500'
                            : 'text-gray-400 bg-gray-200 cursor-not-allowed dark:bg-gray-600 dark:text-gray-500'
                        }`}
                        title={isRackEmpty(rack) ? 'Supprimer ce rack' : 'Ce rack contient des matériaux et ne peut pas être supprimé'}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Modal de confirmation de suppression */}
        {rackToDelete && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
            <div className="relative p-6 border w-96 shadow-lg rounded-xl bg-white dark:bg-gray-800">
              <div className="mt-3 text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/20">
                  <TrashIcon className="h-6 w-6 text-red-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mt-4">
                  Supprimer le rack
                </h3>
                <div className="mt-2 px-7 py-3">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Êtes-vous sûr de vouloir supprimer le rack <strong>"{rackToDelete.nom}"</strong> ?
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                    Cette action supprimera définitivement le rack et tous ses emplacements. Cette action ne peut pas être annulée.
                  </p>
                  {!isRackEmpty(rackToDelete) && (
                    <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md">
                      <p className="text-xs text-amber-700 dark:text-amber-300">
                        ⚠️ Attention : Ce rack contient encore des matériaux. Veuillez d'abord vider tous les emplacements.
                      </p>
                    </div>
                  )}
                </div>
                <div className="items-center px-4 py-3">
                  <div className="flex space-x-3">
                    <button
                      onClick={() => setRackToDelete(null)}
                      className="px-4 py-2 bg-gray-500 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-300 transition-colors"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={handleDeleteRack}
                      disabled={deleting || !isRackEmpty(rackToDelete)}
                      className="px-4 py-2 bg-red-600 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-300 disabled:bg-red-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                    >
                      {deleting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                          Suppression...
                        </>
                      ) : (
                        <>
                          <TrashIcon className="h-4 w-4 mr-2" />
                          Supprimer
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 