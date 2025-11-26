'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { PageHeader } from '@/components/PageHeader'
import { 
  PlusIcon, 
  PencilSquareIcon, 
  UserGroupIcon,
  TrashIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  ClockIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  UsersIcon,
  GlobeAltIcon,
  KeyIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  ChevronUpDownIcon,
  EyeIcon
} from '@heroicons/react/24/outline'
import { SearchInput } from '@/components/ui'
import { useNotification } from '@/hooks/useNotification'
// import { useRouter } from 'next/navigation'

interface SousTraitant {
  id: string
  nom: string
  email: string
  contact: string | null
  telephone: string | null
  adresse: string | null
  actif?: boolean
  _count: {
    ouvriers: number
  }
  contrats?: {
    id: string
    url: string
    estSigne: boolean
    dateGeneration: string
  }[]
}

// Composant pour les en-têtes triables
type SortField = 'nom' | 'email' | 'telephone' | 'ouvriers' | 'actif'
type OuvrierSortField = 'prenom' | 'nom' | 'poste' | 'email' | 'telephone'

function SortableHeader({ 
  field, 
  label, 
  currentSortField, 
  sortDirection, 
  onSort 
}: { 
  field: SortField
  label: string
  currentSortField: SortField | null
  sortDirection: 'asc' | 'desc'
  onSort: (field: SortField) => void
}) {
  const isActive = currentSortField === field
  
  return (
    <th 
      scope="col" 
      className="py-3.5 px-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-200 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors select-none"
      onClick={() => onSort(field)}
    >
      <div className="flex items-center gap-1">
        <span>{label}</span>
        {isActive ? (
          sortDirection === 'asc' ? (
            <ChevronUpIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          ) : (
            <ChevronDownIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          )
        ) : (
          <ChevronUpDownIcon className="h-4 w-4 text-gray-400" />
        )}
      </div>
    </th>
  )
}

interface DeleteModalProps {
  isOpen: boolean
  sousTraitant: SousTraitant | null
  onClose: () => void
  onConfirm: () => Promise<void>
  isDeleting: boolean
}

