'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { PageHeader } from '@/components/PageHeader'
import { CalendarDaysIcon, UserIcon, DocumentArrowDownIcon, FunnelIcon, PencilSquareIcon, TrashIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'

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

type Chantier = {
  chantierId: string
  nomChantier: string
}

export default function JournalPage() {
  const { data: session } = useSession()
  const [groupedEntries, setGroupedEntries] = useState<GroupedEntry[]>([])
  const [ouvriers, setOuvriers] = useState<Ouvrier[]>([])
  const [chantiers, setChantiers] = useState<Chantier[]>([])
  const [loading, setLoading] = useState(true)
  const [availableYears, setAvailableYears] = useState<string[]>([])
  const [filters, setFilters] = useState({
    ouvrierId: '',
    mois: new Date().toISOString().slice(0, 7) // YYYY-MM
  })
  const [showForm, setShowForm] = useState(false)
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null)
  const [entryToDelete, setEntryToDelete] = useState<JournalEntry | null>(null)
  const [deleting, setDeleting] = useState(false)

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

  const loadChantiers = async () => {
    try {
      const response = await fetch('/api/chantiers?pageSize=500')
      if (!response.ok) {
        throw new Error('Erreur lors du chargement des chantiers')
      }
      const data = await response.json()
      if (Array.isArray(data)) {
        setChantiers(data)
      } else if (Array.isArray(data.chantiers)) {
        setChantiers(data.chantiers)
      }
    } catch (error) {
      console.error('Erreur lors du chargement des chantiers:', error)
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
    loadChantiers()
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

  const openEditEntry = (entry: JournalEntry) => {
    setEditingEntry(entry)
    setShowForm(true)
  }

  const handleDeleteClick = (entry: JournalEntry) => {
    setEntryToDelete(entry)
  }

  const handleDeleteEntry = async () => {
    if (!entryToDelete) return
    setDeleting(true)
    try {
      const response = await fetch(`/api/journal/ouvrier/${entryToDelete.id}`, {
        method: 'DELETE'
      })
      if (!response.ok) {
        const data = await response.json().catch(() => null)
        alert(data?.error || 'Erreur lors de la suppression')
      } else {
        setEntryToDelete(null)
        await loadJournal()
      }
    } catch (error) {
      console.error('Erreur lors de la suppression:', error)
      alert('Erreur lors de la suppression')
    } finally {
      setDeleting(false)
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

  // Calculer les statistiques pour les KPIs
  const totalEntries = groupedEntries.reduce((sum, group) => sum + group.entries.length, 0)
  const uniqueOuvriers = new Set(groupedEntries.map(group => group.ouvrier.id)).size
  const entriesValidees = groupedEntries.reduce((sum, group) => 
    sum + group.entries.filter(e => e.estValide).length, 0
  )

  const statsCards = (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg px-3 py-2 border border-gray-200/50 dark:border-gray-700/50 shadow-md">
        <div className="flex items-center gap-2">
          <CalendarDaysIcon className="h-4 w-4 text-green-600 dark:text-green-400" />
          <div>
            <div className="text-[10px] font-medium text-gray-600 dark:text-gray-400">Entrées</div>
            <div className="text-sm font-bold text-gray-900 dark:text-white">{totalEntries}</div>
          </div>
        </div>
      </div>
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg px-3 py-2 border border-gray-200/50 dark:border-gray-700/50 shadow-md">
        <div className="flex items-center gap-2">
          <UserIcon className="h-4 w-4 text-green-600 dark:text-green-400" />
          <div>
            <div className="text-[10px] font-medium text-gray-600 dark:text-gray-400">Ouvriers</div>
            <div className="text-sm font-bold text-gray-900 dark:text-white">{uniqueOuvriers}</div>
          </div>
        </div>
      </div>
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg px-3 py-2 border border-gray-200/50 dark:border-gray-700/50 shadow-md">
        <div className="flex items-center gap-2">
          <DocumentArrowDownIcon className="h-4 w-4 text-green-600 dark:text-green-400" />
          <div>
            <div className="text-[10px] font-medium text-gray-600 dark:text-gray-400">Validées</div>
            <div className="text-sm font-bold text-gray-900 dark:text-white">{entriesValidees}</div>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-green-50/20 to-emerald-50/10 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
      <PageHeader
        title="Journal des Ouvriers"
        subtitle="Consultation et suivi des activités quotidiennes des ouvriers"
        icon={CalendarDaysIcon}
        badgeColor="from-green-600 via-emerald-600 to-teal-700"
        gradientColor="from-green-600/10 via-emerald-600/10 to-teal-700/10"
        stats={statsCards}
        actions={
          <button
            onClick={handleExport}
            className="inline-flex items-center px-3 py-2 bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 text-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 text-sm font-semibold"
          >
            <DocumentArrowDownIcon className="h-4 w-4 mr-1.5"/>
            <span className="hidden sm:inline">Export Excel</span>
            <span className="sm:hidden">Export</span>
          </button>
        }
      />

      {/* Contenu principal */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Filtres */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border-2 border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <FunnelIcon className="h-5 w-5 text-gray-500 dark:text-gray-400"/>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Filtres</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ouvrier</label>
              <select
                value={filters.ouvrierId}
                onChange={(e) => setFilters({ ...filters, ouvrierId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Mois</label>
                <select
                  value={filters.mois ? filters.mois.split('-')[1] : ''}
                  onChange={(e) => {
                    const mois = e.target.value
                    const annee = filters.mois ? filters.mois.split('-')[0] : new Date().getFullYear().toString()
                    setFilters({ ...filters, mois: mois ? `${annee}-${mois.padStart(2, '0')}` : '' })
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Année</label>
                <select
                  value={filters.mois ? filters.mois.split('-')[0] : ''}
                  onChange={(e) => {
                    const annee = e.target.value
                    const mois = filters.mois ? filters.mois.split('-')[1] : ''
                    setFilters({ ...filters, mois: annee && mois ? `${annee}-${mois}` : '' })
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border-2 border-gray-200 dark:border-gray-700 p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Chargement du journal...</p>
          </div>
        ) : groupedEntries.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border-2 border-gray-200 dark:border-gray-700 p-8 text-center">
            <CalendarDaysIcon className="h-12 w-12 text-gray-400 mx-auto mb-4"/>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Aucune entrée trouvée</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Aucune activité n'a été enregistrée pour les critères sélectionnés.
            </p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border-2 border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                      Ouvrier
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                      Heures
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                      Lieu
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                      Description
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-900 dark:divide-gray-700">
                  {groupedEntries.flatMap((group) => 
                    group.entries.map((entry) => (
                      <tr key={entry.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <UserIcon className="h-4 w-4 text-gray-400 mr-2"/>
                            <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                              {group.ouvrier.prenom} {group.ouvrier.nom}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          {new Date(group.date).toLocaleDateString('fr-FR', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'numeric',
                            hour: 'numeric',
                            minute: 'numeric'
                          })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {entry.heureDebut} - {entry.heureFin}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {entry.chantier ? (
                            <div className="flex items-center gap-1 text-sm">
                              <span className="font-medium text-gray-900 dark:text-gray-100">{entry.chantier.nomChantier}</span>
                              <span className="text-gray-400 dark:text-gray-500">•</span>
                              <span className="text-gray-500 dark:text-gray-400">{entry.chantier.chantierId}</span>
                            </div>
                          ) : (
                            <span className="text-sm text-blue-600 dark:text-blue-400 font-medium">{entry.lieuLibre}</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                          <div className="truncate max-w-md" title={entry.description}>
                            {entry.description}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => openEditEntry(entry)}
                              className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:border-blue-400 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:border-gray-700 dark:text-gray-300 dark:hover:border-blue-500 dark:hover:text-blue-400"
                              title="Modifier l'entrée"
                            >
                              <PencilSquareIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteClick(entry)}
                              className="rounded-lg border border-gray-200 p-2 text-red-500 hover:border-red-400 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500/50 dark:border-gray-700 dark:hover:border-red-500 dark:hover:text-red-400"
                              title="Supprimer l'entrée"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
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

      {showForm && editingEntry && (
        <JournalManagerForm
          entry={editingEntry}
          chantiers={chantiers}
          onClose={() => {
            setShowForm(false)
            setEditingEntry(null)
          }}
          onSaved={() => {
            setShowForm(false)
            setEditingEntry(null)
            loadJournal()
          }}
        />
      )}

      {entryToDelete && (
        <DeleteEntryModal
          entry={entryToDelete}
          loading={deleting}
          onCancel={() => setEntryToDelete(null)}
          onConfirm={handleDeleteEntry}
        />
      )}
    </div>
  )
}

function JournalManagerForm({
  entry,
  chantiers,
  onClose,
  onSaved
}: {
  entry: JournalEntry
  chantiers: Chantier[]
  onClose: () => void
  onSaved: () => void
}) {
  const [formData, setFormData] = useState({
    date: entry.date ? new Date(entry.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    heureDebut: entry.heureDebut || '08:00',
    heureFin: entry.heureFin || '17:00',
    chantierId: entry.chantier?.chantierId || entry.chantierId || '',
    lieuLibre: entry.lieuLibre || '',
    description: entry.description || ''
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.chantierId && !formData.lieuLibre.trim()) {
      alert('Veuillez sélectionner un chantier ou indiquer un lieu libre')
      return
    }
    if (!formData.description.trim()) {
      alert('Veuillez renseigner une description')
      return
    }

    setSaving(true)
    try {
      const response = await fetch(`/api/journal/ouvrier/${entry.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      if (!response.ok) {
        const data = await response.json().catch(() => null)
        alert(data?.error || 'Erreur lors de la mise à jour de l\'entrée')
        return
      }
      onSaved()
    } catch (error) {
      console.error('Erreur lors de la mise à jour du journal:', error)
      alert('Erreur lors de la mise à jour du journal')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Modifier l\'encodage</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-emerald-500 focus:ring-emerald-500"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Début</label>
                <input
                  type="time"
                  value={formData.heureDebut}
                  onChange={(e) => setFormData({ ...formData, heureDebut: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-emerald-500 focus:ring-emerald-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fin</label>
                <input
                  type="time"
                  value={formData.heureFin}
                  onChange={(e) => setFormData({ ...formData, heureFin: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-emerald-500 focus:ring-emerald-500"
                  required
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Chantier / Lieu</label>
            <select
              value={formData.chantierId || 'libre'}
              onChange={(e) => {
                if (e.target.value === 'libre') {
                  setFormData({ ...formData, chantierId: '', lieuLibre: '' })
                } else {
                  setFormData({ ...formData, chantierId: e.target.value, lieuLibre: '' })
                }
              }}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-emerald-500 focus:ring-emerald-500"
            >
              <option value="">Sélectionner...</option>
              <option value="libre">Lieu libre</option>
              {chantiers.map((chantier) => (
                <option key={chantier.chantierId} value={chantier.chantierId}>
                  {chantier.nomChantier} ({chantier.chantierId})
                </option>
              ))}
            </select>
          </div>

          {(!formData.chantierId || formData.chantierId === '') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Lieu libre</label>
              <input
                type="text"
                value={formData.lieuLibre}
                onChange={(e) => setFormData({ ...formData, lieuLibre: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-emerald-500 focus:ring-emerald-500"
                placeholder="Ex: Formation sécurité"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-emerald-500 focus:ring-emerald-500"
              rows={4}
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
              disabled={saving}
            >
              Annuler
            </button>
            <button
              type="submit"
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              disabled={saving}
            >
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function DeleteEntryModal({
  entry,
  loading,
  onCancel,
  onConfirm
}: {
  entry: JournalEntry
  loading: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-center gap-3 text-red-600 mb-4">
          <ExclamationTriangleIcon className="h-6 w-6" />
          <h3 className="text-lg font-semibold">Supprimer l'encodage</h3>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Voulez-vous vraiment supprimer l'activité du {new Date(entry.date).toLocaleDateString('fr-FR')} pour {entry.ouvrier.prenom} {entry.ouvrier.nom} ?
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
            disabled={loading}
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
            disabled={loading}
          >
            {loading ? 'Suppression...' : 'Supprimer'}
          </button>
        </div>
      </div>
    </div>
  )
}
