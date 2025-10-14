'use client'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { type Chantier } from '@/types/chantier'
import { 
  CalendarIcon,
  PencilSquareIcon,
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
  PlusIcon
} from '@heroicons/react/24/outline'
import { DocumentExpirationAlert } from '@/components/DocumentExpirationAlert'
import { SearchInput } from '@/components/ui'
import SelectField from '@/components/ui/SelectField'
import { Pagination } from '@/components/Pagination'

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
            href={`/chantiers/${chantier.chantierId}/edit`}
            className="p-2 bg-yellow-100 text-yellow-600 rounded-lg hover:bg-yellow-200 dark:bg-yellow-900 dark:text-yellow-300 dark:hover:bg-yellow-800 transition-colors"
            title="Modifier"
          >
            <PencilSquareIcon className="h-4 w-4" />
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
  
  // Synchroniser filtreClientId avec l'URL
  useEffect(() => {
    setFiltreClientId(clientIdFromUrl)
  }, [clientIdFromUrl])

  useEffect(() => {
    const fetchChantiers = async () => {
      try {
        const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
        const res = await fetch(`/api/chantiers?${params.toString()}`)
        const json = await res.json()
        const data = Array.isArray(json) ? json : json.data
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
  }, [clientIdFromUrl, page])

  const chantiersFiltrés = chantiers.filter(chantier => {
    const matchNom = chantier.nomChantier.toLowerCase().includes(filtreNom.toLowerCase())
    const matchEtat = filtreEtat === '' || chantier.etatChantier === filtreEtat
    const matchClient = !filtreClientId || chantier.clientId === filtreClientId
    return matchNom && matchEtat && matchClient
  })
  
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 dark:bg-gray-900">
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* En-tête avec gradient */}
      <div className="bg-gradient-to-r from-amber-600 to-orange-700 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <DocumentExpirationAlert />
          
          <div className="md:flex md:items-center md:justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center">
                <BuildingOffice2Icon className="h-8 w-8 text-white mr-3" />
                <div>
                  <h1 className="text-3xl font-bold text-white">
                    Gestion des Chantiers
                  </h1>
                  <p className="mt-2 text-amber-100">
                    Gérez et suivez tous vos projets de construction
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-4 md:mt-0">
              <Link
                href="/chantiers/nouveau"
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-amber-700 bg-white hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-colors duration-200"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Nouveau chantier
              </Link>
            </div>
          </div>

          {/* Statistiques */}
          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg px-5 py-3 border border-white/20">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <BuildingOffice2Icon className="h-6 w-6 text-white" />
                </div>
                <div className="ml-3 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-amber-100 truncate">
                      Total chantiers
                    </dt>
                    <dd className="text-lg font-semibold text-white">
                      {stats.total}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-lg px-5 py-3 border border-white/20">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ChartPieIcon className="h-6 w-6 text-white" />
                </div>
                <div className="ml-3 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-amber-100 truncate">
                      En cours
                    </dt>
                    <dd className="text-lg font-semibold text-white">
                      {stats.enCours}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-lg px-5 py-3 border border-white/20">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ClockIcon className="h-6 w-6 text-white" />
                </div>
                <div className="ml-3 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-amber-100 truncate">
                      En préparation
                    </dt>
                    <dd className="text-lg font-semibold text-white">
                      {stats.enPreparation}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-lg px-5 py-3 border border-white/20">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <BanknotesIcon className="h-6 w-6 text-white" />
                </div>
                <div className="ml-3 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-amber-100 truncate">
                      CA total
                    </dt>
                    <dd className="text-lg font-semibold text-white">
                      {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(stats.chiffreAffaires)}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
              <div className="flex-1 min-w-0">
                <SearchInput
                  id="search"
                  placeholder="Rechercher par nom de chantier..."
                  value={filtreNom}
                  onChange={(e) => setFiltreNom(e.target.value)}
                  className="w-full dark:bg-gray-700 dark:text-white dark:border-gray-600"
                />
              </div>
              <div className="sm:w-48">
                <SelectField
                  label=""
                  value={filtreEtat}
                  onChange={(e) => setFiltreEtat(e.target.value)}
                  className="h-10 dark:bg-gray-700 dark:text-white dark:border-gray-600"
                >
                  <option value="">Tous les états</option>
                  <option value="En préparation">En préparation</option>
                  <option value="En cours">En cours</option>
                  <option value="Terminé">Terminé</option>
                </SelectField>
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
                    ? 'bg-blue-600 text-white' 
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
                        <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-200 sm:pl-6">
                          Chantier
                        </th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-200">
                          ID
                        </th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-200">
                          Client
                        </th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-200">
                          État
                        </th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-200">
                          Montant
                        </th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-200">
                          Date de début
                        </th>
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
                              <Link href={`/chantiers/${chantier.chantierId}/edit`} className="p-2 text-yellow-600 hover:bg-yellow-100 dark:text-yellow-400 dark:hover:bg-yellow-900 rounded transition-colors" title="Modifier">
                                <PencilSquareIcon className="h-4 w-4" />
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