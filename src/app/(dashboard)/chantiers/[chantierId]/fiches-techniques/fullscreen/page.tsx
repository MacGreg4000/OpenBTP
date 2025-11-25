'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { 
  DocumentTextIcon, 
  FolderIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  ArrowDownTrayIcon,
  XMarkIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline'
import { useNotification } from '@/hooks/useNotification'

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

export default function FichesTechniquesFullscreenPage() {
  const params = useParams()
  const chantierId = params?.chantierId as string
  const { showNotification, NotificationComponent } = useNotification()

  const [structure, setStructure] = useState<Dossier[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedFiches, setSelectedFiches] = useState<Set<string>>(new Set())
  const [ficheReferences, setFicheReferences] = useState<Map<string, string>>(new Map())
  const [fichesSoustraitants, setFichesSoustraitants] = useState<Record<string, string>>({})
  const [fichesRemarques, setFichesRemarques] = useState<Record<string, string>>({})
  const [soustraitants, setSoustraitants] = useState<Array<{ id: string; nom: string }>>([])
  const [generating, setGenerating] = useState(false)
  const [includeTableOfContents, setIncludeTableOfContents] = useState(true)
  const [searchFilter, setSearchFilter] = useState('')

  // Charger l'état depuis localStorage au montage
  useEffect(() => {
    if (!chantierId) return

    const storageKey = `fiches-techniques-${chantierId}`
    const savedState = localStorage.getItem(storageKey)
    
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState)
        if (parsed.selectedFiches) {
          setSelectedFiches(new Set(parsed.selectedFiches))
        }
        if (parsed.ficheReferences) {
          setFicheReferences(new Map(Object.entries(parsed.ficheReferences)))
        }
        if (parsed.fichesSoustraitants) {
          setFichesSoustraitants(parsed.fichesSoustraitants)
        }
        if (parsed.fichesRemarques) {
          setFichesRemarques(parsed.fichesRemarques)
        }
        if (parsed.includeTableOfContents !== undefined) {
          setIncludeTableOfContents(parsed.includeTableOfContents)
        }
      } catch (error) {
        console.error('Erreur lors du chargement de l\'état:', error)
      }
    }
  }, [chantierId])

  // Sauvegarder l'état dans localStorage à chaque changement
  useEffect(() => {
    if (!chantierId) return

    const storageKey = `fiches-techniques-${chantierId}`
    const stateToSave = {
      selectedFiches: Array.from(selectedFiches),
      ficheReferences: Object.fromEntries(ficheReferences),
      fichesSoustraitants,
      fichesRemarques,
      includeTableOfContents
    }
    localStorage.setItem(storageKey, JSON.stringify(stateToSave))
  }, [selectedFiches, ficheReferences, fichesSoustraitants, fichesRemarques, includeTableOfContents, chantierId])

  // Charger la structure des fiches techniques
  useEffect(() => {
    const fetchStructure = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/fiches-techniques/structure?chantierId=${chantierId}`)
        if (!response.ok) throw new Error('Erreur lors du chargement')
        const data = await response.json()
        // Initialiser tous les dossiers comme ouverts
        const initExpanded = (dossiers: Dossier[]): Dossier[] => {
          return dossiers.map(d => ({
            ...d,
            isExpanded: true,
            sousDossiers: initExpanded(d.sousDossiers)
          }))
        }
        setStructure(initExpanded(data))
      } catch (error) {
        console.error('Erreur lors du chargement de la structure:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchStructure()
  }, [chantierId])

  // Charger les sous-traitants
  useEffect(() => {
    const fetchSoustraitants = async () => {
      try {
        const response = await fetch('/api/soustraitants/select?activeOnly=1')
        if (response.ok) {
          const data = await response.json()
          setSoustraitants(data.map((st: { value: string; label: string }) => ({
            id: st.value,
            nom: st.label
          })))
        }
      } catch (error) {
        console.error('Erreur lors du chargement des sous-traitants:', error)
      }
    }
    fetchSoustraitants()
  }, [])

  // Toggle l'expansion d'un dossier
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

  // Toggle la sélection d'une fiche
  const toggleFiche = (ficheId: string) => {
    setSelectedFiches(prev => {
      const newSet = new Set(prev)
      if (newSet.has(ficheId)) {
        newSet.delete(ficheId)
        // Supprimer aussi la référence, le sous-traitant et les remarques
        setFicheReferences(prevRefs => {
          const newRefs = new Map(prevRefs)
          newRefs.delete(ficheId)
          return newRefs
        })
        setFichesSoustraitants(prev => {
          const newData = { ...prev }
          delete newData[ficheId]
          return newData
        })
        setFichesRemarques(prev => {
          const newData = { ...prev }
          delete newData[ficheId]
          return newData
        })
      } else {
        newSet.add(ficheId)
        console.log('Fiche sélectionnée:', ficheId, 'Total sélectionnées:', newSet.size + 1)
      }
      return newSet
    })
  }

  // Mettre à jour la référence CSC d'une fiche
  const updateFicheReference = (ficheId: string, reference: string) => {
    setFicheReferences(prev => {
      const newMap = new Map(prev)
      newMap.set(ficheId, reference)
      return newMap
    })
  }

  // Sélectionner toutes les fiches d'un dossier
  const selectAllInDossier = (dossier: Dossier, select: boolean) => {
    const collectFiches = (d: Dossier): string[] => {
      const fichesIds = d.fiches.map(f => f.id)
      const subFichesIds = d.sousDossiers.flatMap(collectFiches)
      return [...fichesIds, ...subFichesIds]
    }

    const fichesIds = collectFiches(dossier)
    setSelectedFiches(prev => {
      const newSet = new Set(prev)
      fichesIds.forEach(id => {
        if (select) {
          newSet.add(id)
        } else {
          newSet.delete(id)
        }
      })
      return newSet
    })
  }

  // Générer le PDF et fermer l'onglet
  const handleGeneratePDF = async () => {
    if (selectedFiches.size === 0) {
      showNotification('Attention', 'Veuillez sélectionner au moins une fiche technique', 'warning')
      return
    }

    // Sauvegarder explicitement l'état AVANT la génération
    const storageKey = `fiches-techniques-${chantierId}`
    const stateToSave = {
      selectedFiches: Array.from(selectedFiches),
      ficheReferences: Object.fromEntries(ficheReferences),
      fichesSoustraitants,
      fichesRemarques,
      includeTableOfContents
    }
    localStorage.setItem(storageKey, JSON.stringify(stateToSave))
    console.log('[Fullscreen] État sauvegardé AVANT génération:', stateToSave)

    setGenerating(true)
    try {
      const ficheIds = Array.from(selectedFiches)
      
      // Créer un objet avec les références CSC pour chaque fiche
      const references: Record<string, string> = {}
      ficheIds.forEach(id => {
        references[id] = ficheReferences.get(id) || ''
      })
      
      // Filtrer les sous-traitants et remarques pour ne garder que ceux des fiches sélectionnées
      const soustraitantsFiltered: Record<string, string> = {}
      const remarquesFiltered: Record<string, string> = {}
      ficheIds.forEach(id => {
        if (fichesSoustraitants[id]) {
          soustraitantsFiltered[id] = fichesSoustraitants[id]
        }
        if (fichesRemarques[id]) {
          remarquesFiltered[id] = fichesRemarques[id]
        }
      })
      
      console.log('[Fullscreen] Données envoyées à l\'API:', {
        ficheIds,
        references,
        soustraitantsFiltered,
        remarquesFiltered,
        fichesSoustraitants,
        fichesRemarques
      })
      
      const response = await fetch('/api/fiches-techniques/generer-dossier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chantierId,
          ficheIds,
          ficheReferences: references,
          fichesSoustraitants: soustraitantsFiltered,
          fichesRemarques: remarquesFiltered,
          options: {
            includeTableOfContents
          }
        })
      })

      if (!response.ok) {
        throw new Error('Erreur lors de la génération du PDF')
      }

      // Télécharger le PDF
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `fiches-techniques-chantier-${chantierId}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      // Sauvegarder explicitement l'état APRÈS génération
      const storageKey = `fiches-techniques-${chantierId}`
      const stateToSaveAfter = {
        selectedFiches: Array.from(selectedFiches),
        ficheReferences: Object.fromEntries(ficheReferences),
        fichesSoustraitants,
        fichesRemarques,
        includeTableOfContents
      }
      localStorage.setItem(storageKey, JSON.stringify(stateToSaveAfter))
      console.log('[Fullscreen] État sauvegardé APRÈS génération:', {
        selectedFiches: stateToSaveAfter.selectedFiches.length,
        fichesSoustraitants: Object.keys(stateToSaveAfter.fichesSoustraitants).length,
        fichesSoustraitantsData: stateToSaveAfter.fichesSoustraitants
      })
      
      // Fermer l'onglet et revenir à l'onglet précédent
      if (window.opener) {
        // Notifier l'onglet parent que la génération est terminée
        window.opener.postMessage({ type: 'fiches-techniques-generated', chantierId }, '*')
        // Ne PAS changer d'onglet automatiquement - laisser l'utilisateur sur "fiches-techniques"
        // window.opener.dispatchEvent(new CustomEvent('switchToDocumentsTab'))
        window.close()
      } else {
        // Si pas d'opener, rediriger vers la page du chantier
        window.location.href = `/chantiers/${chantierId}`
      }
    } catch (error) {
      console.error('Erreur lors de la génération du PDF:', error)
      showNotification('Erreur', 'Erreur lors de la génération du PDF', 'error')
      setGenerating(false)
    }
  }

  // Filtrer l'arborescence selon le terme de recherche
  const filterStructure = (dossiers: Dossier[], searchTerm: string): Dossier[] => {
    if (!searchTerm.trim()) return dossiers

    const lowerSearch = searchTerm.toLowerCase()
    
    const filterDossier = (dossier: Dossier): Dossier | null => {
      // Filtrer les fiches qui correspondent
      const filteredFiches = dossier.fiches.filter(fiche =>
        fiche.titre.toLowerCase().includes(lowerSearch) ||
        fiche.referenceCSC?.toLowerCase().includes(lowerSearch)
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

  // Obtenir la structure filtrée
  const filteredStructure = filterStructure(structure, searchFilter)

  // Rendu d'un dossier
  const renderDossier = (dossier: Dossier, niveau: number = 0) => {
    const hasFiches = dossier.fiches.length > 0
    const allSelected = hasFiches && dossier.fiches.every(f => selectedFiches.has(f.id))
    const someSelected = hasFiches && dossier.fiches.some(f => selectedFiches.has(f.id))

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

          {/* Checkbox pour tout sélectionner dans le dossier */}
          {hasFiches && (
            <input
              type="checkbox"
              checked={allSelected}
              ref={(el) => {
                if (el) el.indeterminate = someSelected && !allSelected
              }}
              onChange={(e) => selectAllInDossier(dossier, e.target.checked)}
              className="mr-2 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
          )}

          {/* Icône et nom du dossier */}
          <FolderIcon className="h-5 w-5 text-yellow-500 mr-2" />
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {dossier.nom}
            {hasFiches && (
              <span className="ml-2 text-xs text-gray-500">
                ({dossier.fiches.length} fiche{dossier.fiches.length > 1 ? 's' : ''})
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
            {dossier.fiches.map(fiche => (
              <div key={fiche.id} className="py-1.5 hover:bg-gray-50 dark:hover:bg-gray-700 rounded px-2">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedFiches.has(fiche.id)}
                    onChange={() => toggleFiche(fiche.id)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
                  />
                  <DocumentTextIcon className="h-4 w-4 text-red-500 mr-2" />
                  
                  {/* Champ de référence CSC (visible seulement si sélectionné) */}
                  {selectedFiches.has(fiche.id) && (
                    <input
                      type="text"
                      value={ficheReferences.get(fiche.id) || ''}
                      onChange={(e) => updateFicheReference(fiche.id, e.target.value)}
                      placeholder="CSC"
                      maxLength={20}
                      style={{ width: '120px', minWidth: '120px', maxWidth: '120px' }}
                      className="px-1.5 py-0.5 text-xs border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white mr-2"
                      title="Numéro du poste du cahier des charges (max 20 caractères)"
                    />
                  )}
                  
                  <span className="text-sm text-gray-700 dark:text-gray-300 flex-1 min-w-0 truncate">
                    {fiche.titre}
                  </span>
                  {fiche.referenceCSC && (
                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                      ({fiche.referenceCSC})
                    </span>
                  )}
                  
                  {/* Dropdown sous-traitant (visible seulement si sélectionné) - sur la même ligne */}
                  {selectedFiches.has(fiche.id) && (
                    <select
                      value={fichesSoustraitants[fiche.id] || ''}
                      onChange={(e) => {
                        setFichesSoustraitants(prev => ({
                          ...prev,
                          [fiche.id]: e.target.value || ''
                        }))
                      }}
                      style={{ width: '150px', minWidth: '150px', maxWidth: '150px' }}
                      className="px-2 py-0.5 text-xs border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white ml-2"
                    >
                      <option value="">Sous-traitant</option>
                      {soustraitants.map(st => (
                        <option key={st.id} value={st.id}>{st.nom}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <span className="text-gray-600 dark:text-gray-300">Chargement des fiches techniques...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-white dark:bg-gray-900 flex flex-col overflow-hidden">
      {/* Header plein écran */}
      <div className="relative px-6 py-4 bg-gradient-to-br from-emerald-600/10 via-teal-700/10 to-cyan-800/10 dark:from-emerald-600/10 dark:via-teal-700/10 dark:to-cyan-800/10 text-emerald-900 dark:text-white border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/20 to-cyan-800/20"></div>
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <DocumentTextIcon className="w-6 h-6 text-emerald-900 dark:text-white" />
            <span className="font-bold text-xl text-emerald-900 dark:text-white">📋 Sélection des Fiches Techniques</span>
          </div>
          <button
            onClick={() => {
              if (window.opener) {
                window.close()
              } else {
                window.location.href = `/chantiers/${chantierId}`
              }
            }}
            className="inline-flex items-center px-3 py-2 bg-white/20 backdrop-blur-sm rounded-lg shadow-md ring-1 ring-white/30 hover:bg-white/30 transition-all duration-200"
            title="Fermer"
          >
            <XMarkIcon className="w-5 h-5 text-emerald-900 dark:text-white" />
          </button>
        </div>
      </div>

      {/* Options de génération */}
      <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600 flex-shrink-0">
        <div className="flex items-center justify-between">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={includeTableOfContents}
              onChange={(e) => setIncludeTableOfContents(e.target.checked)}
              className="mr-2 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Inclure la table des matières
            </span>
          </label>

          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {selectedFiches.size} fiche{selectedFiches.size > 1 ? 's' : ''} sélectionnée{selectedFiches.size > 1 ? 's' : ''}
            </span>
            <button
              onClick={handleGeneratePDF}
              disabled={selectedFiches.size === 0 || generating}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {generating ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Génération...
                </>
              ) : (
                <>
                  <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
                  Générer le dossier PDF
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Champ de recherche */}
      <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600 flex-shrink-0">
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

      {/* Arborescence plein écran */}
      <div className="flex-1 overflow-y-auto p-6 bg-white dark:bg-gray-900 min-h-0">
        {structure.length === 0 ? (
          <div className="text-center py-12">
            <FolderIcon className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-500 mb-3" />
            <p className="text-gray-500 dark:text-gray-400">
              Aucune fiche technique disponible
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
              Ajoutez des fiches techniques via la page de Configuration
            </p>
          </div>
        ) : filteredStructure.length === 0 ? (
          <div className="text-center py-12">
            <MagnifyingGlassIcon className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-500 mb-3" />
            <p className="text-gray-500 dark:text-gray-400">
              Aucune fiche technique ne correspond à votre recherche
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {filteredStructure.map(dossier => renderDossier(dossier))}
          </div>
        )}
      </div>
      <NotificationComponent />
    </div>
  )
}

