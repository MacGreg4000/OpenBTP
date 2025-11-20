'use client'

import { useState, useEffect } from 'react'
import type { ComponentType, SVGProps } from 'react'
import Link from 'next/link'
import { PageHeader } from '@/components/PageHeader'
import { SearchableSelect, SearchableSelectOption } from '@/components/SearchableSelect'
import { 
  PlusIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ArrowPathIcon,
  EyeIcon
} from '@heroicons/react/24/outline'

interface Devis {
  id: string
  numeroDevis: string
  typeDevis: 'DEVIS' | 'AVENANT'
  reference: string | null
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
  chantier?: {
    chantierId: string
    nomChantier: string
  } | null
  createur: {
    id: string
    name: string
  }
  _count: {
    lignes: number
  }
}

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>

const statutLabels: Record<string, { label: string; color: string; icon: IconComponent }> = {
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
    color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
    icon: ArrowPathIcon
  },
  EXPIRE: { 
    label: 'Expiré', 
    color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
    icon: XCircleIcon
  }
}

export default function DevisPage() {
  const [devisList, setDevisList] = useState<Devis[]>([])
  const [loading, setLoading] = useState(true)
  const [numeroFilter, setNumeroFilter] = useState<string | number | null>(null)
  const [clientFilter, setClientFilter] = useState<string | number | null>(null)
  const [statutFilter, setStatutFilter] = useState<string | number | null>(null)

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

  // Créer la liste des numéros de devis pour le filtre
  const numeroOptions: SearchableSelectOption[] = devisList
    .map(devis => ({
      value: devis.id,
      label: devis.numeroDevis,
      subtitle: `${devis.client.nom} - ${formatCurrency(Number(devis.montantTTC))}`
    }))
    .sort((a, b) => a.label.localeCompare(b.label))

  // Créer la liste des clients uniques pour le filtre
  const clientOptions: SearchableSelectOption[] = devisList
    .reduce<SearchableSelectOption[]>((acc, devis) => {
      const existingClient = acc.find(c => c.value === devis.client.id)
      if (!existingClient) {
        acc.push({
          value: devis.client.id,
          label: devis.client.nom,
          subtitle: devis.client.email
        })
      }
      return acc
    }, [])
    .sort((a, b) => a.label.localeCompare(b.label))

  // Créer la liste des statuts pour le filtre
  const statutOptions: SearchableSelectOption[] = [
    { value: 'BROUILLON', label: 'Brouillon' },
    { value: 'EN_ATTENTE', label: 'En attente' },
    { value: 'ACCEPTE', label: 'Accepté' },
    { value: 'REFUSE', label: 'Refusé' },
    { value: 'CONVERTI', label: 'Converti' },
    { value: 'EXPIRE', label: 'Expiré' }
  ]

  const devisFiltres = devisList.filter((devis) => {
    const matchNumero = numeroFilter === null || devis.id === numeroFilter
    
    const matchClient = clientFilter === null || devis.client.id === clientFilter
    
    const matchStatut = statutFilter === null || devis.statut === statutFilter

    return matchNumero && matchClient && matchStatut
  })

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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <PageHeader
        title="Devis"
        subtitle="Gérez vos devis clients"
        icon={DocumentTextIcon}
        badgeColor="from-orange-600 via-orange-700 to-red-700"
        gradientColor="from-orange-600/10 via-orange-700/10 to-red-700/10"
        actions={
          <Link
            href="/devis/nouveau"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-all duration-200"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Nouveau devis
          </Link>
        }
      />

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

      {/* Filtres */}
      <div className="relative z-10 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-xl rounded-2xl p-6 border border-gray-200/50 dark:border-gray-700/50">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-4">Filtres</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Filtre par numéro de devis */}
          <SearchableSelect
            options={numeroOptions}
            value={numeroFilter}
            onChange={setNumeroFilter}
            placeholder="Sélectionner un numéro"
            searchPlaceholder="Rechercher un numéro de devis..."
            emptyMessage="Aucun devis trouvé"
            showAllOption={true}
            allOptionLabel="Tous les numéros"
            colorScheme="orange"
          />

          {/* Filtre client avec recherche */}
          <SearchableSelect
            options={clientOptions}
            value={clientFilter}
            onChange={setClientFilter}
            placeholder="Sélectionner un client"
            searchPlaceholder="Rechercher un client..."
            emptyMessage="Aucun client trouvé"
            showAllOption={true}
            allOptionLabel="Tous les clients"
            colorScheme="orange"
          />

          {/* Filtre statut */}
          <SearchableSelect
            options={statutOptions}
            value={statutFilter}
            onChange={setStatutFilter}
            placeholder="Sélectionner un statut"
            searchPlaceholder="Rechercher un statut..."
            emptyMessage="Aucun statut trouvé"
            showAllOption={true}
            allOptionLabel="Tous les statuts"
            colorScheme="orange"
          />
        </div>
      </div>

      {/* Liste des devis */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20">
              <tr>
                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Type
                </th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Numéro
                </th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Client / Chantier
                </th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Date création
                </th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Validité
                </th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Statut
                </th>
                <th scope="col" className="px-6 py-4 text-right text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Montant HT
                </th>
                <th scope="col" className="px-6 py-4 text-right text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Montant TTC
                </th>
                <th scope="col" className="px-6 py-4 text-center text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700/50">
            {devisFiltres.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
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
                    className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    {/* Colonne Type */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-bold shadow-sm ${
                        devis.typeDevis === 'DEVIS' 
                          ? 'bg-gradient-to-r from-blue-100 to-blue-200 dark:from-blue-900/50 dark:to-blue-800/50 text-blue-900 dark:text-blue-300 ring-2 ring-blue-300/50 dark:ring-blue-500/50'
                          : 'bg-gradient-to-r from-orange-100 to-orange-200 dark:from-orange-900/50 dark:to-orange-800/50 text-orange-900 dark:text-orange-300 ring-2 ring-orange-300/50 dark:ring-orange-500/50'
                      }`}>
                        {devis.typeDevis === 'DEVIS' ? '📄 Devis' : '📋 Avenant'}
                      </span>
                    </td>
                    {/* Colonne Numéro */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-gray-900 dark:text-white">
                        {devis.numeroDevis}
                      </div>
                      {devis.reference && (
                        <div className="text-xs text-orange-600 dark:text-orange-400 font-semibold">
                          📌 {devis.reference}
                        </div>
                      )}
                      <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                        {devis._count.lignes} ligne(s)
                      </div>
                    </td>
                    {/* Colonne Client / Chantier */}
                    <td className="px-6 py-4">
                      <div className="text-sm font-semibold text-gray-900 dark:text-white">
                        {devis.client.nom}
                      </div>
                      {devis.chantier && (
                        <div className="text-xs text-orange-600 dark:text-orange-400 font-semibold mt-1">
                          🏗️ {devis.chantier.nomChantier}
                        </div>
                      )}
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {devis.client.email}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-700 dark:text-gray-300">
                      {formatDate(devis.dateCreation)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm font-semibold ${expired ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'}`}>
                        {formatDate(devis.dateValidite)}
                      </div>
                      {expired && (
                        <div className="text-xs font-bold text-red-600 dark:text-red-400">
                          Expiré
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold shadow-sm ${statutInfo?.color || 'bg-gray-100 text-gray-800'}`}>
                        {StatusIcon && <StatusIcon className="h-4 w-4 mr-1.5" />}
                        {statutInfo?.label || devis.statut}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-gray-900 dark:text-white">
                      {formatCurrency(Number(devis.montantHT))}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-extrabold text-orange-700 dark:text-orange-400">
                      {formatCurrency(Number(devis.montantTTC))}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                      <Link
                        href={`/devis/${devis.id}`}
                        className="inline-flex items-center justify-center p-2 rounded-lg text-orange-600 hover:text-orange-900 dark:text-orange-400 dark:hover:text-orange-300 hover:bg-orange-100 dark:hover:bg-orange-900/20 transition-all duration-200"
                        title="Voir le devis"
                      >
                        <EyeIcon className="h-5 w-5" />
                      </Link>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
        </div>
      </div>
      </div>
    </div>
  )
}

