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
  const [filters, setFilters] = useState({
    ouvrierId: '',
    mois: new Date().toISOString().slice(0, 7), // YYYY-MM
    statut: ''
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
      if (filters.statut) params.append('statut', filters.statut)

      const response = await fetch(`/api/journal/manager?${params}`)
      if (response.ok) {
        const data = await response.json()
        setGroupedEntries(data)
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

  const getStatutBadge = (estValide: boolean) => {
    return estValide ? (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-700">
        ✅ Validé
      </span>
    ) : (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-700">
        ⏳ En attente
      </span>
    )
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
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mois</label>
              <input
                type="month"
                value={filters.mois}
                onChange={(e) => setFilters({ ...filters, mois: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
              <select
                value={filters.statut}
                onChange={(e) => setFilters({ ...filters, statut: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Tous les statuts</option>
                <option value="valide">Validé</option>
                <option value="non_valide">Non validé</option>
              </select>
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
          <div className="space-y-6">
            {groupedEntries.map((group, index) => (
              <div key={index} className="bg-white rounded-xl shadow">
                {/* En-tête du groupe */}
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <UserIcon className="h-5 w-5 text-gray-500"/>
                        <span className="font-semibold text-gray-900">
                          {group.ouvrier.prenom} {group.ouvrier.nom}
                        </span>
                      </div>
                      <span className="text-gray-500">•</span>
                      <span className="text-gray-600">
                        {new Date(group.date).toLocaleDateString('fr-FR')}
                      </span>
                      {getStatutBadge(group.estValide)}
                    </div>
                    <div className="text-sm text-gray-500">
                      {group.entries.length} activité{group.entries.length > 1 ? 's' : ''}
                    </div>
                  </div>
                </div>

                {/* Entrées du groupe */}
                <div className="p-6">
                  <div className="space-y-4">
                    {group.entries.map((entry) => (
                      <div key={entry.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            {/* Heures */}
                            <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                              <span>{entry.heureDebut} - {entry.heureFin}</span>
                            </div>

                            {/* Chantier ou lieu libre */}
                            <div className="mb-2">
                              {entry.chantier ? (
                                <div className="flex items-center gap-1 text-sm text-gray-700 bg-gray-50 px-2 py-1 rounded-md">
                                  <span className="font-medium">{entry.chantier.nomChantier}</span>
                                  <span className="text-gray-400">•</span>
                                  <span className="text-gray-500">{entry.chantier.chantierId}</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1 text-sm text-blue-700 bg-blue-50 px-2 py-1 rounded-md">
                                  <span className="font-medium">{entry.lieuLibre}</span>
                                </div>
                              )}
                            </div>

                            {/* Description */}
                            <p className="text-gray-900 text-sm">{entry.description}</p>

                            {/* Photos */}
                            {entry.photos && entry.photos.length > 0 && (
                              <div className="flex items-center gap-1 text-xs text-gray-500 mt-2">
                                <span>📷 {entry.photos.length} photo{entry.photos.length > 1 ? 's' : ''}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
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
