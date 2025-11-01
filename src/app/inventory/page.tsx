'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { RackWithEmplacements, Materiau } from '@/types/inventory'
import { 
  QrCodeIcon,
  ArchiveBoxIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  XMarkIcon,
  InformationCircleIcon,
  CubeIcon,
  BuildingStorefrontIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  TrashIcon
} from '@heroicons/react/24/outline'
import EmplacementQRCodeModal from '@/components/inventory/EmplacementQRCodeModal'

// Composant pour les paramètres de recherche qui utilise useSearchParams()
function SearchParamsComponent({ onEmplacementFound }: { onEmplacementFound: (emplacementId: string, rackId: string) => void }) {
  const searchParams = useSearchParams()
  
  useEffect(() => {
    // Rechercher des paramètres d'URL pour la pré-sélection d'un emplacement
    const emplacementId = searchParams.get('emplacementId')
    const rackId = searchParams.get('rackId')
    
    if (emplacementId && rackId) {
      // Si les paramètres sont présents, sélectionner automatiquement l'emplacement
      onEmplacementFound(emplacementId, rackId)
    }
  }, [searchParams, onEmplacementFound])
  
  return null
}

export default function InventoryPage() {
  // const router = useRouter()
  const [racks, setRacks] = useState<RackWithEmplacements[]>([])
  const [materiaux, setMateriaux] = useState<Materiau[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchResults, setSearchResults] = useState<Materiau[]>([])
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  
  // Pour l'ajout de matériaux
  const [selectedEmplacement, setSelectedEmplacement] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [selectedRackForAddition, setSelectedRackForAddition] = useState<RackWithEmplacements | null>(null)
  const [materiauData, setMateriauData] = useState({
    nom: '',
    description: '',
    quantite: ''
  })
  const [submitting, setSubmitting] = useState(false)
  
  // Pour la suppression de matériaux
  const [selectedMateriau, setSelectedMateriau] = useState<Materiau | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  
  // Pour la gestion des QR codes
  const [showQRCodeModal, setShowQRCodeModal] = useState(false)
  const [currentQRCodeEmplacement, setCurrentQRCodeEmplacement] = useState<{
    id: string,
    rackNom: string,
    position: string,
    qrCodeValue: string
  } | null>(null)

  const handleEmplacementFound = (emplacementId: string, rackId: string) => {
    const rack = racks.find((r: RackWithEmplacements) => r.id === rackId)
    if (rack) {
      setSelectedRackForAddition(rack)
      setSelectedEmplacement(emplacementId)
      setShowAddForm(true)
    }
  }

  // Charger les données initiales
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        
        // Charger les racks
        const racksResponse = await fetch('/api/inventory/racks')
        if (!racksResponse.ok) {
          throw new Error('Erreur lors du chargement des racks')
        }
        const racksData = await racksResponse.json()
        setRacks(racksData)
        
        // Charger les matériaux
        const materiauxResponse = await fetch('/api/inventory/materiaux')
        if (!materiauxResponse.ok) {
          throw new Error('Erreur lors du chargement des matériaux')
        }
        const materiauxData = await materiauxResponse.json()
        setMateriaux(materiauxData)
        
      } catch (err) {
        console.error('Erreur:', err)
        setError('Erreur lors du chargement des données')
      } finally {
        setLoading(false)
      }
    }
    
    loadData()
    
    // Charger les recherches récentes du localStorage
    const savedSearches = localStorage.getItem('recentInventorySearches')
    if (savedSearches) {
      setRecentSearches(JSON.parse(savedSearches))
    }
  }, [])
  
  // Recherche de matériaux
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!searchTerm.trim()) {
      setSearchResults([])
      return
    }
    
    // Rechercher par nom ou description
    const results = materiaux.filter(m => 
      m.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.description && m.description.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    
    setSearchResults(results)
    
    // Ajouter aux recherches récentes si pas déjà présent
    if (!recentSearches.includes(searchTerm)) {
      const updatedSearches = [searchTerm, ...recentSearches.slice(0, 4)]
      setRecentSearches(updatedSearches)
      localStorage.setItem('recentInventorySearches', JSON.stringify(updatedSearches))
    }
  }
  
  // Sélectionner un emplacement pour ajouter un matériau
  const handleEmplacementSelect = (emplacementId: string, rack: RackWithEmplacements) => {
    setSelectedEmplacement(emplacementId)
    setSelectedRackForAddition(rack)
    setShowAddForm(true)
  }
  
  // Gestion de l'ajout d'un matériau
  const handleAddMateriau = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedEmplacement || !selectedRackForAddition) {
      return
    }
    
    try {
      setSubmitting(true)
      
      const materiau = {
        nom: materiauData.nom,
        description: materiauData.description,
        quantite: parseFloat(materiauData.quantite) || 1,
        emplacementId: selectedEmplacement
      }
      
      const response = await fetch('/api/inventory/materiaux', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(materiau)
      })
      
      if (!response.ok) {
        throw new Error('Erreur lors de l\'ajout du matériau')
      }
      
      // Rafraîchir les données
      const racksResponse = await fetch('/api/inventory/racks')
      const materiauxResponse = await fetch('/api/inventory/materiaux')
      
      if (racksResponse.ok && materiauxResponse.ok) {
        const racksData = await racksResponse.json()
        const materiauxData = await materiauxResponse.json()
        
        setRacks(racksData)
        setMateriaux(materiauxData)
      }
      
      // Réinitialiser le formulaire
      setMateriauData({
        nom: '',
        description: '',
        quantite: ''
      })
      setSelectedEmplacement(null)
      setShowAddForm(false)
      setSelectedRackForAddition(null)
      
    } catch (err) {
      console.error('Erreur:', err)
      setError('Erreur lors de l\'ajout du matériau')
    } finally {
      setSubmitting(false)
    }
  }

  // Supprimer un matériau
  const handleDeleteMateriau = async () => {
    if (!selectedMateriau) return
    
    try {
      setDeleting(true)
      
      const response = await fetch(`/api/inventory/materiaux/${selectedMateriau.id}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        throw new Error('Erreur lors de la suppression du matériau')
      }
      
      // Rafraîchir les données
      const [racksResponse, materiauxResponse] = await Promise.all([
        fetch('/api/inventory/racks'),
        fetch('/api/inventory/materiaux')
      ])
      
      if (racksResponse.ok && materiauxResponse.ok) {
        const [racksData, materiauxData] = await Promise.all([
          racksResponse.json(),
          materiauxResponse.json()
        ])
        
        setRacks(racksData)
        setMateriaux(materiauxData)
        
        // Mettre à jour les résultats de recherche si nécessaire
        if (searchResults.length > 0) {
          setSearchResults(searchResults.filter(m => m.id !== selectedMateriau.id))
        }
      }
      
      // Fermer les modals
      setShowDeleteConfirm(false)
      setSelectedMateriau(null)
      
    } catch (err) {
      console.error('Erreur:', err)
      setError('Erreur lors de la suppression du matériau')
    } finally {
      setDeleting(false)
    }
  }

  const renderRackVisualization = (rack: RackWithEmplacements) => {
    const maxLigne = Math.max(...rack.emplacements.map(e => e.ligne))
    const maxColonne = Math.max(...rack.emplacements.map(e => e.colonne))
    
    const grid = []
    for (let ligne = 1; ligne <= maxLigne; ligne++) {
      const row = []
      for (let colonne = 1; colonne <= maxColonne; colonne++) {
        const emplacement = rack.emplacements.find(e => e.ligne === ligne && e.colonne === colonne)
        if (emplacement) {
          const isSelected = selectedEmplacement === emplacement.id
          const isSearchResult = searchResults.some(m => m.emplacement?.id === emplacement.id)
          
          let bgColor = 'bg-green-100 border-green-300'
          if (emplacement.statut === 'occupé') {
            bgColor = 'bg-red-500 border-red-600'
          } else if (isSelected || isSearchResult) {
            bgColor = 'bg-blue-500 border-blue-600'
          }
          
          row.push(
            <div
              key={`${ligne}-${colonne}`}
              className={`w-12 h-12 border-2 rounded cursor-pointer flex items-center justify-center text-xs font-medium transition-all duration-200 hover:scale-105 ${bgColor} ${
                emplacement.statut === 'occupé' ? 'text-white' : 'text-gray-700'
              }`}
              onClick={() => {
                if (emplacement.statut === 'libre') {
                  handleEmplacementSelect(emplacement.id, rack)
                } else if (emplacement.statut === 'occupé') {
                  // Trouver le matériau dans cet emplacement
                  const materiau = materiaux.find(m => m.emplacementId === emplacement.id)
                  if (materiau) {
                    setSelectedMateriau(materiau)
                    setShowDeleteConfirm(true)
                  }
                }
              }}
              onContextMenu={(e) => {
                e.preventDefault()
                generateQRForEmplacement(rack.id, rack.nom, emplacement.id, ligne, colonne)
              }}
              title={`${rack.nom} - ${String.fromCharCode(64 + ligne)}${colonne}${emplacement.statut === 'occupé' ? ' (Occupé)' : ' (Libre)'}`}
            >
              {String.fromCharCode(64 + ligne)}{colonne}
            </div>
          )
        } else {
          row.push(<div key={`${ligne}-${colonne}`} className="w-12 h-12"></div>)
        }
      }
      grid.push(
        <div key={ligne} className="flex gap-1">
          {row}
        </div>
      )
    }
    
    return <div className="flex flex-col gap-1">{grid}</div>
  }

  const generateQRForEmplacement = (rackId: string, rackNom: string, emplacementId: string, ligne: number, colonne: number) => {
    const qrCodeValue = `${window.location.origin}/inventory?emplacementId=${emplacementId}&rackId=${rackId}`
    setCurrentQRCodeEmplacement({
      id: emplacementId,
      rackNom,
      position: `${String.fromCharCode(64 + ligne)}${colonne}`,
      qrCodeValue
    })
    setShowQRCodeModal(true)
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <ExclamationCircleIcon className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Erreur</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Calculs des statistiques
  const stats = {
    totalRacks: racks.length,
    totalEmplacements: racks.reduce((total, rack) => total + rack.emplacements.length, 0),
    emplacementsOccupes: racks.reduce((total, rack) => 
      total + rack.emplacements.filter(emp => emp.statut === 'occupé').length, 0
    ),
    totalMateriaux: materiaux.length
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <Suspense fallback={<div>Chargement...</div>}>
        <SearchParamsComponent onEmplacementFound={handleEmplacementFound} />
      </Suspense>
      
      {/* En-tête avec gradient */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 shadow-lg">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center min-w-0">
              <CubeIcon className="h-5 w-5 text-white mr-2 flex-shrink-0" />
              <div>
                <h1 className="text-xl font-bold text-white">
                  Gestion d'Inventaire
                </h1>
                <p className="mt-0.5 text-xs text-emerald-100 hidden sm:block">
                  Gérez vos racks et matériaux en temps réel
                </p>
              </div>
            </div>

            {/* Statistiques compactes */}
            <div className="flex items-center gap-2 flex-1 justify-center">
              <div className="bg-white/10 backdrop-blur-sm rounded px-2.5 py-1.5 border border-white/20 flex-1 min-w-0 max-w-[120px]">
                <div className="flex items-center gap-1.5">
                  <BuildingStorefrontIcon className="h-4 w-4 text-white flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] font-medium text-emerald-100 truncate">Total racks</div>
                    <div className="text-sm font-semibold text-white truncate">{stats.totalRacks}</div>
                  </div>
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded px-2.5 py-1.5 border border-white/20 flex-1 min-w-0 max-w-[120px]">
                <div className="flex items-center gap-1.5">
                  <ArchiveBoxIcon className="h-4 w-4 text-white flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] font-medium text-emerald-100 truncate">Emplacements</div>
                    <div className="text-sm font-semibold text-white truncate">{stats.totalEmplacements}</div>
                  </div>
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded px-2.5 py-1.5 border border-white/20 flex-1 min-w-0 max-w-[120px]">
                <div className="flex items-center gap-1.5">
                  <ChartBarIcon className="h-4 w-4 text-white flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] font-medium text-emerald-100 truncate">Occupés</div>
                    <div className="text-sm font-semibold text-white truncate">{stats.emplacementsOccupes}</div>
                  </div>
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded px-2.5 py-1.5 border border-white/20 flex-1 min-w-0 max-w-[120px]">
                <div className="flex items-center gap-1.5">
                  <CubeIcon className="h-4 w-4 text-white flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] font-medium text-emerald-100 truncate">Matériaux</div>
                    <div className="text-sm font-semibold text-white truncate">{stats.totalMateriaux}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-shrink-0 flex items-center gap-2">
              <Link
                href="/admin/inventory"
                className="inline-flex items-center px-3 py-1.5 border border-transparent rounded-md shadow-sm text-xs font-medium text-emerald-700 bg-white hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-colors duration-200"
              >
                <Cog6ToothIcon className="h-3.5 w-3.5 mr-1.5" />
                <span className="hidden sm:inline">Gérer les racks</span>
                <span className="sm:hidden">Gérer</span>
              </Link>
              <Link
                href="/inventory/scanner"
                className="inline-flex items-center px-3 py-1.5 border border-white/20 rounded-md shadow-sm text-xs font-medium text-white bg-white/10 hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-colors duration-200"
              >
                <QrCodeIcon className="h-3.5 w-3.5 mr-1.5" />
                <span className="hidden sm:inline">Scanner QR</span>
                <span className="sm:hidden">Scanner</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Contenu principal */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Barre de recherche */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <MagnifyingGlassIcon className="h-5 w-5 text-emerald-600 mr-2" />
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recherche de matériaux</h2>
                </div>
              </div>
              
              <form onSubmit={handleSearch} className="flex gap-4">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Rechercher un matériau..."
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white transition-colors"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <button
                  type="submit"
                  className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-colors duration-200"
                >
                  Rechercher
                </button>
              </form>
              
              {recentSearches.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Recherches récentes :</p>
                  <div className="flex flex-wrap gap-2">
                    {recentSearches.map((term, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          setSearchTerm(term)
                          const results = materiaux.filter(m => 
                            m.nom.toLowerCase().includes(term.toLowerCase()) ||
                            (m.description && m.description.toLowerCase().includes(term.toLowerCase()))
                          )
                          setSearchResults(results)
                        }}
                        className="px-3 py-1 text-sm bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 rounded-full transition-colors duration-200"
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {/* Visualisation des racks */}
            {loading ? (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-12">
                <div className="text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500 mb-4"></div>
                  <p className="text-gray-600 dark:text-gray-400">Chargement de l&apos;inventaire...</p>
                </div>
              </div>
            ) : (
              <>
                {racks.length === 0 ? (
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
                    <ArchiveBoxIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      Aucun rack configuré
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
                      Commencez par créer votre premier rack pour organiser vos matériaux.
                    </p>
                    <Link
                      href="/admin/inventory"
                      className="inline-flex items-center px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                    >
                      <PlusIcon className="h-4 w-4 mr-2" />
                      Créer un rack
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {racks.map((rack) => (
                      <div key={rack.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
                        <div className="flex items-center justify-between mb-6">
                          <div>
                            <div className="flex items-center">
                              <BuildingStorefrontIcon className="h-5 w-5 text-emerald-600 mr-2" />
                              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                                {rack.nom}
                              </h3>
                            </div>
                            <p className="text-gray-500 dark:text-gray-400 mt-1">{rack.position}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-500 dark:text-gray-400">Taux d'occupation</p>
                            <div className="flex items-center mt-1">
                              <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2 mr-2">
                                <div 
                                  className="bg-emerald-600 h-2 rounded-full" 
                                  style={{ 
                                    width: `${(rack.emplacements.filter(emp => emp.statut === 'occupé').length / rack.emplacements.length) * 100}%` 
                                  }}
                                ></div>
                              </div>
                              <span className="text-lg font-medium text-gray-900 dark:text-white">
                                {rack.emplacements.filter(emp => emp.statut === 'occupé').length} / {rack.emplacements.length}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="overflow-x-auto mb-6">
                          {renderRackVisualization(rack)}
                        </div>
                        
                        {/* Légende */}
                        <div className="flex flex-wrap gap-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                          <div className="flex items-center">
                            <div className="w-4 h-4 bg-green-100 border border-green-300 rounded mr-2"></div>
                            <span className="text-sm text-gray-600 dark:text-gray-300">Libre</span>
                          </div>
                          <div className="flex items-center">
                            <div className="w-4 h-4 bg-red-500 border border-red-600 rounded mr-2"></div>
                            <span className="text-sm text-gray-600 dark:text-gray-300">Occupé</span>
                          </div>
                          <div className="flex items-center">
                            <div className="w-4 h-4 bg-blue-500 border border-blue-600 rounded mr-2"></div>
                            <span className="text-sm text-gray-600 dark:text-gray-300">Sélectionné/Résultat</span>
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 ml-auto">
                            💡 Libre: clic = ajouter • Occupé: clic = supprimer • Clic droit = QR code
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Formulaire d'ajout - déplacé ici */}
            {selectedEmplacement && showAddForm && selectedRackForAddition && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center">
                    <PlusIcon className="h-5 w-5 text-emerald-600 mr-2" />
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Ajouter un matériau</h2>
                  </div>
                  <button 
                    onClick={() => {
                      setSelectedEmplacement(null)
                      setShowAddForm(false)
                      setSelectedRackForAddition(null)
                    }} 
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-200"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>
                
                {/* Emplacement sélectionné */}
                <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                  {(() => {
                    const emplacement = selectedRackForAddition.emplacements.find(e => e.id === selectedEmplacement)
                    if (emplacement) {
                      return (
                        <div>
                          <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">Emplacement sélectionné</p>
                          <p className="text-emerald-900 dark:text-emerald-100 font-semibold text-lg">
                            {selectedRackForAddition.nom} - {String.fromCharCode(64 + emplacement.ligne)}{emplacement.colonne}
                          </p>
                        </div>
                      )
                    }
                    return 'Emplacement sélectionné'
                  })()}
                </div>
                
                <form onSubmit={handleAddMateriau} className="space-y-4">
                  <div>
                    <label htmlFor="nom" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Nom du matériau *
                    </label>
                    <input
                      type="text"
                      id="nom"
                      required
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white transition-colors"
                      value={materiauData.nom}
                      onChange={(e) => setMateriauData({...materiauData, nom: e.target.value})}
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Description
                    </label>
                    <textarea
                      id="description"
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white transition-colors"
                      value={materiauData.description}
                      onChange={(e) => setMateriauData({...materiauData, description: e.target.value})}
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="quantite" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Quantité
                    </label>
                    <input
                      type="number"
                      id="quantite"
                      step="0.01"
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white transition-colors"
                      value={materiauData.quantite}
                      onChange={(e) => setMateriauData({...materiauData, quantite: e.target.value})}
                    />
                  </div>
                  
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:bg-emerald-300 transition-colors duration-200"
                  >
                    {submitting ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                        Ajout en cours...
                      </div>
                    ) : (
                      'Ajouter ce matériau'
                    )}
                  </button>
                </form>
              </div>
            )}

            {/* Instructions - déplacé ici */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center mb-4">
                <InformationCircleIcon className="h-5 w-5 text-emerald-600 mr-2" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Guide d'utilisation</h2>
              </div>
              <div className="space-y-3">
                <div className="flex items-start">
                  <CheckCircleIcon className="h-4 w-4 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Ajouter un matériau</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Cliquez sur un emplacement <span className="text-green-600 font-medium">libre</span></p>
                  </div>
                </div>
                <div className="flex items-start">
                  <TrashIcon className="h-4 w-4 text-red-500 mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Supprimer un matériau</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Cliquez sur un emplacement <span className="text-red-600 font-medium">occupé</span></p>
                  </div>
                </div>
                <div className="flex items-start">
                  <QrCodeIcon className="h-4 w-4 text-emerald-500 mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Générer QR code</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Clic droit sur un emplacement</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <MagnifyingGlassIcon className="h-4 w-4 text-purple-500 mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Rechercher matériaux</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Utilisez la barre de recherche ci-dessus</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <Cog6ToothIcon className="h-4 w-4 text-orange-500 mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Gérer les racks</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Créez de nouveaux racks via le bouton en haut</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Panneau latéral - uniquement pour les résultats de recherche */}
          <div className="space-y-6">
            
            {/* Résultats de recherche */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center mb-4">
                <MagnifyingGlassIcon className="h-5 w-5 text-emerald-600 mr-2" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Résultats de recherche</h2>
                {searchResults.length > 0 && (
                  <span className="ml-auto bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 text-xs font-medium px-2 py-1 rounded-full">
                    {searchResults.length}
                  </span>
                )}
              </div>
              
              {searchResults.length > 0 ? (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {searchResults.map(materiau => (
                    <div key={materiau.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <h3 className="font-medium text-gray-900 dark:text-white mb-1">{materiau.nom}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{materiau.description || 'Aucune description'}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          Quantité: <span className="font-medium">{typeof materiau.quantite === 'number' ? materiau.quantite.toFixed(2) : materiau.quantite}</span>
                        </span>
                        {materiau.emplacement && materiau.emplacement.rack && (
                          <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                            {materiau.emplacement.rack.nom} - 
                            {String.fromCharCode(64 + materiau.emplacement.ligne)}
                            {materiau.emplacement.colonne}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <MagnifyingGlassIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500 dark:text-gray-400 text-sm">
                    {searchTerm ? 'Aucun résultat trouvé' : 'Utilisez la barre de recherche pour trouver des matériaux'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Modal pour afficher un QR code */}
      {showQRCodeModal && currentQRCodeEmplacement && (
        <EmplacementQRCodeModal
          emplacementId={currentQRCodeEmplacement.id}
          rackNom={currentQRCodeEmplacement.rackNom}
          position={currentQRCodeEmplacement.position}
          qrCodeValue={currentQRCodeEmplacement.qrCodeValue}
          onClose={() => setShowQRCodeModal(false)}
        />
      )}

      {/* Modal de confirmation de suppression */}
      {showDeleteConfirm && selectedMateriau && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
          <div className="relative p-6 border w-96 shadow-lg rounded-xl bg-white dark:bg-gray-800">
            <div className="mt-3 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/20">
                <TrashIcon className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mt-4">
                Supprimer le matériau
              </h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Êtes-vous sûr de vouloir supprimer le matériau <strong>"{selectedMateriau.nom}"</strong> ?
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                  Cette action ne peut pas être annulée et libérera l'emplacement.
                </p>
              </div>
              <div className="items-center px-4 py-3">
                <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      setShowDeleteConfirm(false)
                      setSelectedMateriau(null)
                    }}
                    className="px-4 py-2 bg-gray-500 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-300 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleDeleteMateriau}
                    disabled={deleting}
                    className="px-4 py-2 bg-red-600 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-300 disabled:bg-red-300 transition-colors flex items-center justify-center"
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
  )
} 