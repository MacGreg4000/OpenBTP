'use client'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { type Chantier } from '@/types/chantier'
import { 
  CalendarIcon,
  EyeIcon,
  ChartBarIcon,
  DocumentTextIcon,
  ClipboardDocumentCheckIcon,
  CurrencyEuroIcon,
  ClipboardDocumentListIcon,
  DocumentDuplicateIcon,
  BuildingOffice2Icon,
  ChartPieIcon,
  BanknotesIcon,
  ClockIcon,
  XMarkIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ChevronUpDownIcon
} from '@heroicons/react/24/outline'
import { DocumentExpirationAlert } from '@/components/DocumentExpirationAlert'
import { Pagination } from '@/components/Pagination'
import { PageHeader } from '@/components/PageHeader'

function getStatusStyle(status: string) {
  switch (status) {
    case 'En cours':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
    case 'Terminé':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
    case 'En préparation':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
    default:
      return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
  }
}

// Composant pour les en-têtes triables
type SortField = 'nomChantier' | 'numeroIdentification' | 'clientNom' | 'etatChantier' | 'budget' | 'dateCommencement'

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

function ChantierCard({ chantier }: { chantier: Chantier }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 border border-gray-200 dark:border-gray-700 overflow-hidden group">
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400">
              {chantier.nomChantier}
            </h3>
            {chantier.numeroIdentification && (
              <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">
                ID: {chantier.numeroIdentification}
              </p>
            )}
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {chantier.clientNom || 'Client non défini'}
            </p>
          </div>
          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${getStatusStyle(chantier.etatChantier)}`}>
            {chantier.etatChantier}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
            <BanknotesIcon className="h-4 w-4 mr-2" />
            <span>{chantier.budget ? `${chantier.budget.toLocaleString('fr-FR')} €` : 'Non défini'}</span>
          </div>
          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
            <CalendarIcon className="h-4 w-4 mr-2" />
            <span>{chantier.dateCommencement ? new Date(chantier.dateCommencement).toLocaleDateString('fr-FR') : 'Non définie'}</span>
          </div>
          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400 col-span-2">
            <ClockIcon className="h-4 w-4 mr-2" />
            <span>
              {chantier.dureeEnJours 
                ? `${chantier.dureeEnJours} jours ${chantier.typeDuree === 'CALENDAIRE' ? 'calendrier' : 'ouvrés'}`
                : 'Durée non définie'}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href={`/chantiers/${chantier.chantierId}`}
            className="p-2 bg-indigo-100 text-indigo-600 rounded-lg hover:bg-indigo-200 dark:bg-indigo-900 dark:text-indigo-300 dark:hover:bg-indigo-800 transition-colors"
            title="Consulter"
          >
            <EyeIcon className="h-4 w-4" />
          </Link>
          <Link
            href={`/chantiers/${chantier.chantierId}/commande`}
            className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-300 dark:hover:bg-blue-800 transition-colors"
            title="Commande"
          >
            <CurrencyEuroIcon className="h-4 w-4" />
          </Link>
          <Link
            href={`/chantiers/${chantier.chantierId}/etats`}
            className="p-2 bg-purple-100 text-purple-600 rounded-lg hover:bg-purple-200 dark:bg-purple-900 dark:text-purple-300 dark:hover:bg-purple-800 transition-colors"
            title="États d'avancement"
          >
            <ChartBarIcon className="h-4 w-4" />
          </Link>
          <Link
            href={`/chantiers/${chantier.chantierId}/documents`}
            className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 dark:bg-green-900 dark:text-green-300 dark:hover:bg-green-800 transition-colors"
            title="Documents"
          >
            <DocumentDuplicateIcon className="h-4 w-4" />
          </Link>
          <Link
            href={`/chantiers/${chantier.chantierId}/notes`}
            className="p-2 bg-indigo-100 text-indigo-600 rounded-lg hover:bg-indigo-200 dark:bg-indigo-900 dark:text-indigo-300 dark:hover:bg-indigo-800 transition-colors"
            title="Notes"
          >
            <ClipboardDocumentListIcon className="h-4 w-4" />
          </Link>
          <Link
            href={`/chantiers/${chantier.chantierId}/rapports`}
            className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 dark:bg-red-900 dark:text-red-300 dark:hover:bg-red-800 transition-colors"
            title="Rapports"
          >
            <DocumentTextIcon className="h-4 w-4" />
          </Link>
          <Link
            href={`/chantiers/${chantier.chantierId}/reception`}
            className="p-2 bg-orange-100 text-orange-600 rounded-lg hover:bg-orange-200 dark:bg-orange-900 dark:text-orange-300 dark:hover:bg-orange-800 transition-colors"
            title="Réception"
          >
            <ClipboardDocumentCheckIcon className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function ChantiersPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [chantiers, setChantiers] = useState<Chantier[]>([])
  const [loading, setLoading] = useState(true)
  const [filtreNom, setFiltreNom] = useState('')
  const [filtreEtat, setFiltreEtat] = useState('')
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table')
  const [page, setPage] = useState(1)
  const pageSize = 25
  const [totalPages, setTotalPages] = useState(1)
  
  // Récupérer le clientId depuis l'URL
  const clientIdFromUrl = searchParams.get('clientId')
  const [filtreClientId, setFiltreClientId] = useState<string | null>(clientIdFromUrl)
  const [clientName, setClientName] = useState<string>('')
  const [clients, setClients] = useState<{ id: string; nom: string }[]>([])
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false)
  const [clientSearchTerm, setClientSearchTerm] = useState('')
  const [chantierDropdownOpen, setChantierDropdownOpen] = useState(false)
  const [chantierSearchTerm, setChantierSearchTerm] = useState('')
  const [selectedChantierId, setSelectedChantierId] = useState<string | null>(null)
  const [etatDropdownOpen, setEtatDropdownOpen] = useState(false)
  const [etatSearchTerm, setEtatSearchTerm] = useState('')
  
  // États pour le tri
  const [sortField, setSortField] = useState<SortField | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  
  // Charger la liste des clients
  useEffect(() => {
    fetch('/api/clients')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setClients(data.map((c: { id: string; nom: string }) => ({ id: c.id, nom: c.nom })))
        }
      })
      .catch(() => setClients([]))
  }, [])
  
  // Fermer les dropdowns quand on clique ailleurs
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.client-dropdown-container')) {
        setClientDropdownOpen(false)
        setClientSearchTerm('')
      }
      if (!target.closest('.chantier-dropdown-container')) {
        setChantierDropdownOpen(false)
        setChantierSearchTerm('')
      }
      if (!target.closest('.etat-dropdown-container')) {
        setEtatDropdownOpen(false)
        setEtatSearchTerm('')
      }
    }
    
    if (clientDropdownOpen || chantierDropdownOpen || etatDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [clientDropdownOpen, chantierDropdownOpen, etatDropdownOpen])
  
  // Filtrer les chantiers selon le terme de recherche dans le dropdown
  const filteredChantierOptions = chantiers.filter(chantier =>
    chantier.nomChantier.toLowerCase().includes(chantierSearchTerm.toLowerCase()) ||
    (chantier.clientNom && chantier.clientNom.toLowerCase().includes(chantierSearchTerm.toLowerCase()))
  )
  
  // Filtrer les clients selon le terme de recherche
  const filteredClientOptions = clients.filter(client =>
    client.nom.toLowerCase().includes(clientSearchTerm.toLowerCase())
  )
  
  // Options d'états disponibles
  const etatOptions = [
    { value: '', label: 'Tous les états' },
    { value: 'En préparation', label: 'En préparation' },
    { value: 'En cours', label: 'En cours' },
    { value: 'Terminé', label: 'Terminé' }
  ]
  
  // Filtrer les états selon le terme de recherche
  const filteredEtatOptions = etatOptions.filter(etat =>
    etat.label.toLowerCase().includes(etatSearchTerm.toLowerCase())
  )
  
  // Trouver le libellé de l'état sélectionné
  const selectedEtatLabel = filtreEtat 
    ? etatOptions.find(e => e.value === filtreEtat)?.label || filtreEtat
    : 'Tous les états'
  
  // Fonction pour gérer le changement de filtre état
  const handleEtatSelect = (etatValue: string) => {
    if (etatValue === '') {
      setFiltreEtat('')
    } else {
      setFiltreEtat(etatValue)
    }
    setEtatDropdownOpen(false)
    setEtatSearchTerm('')
  }
  
  // Synchroniser filtreClientId avec l'URL et récupérer le nom du client
  useEffect(() => {
    setFiltreClientId(clientIdFromUrl)
    if (clientIdFromUrl) {
      const client = clients.find(c => c.id === clientIdFromUrl)
      if (client) {
        setClientName(client.nom)
      }
    } else {
      setClientName('')
    }
  }, [clientIdFromUrl, clients])

  useEffect(() => {
    const fetchChantiers = async () => {
      try {
        const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
        // Ajouter le filtre d'état si sélectionné
        if (filtreEtat && filtreEtat !== '') {
          params.append('etat', filtreEtat)
        }
        const res = await fetch(`/api/chantiers?${params.toString()}`)
        const json = await res.json()
        // L'API retourne { chantiers: [...], meta: {...} }
        const data = Array.isArray(json) ? json : (json.chantiers || json.data || [])
        setChantiers(Array.isArray(data) ? data : [])
        if (!Array.isArray(json) && json.meta?.totalPages) setTotalPages(json.meta.totalPages)
        
        // Si un filtreClientId est défini, récupérer le nom du client
        if (clientIdFromUrl && Array.isArray(data) && data.length > 0) {
          const chantierWithClient = data.find((c: Chantier) => c.clientId === clientIdFromUrl)
          if (chantierWithClient) {
            setClientName(chantierWithClient.clientNom || 'Client')
          }
        }
        
        setLoading(false)
      } catch (error) {
        console.error('Erreur:', error)
        setChantiers([])
        setLoading(false)
      }
    }
    
    fetchChantiers()
  }, [clientIdFromUrl, page, filtreEtat])

  // Trouver le nom du chantier sélectionné
  const selectedChantierName = selectedChantierId 
    ? chantiers.find(c => c.chantierId === selectedChantierId)?.nomChantier || 'Chantier sélectionné'
    : 'Tous les chantiers'
  
  // Fonction pour gérer le changement de filtre chantier
  const handleChantierSelect = (chantierId: string | null) => {
    if (chantierId) {
      const chantier = chantiers.find(c => c.chantierId === chantierId)
      if (chantier) {
        setSelectedChantierId(chantierId)
        setFiltreNom(chantier.nomChantier)
      }
    } else {
      setSelectedChantierId(null)
      setFiltreNom('')
    }
    setChantierDropdownOpen(false)
    setChantierSearchTerm('')
  }
  
  // Fonction pour gérer le clic sur un en-tête de colonne
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Si on clique sur la même colonne, on inverse le sens
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      // Nouvelle colonne, on commence par ordre croissant
      setSortField(field)
      setSortDirection('asc')
    }
  }
  
  // Fonction de tri personnalisée selon le type de données
  const sortChantiers = (chantiers: Chantier[]) => {
    if (!sortField) return chantiers
    
    return [...chantiers].sort((a, b) => {
      let aValue: string | number
      let bValue: string | number
      
      switch (sortField) {
        case 'nomChantier':
          aValue = a.nomChantier?.toLowerCase() || ''
          bValue = b.nomChantier?.toLowerCase() || ''
          break
        case 'numeroIdentification':
          aValue = a.numeroIdentification?.toLowerCase() || ''
          bValue = b.numeroIdentification?.toLowerCase() || ''
          break
        case 'clientNom':
          aValue = a.clientNom?.toLowerCase() || ''
          bValue = b.clientNom?.toLowerCase() || ''
          break
        case 'etatChantier':
          // Ordre personnalisé pour les statuts
          const statusOrder: { [key: string]: number } = {
            'Brouillon': 0,
            'En préparation': 1,
            'En cours': 2,
            'Terminé': 3
          }
          aValue = statusOrder[a.etatChantier] ?? 999
          bValue = statusOrder[b.etatChantier] ?? 999
          break
        case 'budget':
          aValue = a.budget || 0
          bValue = b.budget || 0
          break
        case 'dateCommencement':
          aValue = a.dateCommencement ? new Date(a.dateCommencement).getTime() : 0
          bValue = b.dateCommencement ? new Date(b.dateCommencement).getTime() : 0
          break
        default:
          return 0
      }
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
  }
  
  // Le filtre d'état est maintenant géré par l'API, on ne filtre côté client que par nom et client
  const chantiersFiltrés = sortChantiers(
    chantiers.filter(chantier => {
      const matchNom = !filtreNom || chantier.nomChantier.toLowerCase().includes(filtreNom.toLowerCase())
      const matchChantierId = !selectedChantierId || chantier.chantierId === selectedChantierId
      const matchClient = !filtreClientId || chantier.clientId === filtreClientId
      return matchNom && matchChantierId && matchClient
    })
  )
  
  // Trouver le nom du client sélectionné
  const selectedClientName = filtreClientId 
    ? clients.find(c => c.id === filtreClientId)?.nom || 'Client sélectionné'
    : 'Tous les clients'
  
  // Fonction pour gérer le changement de filtre client
  const handleClientSelect = (clientId: string | null) => {
    if (clientId) {
      const client = clients.find(c => c.id === clientId)
      if (client) {
        setFiltreClientId(clientId)
        setClientName(client.nom)
        router.push(`/chantiers?clientId=${clientId}`)
      }
    } else {
      clearClientFilter()
    }
    setClientDropdownOpen(false)
    setClientSearchTerm('')
  }
  
  // Fonction pour supprimer le filtre client
  const clearClientFilter = () => {
    setFiltreClientId(null)
    setClientName('')
    router.push('/chantiers')
  }

  // Calculs des statistiques
  const stats = {
    total: chantiers.length,
    enCours: chantiers.filter(c => c.etatChantier === 'En cours').length,
    enPreparation: chantiers.filter(c => c.etatChantier === 'En préparation').length,
    termines: chantiers.filter(c => c.etatChantier === 'Terminé').length,
    chiffreAffaires: chantiers
      .filter(c => c.etatChantier === 'En préparation' || c.etatChantier === 'En cours')
      .reduce((total, c) => total + (c.budget || 0), 0)
  }

  if (loading) {
    return (
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 dark:bg-gray-900">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const statsCards = (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg px-3 py-2 border border-gray-200/50 dark:border-gray-700/50 shadow-md">
        <div className="flex items-center gap-2">
          <BuildingOffice2Icon className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <div>
            <div className="text-[10px] font-medium text-gray-600 dark:text-gray-400">Total</div>
            <div className="text-sm font-bold text-gray-900 dark:text-white">{stats.total}</div>
          </div>
        </div>
      </div>
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg px-3 py-2 border border-gray-200/50 dark:border-gray-700/50 shadow-md">
        <div className="flex items-center gap-2">
          <ChartPieIcon className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <div>
            <div className="text-[10px] font-medium text-gray-600 dark:text-gray-400">En cours</div>
            <div className="text-sm font-bold text-gray-900 dark:text-white">{stats.enCours}</div>
          </div>
        </div>
      </div>
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg px-3 py-2 border border-gray-200/50 dark:border-gray-700/50 shadow-md">
        <div className="flex items-center gap-2">
          <ClockIcon className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <div>
            <div className="text-[10px] font-medium text-gray-600 dark:text-gray-400">Préparation</div>
            <div className="text-sm font-bold text-gray-900 dark:text-white">{stats.enPreparation}</div>
          </div>
        </div>
      </div>
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg px-3 py-2 border border-gray-200/50 dark:border-gray-700/50 shadow-md">
        <div className="flex items-center gap-2">
          <BanknotesIcon className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <div>
            <div className="text-[10px] font-medium text-gray-600 dark:text-gray-400">CA</div>
            <div className="text-sm font-bold text-gray-900 dark:text-white">
              {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0, notation: 'compact' }).format(stats.chiffreAffaires)}
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-amber-50/20 to-orange-50/10 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
      <PageHeader
        title="Gestion des Chantiers"
        subtitle="Gérez et suivez tous vos projets de construction"
        icon={BuildingOffice2Icon}
        badgeColor="from-red-700 via-red-800 to-red-900"
        gradientColor="from-red-700/10 via-red-800/10 to-red-900/10"
        stats={statsCards}
        actions={
          <Link
            href="/chantiers/nouveau"
            className="inline-flex items-center px-3 py-2 bg-gradient-to-r from-red-700 to-red-800 hover:from-red-800 hover:to-red-900 text-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 text-sm font-semibold"
          >
            <PlusIcon className="h-4 w-4 mr-1.5" />
            <span className="hidden sm:inline">Nouveau chantier</span>
            <span className="sm:hidden">Nouveau</span>
          </Link>
        }
      />

      {/* Alert expiration documents */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        <DocumentExpirationAlert />
      </div>

      {/* Contenu principal */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filtre client actif */}
        {filtreClientId && (
          <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-sm font-medium text-indigo-900 dark:text-indigo-100">
                  Filtré par client : <span className="font-semibold">{clientName}</span>
                </span>
                <span className="ml-2 bg-indigo-100 dark:bg-indigo-800 text-indigo-800 dark:text-indigo-200 text-xs px-2 py-1 rounded-full">
                  {chantiersFiltrés.length} chantier{chantiersFiltrés.length !== 1 ? 's' : ''}
                </span>
              </div>
              <button
                onClick={clearClientFilter}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-800 dark:text-indigo-200 dark:hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
              >
                <XMarkIcon className="h-4 w-4 mr-1" />
                Supprimer le filtre
              </button>
            </div>
          </div>
        )}

        {/* Filtres et options d'affichage */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex flex-col sm:flex-row gap-4 flex-1">
              <div className="sm:w-64 chantier-dropdown-container relative">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sr-only">
                  Filtrer par chantier
                </label>
                <button
                  type="button"
                  onClick={() => setChantierDropdownOpen(!chantierDropdownOpen)}
                  className="w-full flex items-center justify-between px-3 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                >
                  <span className="truncate">{selectedChantierName}</span>
                  <ChevronDownIcon className={`h-5 w-5 text-gray-400 flex-shrink-0 ml-2 transition-transform ${chantierDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {chantierDropdownOpen && (
                  <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-80 flex flex-col">
                    {/* Champ de recherche */}
                    <div className="p-2 border-b border-gray-200 dark:border-gray-600">
                      <div className="relative">
                        <MagnifyingGlassIcon className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Rechercher un chantier..."
                          value={chantierSearchTerm}
                          onChange={(e) => setChantierSearchTerm(e.target.value)}
                          className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          autoFocus
                        />
                      </div>
                    </div>
                    
                    {/* Liste des options */}
                    <div className="overflow-y-auto max-h-64">
                      <button
                        type="button"
                        onClick={() => handleChantierSelect(null)}
                        className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors ${
                          !selectedChantierId ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-white'
                        }`}
                      >
                        Tous les chantiers
                      </button>
                      {filteredChantierOptions.length > 0 ? (
                        filteredChantierOptions.map(chantier => (
                          <button
                            key={chantier.chantierId}
                            type="button"
                            onClick={() => handleChantierSelect(chantier.chantierId)}
                            className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors border-b border-gray-200 dark:border-gray-600 last:border-b-0 ${
                              selectedChantierId === chantier.chantierId ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-white'
                            }`}
                          >
                            <div className="font-medium">{chantier.nomChantier}</div>
                            {chantier.clientNom && (
                              <div className="text-xs text-gray-500 dark:text-gray-400">{chantier.clientNom}</div>
                            )}
                          </button>
                        ))
                      ) : (
                        <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                          Aucun chantier trouvé
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div className="sm:w-64 client-dropdown-container relative">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sr-only">
                  Filtrer par client
                </label>
                <button
                  type="button"
                  onClick={() => setClientDropdownOpen(!clientDropdownOpen)}
                  className="w-full flex items-center justify-between px-3 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                >
                  <span className="truncate">{selectedClientName}</span>
                  <ChevronDownIcon className={`h-5 w-5 text-gray-400 flex-shrink-0 ml-2 transition-transform ${clientDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {clientDropdownOpen && (
                  <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-80 flex flex-col">
                    {/* Champ de recherche */}
                    <div className="p-2 border-b border-gray-200 dark:border-gray-600">
                      <div className="relative">
                        <MagnifyingGlassIcon className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Rechercher un client..."
                          value={clientSearchTerm}
                          onChange={(e) => setClientSearchTerm(e.target.value)}
                          className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          autoFocus
                        />
                      </div>
                    </div>
                    
                    {/* Liste des options */}
                    <div className="overflow-y-auto max-h-64">
                      <button
                        type="button"
                        onClick={() => handleClientSelect(null)}
                        className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors ${
                          !filtreClientId ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-white'
                        }`}
                      >
                        Tous les clients
                      </button>
                      {filteredClientOptions.length > 0 ? (
                        filteredClientOptions.map(client => (
                          <button
                            key={client.id}
                            type="button"
                            onClick={() => handleClientSelect(client.id)}
                            className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors ${
                              filtreClientId === client.id ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-white'
                            }`}
                          >
                            {client.nom}
                          </button>
                        ))
                      ) : (
                        <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                          Aucun client trouvé
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div className="sm:w-48 etat-dropdown-container relative">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sr-only">
                  Filtrer par état
                </label>
                <button
                  type="button"
                  onClick={() => setEtatDropdownOpen(!etatDropdownOpen)}
                  className="w-full flex items-center justify-between px-3 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                >
                  <span className="truncate">{selectedEtatLabel}</span>
                  <ChevronDownIcon className={`h-5 w-5 text-gray-400 flex-shrink-0 ml-2 transition-transform ${etatDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {etatDropdownOpen && (
                  <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-80 flex flex-col">
                    {/* Champ de recherche */}
                    <div className="p-2 border-b border-gray-200 dark:border-gray-600">
                      <div className="relative">
                        <MagnifyingGlassIcon className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Rechercher un état..."
                          value={etatSearchTerm}
                          onChange={(e) => setEtatSearchTerm(e.target.value)}
                          className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          autoFocus
                        />
                      </div>
                    </div>
                    
                    {/* Liste des options */}
                    <div className="overflow-y-auto max-h-64">
                      {filteredEtatOptions.map(etat => (
                        <button
                          key={etat.value}
                          type="button"
                          onClick={() => handleEtatSelect(etat.value)}
                          className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors ${
                            filtreEtat === etat.value ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-white'
                          }`}
                        >
                          {etat.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
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
                    ? 'bg-red-600 text-white hover:bg-red-700' 
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                Tableau
              </button>
            </div>
          </div>
        </div>

        {/* Résultats */}
        {chantiersFiltrés.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-12 text-center">
            <BuildingOffice2Icon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Aucun chantier trouvé
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {filtreNom || filtreEtat || filtreClientId
                ? 'Essayez de modifier vos critères de recherche.' 
                : 'Commencez par créer votre premier chantier.'}
            </p>
            <Link
              href="/chantiers/nouveau"
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Créer un chantier
            </Link>
          </div>
        ) : (
          <>
            {viewMode === 'cards' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {chantiersFiltrés.map((chantier) => (
                  <ChantierCard key={chantier.chantierId} chantier={chantier} />
                ))}
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <SortableHeader
                          field="nomChantier"
                          label="Chantier"
                          currentSortField={sortField}
                          sortDirection={sortDirection}
                          onSort={handleSort}
                        />
                        <SortableHeader
                          field="numeroIdentification"
                          label="ID"
                          currentSortField={sortField}
                          sortDirection={sortDirection}
                          onSort={handleSort}
                        />
                        <SortableHeader
                          field="clientNom"
                          label="Client"
                          currentSortField={sortField}
                          sortDirection={sortDirection}
                          onSort={handleSort}
                        />
                        <SortableHeader
                          field="etatChantier"
                          label="État"
                          currentSortField={sortField}
                          sortDirection={sortDirection}
                          onSort={handleSort}
                        />
                        <SortableHeader
                          field="budget"
                          label="Montant"
                          currentSortField={sortField}
                          sortDirection={sortDirection}
                          onSort={handleSort}
                        />
                        <SortableHeader
                          field="dateCommencement"
                          label="Date de début"
                          currentSortField={sortField}
                          sortDirection={sortDirection}
                          onSort={handleSort}
                        />
                        <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900 dark:text-gray-200 pr-4 sm:pr-6">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
                      {chantiersFiltrés.map((chantier) => (
                        <tr key={chantier.chantierId} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 dark:text-gray-200 sm:pl-6">
                            {chantier.nomChantier}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                            {chantier.numeroIdentification || '-'}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                            {chantier.clientNom || '-'}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm">
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusStyle(chantier.etatChantier)}`}>
                              {chantier.etatChantier}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                            {chantier.budget ? `${chantier.budget.toLocaleString('fr-FR')} €` : '-'}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                            {chantier.dateCommencement ? new Date(chantier.dateCommencement).toLocaleDateString('fr-FR') : '-'}
                          </td>
                          <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                            <div className="flex space-x-1 justify-end">
                              <Link href={`/chantiers/${chantier.chantierId}`} className="p-2 text-indigo-600 hover:bg-indigo-100 dark:text-indigo-400 dark:hover:bg-indigo-900 rounded transition-colors" title="Consulter">
                                <EyeIcon className="h-4 w-4" />
                              </Link>
                              <Link href={`/chantiers/${chantier.chantierId}/commande`} className="p-2 text-blue-600 hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-blue-900 rounded transition-colors" title="Commande">
                                <CurrencyEuroIcon className="h-4 w-4" />
                              </Link>
                              <Link href={`/chantiers/${chantier.chantierId}/etats`} className="p-2 text-purple-600 hover:bg-purple-100 dark:text-purple-400 dark:hover:bg-purple-900 rounded transition-colors" title="États d'avancement">
                                <ChartBarIcon className="h-4 w-4" />
                              </Link>
                              <Link href={`/chantiers/${chantier.chantierId}/documents`} className="p-2 text-green-600 hover:bg-green-100 dark:text-green-400 dark:hover:bg-green-900 rounded transition-colors" title="Documents">
                                <DocumentDuplicateIcon className="h-4 w-4" />
                              </Link>
                              <Link href={`/chantiers/${chantier.chantierId}/notes`} className="p-2 text-indigo-600 hover:bg-indigo-100 dark:text-indigo-400 dark:hover:bg-indigo-900 rounded transition-colors" title="Notes">
                                <ClipboardDocumentListIcon className="h-4 w-4" />
                              </Link>
                              <Link href={`/chantiers/${chantier.chantierId}/rapports`} className="p-2 text-red-600 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-900 rounded transition-colors" title="Rapports">
                                <DocumentTextIcon className="h-4 w-4" />
                              </Link>
                              <Link href={`/chantiers/${chantier.chantierId}/reception`} className="p-2 text-orange-600 hover:bg-orange-100 dark:text-orange-400 dark:hover:bg-orange-900 rounded transition-colors" title="Réception">
                                <ClipboardDocumentCheckIcon className="h-4 w-4" />
                              </Link>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
                  <Pagination currentPage={page} totalPages={totalPages} onPageChange={(p) => setPage(Math.max(1, Math.min(totalPages, p)))} />
                </div>
              </div>
            )}
            {/* Pagination aussi en vue cartes */}
            {viewMode === 'cards' && (
              <div className="mt-6">
                <Pagination currentPage={page} totalPages={totalPages} onPageChange={(p) => setPage(Math.max(1, Math.min(totalPages, p)))} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
} 