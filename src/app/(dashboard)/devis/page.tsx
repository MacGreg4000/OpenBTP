'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  PlusIcon, 
  MagnifyingGlassIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ArrowPathIcon,
  DocumentDuplicateIcon
} from '@heroicons/react/24/outline'

interface Devis {
  id: string
  numeroDevis: string
  dateCreation: string
  dateValidite: string
  statut: string
  montantHT: number
  montantTTC: number
  client: {
    id: string
    nom: string
    email: string
  }
  createur: {
    id: string
    name: string
  }
  _count: {
    lignes: number
  }
}

const statutLabels: Record<string, { label: string; color: string; icon: any }> = {
  BROUILLON: { 
    label: 'Brouillon', 
    color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
    icon: DocumentTextIcon
  },
  EN_ATTENTE: { 
    label: 'En attente', 
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    icon: ClockIcon
  },
  ACCEPTE: { 
    label: 'Accepté', 
    color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    icon: CheckCircleIcon
  },
  REFUSE: { 
    label: 'Refusé', 
    color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    icon: XCircleIcon
  },
  CONVERTI: { 
    label: 'Converti', 
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
    icon: ArrowPathIcon
  },
  EXPIRE: { 
    label: 'Expiré', 
    color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
    icon: XCircleIcon
  }
}

export default function DevisPage() {
  const router = useRouter()
  const [devisList, setDevisList] = useState<Devis[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statutFilter, setStatutFilter] = useState<string>('ALL')

  useEffect(() => {
    loadDevis()
  }, [])

  const loadDevis = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/devis')
      if (response.ok) {
        const data = await response.json()
        setDevisList(data)
      }
    } catch (error) {
      console.error('Erreur lors du chargement des devis:', error)
    } finally {
      setLoading(false)
    }
  }

  const devisFiltres = devisList.filter((devis) => {
    const matchSearch = 
      devis.numeroDevis.toLowerCase().includes(searchTerm.toLowerCase()) ||
      devis.client.nom.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchStatut = statutFilter === 'ALL' || devis.statut === statutFilter

    return matchSearch && matchStatut
  })

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount)
  }

  const isExpired = (devis: Devis) => {
    return new Date(devis.dateValidite) < new Date() && devis.statut === 'EN_ATTENTE'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Devis</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Gérez vos devis clients
          </p>
        </div>
        <Link
          href="/devis/nouveau"
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Nouveau devis
        </Link>
      </div>

      {/* Filtres */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Recherche */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Rechercher par numéro ou client..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>

          {/* Filtre statut */}
          <div>
            <select
              value={statutFilter}
              onChange={(e) => setStatutFilter(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
            >
              <option value="ALL">Tous les statuts</option>
              <option value="BROUILLON">Brouillon</option>
              <option value="EN_ATTENTE">En attente</option>
              <option value="ACCEPTE">Accepté</option>
              <option value="REFUSE">Refusé</option>
              <option value="CONVERTI">Converti</option>
              <option value="EXPIRE">Expiré</option>
            </select>
          </div>
        </div>
      </div>

      {/* Liste des devis */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Numéro
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Client
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Date création
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Validité
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Statut
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Montant HT
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Montant TTC
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {devisFiltres.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                  <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-lg font-medium">Aucun devis trouvé</p>
                  <p className="mt-1">Créez votre premier devis pour commencer</p>
                </td>
              </tr>
            ) : (
              devisFiltres.map((devis) => {
                const statutInfo = statutLabels[devis.statut]
                const StatusIcon = statutInfo?.icon
                const expired = isExpired(devis)

                return (
                  <tr
                    key={devis.id}
                    onClick={() => router.push(`/devis/${devis.id}`)}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {devis.numeroDevis}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {devis._count.lignes} ligne(s)
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {devis.client.nom}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {devis.client.email}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(devis.dateCreation)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm ${expired ? 'text-red-600 font-medium' : 'text-gray-500 dark:text-gray-400'}`}>
                        {formatDate(devis.dateValidite)}
                      </div>
                      {expired && (
                        <div className="text-xs text-red-600">
                          Expiré
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statutInfo?.color || 'bg-gray-100 text-gray-800'}`}>
                        {StatusIcon && <StatusIcon className="h-3.5 w-3.5 mr-1" />}
                        {statutInfo?.label || devis.statut}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white font-medium">
                      {formatCurrency(Number(devis.montantHT))}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white font-semibold">
                      {formatCurrency(Number(devis.montantTTC))}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push(`/devis/${devis.id}`)
                        }}
                        className="text-orange-600 hover:text-orange-900 dark:text-orange-400 dark:hover:text-orange-300"
                      >
                        Voir
                      </button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Stats */}
      {devisFiltres.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <div className="text-sm text-gray-500 dark:text-gray-400">Total devis</div>
            <div className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
              {devisFiltres.length}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <div className="text-sm text-gray-500 dark:text-gray-400">Montant total HT</div>
            <div className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
              {formatCurrency(devisFiltres.reduce((sum, d) => sum + Number(d.montantHT), 0))}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <div className="text-sm text-gray-500 dark:text-gray-400">En attente</div>
            <div className="mt-1 text-2xl font-semibold text-blue-600">
              {devisFiltres.filter(d => d.statut === 'EN_ATTENTE').length}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <div className="text-sm text-gray-500 dark:text-gray-400">Acceptés</div>
            <div className="mt-1 text-2xl font-semibold text-green-600">
              {devisFiltres.filter(d => d.statut === 'ACCEPTE').length}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

