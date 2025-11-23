'use client'
import { useState, useEffect } from 'react'
import {
  XMarkIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
  DocumentTextIcon,
  FolderIcon,
  ChevronRightIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline'
import { useNotification } from '@/hooks/useNotification'
import { useSession } from 'next-auth/react'

interface DossierFiche {
  id: string
  ficheId: string
  ficheReference: string | null
  version: number
  statut: 'VALIDEE' | 'A_REMPLACER' | 'NOUVELLE_PROPOSITION' | 'BROUILLON'
  ordre: number
  ficheRemplaceeId: string | null
}

interface DossierTechnique {
  id: string
  nom: string
  version: number
  statut: string
  url: string
  dateGeneration: string
  dateModification: string
  fiches: DossierFiche[]
}

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

interface ModifierDossierModalProps {
  dossier: DossierTechnique | null
  chantierId: string
  structure: Dossier[]
  onClose: () => void
  onRegenerate: () => void
}

// Fonction pour trouver toutes les fiches dans la structure
const getAllFiches = (dossiers: Dossier[]): FicheTechnique[] => {
  let fiches: FicheTechnique[] = []
  dossiers.forEach(dossier => {
    fiches = [...fiches, ...dossier.fiches]
    if (dossier.sousDossiers.length > 0) {
      fiches = [...fiches, ...getAllFiches(dossier.sousDossiers)]
    }
  })
  return fiches
}

export default function ModifierDossierModal({
  dossier,
  chantierId,
  structure,
  onClose,
  onRegenerate
}: ModifierDossierModalProps) {
  const [fichesStatuts, setFichesStatuts] = useState<Record<string, string>>({})
  const [fichesRemplacees, setFichesRemplacees] = useState<Record<string, string>>({})
  const [fichesSoustraitants, setFichesSoustraitants] = useState<Record<string, string>>({})
  const [fichesRemarques, setFichesRemarques] = useState<Record<string, string>>({})
  const [soustraitants, setSoustraitants] = useState<Array<{ id: string; nom: string }>>([])
  const [replacementMode, setReplacementMode] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const { showNotification, NotificationComponent } = useNotification()
  const [structureComplete, setStructureComplete] = useState<Dossier[]>([])
  const [loadingStructure, setLoadingStructure] = useState(false)
  const [searchFilterReplacement, setSearchFilterReplacement] = useState('')
  const { data: session } = useSession()

  useEffect(() => {
    if (dossier) {
      const statuts: Record<string, string> = {}
      const soustraitantsData: Record<string, string> = {}
      const remarquesData: Record<string, string> = {}
      dossier.fiches.forEach(fiche => {
        statuts[fiche.ficheId] = fiche.statut
        if ((fiche as any).soustraitantId) {
          soustraitantsData[fiche.ficheId] = (fiche as any).soustraitantId
        }
        if ((fiche as any).remarques) {
          remarquesData[fiche.ficheId] = (fiche as any).remarques
        }
      })
      setFichesStatuts(statuts)
      setFichesSoustraitants(soustraitantsData)
      setFichesRemarques(remarquesData)
    }
  }, [dossier])

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

  // Charger la structure complète quand on entre en mode remplacement
  useEffect(() => {
    if (replacementMode) {
      const fetchStructure = async () => {
        try {
          setLoadingStructure(true)
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
          
          const initializedStructure = initExpanded(data)
          setStructureComplete(initializedStructure)
          setSearchFilterReplacement('')
          
          // Debug: compter toutes les fiches
          const countAllFiches = (dossiers: Dossier[]): number => {
            let count = 0
            dossiers.forEach(d => {
              count += d.fiches.length
              if (d.sousDossiers.length > 0) {
                count += countAllFiches(d.sousDossiers)
              }
            })
            return count
          }
          const totalFiches = countAllFiches(initializedStructure)
          console.log('[ModifierDossierModal] Structure complète chargée:', {
            totalFiches,
            replacementMode,
            dossiers: initializedStructure.map(d => ({
              nom: d.nom,
              fichesCount: d.fiches.length,
              fiches: d.fiches.map(f => ({ id: f.id, titre: f.titre }))
            }))
          })
        } catch (error) {
          console.error('Erreur lors du chargement de la structure:', error)
        } finally {
          setLoadingStructure(false)
        }
      }
      
      fetchStructure()
    }
  }, [replacementMode])

  const handleSelectReplacement = (nouvelleFicheId: string) => {
    if (replacementMode) {
      setFichesRemplacees(prev => ({
        ...prev,
        [replacementMode]: nouvelleFicheId
      }))
      setReplacementMode(null)
    }
  }

  if (!dossier) return null

  const handleStatutChange = (ficheId: string, nouveauStatut: string) => {
    setFichesStatuts(prev => ({
      ...prev,
      [ficheId]: nouveauStatut
    }))
  }

  const handleSave = async () => {
    if (!dossier) return

    setSaving(true)
    try {
      const response = await fetch(`/api/fiches-techniques/dossier/${dossier.id}/fiches`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fichesStatuts,
          fichesRemplacees,
          fichesSoustraitants,
          fichesRemarques
        })
      })

      if (!response.ok) throw new Error('Erreur lors de la sauvegarde')

      // Mettre à jour le statut du dossier si nécessaire
      const hasRejections = Object.values(fichesStatuts).some(s => s === 'A_REMPLACER')
      if (hasRejections) {
        await fetch(`/api/fiches-techniques/dossier/${dossier.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            statut: 'REFUSE_PARTIELLEMENT'
          })
        })
      }

      showNotification('Succès', 'Modifications enregistrées avec succès', 'success')
      onRegenerate()
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error)
      showNotification('Erreur', 'Erreur lors de la sauvegarde', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleRegeneratePDF = async () => {
    if (!dossier) return

    setGenerating(true)
    try {
      // Récupérer les fiches actuelles (avec remplacements)
      const ficheIds: string[] = []
      const ficheReferences: Record<string, string> = {}
      const finalStatuts: Record<string, string> = {}

      const finalSoustraitants: Record<string, string> = {}
      const finalRemarques: Record<string, string> = {}

      dossier.fiches.forEach(fiche => {
        const nouvelleFicheId = fichesRemplacees[fiche.ficheId] || fiche.ficheId
        if (!ficheIds.includes(nouvelleFicheId)) {
          ficheIds.push(nouvelleFicheId)
          if (fiche.ficheReference) {
            ficheReferences[nouvelleFicheId] = fiche.ficheReference
          }
          finalStatuts[nouvelleFicheId] = fichesStatuts[fiche.ficheId] || fiche.statut
          if (fichesSoustraitants[fiche.ficheId]) {
            finalSoustraitants[nouvelleFicheId] = fichesSoustraitants[fiche.ficheId]
          }
          if (fichesRemarques[fiche.ficheId]) {
            finalRemarques[nouvelleFicheId] = fichesRemarques[fiche.ficheId]
          }
        }
      })

      const response = await fetch('/api/fiches-techniques/generer-dossier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chantierId,
          dossierId: dossier.id,
          ficheIds,
          ficheReferences,
          fichesStatuts: finalStatuts,
          fichesSoustraitants: finalSoustraitants,
          fichesRemarques: finalRemarques,
          options: {
            includeTableOfContents: true
          }
        })
      })

      if (!response.ok) throw new Error('Erreur lors de la génération')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `dossier-technique-v${dossier.version + 1}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      showNotification('Succès', 'PDF régénéré avec succès', 'success')
      onRegenerate()
      onClose()
    } catch (error) {
      console.error('Erreur lors de la génération:', error)
      showNotification('Erreur', 'Erreur lors de la génération du PDF', 'error')
    } finally {
      setGenerating(false)
    }
  }

  const getStatutColor = (statut: string) => {
    switch (statut) {
      case 'VALIDEE':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
      case 'NOUVELLE_PROPOSITION':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300'
      case 'A_REMPLACER':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
      case 'BROUILLON':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
    }
  }

  const getStatutLabel = (statut: string) => {
    switch (statut) {
      case 'VALIDEE':
        return 'Validée'
      case 'NOUVELLE_PROPOSITION':
        return 'Nouvelle proposition'
      case 'A_REMPLACER':
        return 'À remplacer'
      case 'BROUILLON':
        return 'Brouillon'
      default:
        return statut
    }
  }

  // Toggle l'expansion d'un dossier dans l'arborescence de remplacement
  const toggleDossierReplacement = (chemin: string) => {
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
    setStructureComplete(prev => updateDossiers(prev))
  }

  // Filtrer l'arborescence pour le remplacement
  const filterStructureReplacement = (dossiers: Dossier[], searchTerm: string): Dossier[] => {
    if (!searchTerm.trim()) {
      // Sans recherche, retourner la structure complète mais exclure la fiche en mode remplacement
      return dossiers.map(dossier => ({
        ...dossier,
        fiches: dossier.fiches.filter(f => !replacementMode || f.id !== replacementMode),
        sousDossiers: filterStructureReplacement(dossier.sousDossiers, '')
      }))
    }

    const lowerSearch = searchTerm.toLowerCase()
    
    const filterDossier = (dossier: Dossier): Dossier | null => {
      // Exclure la fiche en mode remplacement ET filtrer par recherche
      const filteredFiches = dossier.fiches.filter(fiche =>
        (fiche.titre.toLowerCase().includes(lowerSearch) ||
        fiche.referenceCSC?.toLowerCase().includes(lowerSearch) ||
        fiche.id.toLowerCase().includes(lowerSearch)) &&
        (!replacementMode || fiche.id !== replacementMode)
      )

      const filteredSousDossiers = dossier.sousDossiers
        .map(filterDossier)
        .filter((d): d is Dossier => d !== null)

      if (
        filteredFiches.length > 0 ||
        filteredSousDossiers.length > 0 ||
        dossier.nom.toLowerCase().includes(lowerSearch)
      ) {
        return {
          ...dossier,
          fiches: filteredFiches,
          sousDossiers: filteredSousDossiers,
          isExpanded: true
        }
      }

      return null
    }

    return dossiers
      .map(filterDossier)
      .filter((d): d is Dossier => d !== null)
  }

  const filteredStructureReplacement = filterStructureReplacement(structureComplete, searchFilterReplacement)

  // Rendu de l'arborescence pour le remplacement (identique à la page principale)
  const renderDossierReplacement = (dossier: Dossier, niveau: number = 0) => {
    const hasFiches = dossier.fiches.length > 0

    return (
      <div key={dossier.chemin} className={`${niveau > 0 ? 'ml-4' : ''}`}>
        <div className="flex items-center py-2">
          <button
            onClick={() => toggleDossierReplacement(dossier.chemin)}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded mr-1"
          >
            {dossier.isExpanded ? (
              <ChevronDownIcon className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronRightIcon className="h-4 w-4 text-gray-500" />
            )}
          </button>

          <FolderIcon className="h-5 w-5 text-yellow-500 mr-2" />
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {dossier.nom}
            {hasFiches && (
              <span className="ml-2 text-xs text-gray-500">
                ({dossier.fiches.filter(f => !replacementMode || f.id !== replacementMode).length} fiche{dossier.fiches.filter(f => !replacementMode || f.id !== replacementMode).length > 1 ? 's' : ''})
              </span>
            )}
          </span>
        </div>

        {dossier.isExpanded && (
          <div className="ml-6">
            {dossier.sousDossiers.map(sd => renderDossierReplacement(sd, niveau + 1))}

            {dossier.fiches.map(fiche => (
                <div 
                  key={fiche.id} 
                  className="py-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded px-2 cursor-pointer transition-colors"
                  onClick={() => handleSelectReplacement(fiche.id)}
                >
                  <div className="flex items-center">
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
              ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col border border-gray-200 dark:border-gray-700">
          {/* En-tête */}
          <div className="relative px-6 py-4 bg-gradient-to-br from-emerald-600/10 via-teal-700/10 to-cyan-800/10 dark:from-emerald-600/10 dark:via-teal-700/10 dark:to-cyan-800/10 border-b border-gray-200 dark:border-gray-700 overflow-hidden rounded-t-lg">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/20 to-cyan-800/20"></div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl transform translate-x-16 -translate-y-16"></div>
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <DocumentTextIcon className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    Modifier le dossier technique
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Version {dossier.version} • {dossier.fiches.length} fiche{dossier.fiches.length > 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
          </div>

        {/* Contenu */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            {dossier.fiches.map((fiche) => {
              const currentStatut = fichesStatuts[fiche.ficheId] || fiche.statut
              const isReplaced = fichesRemplacees[fiche.ficheId]
              
              return (
                <div
                  key={fiche.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {isReplaced ? (
                            <span className="line-through text-gray-400">{fiche.ficheId}</span>
                          ) : (
                            fiche.ficheId
                          )}
                        </span>
                        {fiche.version > 1 && (
                          <span className="text-xs font-medium text-orange-600 dark:text-orange-400">
                            V{fiche.version}
                          </span>
                        )}
                        {isReplaced && (
                          <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                            → {isReplaced}
                          </span>
                        )}
                      </div>
                      {fiche.ficheReference && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Réf CSC: {fiche.ficheReference}
                        </p>
                      )}
                    </div>
                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getStatutColor(currentStatut)}`}>
                      {getStatutLabel(currentStatut)}
                    </span>
                  </div>

                  <div className="flex flex-col gap-3 mt-3">
                    <div className="flex items-center gap-2">
                      <select
                        value={currentStatut}
                        onChange={(e) => handleStatutChange(fiche.ficheId, e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="BROUILLON">Brouillon</option>
                        <option value="VALIDEE">Validée</option>
                        <option value="A_REMPLACER">À remplacer</option>
                        <option value="NOUVELLE_PROPOSITION">Nouvelle proposition</option>
                      </select>

                      {/* Afficher le bouton "Remplacer" uniquement si le statut est "À remplacer" */}
                      {currentStatut === 'A_REMPLACER' && (
                        <button
                          onClick={() => {
                            if (replacementMode === fiche.ficheId) {
                              setReplacementMode(null)
                            } else {
                              setReplacementMode(fiche.ficheId)
                            }
                          }}
                          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap shadow-sm ${
                            replacementMode === fiche.ficheId
                              ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-md'
                              : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-900/50'
                          }`}
                        >
                          {replacementMode === fiche.ficheId ? 'Annuler' : 'Remplacer'}
                        </button>
                      )}
                    </div>

                    {/* Dropdown sous-traitant */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Sous-traitant (optionnel)
                      </label>
                      <select
                        value={fichesSoustraitants[fiche.ficheId] || ''}
                        onChange={(e) => {
                          setFichesSoustraitants(prev => ({
                            ...prev,
                            [fiche.ficheId]: e.target.value || ''
                          }))
                        }}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="">Aucun</option>
                        {soustraitants.map(st => (
                          <option key={st.id} value={st.id}>{st.nom}</option>
                        ))}
                      </select>
                    </div>

                    {/* Champ remarques */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Remarques (optionnel)
                      </label>
                      <textarea
                        value={fichesRemarques[fiche.ficheId] || ''}
                        onChange={(e) => {
                          setFichesRemarques(prev => ({
                            ...prev,
                            [fiche.ficheId]: e.target.value
                          }))
                        }}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                        placeholder="Ajouter des remarques sur cette fiche technique..."
                      />
                    </div>

                    {/* Arborescence de remplacement intégrée */}
                    {replacementMode === fiche.ficheId && (
                      <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                        <div className="mb-3">
                          <div className="relative">
                            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                              type="text"
                              value={searchFilterReplacement}
                              onChange={(e) => setSearchFilterReplacement(e.target.value)}
                              placeholder="Rechercher une fiche technique..."
                              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                            />
                            {searchFilterReplacement && (
                              <button
                                onClick={() => setSearchFilterReplacement('')}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                              >
                                <XMarkIcon className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="max-h-64 overflow-y-auto">
                          {loadingStructure ? (
                            <div className="text-center py-8">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-2"></div>
                              <p className="text-xs text-gray-500">Chargement...</p>
                            </div>
                          ) : filteredStructureReplacement.length === 0 ? (
                            <p className="text-sm text-gray-500 text-center py-4">Aucune fiche disponible</p>
                          ) : (
                            <div>
                              {filteredStructureReplacement.map(d => renderDossierReplacement(d))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Pied de page */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors font-medium"
          >
            Annuler
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-sm hover:shadow-md"
            >
              {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
            </button>
            <button
              onClick={handleRegeneratePDF}
              disabled={generating}
              className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-semibold shadow-sm hover:shadow-md"
            >
              {generating ? (
                <>
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Génération...
                </>
              ) : (
                <>
                  <ArrowPathIcon className="h-4 w-4" />
                  Régénérer le PDF
                </>
              )}
            </button>
          </div>
        </div>
      </div>
      </div>

      <NotificationComponent />
    </div>
  )
}

