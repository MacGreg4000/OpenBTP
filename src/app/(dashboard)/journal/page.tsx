'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { CalendarDaysIcon, UserIcon, DocumentArrowDownIcon, FunnelIcon } from '@heroicons/react/24/outline'

type JournalEntry = {
  id: string
  date: string
  heureDebut: string
  heureFin: string
  chantierId?: string
  lieuLibre?: string
  description: string
  photos?: string[]
  estValide: boolean
  modifiableJusquA: string
  chantier?: {
    chantierId: string
    nomChantier: string
  }
  ouvrier: {
    id: string
    nom: string
    prenom: string
    email: string
  }
}

type Ouvrier = {
  id: string
  nom: string
  prenom: string
  email: string
}

type GroupedEntry = {
  ouvrier: {
    id: string
    nom: string
    prenom: string
    email: string
  }
  date: string
  estValide: boolean
  entries: JournalEntry[]
}

export default function JournalPage() {
  const { data: session } = useSession()
  const [groupedEntries, setGroupedEntries] = useState<GroupedEntry[]>([])
  const [ouvriers, setOuvriers] = useState<Ouvrier[]>([])
  const [loading, setLoading] = useState(true)
  const [availableYears, setAvailableYears] = useState<string[]>([])
  const [filters, setFilters] = useState({
    ouvrierId: '',
    mois: new Date().toISOString().slice(0, 7) // YYYY-MM
  })

  const loadOuvriers = async () => {
    try {
      const response = await fetch('/api/ouvriers')
      if (response.ok) {
        const data = await response.json()
        setOuvriers(data)
      }
    } catch (error) {
      console.error('Erreur lors du chargement des ouvriers:', error)
    }
  }

  const loadJournal = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.ouvrierId) params.append('ouvrierId', filters.ouvrierId)
      if (filters.mois) params.append('mois', filters.mois)

      console.log('🔍 Filtres envoyés:', { filters, params: params.toString() })

      const response = await fetch(`/api/journal/manager?${params}`)
      if (response.ok) {
        const data = await response.json()
        console.log('📊 Données reçues:', data.length, 'groupes')
        setGroupedEntries(data)
        
        // Extraire les années disponibles depuis les données
        const years = new Set<string>()
        data.forEach((group: GroupedEntry) => {
          group.entries.forEach(entry => {
            const year = new Date(entry.date).getFullYear().toString()
            years.add(year)
          })
        })
        
        // Ajouter l'année actuelle si pas de données
        const currentYear = new Date().getFullYear().toString() // 2025
        if (years.size === 0) {
          years.add(currentYear)
        }
        
        const sortedYears = Array.from(years).sort((a, b) => b.localeCompare(a))
        setAvailableYears(sortedYears)
        console.log('📅 Années disponibles:', sortedYears)
      } else {
        console.error('❌ Erreur API:', response.status)
      }
    } catch (error) {
      console.error('Erreur lors du chargement du journal:', error)
    } finally {
      setLoading(false)
    }
  }, [filters])

  // Charger les ouvriers
  useEffect(() => {
    loadOuvriers()
  }, [])

  // Charger le journal
  useEffect(() => {
    loadJournal()
  }, [loadJournal])

  const handleExport = async () => {
    try {
      const params = new URLSearchParams()
      if (filters.ouvrierId) params.append('ouvrierId', filters.ouvrierId)
      if (filters.mois) params.append('mois', filters.mois)

      const response = await fetch(`/api/journal/manager/export?${params}`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `Journal_Ouvrier_${filters.mois}.xlsx`
        a.click()
        window.URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Erreur lors de l\'export:', error)
    }
  }


  if (session?.user.role !== 'ADMIN' && session?.user.role !== 'MANAGER') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Accès non autorisé</h1>
          <p className="text-gray-600">Vous n'avez pas les permissions pour accéder à cette page.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1600px] mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* En-tête */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <CalendarDaysIcon className="h-8 w-8 mr-3 text-blue-600"/>
                Journal des Ouvriers
              </h1>
              <p className="mt-2 text-gray-600">
                Consultation et suivi des activités quotidiennes des ouvriers
              </p>
            </div>
            <button
              onClick={handleExport}
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <DocumentArrowDownIcon className="h-5 w-5 mr-2"/>
              Export Excel
            </button>
          </div>
        </div>

        {/* Filtres */}
        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <FunnelIcon className="h-5 w-5 text-gray-500"/>
            <h3 className="text-lg font-semibold text-gray-900">Filtres</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ouvrier</label>
              <select
                value={filters.ouvrierId}
                onChange={(e) => setFilters({ ...filters, ouvrierId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Tous les ouvriers</option>
                {ouvriers.map((ouvrier) => (
                  <option key={ouvrier.id} value={ouvrier.id}>
                    {ouvrier.prenom} {ouvrier.nom}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mois</label>
                <select
                  value={filters.mois ? filters.mois.split('-')[1] : ''}
                  onChange={(e) => {
                    const mois = e.target.value
                    const annee = filters.mois ? filters.mois.split('-')[0] : new Date().getFullYear().toString()
                    setFilters({ ...filters, mois: mois ? `${annee}-${mois.padStart(2, '0')}` : '' })
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Tous les mois</option>
                  <option value="01">Janvier</option>
                  <option value="02">Février</option>
                  <option value="03">Mars</option>
                  <option value="04">Avril</option>
                  <option value="05">Mai</option>
                  <option value="06">Juin</option>
                  <option value="07">Juillet</option>
                  <option value="08">Août</option>
                  <option value="09">Septembre</option>
                  <option value="10">Octobre</option>
                  <option value="11">Novembre</option>
                  <option value="12">Décembre</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Année</label>
                <select
                  value={filters.mois ? filters.mois.split('-')[0] : ''}
                  onChange={(e) => {
                    const annee = e.target.value
                    const mois = filters.mois ? filters.mois.split('-')[1] : ''
                    setFilters({ ...filters, mois: annee && mois ? `${annee}-${mois}` : '' })
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Toutes les années</option>
                  {availableYears.map(year => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
            </div>

          </div>
        </div>

        {/* Contenu */}
        {loading ? (
          <div className="bg-white rounded-xl shadow p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Chargement du journal...</p>
          </div>
        ) : groupedEntries.length === 0 ? (
          <div className="bg-white rounded-xl shadow p-8 text-center">
            <CalendarDaysIcon className="h-12 w-12 text-gray-400 mx-auto mb-4"/>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucune entrée trouvée</h3>
            <p className="text-gray-600">
              Aucune activité n'a été enregistrée pour les critères sélectionnés.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ouvrier
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Heures
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Lieu
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {groupedEntries.flatMap((group) => 
                    group.entries.map((entry) => (
                      <tr key={entry.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <UserIcon className="h-4 w-4 text-gray-400 mr-2"/>
                            <div className="text-sm font-medium text-gray-900">
                              {group.ouvrier.prenom} {group.ouvrier.nom}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(group.date).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {entry.heureDebut} - {entry.heureFin}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {entry.chantier ? (
                            <div className="flex items-center gap-1 text-sm">
                              <span className="font-medium text-gray-900">{entry.chantier.nomChantier}</span>
                              <span className="text-gray-400">•</span>
                              <span className="text-gray-500">{entry.chantier.chantierId}</span>
                            </div>
                          ) : (
                            <span className="text-sm text-blue-600 font-medium">{entry.lieuLibre}</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          <div className="truncate max-w-md" title={entry.description}>
                            {entry.description}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
