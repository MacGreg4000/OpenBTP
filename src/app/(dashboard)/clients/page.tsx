'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { SearchInput } from '@/components/ui'
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
  MapPinIcon
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

export default function ClientsPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [filtreNom, setFiltreNom] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
  const clientsFiltres = clients.filter(client =>
    client.nom.toLowerCase().includes(filtreNom.toLowerCase())
  )

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* En-tête avec gradient */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-700 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="md:flex md:items-center md:justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center">
                <BuildingStorefrontIcon className="h-8 w-8 text-white mr-3" />
                <div>
                  <h1 className="text-3xl font-bold text-white">
                    Annuaire des Clients
                  </h1>
                  <p className="mt-2 text-indigo-100">
                    Gérez vos relations clients et leurs projets
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-4 md:mt-0">
              <Link
                href="/clients/nouveau"
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-indigo-700 bg-white hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Nouveau client
              </Link>
            </div>
          </div>

          {/* Statistiques */}
          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg px-5 py-3 border border-white/20">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <UsersIcon className="h-6 w-6 text-white" />
                </div>
                <div className="ml-3 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-indigo-100 truncate">
                      Total clients
                    </dt>
                    <dd className="text-lg font-semibold text-white">
                      {totalClients}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-lg px-5 py-3 border border-white/20">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <BuildingOfficeIcon className="h-6 w-6 text-white" />
                </div>
                <div className="ml-3 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-indigo-100 truncate">
                      Total chantiers
                    </dt>
                    <dd className="text-lg font-semibold text-white">
                      {totalChantiers}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-lg px-5 py-3 border border-white/20">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ChartBarIcon className="h-6 w-6 text-white" />
                </div>
                <div className="ml-3 w-0 flex-1">
                  <dl>
                                         <dt className="text-sm font-medium text-indigo-100 truncate">
                       En cours/préparation
                     </dt>
                    <dd className="text-lg font-semibold text-white">
                      {chantiersActifs}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-lg px-5 py-3 border border-white/20">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CurrencyEuroIcon className="h-6 w-6 text-white" />
                </div>
                <div className="ml-3 w-0 flex-1">
                  <dl>
                                         <dt className="text-sm font-medium text-indigo-100 truncate">
                       CA actuel
                     </dt>
                    <dd className="text-lg font-semibold text-white">
                      {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(chiffreAffaires)}
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
        {/* Barre de recherche */}
        <div className="mb-8">
          <SearchInput
            id="search"
            placeholder="Rechercher un client..."
            value={filtreNom}
            onChange={(e) => setFiltreNom(e.target.value)}
            className="max-w-md"
          />
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

        {/* Grille de cartes */}
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
        )}
      </div>
    </div>
  )
} 