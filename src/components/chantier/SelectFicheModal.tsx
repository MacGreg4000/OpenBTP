'use client'
import { useState, useEffect } from 'react'
import {
  XMarkIcon,
  MagnifyingGlassIcon,
  FolderIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  CheckIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline'

interface FicheTechnique {
  id: string
  titre: string
  categorie: string
  sousCategorie?: string | null
  fichierUrl: string
  description?: string | null
  referenceCSC?: string | null
}

interface Dossier {
  nom: string
  chemin: string
  sousDossiers: Dossier[]
  fiches: FicheTechnique[]
  isExpanded?: boolean
}

interface SelectFicheModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (ficheId: string) => void
  excludeFicheId?: string
  title?: string
}

export default function SelectFicheModal({
  isOpen,
  onClose,
  onSelect,
  excludeFicheId,
  title = 'Sélectionner une fiche technique'
}: SelectFicheModalProps) {
  const [structure, setStructure] = useState<Dossier[]>([])
  const [loading, setLoading] = useState(false)
  const [searchFilter, setSearchFilter] = useState('')
  const [selectedFicheId, setSelectedFicheId] = useState<string | null>(null)

  // Charger la structure complète depuis l'API à chaque ouverture du modal
  useEffect(() => {
    if (isOpen) {
      const fetchStructure = async () => {
        try {
          setLoading(true)
          const response = await fetch('/api/fiches-techniques/structure')
          if (!response.ok) throw new Error('Erreur lors du chargement')
          const data = await response.json()
          
          // Initialiser tous les dossiers comme ouverts (comme sur la page principale)
          const initExpanded = (dossiers: Dossier[]): Dossier[] => {
            return dossiers.map(d => ({
              ...d,
              isExpanded: true, // Tous les dossiers ouverts par défaut
              sousDossiers: initExpanded(d.sousDossiers)
            }))
          }
          
          const initializedStructure = initExpanded(data)
          setStructure(initializedStructure)
          
          // Compter toutes les fiches
          let totalFiches = 0
          const countFiches = (dossiers: Dossier[]) => {
            dossiers.forEach(d => {
              totalFiches += d.fiches.length
              if (d.sousDossiers.length > 0) {
                countFiches(d.sousDossiers)
              }
            })
          }
          countFiches(initializedStructure)
          
          console.log('SelectFicheModal - Structure complète chargée:', {
            totalFiches,
            excludeFicheId,
            structure: initializedStructure,
            dossiers: initializedStructure.map(d => ({
              nom: d.nom,
              fichesCount: d.fiches.length,
              fiches: d.fiches.map(f => f.id)
            }))
          })
        } catch (error) {
          console.error('Erreur lors du chargement de la structure:', error)
        } finally {
          setLoading(false)
        }
      }
      
      fetchStructure()
      setSearchFilter('')
      setSelectedFicheId(null)
    }
  }, [isOpen, excludeFicheId])

  // Toggle l'expansion d'un dossier (exactement comme sur la page principale)
  const toggleDossier = (chemin: string) => {
    const updateDossiers = (dossiers: Dossier[]): Dossier[] => {
      return dossiers.map(d => {
        if (d.chemin === chemin) {
          return { ...d, isExpanded: !d.isExpanded }
        }
        if (d.sousDossiers.length > 0) {
          return { ...d, sousDossiers: updateDossiers(d.sousDossiers) }
        }
        return d
      })
    }
    setStructure(prev => updateDossiers(prev))
  }

  // Filtrer l'arborescence selon le terme de recherche (exactement comme sur la page principale)
  const filterStructure = (dossiers: Dossier[], searchTerm: string): Dossier[] => {
    if (!searchTerm.trim()) return dossiers

    const lowerSearch = searchTerm.toLowerCase()
    
    const filterDossier = (dossier: Dossier): Dossier | null => {
      // Filtrer les fiches qui correspondent
      const filteredFiches = dossier.fiches.filter(fiche =>
        (fiche.titre.toLowerCase().includes(lowerSearch) ||
        fiche.referenceCSC?.toLowerCase().includes(lowerSearch) ||
        fiche.id.toLowerCase().includes(lowerSearch)) &&
        (!excludeFicheId || fiche.id !== excludeFicheId)
      )

      // Filtrer récursivement les sous-dossiers
      const filteredSousDossiers = dossier.sousDossiers
        .map(filterDossier)
        .filter((d): d is Dossier => d !== null)

      // Garder le dossier si :
      // - Il a des fiches qui correspondent
      // - Il a des sous-dossiers qui correspondent
      // - Son nom correspond
      if (
        filteredFiches.length > 0 ||
        filteredSousDossiers.length > 0 ||
        dossier.nom.toLowerCase().includes(lowerSearch)
      ) {
        return {
          ...dossier,
          fiches: filteredFiches,
          sousDossiers: filteredSousDossiers,
          isExpanded: true // Auto-expand les dossiers filtrés
        }
      }

      return null
    }

    return dossiers
      .map(filterDossier)
      .filter((d): d is Dossier => d !== null)
  }

  const filteredStructure = filterStructure(structure, searchFilter)

  // Rendu d'un dossier (exactement comme sur la page principale)
  const renderDossier = (dossier: Dossier, niveau: number = 0) => {
    const hasFiches = dossier.fiches.length > 0

    return (
      <div key={dossier.chemin} className={`${niveau > 0 ? 'ml-4' : ''}`}>
        <div className="flex items-center py-2">
          {/* Bouton expand/collapse */}
          <button
            onClick={() => toggleDossier(dossier.chemin)}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded mr-1"
          >
            {dossier.isExpanded ? (
              <ChevronDownIcon className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronRightIcon className="h-4 w-4 text-gray-500" />
            )}
          </button>

          {/* Icône et nom du dossier */}
          <FolderIcon className="h-5 w-5 text-yellow-500 mr-2" />
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {dossier.nom}
            {hasFiches && (
              <span className="ml-2 text-xs text-gray-500">
                ({dossier.fiches.filter(f => !excludeFicheId || f.id !== excludeFicheId).length} fiche{dossier.fiches.filter(f => !excludeFicheId || f.id !== excludeFicheId).length > 1 ? 's' : ''})
              </span>
            )}
          </span>
        </div>

        {/* Contenu du dossier */}
        {dossier.isExpanded && (
          <div className="ml-6">
            {/* Sous-dossiers */}
            {dossier.sousDossiers.map(sd => renderDossier(sd, niveau + 1))}

            {/* Fiches */}
            {dossier.fiches
              .filter(f => {
                const shouldInclude = !excludeFicheId || f.id !== excludeFicheId
                if (!shouldInclude) {
                  console.log('Fiche exclue:', f.id, 'excludeFicheId:', excludeFicheId)
                }
                return shouldInclude
              })
              .map(fiche => {
                const isSelected = selectedFicheId === fiche.id
                console.log('Rendu fiche:', fiche.id, fiche.titre)
                return (
                  <div 
                    key={fiche.id} 
                    className={`py-1.5 hover:bg-gray-50 dark:hover:bg-gray-700 rounded px-2 cursor-pointer transition-colors ${
                      isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                    }`}
                    onClick={() => setSelectedFicheId(fiche.id)}
                  >
                    <div className="flex items-center">
                      {isSelected ? (
                        <div className="w-4 h-4 rounded border-2 border-blue-600 bg-blue-600 flex items-center justify-center mr-2">
                          <CheckIcon className="h-3 w-3 text-white" />
                        </div>
                      ) : (
                        <div className="w-4 h-4 rounded border-2 border-gray-300 dark:border-gray-600 mr-2" />
                      )}
                      <DocumentTextIcon className="h-4 w-4 text-red-500 mr-2" />
                      <span className="text-sm text-gray-700 dark:text-gray-300 flex-1 min-w-0 truncate">
                        {fiche.titre}
                      </span>
                      {fiche.referenceCSC && (
                        <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                          (CSC: {fiche.referenceCSC})
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
          </div>
        )}
      </div>
    )
  }

  if (!isOpen) return null

  // Compter toutes les fiches disponibles
  const countAllFiches = (dossiers: Dossier[]): number => {
    let count = 0
    dossiers.forEach(d => {
      count += d.fiches.filter(f => !excludeFicheId || f.id !== excludeFicheId).length
      if (d.sousDossiers.length > 0) {
        count += countAllFiches(d.sousDossiers)
      }
    })
    return count
  }

  const totalFiches = countAllFiches(filteredStructure)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col border border-gray-200 dark:border-gray-700">
        {/* En-tête */}
        <div className="relative px-6 py-4 bg-gradient-to-br from-emerald-600/10 via-teal-700/10 to-cyan-800/10 dark:from-emerald-600/10 dark:via-teal-700/10 dark:to-cyan-800/10 border-b border-gray-200 dark:border-gray-700 overflow-hidden rounded-t-lg">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/20 to-cyan-800/20"></div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl transform translate-x-16 -translate-y-16"></div>
          <div className="relative z-10 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {title}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Champ de recherche */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Rechercher une fiche technique..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
            {searchFilter && (
              <button
                onClick={() => setSearchFilter('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>

        {/* Arborescence */}
        <div className="p-6 max-h-[600px] overflow-y-auto flex-1">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
              <p className="text-gray-500 dark:text-gray-400">
                Chargement de la structure complète...
              </p>
            </div>
          ) : filteredStructure.length === 0 ? (
            <div className="text-center py-12">
              <FolderIcon className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-500 mb-3" />
              <p className="text-gray-500 dark:text-gray-400">
                {searchFilter.trim() 
                  ? 'Aucune fiche technique ne correspond à votre recherche'
                  : 'Aucune fiche technique disponible'}
              </p>
            </div>
          ) : (
            <div>
              {filteredStructure.map(dossier => renderDossier(dossier))}
            </div>
          )}
        </div>

        {/* Pied de page */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {selectedFicheId ? (
              <span>Fiche sélectionnée : <span className="font-medium text-gray-900 dark:text-white">{selectedFicheId.split('/').pop()}</span></span>
            ) : (
              <span>
                Sélectionnez une fiche technique
                <span className="ml-2 text-xs text-gray-500">
                  ({totalFiches} fiches disponibles{excludeFicheId ? `, 1 exclue` : ''})
                </span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={() => {
                if (selectedFicheId) {
                  onSelect(selectedFicheId)
                  onClose()
                }
              }}
              disabled={!selectedFicheId}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Valider
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
