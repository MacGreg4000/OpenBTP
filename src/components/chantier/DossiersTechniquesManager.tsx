'use client'
import { useEffect, useState } from 'react'
import {
  DocumentTextIcon,
  PencilIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ArrowDownTrayIcon,
  TrashIcon,
  ChevronRightIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline'
import { useSession } from 'next-auth/react'
import { useNotification } from '@/hooks/useNotification'
import ConfirmModal from '@/components/ui/ConfirmModal'

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

interface DossiersTechniquesManagerProps {
  chantierId: string
  onReopenDossier: (dossier: DossierTechnique) => void
}

export default function DossiersTechniquesManager({ chantierId, onReopenDossier }: DossiersTechniquesManagerProps) {
  const [dossiers, setDossiers] = useState<DossierTechnique[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedDossier, setExpandedDossier] = useState<string | null>(null)
  const { data: session } = useSession()
  const { showNotification, NotificationComponent } = useNotification()
  const [dossierToDelete, setDossierToDelete] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  
  const isAdmin = session?.user?.role === 'ADMIN'

  useEffect(() => {
    fetchDossiers()
    
    // Écouter l'événement de génération de dossier pour rafraîchir la liste
    const handleDossierGenerated = () => {
      fetchDossiers()
    }
    
    window.addEventListener('dossierGenerated', handleDossierGenerated)
    
    return () => {
      window.removeEventListener('dossierGenerated', handleDossierGenerated)
    }
  }, [chantierId])

  const fetchDossiers = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/fiches-techniques/dossiers?chantierId=${chantierId}`)
      if (!response.ok) {
        const errorText = await response.text()
        console.error('Erreur API:', response.status, errorText)
        throw new Error(`Erreur ${response.status}: ${errorText}`)
      }
      const data = await response.json()
      console.log('Dossiers chargés:', data)
      setDossiers(data)
    } catch (error) {
      console.error('Erreur lors du chargement des dossiers:', error)
      setDossiers([]) // S'assurer que la liste est vide en cas d'erreur
    } finally {
      setLoading(false)
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

  const getDossierStatutColor = (statut: string) => {
    switch (statut) {
      case 'ENVOYE':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
      case 'REFUSE_PARTIELLEMENT':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
      case 'VALIDE':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
      case 'BROUILLON':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
    }
  }

  const getDossierStatutLabel = (statut: string) => {
    switch (statut) {
      case 'ENVOYE':
        return 'Envoyé'
      case 'REFUSE_PARTIELLEMENT':
        return 'Refusé partiellement'
      case 'VALIDE':
        return 'Validé'
      case 'BROUILLON':
        return 'Brouillon'
      default:
        return statut
    }
  }

  const handleDeleteDossier = async () => {
    if (!dossierToDelete) return

    setDeleting(true)
    try {
      const response = await fetch(`/api/fiches-techniques/dossier/${dossierToDelete}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Erreur lors de la suppression')
      }

      showNotification('Succès', 'Dossier technique supprimé avec succès', 'success')
      setDossierToDelete(null)
      fetchDossiers()
    } catch (error) {
      console.error('Erreur lors de la suppression:', error)
      showNotification('Erreur', 'Erreur lors de la suppression du dossier', 'error')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (dossiers.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="px-6 py-4 bg-gradient-to-br from-blue-600/10 via-indigo-700/10 to-purple-800/10 dark:from-blue-600/10 dark:via-indigo-700/10 dark:to-purple-800/10 border-b border-gray-200 dark:border-gray-700 mb-4">
          <div className="flex items-center gap-3">
            <DocumentTextIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <h3 className="font-bold text-lg text-gray-900 dark:text-white">
              Dossiers techniques existants
            </h3>
            <span className="ml-auto text-sm text-gray-600 dark:text-gray-400">
              0 dossier
            </span>
          </div>
        </div>
        <div className="text-center py-12">
          <DocumentTextIcon className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-500 mb-3" />
          <p className="text-gray-500 dark:text-gray-400">
            Aucun dossier technique généré
          </p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
            Générez votre premier dossier en sélectionnant des fiches techniques ci-dessous
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="relative px-6 py-4 bg-gradient-to-br from-emerald-600/10 via-teal-700/10 to-cyan-800/10 dark:from-emerald-600/10 dark:via-teal-700/10 dark:to-cyan-800/10 border-b border-gray-200 dark:border-gray-700 overflow-hidden rounded-t-lg">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/20 to-cyan-800/20"></div>
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl transform translate-x-16 -translate-y-16"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <DocumentTextIcon className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
            <div className="flex-1">
              <h3 className="font-bold text-xl text-gray-900 dark:text-white">
                📚 Dossiers techniques existants
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                Gérez vos dossiers, modifiez les statuts des fiches et régénérez les PDFs
              </p>
            </div>
            <span className="ml-auto px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 rounded-full text-sm font-semibold">
              {dossiers.length} dossier{dossiers.length > 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>

      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {dossiers.map((dossier) => (
          <div key={dossier.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <button
                    onClick={() => setExpandedDossier(expandedDossier === dossier.id ? null : dossier.id)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {expandedDossier === dossier.id ? (
                      <ChevronDownIcon className="h-5 w-5" />
                    ) : (
                      <ChevronRightIcon className="h-5 w-5" />
                    )}
                  </button>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                      {dossier.nom}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getDossierStatutColor(dossier.statut)}`}>
                        {getDossierStatutLabel(dossier.statut)}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        Version {dossier.version}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        • {dossier.fiches.length} fiche{dossier.fiches.length > 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                </div>

                {expandedDossier === dossier.id && (
                  <div className="ml-8 mt-3 space-y-2">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      <p>Généré le : {new Date(dossier.dateGeneration).toLocaleDateString('fr-FR', { 
                        day: '2-digit', 
                        month: '2-digit', 
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}</p>
                      {dossier.dateModification !== dossier.dateGeneration && (
                        <p>Modifié le : {new Date(dossier.dateModification).toLocaleDateString('fr-FR', { 
                          day: '2-digit', 
                          month: '2-digit', 
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}</p>
                      )}
                    </div>

                    <div className="mt-3">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Fiches du dossier :
                      </p>
                      <div className="space-y-1">
                        {dossier.fiches.map((fiche) => (
                          <div
                            key={fiche.id}
                            className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded text-sm"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-gray-600 dark:text-gray-400">
                                {fiche.ficheId}
                              </span>
                              {fiche.ficheReference && (
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  (Réf: {fiche.ficheReference})
                                </span>
                              )}
                              {fiche.version > 1 && (
                                <span className="text-xs font-medium text-orange-600 dark:text-orange-400">
                                  V{fiche.version}
                                </span>
                              )}
                            </div>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatutColor(fiche.statut)}`}>
                              {getStatutLabel(fiche.statut)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 ml-4">
                <button
                  onClick={async () => {
                    try {
                      // Vérifier si le fichier existe en essayant de le télécharger
                      const response = await fetch(dossier.url)
                      if (response.ok) {
                        // Le fichier existe, le télécharger
                        const blob = await response.blob()
                        const url = window.URL.createObjectURL(blob)
                        const a = document.createElement('a')
                        a.href = url
                        a.download = dossier.url.split('/').pop() || 'dossier-technique.pdf'
                        document.body.appendChild(a)
                        a.click()
                        window.URL.revokeObjectURL(url)
                        document.body.removeChild(a)
                      } else {
                        // Le fichier n'existe pas, régénérer le PDF
                        showNotification('Information', 'Le PDF n\'existe pas encore. Régénération en cours...', 'info')
                        // Régénérer le PDF en utilisant les données du dossier
                        const ficheIds = dossier.fiches.map(f => f.ficheId)
                        const ficheReferences: Record<string, string> = {}
                        const fichesStatuts: Record<string, string> = {}
                        dossier.fiches.forEach(fiche => {
                          if (fiche.ficheReference) {
                            ficheReferences[fiche.ficheId] = fiche.ficheReference
                          }
                          fichesStatuts[fiche.ficheId] = fiche.statut
                        })
                        
                        const generateResponse = await fetch('/api/fiches-techniques/generer-dossier', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            chantierId,
                            dossierId: dossier.id,
                            ficheIds,
                            ficheReferences,
                            fichesStatuts,
                            options: {
                              includeTableOfContents: true
                            }
                          })
                        })
                        
                        if (!generateResponse.ok) {
                          throw new Error('Erreur lors de la régénération du PDF')
                        }
                        
                        // Télécharger le PDF régénéré
                        const blob = await generateResponse.blob()
                        const url = window.URL.createObjectURL(blob)
                        const a = document.createElement('a')
                        a.href = url
                        a.download = dossier.url.split('/').pop() || 'dossier-technique.pdf'
                        document.body.appendChild(a)
                        a.click()
                        window.URL.revokeObjectURL(url)
                        document.body.removeChild(a)
                        
                        // Rafraîchir la liste des dossiers
                        fetchDossiers()
                        showNotification('Succès', 'PDF régénéré et téléchargé avec succès', 'success')
                      }
                    } catch (error) {
                      console.error('Erreur lors du téléchargement:', error)
                      showNotification('Erreur', 'Erreur lors du téléchargement du PDF', 'error')
                    }
                  }}
                  className="p-2 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded transition-colors"
                  title="Télécharger"
                >
                  <ArrowDownTrayIcon className="h-5 w-5" />
                </button>
                <button
                  onClick={() => onReopenDossier(dossier)}
                  className="p-2 text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/20 rounded transition-colors"
                  title="Réouvrir pour modification"
                >
                  <PencilIcon className="h-5 w-5" />
                </button>
                {isAdmin && (
                  <button
                    onClick={() => setDossierToDelete(dossier.id)}
                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                    title="Supprimer le dossier"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal de confirmation de suppression */}
      <ConfirmModal
        isOpen={dossierToDelete !== null}
        onClose={() => setDossierToDelete(null)}
        onConfirm={handleDeleteDossier}
        title="Supprimer le dossier technique"
        message="Êtes-vous sûr de vouloir supprimer ce dossier technique ? Cette action est irréversible."
        confirmText="Supprimer"
        cancelText="Annuler"
        confirmButtonClass="bg-red-600 hover:bg-red-700"
      />

      <NotificationComponent />
    </div>
  )
}

