'use client'
import { useState, useEffect, use } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link'
import { PlusIcon, DocumentTextIcon, TrashIcon, PencilIcon, EyeIcon, EnvelopeIcon, TagIcon, ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import { DocumentExpirationAlert } from '@/components/DocumentExpirationAlert'
import { SendRapportEmailModal } from '@/components/modals/SendRapportEmailModal'
import toast from 'react-hot-toast'

interface RapportDurable {
  id: string
  date: string
  createdAt: string
  auteur?: { name: string | null; email: string } | null
  documents: Array<{ id: number; type: string; url: string; nom: string; tagKey: string | null }>
  _count?: { photos: number; notes: number }
}

interface GroupeAffiche {
  cle: string
  titre: string
  auteur: string
  date: Date
  resume?: string
  principal: { id: number; url: string; nom: string } | null
  variantes: Array<{ id: number; url: string; nom: string; tag: string }>
  editHref: string | null
  supprimer: () => void
}

const libelleTag = (brut: string) =>
  brut.replace(/-/g, ' ').split(' ').filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')

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
  const [rapportsDurables, setRapportsDurables] = useState<RapportDurable[]>([])
  const [chantier, setChantier] = useState<{ nomChantier?: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [emailModalOpen, setEmailModalOpen] = useState(false)
  const [selectedRapport, setSelectedRapport] = useState<{ id: number; nom: string } | null>(null)
  const [expandedRapports, setExpandedRapports] = useState<Set<string>>(new Set())

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
        
        // Rapports enregistrés avec le nouveau formulaire (leurs PDF sont des
        // documents liés par rapportId, affichés via le rapport lui-même)
        const resDurables = await fetch(`/api/chantiers/${params.chantierId}/rapports?t=${Date.now()}`)
        if (resDurables.ok) {
          const durables = await resDurables.json()
          if (Array.isArray(durables)) setRapportsDurables(durables)
        }

        if (Array.isArray(data)) {
          // Filtrer tous les types de rapports (général + filtrés par tag)
          const rapportsVisite = data.filter(doc => !doc.rapportId).filter(doc => 
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

  const handleDeleteRapportDurable = async (rapport: RapportDurable) => {
    if (!confirm('Supprimer ce rapport de visite et tous ses PDF ?')) return
    try {
      const res = await fetch(`/api/rapports/${rapport.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Erreur lors de la suppression')
      setRapportsDurables(prev => prev.filter(r => r.id !== rapport.id))
      toast.success('Rapport supprimé')
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors de la suppression du rapport')
    }
  }

  const toggleRapport = (rapportId: string) => {
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

  const groupesAffiches = (): GroupeAffiche[] => {
    const durables: GroupeAffiche[] = rapportsDurables.map(r => {
      const general = r.documents.find(d => d.type === 'rapport-visite-general') ?? null
      const date = new Date(r.date)
      const morceaux = []
      if (r._count?.notes) morceaux.push(`${r._count.notes} note${r._count.notes > 1 ? 's' : ''}`)
      if (r._count?.photos) morceaux.push(`${r._count.photos} photo${r._count.photos > 1 ? 's' : ''}`)
      return {
        cle: `r-${r.id}`,
        titre: `Rapport de visite du ${date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`,
        auteur: r.auteur?.name || r.auteur?.email || 'Utilisateur inconnu',
        date,
        resume: morceaux.join(' · ') || undefined,
        principal: general,
        variantes: r.documents
          .filter(d => d.id !== general?.id)
          .map(d => ({ ...d, tag: libelleTag(d.tagKey || d.type.replace('rapport-visite-tag-', '')) })),
        editHref: `/chantiers/${params.chantierId}/rapports/nouveau?rapport=${r.id}`,
        supprimer: () => handleDeleteRapportDurable(r),
      }
    })
    const anciens: GroupeAffiche[] = groupedRapports().map(g => ({
      cle: `d-${g.principal.id}`,
      titre: g.principal.nom,
      auteur: g.principal.User?.name || g.principal.User?.email || 'Utilisateur inconnu',
      date: new Date(g.principal.createdAt),
      principal: g.principal,
      variantes: g.variantes.map(v => ({ ...v, tag: getTagFromRapport(v) })),
      editHref: `/chantiers/${params.chantierId}/rapports/nouveau?edit=${g.principal.id}`,
      supprimer: () => handleDeleteRapport(g.principal.id),
    }))
    return [...durables, ...anciens].sort((a, b) => b.date.getTime() - a.date.getTime())
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

  const groupes = groupesAffiches()
  const bouton = 'flex h-10 w-10 items-center justify-center rounded-lg transition-colors'

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <DocumentExpirationAlert />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:p-6">
        <div className="flex min-w-0 items-center gap-3">
          <DocumentTextIcon className="h-7 w-7 shrink-0 text-blue-600 dark:text-blue-400" />
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Rapports de visite</h1>
            {chantier.nomChantier && <p className="truncate text-sm text-gray-500 dark:text-gray-400">{chantier.nomChantier}</p>}
          </div>
        </div>
        <Link
          href={`/chantiers/${params.chantierId}/rapports/nouveau`}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-blue-600 px-4 text-base font-semibold text-white shadow-sm hover:bg-blue-700"
        >
          <PlusIcon className="h-5 w-5" />
          Nouveau rapport
        </Link>
      </div>

      {groupes.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white px-4 py-12 text-center dark:border-gray-700 dark:bg-gray-800">
          <DocumentTextIcon className="mx-auto mb-4 h-12 w-12 text-gray-300 dark:text-gray-600" />
          <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">Aucun rapport de visite</h3>
          <p className="mx-auto mb-6 max-w-md text-gray-500 dark:text-gray-400">
            Créez votre premier rapport de visite pour documenter l&apos;avancement des travaux.
          </p>
          <Link
            href={`/chantiers/${params.chantierId}/rapports/nouveau`}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-blue-600 px-5 font-semibold text-white hover:bg-blue-700"
          >
            <PlusIcon className="h-5 w-5" />
            Créer un rapport
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {groupes.map(groupe => {
            const ouvert = expandedRapports.has(groupe.cle)
            const aVariantes = groupe.variantes.length > 0
            return (
              <li key={groupe.cle} className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
                <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <h3 className="break-words text-base font-semibold text-gray-900 dark:text-white">{groupe.titre}</h3>
                    <p className="mt-1 flex flex-wrap gap-x-2 text-sm text-gray-500 dark:text-gray-400">
                      <span>{groupe.auteur}</span>
                      <span>·</span>
                      <span>{groupe.date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                      {groupe.resume && (<><span>·</span><span>{groupe.resume}</span></>)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {groupe.principal && (
                      <>
                        <a href={groupe.principal.url} target="_blank" rel="noopener noreferrer" className={`${bouton} text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20`} title="Voir le PDF">
                          <EyeIcon className="h-5 w-5" />
                        </a>
                        <button onClick={() => handleOpenEmailModal(groupe.principal!.id, groupe.principal!.nom)} className={`${bouton} text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-900/20`} title="Envoyer par email">
                          <EnvelopeIcon className="h-5 w-5" />
                        </button>
                      </>
                    )}
                    {groupe.editHref && (
                      <Link href={groupe.editHref} className={`${bouton} text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20`} title="Modifier">
                        <PencilIcon className="h-5 w-5" />
                      </Link>
                    )}
                    <button onClick={groupe.supprimer} className={`${bouton} text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20`} title="Supprimer">
                      <TrashIcon className="h-5 w-5" />
                    </button>
                    {aVariantes && (
                      <button
                        onClick={() => toggleRapport(groupe.cle)}
                        className="ml-auto inline-flex min-h-[40px] items-center gap-1 rounded-lg px-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 sm:ml-1"
                        aria-expanded={ouvert}
                      >
                        <TagIcon className="h-4 w-4" />
                        {groupe.variantes.length} par tag
                        {ouvert ? <ChevronDownIcon className="h-4 w-4" /> : <ChevronRightIcon className="h-4 w-4" />}
                      </button>
                    )}
                  </div>
                </div>

                {aVariantes && ouvert && (
                  <ul className="divide-y divide-gray-100 border-t border-gray-100 bg-gray-50 dark:divide-gray-700 dark:border-gray-700 dark:bg-gray-900/40">
                    {groupe.variantes.map(variante => (
                      <li key={variante.id} className="flex items-center gap-3 px-4 py-2">
                        <TagIcon className="h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-400" />
                        <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-900 dark:text-white">{variante.tag}</span>
                        <a href={variante.url} target="_blank" rel="noopener noreferrer" className={`${bouton} text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20`} title="Voir le PDF">
                          <EyeIcon className="h-5 w-5" />
                        </a>
                        <button onClick={() => handleOpenEmailModal(variante.id, variante.nom)} className={`${bouton} text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-900/20`} title="Envoyer par email">
                          <EnvelopeIcon className="h-5 w-5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            )
          })}
        </ul>
      )}

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
