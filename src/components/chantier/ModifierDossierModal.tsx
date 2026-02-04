'use client'
import { useState, useEffect, useCallback } from 'react'
import {
  XMarkIcon,
  TrashIcon,
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
  statut: 'VALIDEE' | 'NOUVELLE_PROPOSITION' | 'BROUILLON'
  ordre: number
  ficheRemplaceeId: string | null
  soustraitantId?: string | null
  remarques?: string | null
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


export default function ModifierDossierModal({
  dossier,
  chantierId,
  structure: _structure,
  onClose,
  onRegenerate
}: ModifierDossierModalProps) {
  const [fichesStatuts, setFichesStatuts] = useState<Record<string, string>>({})
  const [fichesRemplacees, setFichesRemplacees] = useState<Record<string, string>>({})
  const [fichesSoustraitants, setFichesSoustraitants] = useState<Record<string, string>>({})
  const [fichesReferences, setFichesReferences] = useState<Record<string, string>>({})
  const [fichesRemarques, setFichesRemarques] = useState<Record<string, string>>({})
  const [soustraitants, setSoustraitants] = useState<Array<{ id: string; nom: string }>>([])
  const [replacementMode, setReplacementMode] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const { showNotification, NotificationComponent } = useNotification()
  const [structureComplete, setStructureComplete] = useState<Dossier[]>([])
  const [loadingStructure, setLoadingStructure] = useState(false)
  const [searchFilterReplacement, setSearchFilterReplacement] = useState('')
  const [addingFiches, setAddingFiches] = useState(false)
  const [fichesSelectionnees, setFichesSelectionnees] = useState<Set<string>>(new Set())
  const [searchFilterAdd, setSearchFilterAdd] = useState('')
  const [fichesASupprimer, setFichesASupprimer] = useState<Set<string>>(new Set()) // DossierFiche.id à retirer du dossier
  const { data: _session } = useSession()

  useEffect(() => {
    if (dossier) {
      const statuts: Record<string, string> = {}
      const soustraitantsData: Record<string, string> = {}
      const referencesData: Record<string, string> = {}
      const remarquesData: Record<string, string> = {}
      dossier.fiches.forEach(fiche => {
        statuts[fiche.ficheId] = fiche.statut
        if (fiche.soustraitantId) {
          soustraitantsData[fiche.ficheId] = String(fiche.soustraitantId)
        }
        if (fiche.ficheReference) {
          referencesData[fiche.ficheId] = fiche.ficheReference
        }
        if (fiche.remarques) {
          remarquesData[fiche.ficheId] = fiche.remarques
        }
      })
      setFichesStatuts(statuts)
      setFichesSoustraitants(soustraitantsData)
      setFichesReferences(referencesData)
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

  // Fonction pour charger la structure complète
  const fetchStructure = useCallback(async () => {
    try {
      setLoadingStructure(true)
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
  }, [chantierId, replacementMode])

  // Charger la structure complète quand on entre en mode remplacement
  useEffect(() => {
    if (replacementMode) {
      fetchStructure()
    }
  }, [replacementMode, fetchStructure])

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
      // Préparer les fiches à ajouter
      const fichesAAjouter = Array.from(fichesSelectionnees).map(ficheId => ({
        ficheId,
        ficheReference: fichesReferences[ficheId] || null,
        statut: fichesStatuts[ficheId] || 'BROUILLON',
        soustraitantId: fichesSoustraitants[ficheId] || null,
        remarques: fichesRemarques[ficheId] || null
      }))

      const response = await fetch(`/api/fiches-techniques/dossier/${dossier.id}/fiches`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fichesStatuts,
          fichesRemplacees,
          fichesSoustraitants,
          fichesReferences,
          fichesRemarques,
          fichesAAjouter: fichesAAjouter.length > 0 ? fichesAAjouter : undefined,
          fichesASupprimer: fichesASupprimer.size > 0 ? Array.from(fichesASupprimer) : undefined
        })
      })

      if (!response.ok) throw new Error('Erreur lors de la sauvegarde')

      const updatedDossier = await response.json()
      setFichesASupprimer(new Set())
      setFichesSelectionnees(new Set())
      setAddingFiches(false)

      // Régénérer le PDF pour mettre à jour les tables des matières
      setGenerating(true)
      try {
        const ficheIds = updatedDossier.fiches.map((f: DossierFiche) => f.ficheId)
        const ficheReferences: Record<string, string> = {}
        const finalStatuts: Record<string, string> = {}
        const finalSoustraitants: Record<string, string> = {}
        const finalRemarques: Record<string, string> = {}
        updatedDossier.fiches.forEach((f: DossierFiche) => {
          if (f.ficheReference) ficheReferences[f.ficheId] = f.ficheReference
          finalStatuts[f.ficheId] = f.statut
          if (f.soustraitantId) finalSoustraitants[f.ficheId] = String(f.soustraitantId)
          if (f.remarques) finalRemarques[f.ficheId] = f.remarques
        })
        const genRes = await fetch('/api/fiches-techniques/generer-dossier', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chantierId,
            dossierId: updatedDossier.id,
            ficheIds,
            ficheReferences,
            fichesStatuts: finalStatuts,
            fichesSoustraitants: finalSoustraitants,
            fichesRemarques: finalRemarques,
            options: { includeTableOfContents: true }
          })
        })
        if (genRes.ok) {
          showNotification('Succès', 'Modifications enregistrées et PDF régénéré', 'success')
        } else {
          showNotification('Succès', 'Modifications enregistrées (régénération PDF à lancer manuellement si besoin)', 'success')
        }
      } catch (regErr) {
        console.error('Régénération PDF après sauvegarde:', regErr)
        showNotification('Succès', 'Modifications enregistrées (régénération PDF à lancer manuellement si besoin)', 'success')
      } finally {
        setGenerating(false)
      }
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
          // Utiliser la référence modifiée si disponible, sinon celle de la fiche
          if (fichesReferences[fiche.ficheId]) {
            ficheReferences[nouvelleFicheId] = fichesReferences[fiche.ficheId]
          } else if (fiche.ficheReference) {
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

  // Filtrer l'arborescence pour l'ajout de fiches (exclure les fiches déjà dans le dossier)
  const filterStructureAdd = (dossiers: Dossier[], searchTerm: string): Dossier[] => {
    if (!dossier) return []
    
    const fichesExistantes = new Set(dossier.fiches.map(f => f.ficheId))
    
    if (!searchTerm.trim()) {
      return dossiers.map(d => ({
        ...d,
        fiches: d.fiches.filter(f => !fichesExistantes.has(f.id)),
        sousDossiers: filterStructureAdd(d.sousDossiers, '')
      }))
    }

    const lowerSearch = searchTerm.toLowerCase()
    
    const filterDossier = (d: Dossier): Dossier | null => {
      const filteredFiches = d.fiches.filter(fiche =>
        (fiche.titre.toLowerCase().includes(lowerSearch) ||
        fiche.referenceCSC?.toLowerCase().includes(lowerSearch) ||
        fiche.id.toLowerCase().includes(lowerSearch)) &&
        !fichesExistantes.has(fiche.id)
      )

      const filteredSousDossiers = d.sousDossiers
        .map(filterDossier)
        .filter((d): d is Dossier => d !== null)

      if (
        filteredFiches.length > 0 ||
        filteredSousDossiers.length > 0 ||
        d.nom.toLowerCase().includes(lowerSearch)
      ) {
        return {
          ...d,
          fiches: filteredFiches,
          sousDossiers: filteredSousDossiers
        }
      }
      return null
    }

    return dossiers.map(filterDossier).filter((d): d is Dossier => d !== null)
  }

  const filteredStructureAdd = filterStructureAdd(structureComplete, searchFilterAdd)

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
                ({dossier.fiches.filter(f => !fichesASupprimer.has(f.id) && (!replacementMode || f.id !== replacementMode)).length} fiche{dossier.fiches.filter(f => !fichesASupprimer.has(f.id) && (!replacementMode || f.id !== replacementMode)).length > 1 ? 's' : ''})
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
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 p-4 pt-20 overflow-y-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[85vh] flex flex-col border border-gray-200 dark:border-gray-700 my-4">
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
                    Version {dossier.version} • {dossier.fiches.filter(f => !fichesASupprimer.has(f.id)).length} fiche{dossier.fiches.filter(f => !fichesASupprimer.has(f.id)).length !== 1 ? 's' : ''}
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
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-3">
            {dossier.fiches.filter(f => !fichesASupprimer.has(f.id)).map((fiche) => {
              const currentStatut = fichesStatuts[fiche.ficheId] || fiche.statut
              const isReplaced = fichesRemplacees[fiche.ficheId]
              
              return (
                <div
                  key={fiche.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-3"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-medium text-sm text-gray-900 dark:text-white truncate">
                          {isReplaced ? (
                            <span className="line-through text-gray-400">{fiche.ficheId}</span>
                          ) : (
                            fiche.ficheId
                          )}
                        </span>
                        {fiche.version > 1 && (
                          <span className="text-xs font-medium text-orange-600 dark:text-orange-400 whitespace-nowrap">
                            V{fiche.version}
                          </span>
                        )}
                        {isReplaced && (
                          <span className="text-xs font-medium text-blue-600 dark:text-blue-400 truncate">
                            → {isReplaced}
                          </span>
                        )}
                      </div>
                      {fiche.ficheReference && (
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          Réf CSC: {fiche.ficheReference}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatutColor(currentStatut)}`}>
                        {getStatutLabel(currentStatut)}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm('Retirer cette fiche du dossier ? Le PDF sera régénéré à la prochaine sauvegarde.')) {
                            setFichesASupprimer(prev => new Set(prev).add(fiche.id))
                          }
                        }}
                        className="p-1.5 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        title="Supprimer du dossier"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                    {/* Statut et bouton remplacer */}
                    <div className="md:col-span-2 flex items-center gap-2">
                      <select
                        value={currentStatut}
                        onChange={(e) => handleStatutChange(fiche.ficheId, e.target.value)}
                        className="flex-1 px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="BROUILLON">Brouillon</option>
                        <option value="VALIDEE">Validée</option>
                        <option value="NOUVELLE_PROPOSITION">Nouvelle proposition</option>
                      </select>

                      {/* Afficher le bouton "Remplacer" uniquement si le statut est "Nouvelle proposition" */}
                      {currentStatut === 'NOUVELLE_PROPOSITION' && (
                        <button
                          onClick={() => {
                            if (replacementMode === fiche.ficheId) {
                              setReplacementMode(null)
                            } else {
                              setReplacementMode(fiche.ficheId)
                            }
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap shadow-sm flex-shrink-0 ${
                            replacementMode === fiche.ficheId
                              ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-md'
                              : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-900/50'
                          }`}
                        >
                          {replacementMode === fiche.ficheId ? 'Annuler' : 'Remplacer'}
                        </button>
                      )}
                    </div>

                    {/* Dropdown sous-traitant - réduit en largeur */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Sous-traitant
                      </label>
                      <select
                        value={fichesSoustraitants[fiche.ficheId] || ''}
                        onChange={(e) => {
                          setFichesSoustraitants(prev => ({
                            ...prev,
                            [fiche.ficheId]: e.target.value || ''
                          }))
                        }}
                        className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="">Aucun</option>
                        {soustraitants.map(st => (
                          <option key={st.id} value={st.id}>{st.nom}</option>
                        ))}
                      </select>
                    </div>

                    {/* Champ CSC */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Référence CSC
                      </label>
                      <input
                        type="text"
                        value={fichesReferences[fiche.ficheId] || ''}
                        onChange={(e) => {
                          setFichesReferences(prev => ({
                            ...prev,
                            [fiche.ficheId]: e.target.value
                          }))
                        }}
                        maxLength={20}
                        className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        placeholder="CSC"
                      />
                    </div>

                    {/* Champ remarques - réduit en hauteur */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Remarques
                      </label>
                      <textarea
                        value={fichesRemarques[fiche.ficheId] || ''}
                        onChange={(e) => {
                          setFichesRemarques(prev => ({
                            ...prev,
                            [fiche.ficheId]: e.target.value
                          }))
                        }}
                        rows={2}
                        className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                        placeholder="Remarques..."
                      />
                    </div>

                    {/* Arborescence de remplacement intégrée */}
                    {replacementMode === fiche.ficheId && (
                      <div className="md:col-span-2 mt-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                        <div className="mb-2">
                          <div className="relative">
                            <MagnifyingGlassIcon className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400" />
                            <input
                              type="text"
                              value={searchFilterReplacement}
                              onChange={(e) => setSearchFilterReplacement(e.target.value)}
                              placeholder="Rechercher une fiche..."
                              className="w-full pl-8 pr-8 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                            />
                            {searchFilterReplacement && (
                              <button
                                onClick={() => setSearchFilterReplacement('')}
                                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                              >
                                <XMarkIcon className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="max-h-48 overflow-y-auto">
                          {loadingStructure ? (
                            <div className="text-center py-4">
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600 mx-auto mb-2"></div>
                              <p className="text-xs text-gray-500">Chargement...</p>
                            </div>
                          ) : filteredStructureReplacement.length === 0 ? (
                            <p className="text-xs text-gray-500 text-center py-2">Aucune fiche disponible</p>
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

            {/* Section pour ajouter des fiches */}
            {addingFiches && (
              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-2 border-blue-200 dark:border-blue-800">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-sm text-gray-900 dark:text-white">
                  Ajouter des fiches techniques
                  </h3>
                  <button
                    onClick={() => {
                      setAddingFiches(false)
                      setFichesSelectionnees(new Set())
                      setSearchFilterAdd('')
                    }}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>
                <div className="mb-3">
                  <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={searchFilterAdd}
                      onChange={(e) => setSearchFilterAdd(e.target.value)}
                      placeholder="Rechercher une fiche..."
                      className="w-full pl-8 pr-8 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    {searchFilterAdd && (
                      <button
                        onClick={() => setSearchFilterAdd('')}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="max-h-64 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-2">
                  {loadingStructure ? (
                    <div className="text-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                      <p className="text-xs text-gray-500">Chargement...</p>
                    </div>
                  ) : filteredStructureAdd.length === 0 ? (
                    <p className="text-xs text-gray-500 text-center py-2">Aucune fiche disponible</p>
                  ) : (
                    <div>
                      {filteredStructureAdd.map(d => (
                        <div key={d.chemin} className="mb-2">
                          <div className="flex items-center py-1">
                            <FolderIcon className="h-4 w-4 text-yellow-500 mr-2" />
                            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{d.nom}</span>
                          </div>
                          <div className="ml-6 space-y-1">
                            {d.fiches.map(fiche => (
                              <label
                                key={fiche.id}
                                className="flex items-center py-1 px-2 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={fichesSelectionnees.has(fiche.id)}
                                  onChange={(e) => {
                                    const newSet = new Set(fichesSelectionnees)
                                    if (e.target.checked) {
                                      newSet.add(fiche.id)
                                    } else {
                                      newSet.delete(fiche.id)
                                    }
                                    setFichesSelectionnees(newSet)
                                  }}
                                  className="mr-2"
                                />
                                <DocumentTextIcon className="h-4 w-4 text-blue-500 mr-2" />
                                <span className="text-xs text-gray-700 dark:text-gray-300 flex-1">
                                  {fiche.titre}
                                </span>
                                {fiche.referenceCSC && (
                                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                                    (CSC: {fiche.referenceCSC})
                                  </span>
                                )}
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {fichesSelectionnees.size > 0 && (
                  <div className="mt-3 text-xs text-blue-600 dark:text-blue-400">
                    {fichesSelectionnees.size} fiche{fichesSelectionnees.size > 1 ? 's' : ''} sélectionnée{fichesSelectionnees.size > 1 ? 's' : ''}
                  </div>
                )}
              </div>
            )}

            {/* Bouton pour ajouter des fiches */}
            {!addingFiches && (
              <div className="mt-4">
                <button
                  onClick={() => {
                    setAddingFiches(true)
                    fetchStructure()
                  }}
                  className="w-full px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 font-medium"
                >
                  <DocumentTextIcon className="h-4 w-4" />
                  Ajouter des fiches techniques
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Pied de page */}
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between flex-wrap gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors font-medium"
          >
            Annuler
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-3 py-1.5 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-sm hover:shadow-md"
            >
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
            <button
              onClick={handleRegeneratePDF}
              disabled={generating}
              className="px-3 py-1.5 text-sm bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 font-semibold shadow-sm hover:shadow-md"
            >
              {generating ? (
                <>
                  <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Génération...
                </>
              ) : (
                <>
                  <ArrowPathIcon className="h-3 w-3" />
                  Régénérer
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