function DeleteModal({ isOpen, sousTraitant, onClose, onConfirm, isDeleting }: DeleteModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 dark:bg-gray-900 dark:bg-opacity-80 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm w-full shadow-xl">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Confirmer la suppression</h3>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-300">
          Êtes-vous sûr de vouloir supprimer le sous-traitant "{sousTraitant?.nom}" ? 
          Cette action est irréversible et supprimera également tous les ouvriers associés.
        </p>
        <div className="mt-4 flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 dark:bg-red-700 border border-transparent rounded-md hover:bg-red-700 dark:hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:focus:ring-offset-gray-800"
          >
            {isDeleting ? 'Suppression...' : 'Supprimer'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function SousTraitantsPage() {
  // const router = useRouter()
  const { data: session } = useSession()
  const { showNotification, NotificationComponent } = useNotification()
  const [sousTraitants, setSousTraitants] = useState<SousTraitant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filtreNom, setFiltreNom] = useState('')
  const [deleteModal, setDeleteModal] = useState<DeleteModalProps>({
    isOpen: false,
    sousTraitant: null,
    onClose: () => setDeleteModal(prev => ({ ...prev, isOpen: false })),
    onConfirm: async () => {},
    isDeleting: false
  })
  const [generatingContract, setGeneratingContract] = useState<string | null>(null)
  const [sendingContract, setSendingContract] = useState<string | null>(null)
  const [ouvriersInternes, setOuvriersInternes] = useState<Array<{id:string; prenom:string; nom:string; poste?:string; email?:string; telephone?:string}>>([])
  const [newOuvrier, setNewOuvrier] = useState({ prenom:'', nom:'', email:'', telephone:'', poste:'', actif:true })
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table')
  const [sortField, setSortField] = useState<SortField | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [ouvrierSortField, setOuvrierSortField] = useState<OuvrierSortField | null>(null)
  const [ouvrierSortDirection, setOuvrierSortDirection] = useState<'asc' | 'desc'>('asc')

  useEffect(() => {
    if (session) {
      fetch('/api/sous-traitants')
        .then(async res => {
          const json = await res.json().catch(() => null)
          if (!res.ok) {
            throw new Error(json?.error || 'Erreur API sous-traitants')
          }
          const arr = Array.isArray(json) ? json : (Array.isArray(json?.data) ? json.data : [])
          setSousTraitants(arr as SousTraitant[])
          setLoading(false)
        })
        .catch(() => {
          setError('Erreur lors du chargement des sous-traitants')
          setLoading(false)
        })
      // Charger ouvriers internes
      fetch('/api/ouvriers-internes')
        .then(r=>r.json())
        .then(setOuvriersInternes)
        .catch(()=>{})
    }
  }, [session])

  const handleDelete = async () => {
    if (!deleteModal.sousTraitant) return

    setDeleteModal(prev => ({ ...prev, isDeleting: true }))
    try {
      const response = await fetch(`/api/sous-traitants/${deleteModal.sousTraitant.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Erreur lors de la suppression')
      }

      // Mettre à jour la liste
      setSousTraitants(prev => 
        prev.filter(st => st.id !== deleteModal.sousTraitant?.id)
      )
      setDeleteModal(prev => ({ ...prev, isOpen: false }))
    } catch {
      // erreur déjà gérée via UI
    } finally {
      setDeleteModal(prev => ({ ...prev, isDeleting: false }))
    }
  }

  const genererContrat = async (soustraitantId: string) => {
    try {
      setGeneratingContract(soustraitantId)
      const response = await fetch(`/api/sous-traitants/${soustraitantId}/generer-contrat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Erreur lors de la génération du contrat')
      }

      await response.json()
      
      // Recharger la page pour afficher le nouveau contrat
      window.location.reload()
    } catch (error) {
      console.error('Erreur:', error)
      showNotification('Erreur', 'Erreur lors de la génération du contrat', 'error')
    } finally {
      setGeneratingContract(null)
    }
  }

  const envoyerContrat = async (soustraitantId: string) => {
    try {
      setSendingContract(soustraitantId)
      const response = await fetch(`/api/sous-traitants/${soustraitantId}/envoyer-contrat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erreur lors de l\'envoi du contrat')
      }

      showNotification('Succès', 'Le contrat a été envoyé avec succès au sous-traitant', 'success')
    } catch (error) {
      console.error('Erreur:', error)
      showNotification('Erreur', error instanceof Error ? error.message : 'Erreur lors de l\'envoi du contrat', 'error')
    } finally {
      setSendingContract(null)
    }
  }

  // Filtrer les sous-traitants par nom
  let sousTraitantsFiltres = Array.isArray(sousTraitants)
    ? sousTraitants.filter(st => st.nom.toLowerCase().includes(filtreNom.toLowerCase()))
    : []

  // Fonction de tri
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  // Application du tri
  if (sortField) {
    sousTraitantsFiltres = [...sousTraitantsFiltres].sort((a, b) => {
      let aValue: string | number | boolean = ''
      let bValue: string | number | boolean = ''

      switch (sortField) {
        case 'nom':
          aValue = a.nom.toLowerCase()
          bValue = b.nom.toLowerCase()
          break
        case 'email':
          aValue = (a.email || '').toLowerCase()
          bValue = (b.email || '').toLowerCase()
          break
        case 'telephone':
          aValue = (a.telephone || '').toLowerCase()
          bValue = (b.telephone || '').toLowerCase()
          break
        case 'ouvriers':
          aValue = a._count?.ouvriers || 0
          bValue = b._count?.ouvriers || 0
          break
        case 'actif':
          aValue = a.actif ?? true
          bValue = b.actif ?? true
          break
      }

      if (typeof aValue === 'boolean' && typeof bValue === 'boolean') {
        return sortDirection === 'asc' 
          ? (aValue === bValue ? 0 : aValue ? 1 : -1)
          : (aValue === bValue ? 0 : aValue ? -1 : 1)
      } else if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue)
      } else {
        return sortDirection === 'asc'
          ? (aValue as number) - (bValue as number)
          : (bValue as number) - (aValue as number)
      }
    })
  }

  // Calculs pour les statistiques
  const totalSousTraitants = sousTraitants.length
  const totalOuvriers = sousTraitants.reduce((total, st) => total + (st._count?.ouvriers || 0), 0)
  const contratsSignes = sousTraitants.filter(st => st.contrats?.some(c => c.estSigne)).length
  const sansContrat = sousTraitants.filter(st => !st.contrats || st.contrats.length === 0).length

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">{error}</div>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Réessayer
          </button>
        </div>
      </div>
    )
  }

  const statsCards = (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg px-3 py-2 border border-gray-200/50 dark:border-gray-700/50 shadow-md">
        <div className="flex items-center gap-2">
          <UsersIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <div>
            <div className="text-[10px] font-medium text-gray-600 dark:text-gray-400">Sous-traitants</div>
            <div className="text-sm font-bold text-gray-900 dark:text-white">{totalSousTraitants}</div>
          </div>
        </div>
      </div>
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg px-3 py-2 border border-gray-200/50 dark:border-gray-700/50 shadow-md">
        <div className="flex items-center gap-2">
          <UserGroupIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <div>
            <div className="text-[10px] font-medium text-gray-600 dark:text-gray-400">Ouvriers</div>
            <div className="text-sm font-bold text-gray-900 dark:text-white">{totalOuvriers}</div>
          </div>
        </div>
      </div>
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg px-3 py-2 border border-gray-200/50 dark:border-gray-700/50 shadow-md">
        <div className="flex items-center gap-2">
          <CheckCircleIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <div>
            <div className="text-[10px] font-medium text-gray-600 dark:text-gray-400">Signés</div>
            <div className="text-sm font-bold text-gray-900 dark:text-white">{contratsSignes}</div>
          </div>
        </div>
      </div>
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg px-3 py-2 border border-gray-200/50 dark:border-gray-700/50 shadow-md">
        <div className="flex items-center gap-2">
          <ClockIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <div>
            <div className="text-[10px] font-medium text-gray-600 dark:text-gray-400">En attente</div>
            <div className="text-sm font-bold text-gray-900 dark:text-white">{sansContrat}</div>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/20 to-indigo-50/10 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
      <PageHeader
        title="Sous-Traitants"
        subtitle="Gestion des sous-traitants et de leurs équipes"
        icon={UsersIcon}
        badgeColor="from-blue-600 via-indigo-600 to-purple-700"
        gradientColor="from-blue-600/10 via-indigo-600/10 to-purple-700/10"
        stats={statsCards}
        actions={
          <Link
            href="/sous-traitants/nouveau"
            className="inline-flex items-center px-3 py-2 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 text-sm font-semibold"
          >
            <PlusIcon className="h-4 w-4 mr-1.5" />
            <span className="hidden sm:inline">Nouveau sous-traitant</span>
            <span className="sm:hidden">Nouveau</span>
          </Link>
        }
      />

      {/* Contenu principal */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Barre de recherche et vue */}
        <div className="mb-8 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex-1 max-w-md">
            <SearchInput
              id="search"
              placeholder="Rechercher un sous-traitant..."
              value={filtreNom}
              onChange={(e) => setFiltreNom(e.target.value)}
              className="w-full"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('cards')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                viewMode === 'cards' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              Cartes
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                viewMode === 'table' 
                  ? 'bg-blue-600 text-white hover:bg-blue-700' 
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              Tableau
            </button>
          </div>
        </div>

        {/* Affichage des sous-traitants */}
        {sousTraitantsFiltres.length === 0 ? (
          <div className="text-center py-12">
            <UsersIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">
              Aucun sous-traitant
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {filtreNom ? 'Aucun sous-traitant ne correspond à votre recherche.' : 'Commencez par créer un nouveau sous-traitant.'}
            </p>
            {!filtreNom && (
              <div className="mt-6">
                <Link
                  href="/sous-traitants/nouveau"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Nouveau sous-traitant
                </Link>
              </div>
            )}
          </div>
        ) : (
          <>
            {viewMode === 'cards' ? (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {sousTraitantsFiltres.map((st) => (
              <div key={st.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-200 overflow-hidden">
                {/* En-tête de la carte */}
                <div className="p-6 pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                        {st.nom}
                      </h3>
                      <div className="mt-2">
                        <label className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                          <input
                            type="checkbox"
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            checked={st.actif ?? true}
                            onChange={async (e)=>{
                              const actif = e.target.checked
                              try {
                                const res = await fetch(`/api/sous-traitants/${st.id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ actif }) })
                                if(!res.ok) throw new Error('Erreur mise à jour actif')
                                setSousTraitants(prev=> prev.map(x=> x.id===st.id ? { ...x, actif } : x))
                              } catch {
                                showNotification('Erreur', 'Erreur lors de la mise à jour du statut actif', 'error')
                              }
                            }}
                          />
                          Actif ?
                        </label>
                      </div>
                      {st.contact && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          Contact: {st.contact}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      <Link
                        href={`/sous-traitants/${st.id}`}
                        className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors duration-200"
                        title="Consulter"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </Link>
                      <Link
                        href={`/sous-traitants/${st.id}/edit`}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors duration-200"
                        title="Modifier"
                      >
                        <PencilSquareIcon className="h-4 w-4" />
                      </Link>
                      <a
                        href={`/public/portail/soustraitant/${st.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors duration-200"
                        title="Portail public sous-traitant"
                      >
                        <GlobeAltIcon className="h-4 w-4" />
                      </a>
                      <button
                        onClick={() => setDeleteModal({
                          isOpen: true,
                          sousTraitant: st,
                          onClose: () => setDeleteModal(prev => ({ ...prev, isOpen: false })),
                          onConfirm: handleDelete,
                          isDeleting: false
                        })}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors duration-200"
                        title="Supprimer"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Informations de contact */}
                  <div className="mt-4 space-y-2">
                                         {st.email && (
                       <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                         <EnvelopeIcon className="h-4 w-4 mr-2 text-gray-400" />
                         <span className="truncate">{st.email}</span>
                       </div>
                     )}
                    {st.telephone && (
                      <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                        <PhoneIcon className="h-4 w-4 mr-2 text-gray-400" />
                        <span>{st.telephone}</span>
                      </div>
                    )}
                    {st.adresse && (
                      <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                        <MapPinIcon className="h-4 w-4 mr-2 text-gray-400" />
                        <span className="truncate">{st.adresse}</span>
                      </div>
                    )}
                  </div>

                  {/* Statut du contrat */}
                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center">
                      {st.contrats && st.contrats.length > 0 && st.contrats[0].estSigne ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100">
                          <CheckCircleIcon className="h-3 w-3 mr-1" />
                          Contrat signé
                        </span>
                      ) : st.contrats && st.contrats.length > 0 ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-800 dark:text-orange-100">
                          <ClockIcon className="h-3 w-3 mr-1" />
                          En attente
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                          <DocumentTextIcon className="h-3 w-3 mr-1" />
                          Aucun contrat
                        </span>
                      )}
                    </div>

                    {/* Nombre d'ouvriers cliquable */}
                    <Link 
                      href={`/sous-traitants/${st.id}/ouvriers`}
                      className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium hover:underline transition-colors duration-200"
                    >
                      <UserGroupIcon className="h-4 w-4 mr-1" />
                      {st._count?.ouvriers || 0} ouvrier{(st._count?.ouvriers || 0) !== 1 ? 's' : ''}
                    </Link>
                  </div>
                </div>

                {/* Actions pour les contrats */}
                <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-600">
                        <div className="flex flex-col space-y-2">
                          {st.contrats && st.contrats.length > 0 && st.contrats[0].estSigne ? (
                            <a
                              href={st.contrats[0].url}
                              target="_blank"
                              rel="noopener noreferrer"
                        className="inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 dark:bg-green-900 dark:text-green-200 dark:hover:bg-green-800 transition-colors duration-200"
                            >
                        <DocumentTextIcon className="h-4 w-4 mr-2" />
                              Voir contrat signé
                            </a>
                          ) : (
                      <>
                            <button
                              onClick={() => genererContrat(st.id)}
                              disabled={generatingContract === st.id}
                          className="inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-blue-900 dark:text-blue-200 dark:hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                            >
                              {generatingContract === st.id ? (
                                <span className="flex items-center">
                              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-700 dark:text-blue-200" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                  Génération...
                                </span>
                              ) : (
                                <>
                              <DocumentTextIcon className="h-4 w-4 mr-2" />
                                  Générer contrat
                                </>
                              )}
                            </button>
                          
                          {st.contrats && st.contrats.length > 0 && !st.contrats[0].estSigne && (
                            <a
                              href={st.contrats[0].url}
                              target="_blank"
                              rel="noopener noreferrer"
                            className="inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:bg-indigo-900 dark:text-indigo-200 dark:hover:bg-indigo-800 transition-colors duration-200"
                            >
                            <DocumentTextIcon className="h-4 w-4 mr-2" />
                              Consulter contrat
                            </a>
                          )}
                          
                            <button
                              onClick={() => envoyerContrat(st.id)}
                              disabled={sendingContract === st.id}
                          className="inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 dark:bg-green-900 dark:text-green-200 dark:hover:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                            >
                              {sendingContract === st.id ? (
                                <span className="flex items-center">
                                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-green-700 dark:text-green-200" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                  Envoi...
                                </span>
                              ) : (
                                <>
                               <EnvelopeIcon className="h-4 w-4 mr-2" />
                                  Envoyer contrat
                                </>
                              )}
                            </button>
                      </>
                          )}
                        </div>
                        </div>
                        </div>
                  ))}
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <SortableHeader
                          field="nom"
                          label="Nom"
                          currentSortField={sortField}
                          sortDirection={sortDirection}
                          onSort={handleSort}
                        />
                        <SortableHeader
                          field="email"
                          label="Email"
                          currentSortField={sortField}
                          sortDirection={sortDirection}
                          onSort={handleSort}
                        />
                        <SortableHeader
                          field="telephone"
                          label="Téléphone"
                          currentSortField={sortField}
                          sortDirection={sortDirection}
                          onSort={handleSort}
                        />
                        <th scope="col" className="py-3.5 px-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-200">
                          Adresse
                        </th>
                        <SortableHeader
                          field="ouvriers"
                          label="Ouvriers"
                          currentSortField={sortField}
                          sortDirection={sortDirection}
                          onSort={handleSort}
                        />
                        <SortableHeader
                          field="actif"
                          label="Statut"
                          currentSortField={sortField}
                          sortDirection={sortDirection}
                          onSort={handleSort}
                        />
                        <th scope="col" className="py-3.5 px-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-200">
                          Contrat
                        </th>
                        <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900 dark:text-gray-200 pr-4 sm:pr-6">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
                      {sousTraitantsFiltres.map((st) => (
                        <tr key={st.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 dark:text-gray-200 sm:pl-6">
                            {st.nom}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                            {st.email || '-'}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                            {st.telephone || '-'}
                          </td>
                          <td className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">
                            {st.adresse || '-'}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                            <Link 
                              href={`/sous-traitants/${st.id}/ouvriers`}
                              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium hover:underline"
                            >
                              {st._count?.ouvriers || 0}
                            </Link>
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm">
                            {st.actif ?? true ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100">
                                Actif
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                                Inactif
                              </span>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm">
                            {st.contrats && st.contrats.length > 0 && st.contrats[0].estSigne ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100">
                                <CheckCircleIcon className="h-3 w-3 mr-1" />
                                Signé
                              </span>
                            ) : st.contrats && st.contrats.length > 0 ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-800 dark:text-orange-100">
                                <ClockIcon className="h-3 w-3 mr-1" />
                                En attente
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                                <DocumentTextIcon className="h-3 w-3 mr-1" />
                                Aucun
                              </span>
                            )}
                          </td>
                          <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                            <div className="flex space-x-1 justify-end">
                              <Link 
                                href={`/sous-traitants/${st.id}`} 
                                className="p-2 text-indigo-600 hover:bg-indigo-100 dark:text-indigo-400 dark:hover:bg-indigo-900 rounded transition-colors" 
                                title="Consulter"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <EyeIcon className="h-4 w-4" />
                              </Link>
                              <Link 
                                href={`/sous-traitants/${st.id}/edit`} 
                                className="p-2 text-blue-600 hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-blue-900 rounded transition-colors" 
                                title="Modifier"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <PencilSquareIcon className="h-4 w-4" />
                              </Link>
                              <a
                                href={`/public/portail/soustraitant/${st.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 text-indigo-600 hover:bg-indigo-100 dark:text-indigo-400 dark:hover:bg-indigo-900 rounded transition-colors"
                                title="Portail public"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <GlobeAltIcon className="h-4 w-4" />
                              </a>
                              <button
                                onClick={() => setDeleteModal({
                                  isOpen: true,
                                  sousTraitant: st,
                                  onClose: () => setDeleteModal(prev => ({ ...prev, isOpen: false })),
                                  onConfirm: handleDelete,
                                  isDeleting: false
                                })}
                                className="p-2 text-red-600 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-900 rounded transition-colors"
                                title="Supprimer"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {/* Ouvriers internes */}
        <div className="mt-12">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Ouvriers internes</h2>
          
          {/* Formulaire d'ajout */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-4">
            <form className="grid grid-cols-1 md:grid-cols-5 gap-2" onSubmit={async(e)=>{
              e.preventDefault()
              const res = await fetch('/api/ouvriers-internes', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(newOuvrier) })
              if (res.ok) {
                const created = await res.json()
                setOuvriersInternes(prev=> [created, ...prev])
                setNewOuvrier({ prenom:'', nom:'', email:'', telephone:'', poste:'', actif:true })
              }
            }}>
              <input className="p-2 border rounded bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-500 dark:focus:ring-blue-400 dark:focus:border-blue-400" placeholder="Prénom" value={newOuvrier.prenom} onChange={e=>setNewOuvrier(prev=>({...prev, prenom:e.target.value}))} />
              <input className="p-2 border rounded bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-500 dark:focus:ring-blue-400 dark:focus:border-blue-400" placeholder="Nom" value={newOuvrier.nom} onChange={e=>setNewOuvrier(prev=>({...prev, nom:e.target.value}))} />
              <input className="p-2 border rounded bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-500 dark:focus:ring-blue-400 dark:focus:border-blue-400" placeholder="Email" value={newOuvrier.email} onChange={e=>setNewOuvrier(prev=>({...prev, email:e.target.value}))} />
              <input className="p-2 border rounded bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-500 dark:focus:ring-blue-400 dark:focus:border-blue-400" placeholder="Téléphone" value={newOuvrier.telephone} onChange={e=>setNewOuvrier(prev=>({...prev, telephone:e.target.value}))} />
              <input className="p-2 border rounded bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-500 dark:focus:ring-blue-400 dark:focus:border-blue-400" placeholder="Poste" value={newOuvrier.poste} onChange={e=>setNewOuvrier(prev=>({...prev, poste:e.target.value}))} />
              <div className="md:col-span-5 flex items-center gap-3 mt-2">
                <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"><input type="checkbox" checked={newOuvrier.actif} onChange={e=>setNewOuvrier(prev=>({...prev, actif:e.target.checked}))} /> Actif</label>
                <button className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">Ajouter</button>
              </div>
            </form>
          </div>

          {/* Tableau des ouvriers internes */}
          {ouvriersInternes.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
              <UsersIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-sm text-gray-500 dark:text-gray-400">Aucun ouvrier interne</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th 
                        scope="col" 
                        className="py-3.5 px-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-200 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors select-none"
                        onClick={() => {
                          if (ouvrierSortField === 'prenom') {
                            setOuvrierSortDirection(ouvrierSortDirection === 'asc' ? 'desc' : 'asc')
                          } else {
                            setOuvrierSortField('prenom')
                            setOuvrierSortDirection('asc')
                          }
                        }}
                      >
                        <div className="flex items-center gap-1">
                          <span>Prénom</span>
                          {ouvrierSortField === 'prenom' ? (
                            ouvrierSortDirection === 'asc' ? (
                              <ChevronUpIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            ) : (
                              <ChevronDownIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            )
                          ) : (
                            <ChevronUpDownIcon className="h-4 w-4 text-gray-400" />
                          )}
                        </div>
                      </th>
                      <th 
                        scope="col" 
                        className="py-3.5 px-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-200 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors select-none"
                        onClick={() => {
                          if (ouvrierSortField === 'nom') {
                            setOuvrierSortDirection(ouvrierSortDirection === 'asc' ? 'desc' : 'asc')
                          } else {
                            setOuvrierSortField('nom')
                            setOuvrierSortDirection('asc')
                          }
                        }}
                      >
                        <div className="flex items-center gap-1">
                          <span>Nom</span>
                          {ouvrierSortField === 'nom' ? (
                            ouvrierSortDirection === 'asc' ? (
                              <ChevronUpIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            ) : (
                              <ChevronDownIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            )
                          ) : (
                            <ChevronUpDownIcon className="h-4 w-4 text-gray-400" />
                          )}
                        </div>
                      </th>
                      <th 
                        scope="col" 
                        className="py-3.5 px-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-200 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors select-none"
                        onClick={() => {
                          if (ouvrierSortField === 'poste') {
                            setOuvrierSortDirection(ouvrierSortDirection === 'asc' ? 'desc' : 'asc')
                          } else {
                            setOuvrierSortField('poste')
                            setOuvrierSortDirection('asc')
                          }
                        }}
                      >
                        <div className="flex items-center gap-1">
                          <span>Poste</span>
                          {ouvrierSortField === 'poste' ? (
                            ouvrierSortDirection === 'asc' ? (
                              <ChevronUpIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            ) : (
                              <ChevronDownIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            )
                          ) : (
                            <ChevronUpDownIcon className="h-4 w-4 text-gray-400" />
                          )}
                        </div>
                      </th>
                      <th 
                        scope="col" 
                        className="py-3.5 px-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-200 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors select-none"
                        onClick={() => {
                          if (ouvrierSortField === 'email') {
                            setOuvrierSortDirection(ouvrierSortDirection === 'asc' ? 'desc' : 'asc')
                          } else {
                            setOuvrierSortField('email')
                            setOuvrierSortDirection('asc')
                          }
                        }}
                      >
                        <div className="flex items-center gap-1">
                          <span>Email</span>
                          {ouvrierSortField === 'email' ? (
                            ouvrierSortDirection === 'asc' ? (
                              <ChevronUpIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            ) : (
                              <ChevronDownIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            )
                          ) : (
                            <ChevronUpDownIcon className="h-4 w-4 text-gray-400" />
                          )}
                        </div>
                      </th>
                      <th 
                        scope="col" 
                        className="py-3.5 px-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-200 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors select-none"
                        onClick={() => {
                          if (ouvrierSortField === 'telephone') {
                            setOuvrierSortDirection(ouvrierSortDirection === 'asc' ? 'desc' : 'asc')
                          } else {
                            setOuvrierSortField('telephone')
                            setOuvrierSortDirection('asc')
                          }
                        }}
                      >
                        <div className="flex items-center gap-1">
                          <span>Téléphone</span>
                          {ouvrierSortField === 'telephone' ? (
                            ouvrierSortDirection === 'asc' ? (
                              <ChevronUpIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            ) : (
                              <ChevronDownIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            )
                          ) : (
                            <ChevronUpDownIcon className="h-4 w-4 text-gray-400" />
                          )}
                        </div>
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900 dark:text-gray-200 pr-4 sm:pr-6">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
                    {(() => {
                      const sortedOuvriers = [...ouvriersInternes]
                      if (ouvrierSortField) {
                        sortedOuvriers.sort((a, b) => {
                          let aValue: string = ''
                          let bValue: string = ''

                          switch (ouvrierSortField) {
                            case 'prenom':
                              aValue = (a.prenom || '').toLowerCase()
                              bValue = (b.prenom || '').toLowerCase()
                              break
                            case 'nom':
                              aValue = (a.nom || '').toLowerCase()
                              bValue = (b.nom || '').toLowerCase()
                              break
                            case 'poste':
                              aValue = (a.poste || '').toLowerCase()
                              bValue = (b.poste || '').toLowerCase()
                              break
                            case 'email':
                              aValue = (a.email || '').toLowerCase()
                              bValue = (b.email || '').toLowerCase()
                              break
                            case 'telephone':
                              aValue = (a.telephone || '').toLowerCase()
                              bValue = (b.telephone || '').toLowerCase()
                              break
                          }

                          return ouvrierSortDirection === 'asc' 
                            ? aValue.localeCompare(bValue)
                            : bValue.localeCompare(aValue)
                        })
                      }

                      return sortedOuvriers.map((o) => (
                        <tr key={o.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 dark:text-gray-200 sm:pl-6">
                            {o.prenom || '-'}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                            {o.nom || '-'}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                            {o.poste || '-'}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                            {o.email || '-'}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                            {o.telephone || '-'}
                          </td>
                          <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                            <div className="flex space-x-1 justify-end">
                              <a
                                href={`/public/portail/ouvrier/${o.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 text-indigo-600 hover:bg-indigo-100 dark:text-indigo-400 dark:hover:bg-indigo-900 rounded transition-colors"
                                title="Portail public"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <GlobeAltIcon className="h-4 w-4" />
                              </a>
                              <button
                                type="button"
                                className="p-2 text-amber-600 hover:bg-amber-100 dark:text-amber-400 dark:hover:bg-amber-900 rounded transition-colors"
                                title="Définir le PIN"
                                onClick={async (e) => {
                                  e.stopPropagation()
                                  const pin = prompt('Nouveau PIN (au moins 4 chiffres)') || ''
                                  if (pin && pin.replace(/\D/g,'').length>=4) {
                                    await fetch(`/api/ouvriers-internes/${o.id}/pin`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ pin: pin.replace(/\D/g,'') }) })
                                    showNotification('Succès', 'PIN enregistré', 'success')
                                  }
                                }}
                              >
                                <KeyIcon className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      <DeleteModal
        isOpen={deleteModal.isOpen}
        sousTraitant={deleteModal.sousTraitant}
        onClose={deleteModal.onClose}
        onConfirm={deleteModal.onConfirm}
        isDeleting={deleteModal.isDeleting}
      />
      <NotificationComponent />
    </div>
  )
} 