'use client'
import { useState, useEffect, use } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link'
import { PlusIcon, DocumentTextIcon, TrashIcon, PencilIcon, EyeIcon, EnvelopeIcon, TagIcon, ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import { DocumentExpirationAlert } from '@/components/DocumentExpirationAlert'
import { SendRapportEmailModal } from '@/components/modals/SendRapportEmailModal'
import toast from 'react-hot-toast'

interface RapportVisite {
  id: number
  nom: string
  url: string
  type: string
  createdAt: string
  createdBy: string
  metadata?: {
    rapportPrincipalId?: number
    rapportVariantesIds?: number[]
    tag?: string
    tagsGeneres?: string[]
  }
  User: {
    name: string | null
    email: string
  }
}

export default function RapportsVisitePage(props: { params: Promise<{ chantierId: string }> }) {
  const params = use(props.params);
  const searchParams = useSearchParams();
  const [rapports, setRapports] = useState<RapportVisite[]>([])
  const [chantier, setChantier] = useState<{ nomChantier?: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [emailModalOpen, setEmailModalOpen] = useState(false)
  const [selectedRapport, setSelectedRapport] = useState<{ id: number; nom: string } | null>(null)
  const [expandedRapports, setExpandedRapports] = useState<Set<number>>(new Set())

  useEffect(() => {
    const fetchChantier = async () => {
      try {
        const res = await fetch(`/api/chantiers/${params.chantierId}`)
        if (!res.ok) throw new Error('Erreur lors de la récupération du chantier')
        const data = await res.json()
        setChantier(data)
      } catch (error) {
        console.error('Erreur:', error)
        setError('Erreur lors du chargement du chantier')
      }
    }

    const fetchRapports = async () => {
      try {
        // Ajouter un timestamp pour éviter le cache
        const res = await fetch(`/api/chantiers/${params.chantierId}/documents?t=${Date.now()}`)
        if (!res.ok) throw new Error('Erreur lors de la récupération des documents')
        const data = await res.json()
        
        if (Array.isArray(data)) {
          // Filtrer tous les types de rapports (général + filtrés par tag)
          const rapportsVisite = data.filter(doc => 
            doc.type === 'rapport-visite' || 
            doc.type === 'rapport-visite-general' || 
            (typeof doc.type === 'string' && doc.type.startsWith('rapport-visite-tag-'))
          ).map(doc => {
            // Parser les métadonnées si c'est une string JSON
            let metadata = doc.metadata
            if (typeof metadata === 'string') {
              try {
                metadata = JSON.parse(metadata)
              } catch (e) {
                console.warn('Erreur lors du parsing des métadonnées:', e)
                metadata = null
              }
            }
            return {
              ...doc,
              metadata
            }
          })
          setRapports(rapportsVisite)
        }
      } catch (error) {
        console.error('Erreur:', error)
        setError('Erreur lors du chargement des rapports')
      } finally {
        setLoading(false)
      }
    }

    fetchChantier()
    fetchRapports()
    
    // Écouter les événements de focus pour rafraîchir quand on revient sur la page
    const handleFocus = () => {
      fetchRapports()
    }
    window.addEventListener('focus', handleFocus)
    
    return () => {
      window.removeEventListener('focus', handleFocus)
    }
  }, [params.chantierId, searchParams])

  const handleDeleteRapport = async (id: number) => {
    const rapport = rapports.find(r => r.id === id)
    const isRapportGeneral = rapport?.type === 'rapport-visite-general'
    const variantesIds = rapport?.metadata?.rapportVariantesIds || []
    
    let message = 'Êtes-vous sûr de vouloir supprimer ce rapport ?'
    if (isRapportGeneral && variantesIds.length > 0) {
      message = `Êtes-vous sûr de vouloir supprimer ce rapport et ses ${variantesIds.length} variante(s) filtrée(s) ?`
    }
    
    if (!confirm(message)) return

    try {
      // Supprimer le rapport principal
      const res = await fetch(`/api/chantiers/${params.chantierId}/documents/${id}`, {
        method: 'DELETE'
      })

      if (!res.ok) throw new Error('Erreur lors de la suppression')

      // Si c'est un rapport général, supprimer aussi les variantes
      if (isRapportGeneral && variantesIds.length > 0) {
        for (const varianteId of variantesIds) {
          try {
            await fetch(`/api/chantiers/${params.chantierId}/documents/${varianteId}`, {
              method: 'DELETE'
            })
          } catch (error) {
            console.warn(`Erreur lors de la suppression de la variante ${varianteId}:`, error)
          }
        }
      }

      // Si c'est une variante, supprimer aussi la référence dans le rapport principal
      if (rapport?.metadata?.rapportPrincipalId) {
        try {
          const principalId = rapport.metadata.rapportPrincipalId
          const principalRapport = rapports.find(r => r.id === principalId)
          if (principalRapport) {
            const updatedVariantesIds = (principalRapport.metadata?.rapportVariantesIds || []).filter(vid => vid !== id)
            await fetch(`/api/chantiers/${params.chantierId}/documents/${principalId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                metadata: {
                  ...principalRapport.metadata,
                  rapportVariantesIds: updatedVariantesIds
                }
              })
            })
          }
        } catch (error) {
          console.warn('Erreur lors de la mise à jour du rapport principal:', error)
        }
      }

      // Mettre à jour la liste locale
      if (isRapportGeneral && variantesIds.length > 0) {
        setRapports(prev => prev.filter(r => r.id !== id && !variantesIds.includes(r.id)))
      } else {
        setRapports(prev => prev.filter(rapport => rapport.id !== id))
      }
      
      toast.success('Rapport supprimé avec succès')
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors de la suppression du rapport')
    }
  }

  const handleOpenEmailModal = (rapportId: number, rapportNom: string) => {
    setSelectedRapport({ id: rapportId, nom: rapportNom })
    setEmailModalOpen(true)
  }

  const handleCloseEmailModal = () => {
    setEmailModalOpen(false)
    setSelectedRapport(null)
  }

  const toggleRapport = (rapportId: number) => {
    setExpandedRapports(prev => {
      const newSet = new Set(prev)
      if (newSet.has(rapportId)) {
        newSet.delete(rapportId)
      } else {
        newSet.add(rapportId)
      }
      return newSet
    })
  }

  // Extraire le tag d'un rapport depuis le type ou les métadonnées
  const getTagFromRapport = (rapport: RapportVisite): string => {
    // D'abord essayer depuis les métadonnées
    if (rapport.metadata?.tag) {
      return rapport.metadata.tag
    }
    
    // Sinon, extraire depuis le type (rapport-visite-tag-Maçon -> Maçon)
    if (typeof rapport.type === 'string' && rapport.type.startsWith('rapport-visite-tag-')) {
      const tag = rapport.type.replace('rapport-visite-tag-', '').replace(/-/g, ' ')
      // Capitaliser la première lettre de chaque mot
      return tag.split(' ').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      ).join(' ')
    }
    
    return 'Tag inconnu'
  }

  // Grouper les rapports : général + variantes filtrées
  const groupedRapports = () => {
    const groupes: Array<{
      principal: RapportVisite
      variantes: RapportVisite[]
    }> = []
    
    // Trouver tous les rapports taggés (variantes) - ils ont rapportPrincipalId
    const rapportsTaggés = rapports.filter(r => 
      typeof r.type === 'string' && r.type.startsWith('rapport-visite-tag-')
    )
    
    // Créer un map des variantes par rapport principal
    const variantesParPrincipal = new Map<number, RapportVisite[]>()
    for (const rapportTaggé of rapportsTaggés) {
      const principalId = rapportTaggé.metadata?.rapportPrincipalId
      if (principalId) {
        if (!variantesParPrincipal.has(principalId)) {
          variantesParPrincipal.set(principalId, [])
        }
        variantesParPrincipal.get(principalId)!.push(rapportTaggé)
      }
    }
    
    // Trouver tous les rapports généraux (principaux)
    // Un rapport est principal s'il n'est pas taggé ET qu'il n'a pas de rapportPrincipalId
    const rapportsGeneraux = rapports.filter(r => {
      const isTaggé = typeof r.type === 'string' && r.type.startsWith('rapport-visite-tag-')
      const aUnPrincipal = r.metadata?.rapportPrincipalId !== undefined
      return !isTaggé && !aUnPrincipal
    })
    
      // Grouper les rapports généraux avec leurs variantes
      for (const rapportGeneral of rapportsGeneraux) {
        // Méthode 1 : Utiliser rapportVariantesIds si disponible
        const variantesIds = rapportGeneral.metadata?.rapportVariantesIds || []
        
        // Convertir les IDs en numbers pour la comparaison
        const variantesIdsNumbers = variantesIds.map(id => Number(id))
        let variantes = rapports.filter(r => variantesIdsNumbers.includes(Number(r.id)))
        
        // Méthode 2 : Si pas de variantes via IDs, chercher par rapportPrincipalId dans le map
        if (variantes.length === 0 && variantesParPrincipal.has(rapportGeneral.id)) {
          variantes = variantesParPrincipal.get(rapportGeneral.id) || []
        }
        
        // Méthode 3 : Fallback - Grouper les rapports taggés sans métadonnées par date et nom de chantier
        if (variantes.length === 0) {
          // Extraire la date du nom du rapport général (format: rapport-visite-NomChantier-YYYY-MM-DD.pdf)
          // Exemple: rapport-visite-Pirnay-2025-11-25.pdf
          const generalMatch = rapportGeneral.nom.match(/rapport-visite-(.+?)-(\d{4}-\d{2}-\d{2})\.pdf/)
          if (generalMatch) {
            const generalChantier = generalMatch[1] // "Pirnay"
            const generalDate = generalMatch[2] // "2025-11-25"
            
            // Chercher les rapports taggés qui correspondent à la même date
            // Format des rapports taggés: rapport-visite-Tag-NomChantier-YYYY-MM-DD.pdf
            // Exemple: rapport-visite-Général-Pirnay-2025-11-25.pdf
            const variantesParDate = rapportsTaggés.filter(r => {
              // Si le rapport taggé a déjà un rapportPrincipalId, ne pas le prendre
              if (r.metadata?.rapportPrincipalId) return false
              
              // Vérifier que le nom se termine par le nom du chantier et la date
              const suffix = `-${generalChantier}-${generalDate}.pdf`
              const endsWithChantier = r.nom.endsWith(suffix)
              
              // Extraire la date du nom du rapport taggé pour vérification
              const tagDateMatch = r.nom.match(/-(\d{4}-\d{2}-\d{2})\.pdf$/)
              const dateMatches = tagDateMatch ? tagDateMatch[1] === generalDate : false
              
              return dateMatches && endsWithChantier
            })
            
            if (variantesParDate.length > 0) {
              variantes = variantesParDate
            }
          }
        }
        
        groupes.push({
          principal: rapportGeneral,
          variantes
        })
      }
    
    // Collecter tous les IDs des rapports taggés qui ont été groupés
    const rapportsTaggésGroupés = new Set<number>()
    for (const groupe of groupes) {
      for (const variante of groupe.variantes) {
        rapportsTaggésGroupés.add(variante.id)
      }
    }
    
    // Ajouter les rapports taggés orphelins (qui ont un rapportPrincipalId mais le principal n'existe pas)
    const rapportsPrincipauxIds = new Set(rapportsGeneraux.map(r => r.id))
    const rapportsTaggésOrphelins = rapportsTaggés.filter(r => {
      // Ne pas inclure les rapports déjà groupés
      if (rapportsTaggésGroupés.has(r.id)) return false
      const principalId = r.metadata?.rapportPrincipalId
      return principalId && !rapportsPrincipauxIds.has(principalId)
    })
    
    // Pour les orphelins, les afficher comme rapports principaux individuels
    for (const orphelin of rapportsTaggésOrphelins) {
      groupes.push({
        principal: orphelin,
        variantes: []
      })
    }
    
    // Ajouter les rapports taggés non groupés comme rapports principaux individuels
    const rapportsTaggésNonGroupés = rapportsTaggés.filter(r => {
      // Ne pas inclure les rapports déjà groupés
      if (rapportsTaggésGroupés.has(r.id)) return false
      // Ne pas inclure les orphelins (déjà traités)
      const principalId = r.metadata?.rapportPrincipalId
      if (principalId && !rapportsPrincipauxIds.has(principalId)) return false
      return true
    })
    
    for (const rapportTaggé of rapportsTaggésNonGroupés) {
      groupes.push({
        principal: rapportTaggé,
        variantes: []
      })
    }
    
    // Ajouter les rapports qui n'ont pas de groupe (anciens rapports sans variantes ni métadonnées)
    const rapportsAvecGroupes = new Set([
      ...rapportsGeneraux.map(r => r.id),
      ...Array.from(rapportsTaggésGroupés),
      ...rapportsTaggésNonGroupés.map(r => r.id)
    ])
    
    const rapportsSansGroupe = rapports.filter(r => 
      !rapportsAvecGroupes.has(r.id)
    )
    
    for (const rapport of rapportsSansGroupe) {
      groupes.push({
        principal: rapport,
        variantes: []
      })
    }
    
    return groupes.sort((a, b) => 
      new Date(b.principal.createdAt).getTime() - new Date(a.principal.createdAt).getTime()
    )
  }

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
    </div>
  )

  if (error) return (
    <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-lg border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400">
      {error}
    </div>
  )

  if (!chantier) return (
    <div className="bg-yellow-50 dark:bg-yellow-900/10 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-400">
      Chantier non trouvé
    </div>
  )

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <DocumentExpirationAlert />
      
      {/* Header léger style backdrop-blur */}
      <div className="mb-6">
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-2 border-white/50 dark:border-gray-700/50 rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
          {/* Effet de fond subtil avec dégradé orange/red (couleur de l'icône Rapports) - opacité 60% */}
          <div className="absolute inset-0 bg-gradient-to-br from-orange-600/60 via-orange-700/60 to-red-800/60 dark:from-orange-600/30 dark:via-orange-700/30 dark:to-red-800/30"></div>
          
          <div className="relative z-10 p-4 sm:p-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3 flex-1">
                <div className="inline-flex items-center px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full shadow-lg ring-2 ring-white/30">
                  <DocumentTextIcon className="w-6 h-6 mr-3 text-orange-900 dark:text-white" />
                  <h1 className="text-xl font-bold text-orange-900 dark:text-white">
                    Rapports de visite
                  </h1>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <Link
                  href={`/chantiers/${params.chantierId}/rapports/nouveau`}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white/30 backdrop-blur-sm rounded-lg text-sm font-semibold shadow-lg hover:bg-white/40 transition-all duration-200 text-orange-900 dark:text-white"
                >
                  <PlusIcon className="h-5 w-5" />
                  Nouveau rapport
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Contenu principal */}
      <div className="space-y-8">
          {/* Section Rapports de visite */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-6">
              {groupedRapports().length === 0 ? (
                <div className="text-center py-12 bg-gradient-to-br from-orange-50 via-amber-100 to-rose-100 dark:from-orange-900/20 dark:via-amber-900/25 dark:to-rose-900/30 rounded-xl border border-orange-200/80 dark:border-amber-800/60">
                  <div className="mx-auto w-20 h-20 flex items-center justify-center rounded-full bg-gradient-to-r from-orange-500 via-orange-600 to-red-600 mb-6 shadow-lg ring-2 ring-white/40">
                    <DocumentTextIcon className="h-10 w-10 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-orange-900 dark:text-white mb-2">
                    Aucun rapport de visite
                  </h3>
                  <p className="text-orange-800/80 dark:text-orange-200/80 mb-6 max-w-md mx-auto">
                    Créez votre premier rapport de visite pour documenter l'avancement des travaux.
                  </p>
                  <Link
                    href={`/chantiers/${params.chantierId}/rapports/nouveau`}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 via-orange-600 to-red-600 text-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 hover:from-orange-600 hover:to-red-700 transform hover:-translate-y-0.5"
                  >
                    <PlusIcon className="h-5 w-5" />
                    Créer un rapport
                  </Link>
                </div>
              ) : (
                <div className="space-y-6">
                  {groupedRapports().map((groupe) => {
                    const isExpanded = expandedRapports.has(groupe.principal.id)
                    const hasVariantes = groupe.variantes.length > 0
                    
                    return (
                      <div key={groupe.principal.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                        {/* Rapport principal */}
                        <div className="bg-gradient-to-r from-slate-50 to-gray-50 dark:from-gray-700 dark:to-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 flex-1">
                              {/* Bouton flèche pour dérouler (seulement si variantes) */}
                              {hasVariantes && (
                                <button
                                  onClick={() => toggleRapport(groupe.principal.id)}
                                  className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors flex-shrink-0"
                                  title={isExpanded ? "Réduire" : "Dérouler les rapports par tag"}
                                >
                                  {isExpanded ? (
                                    <ChevronDownIcon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                                  ) : (
                                    <ChevronRightIcon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                                  )}
                                </button>
                              )}
                              {!hasVariantes && (
                                <div className="w-7" /> // Espace pour aligner si pas de flèche
                              )}
                              <DocumentTextIcon className="h-6 w-6 text-slate-600 dark:text-slate-300 flex-shrink-0" />
                              <div className="flex-1">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                  {groupe.principal.nom}
                                </h3>
                                <div className="flex items-center gap-4 mt-1 text-sm text-gray-600 dark:text-gray-400">
                                  <span>{groupe.principal.User?.name || groupe.principal.User?.email || 'Utilisateur inconnu'}</span>
                                  <span>•</span>
                                  <span>{new Date(groupe.principal.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                                  {hasVariantes && (
                                    <>
                                      <span>•</span>
                                      <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                                        {groupe.variantes.length} variante{groupe.variantes.length > 1 ? 's' : ''} filtrée{groupe.variantes.length > 1 ? 's' : ''}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <a
                                href={groupe.principal.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                title="Télécharger"
                              >
                                <EyeIcon className="h-5 w-5" />
                              </a>
                              <button
                                onClick={() => handleOpenEmailModal(groupe.principal.id, groupe.principal.nom)}
                                className="p-2 text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                                title="Envoyer par email"
                              >
                                <EnvelopeIcon className="h-5 w-5" />
                              </button>
                              <Link
                                href={`/chantiers/${params.chantierId}/rapports/nouveau?edit=${groupe.principal.id}`}
                                className="p-2 text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                                title="Modifier"
                              >
                                <PencilIcon className="h-5 w-5" />
                              </Link>
                              <button
                                onClick={() => handleDeleteRapport(groupe.principal.id)}
                                className="p-2 text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                title="Supprimer"
                              >
                                <TrashIcon className="h-5 w-5" />
                              </button>
                            </div>
                          </div>
                        </div>
                        
                        {/* Variantes filtrées - déroulable */}
                        {hasVariantes && (
                          <div 
                            className={`overflow-hidden transition-all duration-300 ease-in-out ${
                              isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
                            }`}
                          >
                            <div className="p-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700">
                              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                                Rapports filtrés par tag :
                              </h4>
                              <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                  <thead className="bg-gray-100 dark:bg-gray-800">
                                    <tr>
                                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Tag
                                      </th>
                                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Nom du fichier
                                      </th>
                                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Date
                                      </th>
                                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Actions
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                    {groupe.variantes.map((variante) => (
                                      <tr key={variante.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                        <td className="px-4 py-3 whitespace-nowrap">
                                          <div className="flex items-center gap-2">
                                            <TagIcon className="h-4 w-4 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
                                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                                              {getTagFromRapport(variante)}
                                            </span>
                                          </div>
                                        </td>
                                        <td className="px-4 py-3">
                                          <span className="text-sm text-gray-900 dark:text-white">
                                            {variante.nom}
                                          </span>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                          <span className="text-sm text-gray-500 dark:text-gray-400">
                                            {new Date(variante.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                                          </span>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                                          <div className="flex items-center justify-end gap-2">
                                            <a
                                              href={variante.url}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="p-1.5 text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                                              title="Télécharger"
                                            >
                                              <EyeIcon className="h-4 w-4" />
                                            </a>
                                            <button
                                              onClick={() => handleOpenEmailModal(variante.id, variante.nom)}
                                              className="p-1.5 text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded transition-colors"
                                              title="Envoyer par email"
                                            >
                                              <EnvelopeIcon className="h-4 w-4" />
                                            </button>
                                          </div>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

      {/* Modale d'envoi par email */}
      {selectedRapport && (
        <SendRapportEmailModal
          isOpen={emailModalOpen}
          onClose={handleCloseEmailModal}
          rapportId={selectedRapport.id}
          rapportNom={selectedRapport.nom}
          chantierId={params.chantierId}
        />
      )}
    </div>
  )
} 