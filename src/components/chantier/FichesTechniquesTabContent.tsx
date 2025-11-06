'use client'
import { useEffect, useState } from 'react'
import { 
  DocumentTextIcon, 
  FolderIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  ArrowDownTrayIcon
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

interface FichesTechniquesTabContentProps {
  chantierId: string
}

export default function FichesTechniquesTabContent({ chantierId }: FichesTechniquesTabContentProps) {
  const [structure, setStructure] = useState<Dossier[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedFiches, setSelectedFiches] = useState<Set<string>>(new Set())
  const [ficheReferences, setFicheReferences] = useState<Map<string, string>>(new Map())
  const [generating, setGenerating] = useState(false)
  const [includeTableOfContents, setIncludeTableOfContents] = useState(true)

  // Charger la structure des fiches techniques
  useEffect(() => {
    const fetchStructure = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/fiches-techniques/structure')
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
        // Supprimer aussi la référence
        setFicheReferences(prevRefs => {
          const newRefs = new Map(prevRefs)
          newRefs.delete(ficheId)
          return newRefs
        })
      } else {
        newSet.add(ficheId)
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

  // Générer le PDF
  const handleGeneratePDF = async () => {
    if (selectedFiches.size === 0) {
      alert('Veuillez sélectionner au moins une fiche technique')
      return
    }

    setGenerating(true)
    try {
      const ficheIds = Array.from(selectedFiches)
      
      // Créer un objet avec les références CSC pour chaque fiche
      const references: Record<string, string> = {}
      ficheIds.forEach(id => {
        references[id] = ficheReferences.get(id) || ''
      })
      
      const response = await fetch('/api/fiches-techniques/generer-dossier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chantierId,
          ficheIds,
          ficheReferences: references,
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
    } catch (error) {
      console.error('Erreur lors de la génération du PDF:', error)
      alert('Erreur lors de la génération du PDF')
    } finally {
      setGenerating(false)
    }
  }

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
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600 dark:text-gray-300">Chargement des fiches techniques...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="relative px-6 py-6 bg-gradient-to-br from-emerald-600/10 via-teal-700/10 to-cyan-800/10 dark:from-emerald-600/10 dark:via-teal-700/10 dark:to-cyan-800/10 text-emerald-900 dark:text-white overflow-hidden rounded-t-lg backdrop-blur-sm">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/20 to-cyan-800/20"></div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl transform translate-x-16 -translate-y-16"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-teal-300/20 rounded-full blur-xl transform -translate-x-8 translate-y-8"></div>
          
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <div className="inline-flex items-center px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full shadow-lg ring-2 ring-white/30">
                  <DocumentTextIcon className="w-6 h-6 mr-3 text-emerald-900 dark:text-white" />
                  <span className="font-bold text-xl text-emerald-900 dark:text-white">📋 Sélection des Fiches Techniques</span>
                </div>
              </div>
            </div>

            <p className="text-sm text-emerald-800 dark:text-white/90">
              Sélectionnez les fiches techniques à inclure dans votre dossier. Un PDF sera généré avec une page de garde et une table des matières.
            </p>
          </div>
        </div>

        {/* Options de génération */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600">
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

        {/* Arborescence */}
        <div className="p-6">
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
          ) : (
            <div className="space-y-1">
              {structure.map(dossier => renderDossier(dossier))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
