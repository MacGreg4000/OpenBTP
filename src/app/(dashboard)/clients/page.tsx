'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { SearchInput } from '@/components/ui'
import { PageHeader } from '@/components/PageHeader'
import { 
  PencilSquareIcon, 
  BuildingOfficeIcon, 
  EyeIcon,
  PlusIcon,
  UsersIcon,
  CurrencyEuroIcon,
  ChartBarIcon,
  BuildingStorefrontIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  ChevronUpDownIcon
} from '@heroicons/react/24/outline'

interface Client {
  id: string
  nom: string
  email: string | null
  adresse: string | null
  telephone: string | null
  Chantier: Array<{
    chantierId: string
    nomChantier: string
    dateDebut: string | null
    statut: string
    budget: number | null
    adresseChantier: string | null
    commandes: Array<{
      total: number
      statut: string
    }>
  }>
}

// Composant pour les en-têtes triables
type SortField = 'nom' | 'email' | 'telephone' | 'chantiers' | 'montant'

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
            <ChevronUpIcon className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          ) : (
            <ChevronDownIcon className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          )
        ) : (
          <ChevronUpDownIcon className="h-4 w-4 text-gray-400" />
        )}
      </div>
    </th>
  )
}

export default function ClientsPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [filtreNom, setFiltreNom] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table')
  const [sortField, setSortField] = useState<SortField | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  useEffect(() => {
    if (!session) return

    fetch('/api/clients')
      .then(async res => {
        const data = await res.json()
        if (!res.ok) {
          throw new Error(data.error || 'Erreur lors de la récupération des clients')
        }
        return data
      })
      .then(data => {
        if (Array.isArray(data)) {
          setClients(data)
        } else {
          throw new Error('Format de données invalide')
        }
      })
      .catch(error => {
        console.error('Erreur:', error)
        setError(error.message)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [session])

  // Filtrage des clients par nom
  let clientsFiltres = clients.filter(client =>
    client.nom.toLowerCase().includes(filtreNom.toLowerCase())
  )

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
    clientsFiltres = [...clientsFiltres].sort((a, b) => {
      let aValue: string | number = ''
      let bValue: string | number = ''

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
        case 'chantiers':
          aValue = a.Chantier?.length || 0
          bValue = b.Chantier?.length || 0
          break
        case 'montant':
          aValue = a.Chantier?.reduce((sum, chantier) => {
            const chantiersValides = chantier.statut === 'EN_COURS' || chantier.statut === 'EN_PREPARATION'
            if (!chantiersValides) return sum
            const montantCommandes = chantier.commandes
              .filter(commande => commande.statut !== 'BROUILLON')
              .reduce((total, commande) => total + (commande.total || 0), 0)
            return sum + (montantCommandes > 0 ? montantCommandes : (chantier.budget || 0))
          }, 0) || 0
          bValue = b.Chantier?.reduce((sum, chantier) => {
            const chantiersValides = chantier.statut === 'EN_COURS' || chantier.statut === 'EN_PREPARATION'
            if (!chantiersValides) return sum
            const montantCommandes = chantier.commandes
              .filter(commande => commande.statut !== 'BROUILLON')
              .reduce((total, commande) => total + (commande.total || 0), 0)
            return sum + (montantCommandes > 0 ? montantCommandes : (chantier.budget || 0))
          }, 0) || 0
          break
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
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

  // Fonction pour créer un nouveau chantier à partir d'un client
  const handleCreateChantier = (clientId: string, clientNom: string) => {
    router.push(`/chantiers/nouveau?clientId=${clientId}&clientNom=${encodeURIComponent(clientNom)}`);
  };

  // Calculs pour les statistiques
  const totalClients = clients.length
  const totalChantiers = clients.reduce((total, client) => total + (client.Chantier?.length || 0), 0)
  const chantiersActifs = clients.reduce((total, client) => 
    total + (client.Chantier?.filter(c => c.statut === 'EN_COURS' || c.statut === 'EN_PREPARATION').length || 0), 0
  )
  
  // Calculer le chiffre d'affaires uniquement pour les chantiers en cours et en préparation
  const chiffreAffaires = clients.reduce((total, client) => {
    const chantiersValides = client.Chantier?.filter(c => c.statut === 'EN_COURS' || c.statut === 'EN_PREPARATION') || []
    return total + chantiersValides.reduce((sum, chantier) => {
      // Calculer le montant total des commandes validées pour ce chantier
      const montantCommandes = chantier.commandes
        .filter(commande => commande.statut !== 'BROUILLON')
        .reduce((totalCommandes, commande) => totalCommandes + (commande.total || 0), 0)
      
      // Utiliser le montant des commandes s'il existe, sinon le budget du chantier
      return sum + (montantCommandes > 0 ? montantCommandes : (chantier.budget || 0))
    }, 0)
  }, 0)

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">Accès non autorisé</div>
          <p className="text-gray-600">Veuillez vous connecter pour accéder à cette page</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">Erreur: {error}</div>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
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
          <UsersIcon className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          <div>
            <div className="text-[10px] font-medium text-gray-600 dark:text-gray-400">Clients</div>
            <div className="text-sm font-bold text-gray-900 dark:text-white">{totalClients}</div>
          </div>
        </div>
      </div>
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg px-3 py-2 border border-gray-200/50 dark:border-gray-700/50 shadow-md">
        <div className="flex items-center gap-2">
          <BuildingOfficeIcon className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          <div>
            <div className="text-[10px] font-medium text-gray-600 dark:text-gray-400">Chantiers</div>
            <div className="text-sm font-bold text-gray-900 dark:text-white">{totalChantiers}</div>
          </div>
        </div>
      </div>
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg px-3 py-2 border border-gray-200/50 dark:border-gray-700/50 shadow-md">
        <div className="flex items-center gap-2">
          <ChartBarIcon className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          <div>
            <div className="text-[10px] font-medium text-gray-600 dark:text-gray-400">Actifs</div>
            <div className="text-sm font-bold text-gray-900 dark:text-white">{chantiersActifs}</div>
          </div>
        </div>
      </div>
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg px-3 py-2 border border-gray-200/50 dark:border-gray-700/50 shadow-md">
        <div className="flex items-center gap-2">
          <CurrencyEuroIcon className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          <div>
            <div className="text-[10px] font-medium text-gray-600 dark:text-gray-400">CA</div>
            <div className="text-sm font-bold text-gray-900 dark:text-white">
              {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0, notation: 'compact' }).format(chiffreAffaires)}
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-indigo-50/20 to-purple-50/10 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
      <PageHeader
        title="Annuaire des Clients"
        subtitle="Gérez vos relations clients et leurs projets"
        icon={BuildingStorefrontIcon}
        badgeColor="from-indigo-600 via-purple-600 to-pink-700"
        gradientColor="from-indigo-600/10 via-purple-600/10 to-pink-700/10"
        stats={statsCards}
        actions={
          <Link
            href="/clients/nouveau"
            className="inline-flex items-center px-3 py-2 bg-gradient-to-r from-indigo-600 to-purple-700 hover:from-indigo-700 hover:to-purple-800 text-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 text-sm font-semibold"
          >
            <PlusIcon className="h-4 w-4 mr-1.5" />
            <span className="hidden sm:inline">Nouveau client</span>
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
              placeholder="Rechercher un client..."
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
                  ? 'bg-indigo-600 text-white' 
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              Cartes
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                viewMode === 'table' 
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700' 
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              Tableau
            </button>
          </div>
        </div>

        {/* Affichage des erreurs */}
        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800 dark:text-red-200">{error}</h3>
              </div>
            </div>
          </div>
        )}

        {/* Affichage des clients */}
        {clientsFiltres.length === 0 ? (
          <div className="text-center py-12">
            <UsersIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">
              {filtreNom ? 'Aucun client trouvé' : 'Aucun client'}
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {filtreNom ? 'Aucun client ne correspond à votre recherche.' : 'Commencez par ajouter votre premier client.'}
            </p>
            {!filtreNom && (
              <div className="mt-6">
                <Link
                  href="/clients/nouveau"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Nouveau client
                </Link>
              </div>
            )}
          </div>
        ) : (
          <>
            {viewMode === 'cards' ? (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {clientsFiltres.map((client) => (
              <div key={client.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-200 overflow-hidden">
                {/* En-tête de la carte */}
                <div className="p-6 pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                        {client.nom}
                      </h3>
                      <div className="mt-3 space-y-2">
                        {client.email && (
                          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                            <EnvelopeIcon className="h-4 w-4 mr-2 text-gray-400" />
                            <span className="truncate">{client.email}</span>
                          </div>
                        )}
                        {client.telephone && (
                          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                            <PhoneIcon className="h-4 w-4 mr-2 text-gray-400" />
                            <span>{client.telephone}</span>
                          </div>
                        )}
                        {client.adresse && (
                          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                            <MapPinIcon className="h-4 w-4 mr-2 text-gray-400" />
                            <span className="truncate">{client.adresse}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                                     {/* Statistiques du client */}
                   <div className="mt-4 flex items-center justify-between text-sm">
                     {/* Nombre de chantiers cliquable */}
                     <Link 
                       href={`/chantiers?clientId=${client.id}`}
                       className="inline-flex items-center text-sm text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium hover:underline transition-colors duration-200"
                     >
                       <BuildingOfficeIcon className="h-4 w-4 mr-1" />
                       <span className="font-medium">{client.Chantier?.length || 0}</span>&nbsp;chantier{(client.Chantier?.length || 0) !== 1 ? 's' : ''}
                     </Link>
                     {client.Chantier && client.Chantier.length > 0 && (
                       <div className="text-indigo-600 dark:text-indigo-400 font-medium">
                         {(() => {
                           // Calculer le montant pour les chantiers en cours et en préparation uniquement
                           const chantiersValides = client.Chantier.filter(c => c.statut === 'EN_COURS' || c.statut === 'EN_PREPARATION')
                           const montantTotal = chantiersValides.reduce((sum, chantier) => {
                             const montantCommandes = chantier.commandes
                               .filter(commande => commande.statut !== 'BROUILLON')
                               .reduce((total, commande) => total + (commande.total || 0), 0)
                             return sum + (montantCommandes > 0 ? montantCommandes : (chantier.budget || 0))
                           }, 0)
                           
                           return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(montantTotal)
                         })()}
                       </div>
                     )}
                   </div>
                </div>

                {/* Actions */}
                <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-600">
                  <div className="flex items-center justify-between">
                    <div className="flex space-x-2">
                      <Link
                        href={`/clients/${client.id}`}
                        className="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-xs font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
                        title="Voir les détails"
                      >
                        <EyeIcon className="h-4 w-4 mr-1" />
                        Détails
                      </Link>
                      <Link
                        href={`/clients/${client.id}/edit`}
                        className="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-xs font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
                        title="Modifier le client"
                      >
                        <PencilSquareIcon className="h-4 w-4 mr-1" />
                        Modifier
                      </Link>
                    </div>
                    <button
                      onClick={() => handleCreateChantier(client.id, client.nom)}
                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
                      title="Créer un nouveau chantier pour ce client"
                    >
                      <BuildingOfficeIcon className="h-4 w-4 mr-1" />
                      Chantier
                    </button>
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
                          field="chantiers"
                          label="Chantiers"
                          currentSortField={sortField}
                          sortDirection={sortDirection}
                          onSort={handleSort}
                        />
                        <SortableHeader
                          field="montant"
                          label="Montant"
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
                      {clientsFiltres.map((client) => {
                        const montantTotal = client.Chantier?.reduce((sum, chantier) => {
                          const chantiersValides = chantier.statut === 'EN_COURS' || chantier.statut === 'EN_PREPARATION'
                          if (!chantiersValides) return sum
                          const montantCommandes = chantier.commandes
                            .filter(commande => commande.statut !== 'BROUILLON')
                            .reduce((total, commande) => total + (commande.total || 0), 0)
                          return sum + (montantCommandes > 0 ? montantCommandes : (chantier.budget || 0))
                        }, 0) || 0

                        return (
                          <tr key={client.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                            <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 dark:text-gray-200 sm:pl-6">
                              {client.nom}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                              {client.email || '-'}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                              {client.telephone || '-'}
                            </td>
                            <td className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">
                              {client.adresse || '-'}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                              <Link 
                                href={`/chantiers?clientId=${client.id}`}
                                className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium hover:underline"
                              >
                                {client.Chantier?.length || 0}
                              </Link>
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                              {montantTotal > 0 
                                ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(montantTotal)
                                : '-'
                              }
                            </td>
                            <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                              <div className="flex space-x-1 justify-end">
                                <Link 
                                  href={`/clients/${client.id}`} 
                                  className="p-2 text-indigo-600 hover:bg-indigo-100 dark:text-indigo-400 dark:hover:bg-indigo-900 rounded transition-colors" 
                                  title="Consulter"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <EyeIcon className="h-4 w-4" />
                                </Link>
                                <Link 
                                  href={`/clients/${client.id}/edit`} 
                                  className="p-2 text-blue-600 hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-blue-900 rounded transition-colors" 
                                  title="Modifier"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <PencilSquareIcon className="h-4 w-4" />
                                </Link>
                                <button
                                  onClick={() => handleCreateChantier(client.id, client.nom)}
                                  className="p-2 text-green-600 hover:bg-green-100 dark:text-green-400 dark:hover:bg-green-900 rounded transition-colors"
                                  title="Créer un chantier"
                                >
                                  <BuildingOfficeIcon className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
} 