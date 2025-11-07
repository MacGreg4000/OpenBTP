'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { PageHeader } from '@/components/PageHeader'
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
      toast.success('Rack créé avec succès')
    } catch (err) {
      setError('Erreur lors de la création du rack')
      console.error(err)
      toast.error('Impossible de créer le rack')
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
      toast.success('Rack supprimé avec succès')
    } catch (err) {
      console.error('Erreur:', err)
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la suppression du rack')
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

  const statsCards = (
    <div className="flex items-center gap-2">
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl px-3 py-2 border border-gray-200/50 dark:border-gray-700/50 shadow-lg">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
            <BuildingStorefrontIcon className="h-4 w-4 text-white" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase">Racks</div>
            <div className="text-sm font-black text-gray-900 dark:text-white">{stats.totalRacks}</div>
          </div>
        </div>
      </div>
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl px-3 py-2 border border-gray-200/50 dark:border-gray-700/50 shadow-lg">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-lg flex items-center justify-center">
            <CubeIcon className="h-4 w-4 text-white" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase">Emplacements</div>
            <div className="text-sm font-black text-gray-900 dark:text-white">{stats.totalEmplacements}</div>
          </div>
        </div>
      </div>
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl px-3 py-2 border border-gray-200/50 dark:border-gray-700/50 shadow-lg">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-blue-500 rounded-lg flex items.center justify-center">
            <ChartBarIcon className="h-4 w-4 text-white" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase">Taille moy.</div>
            <div className="text-sm font-black text-gray-900 dark:text-white">{stats.moyenneTaille}</div>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/30 to-teal-100/40 dark:from-gray-950 dark:via-gray-900 dark:to-gray-900">
      <PageHeader
        title="Administration des racks"
        subtitle="Créez et gérez vos espaces de stockage"
        icon={Cog6ToothIcon}
        badgeColor="from-emerald-500 via-teal-500 to-emerald-700"
        gradientColor="from-emerald-500/10 via-teal-500/10 to-emerald-700/10"
        stats={statsCards}
        actions={
          <div className="flex items-center gap-3 sm:gap-4">
            <Link
              href="/inventory"
              className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 bg-white/90 dark:bg-gray-800/80 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 shadow-sm"
            >
              <ArchiveBoxIcon className="h-4 w-4" />
              Inventaire
            </Link>
            <button
              onClick={() => setShowForm(!showForm)}
              className={`inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-lg shadow-lg transition-all duration-200 ${
                showForm
                  ? 'text-emerald-700 dark:text-emerald-200 bg-white/90 dark:bg-gray-800/80 border border-emerald-200/70 dark:border-emerald-700/60 hover:bg-white dark:hover:bg-gray-700'
                  : 'text-white bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-600 hover:to-teal-600'
              }`}
            >
              {showForm ? (
                <>
                  <XMarkIcon className="h-4 w-4" />
                  Annuler
                </>
              ) : (
                <>
                  <PlusIcon className="h-4 w-4" />
                  Nouveau rack
                </>
              )}
            </button>
          </div>
        }
      />

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
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
              <div className="text-center py-14 px-8 bg-gradient-to-br from-emerald-50 via-teal-100 to-green-100 dark:from-emerald-900/20 dark:via-teal-900/25 dark:to-green-900/20 rounded-3xl border border-emerald-200/70 dark:border-emerald-800/60 shadow-lg">
                <div className="mx-auto w-20 h-20 flex items-center justify-center rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-green-600 shadow-xl ring-2 ring-white/40 mb-6">
                  <BuildingStorefrontIcon className="h-10 w-10 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-emerald-900 dark:text-white mb-2">
                  Aucun rack configuré
                </h3>
                <p className="text-emerald-800/80 dark:text-emerald-200/80 text-sm mb-6 max-w-md mx-auto">
                  Créez votre premier rack pour organiser efficacement vos matériaux dans l’inventaire.
                </p>
                <button
                  onClick={() => setShowForm(true)}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 text-white rounded-lg shadow-lg hover:shadow-xl transition-transform duration-200 hover:-translate-y-0.5"
                >
                  <PlusIcon className="h-4 w-4" />
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