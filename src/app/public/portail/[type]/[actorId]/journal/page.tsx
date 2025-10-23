'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeftIcon, PlusIcon, CheckIcon, XMarkIcon, PencilIcon, TrashIcon, CalendarDaysIcon } from '@heroicons/react/24/outline'
import { PortalI18nProvider, usePortalI18n } from '../../../i18n'

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
}

type Chantier = {
  chantierId: string
  nomChantier: string
}

function InnerPage(props: { params: { type: 'ouvrier'|'soustraitant'; actorId: string } }) {
  const { actorId } = props.params
  const router = useRouter()
  const { t, lang, setLang } = usePortalI18n()
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([])
  const [chantiers, setChantiers] = useState<Chantier[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null)

  const loadJournal = useCallback(async () => {
    try {
      const response = await fetch(`/api/journal/ouvrier?ouvrierId=${actorId}`)
      if (response.ok) {
        const data = await response.json()
        setJournalEntries(data)
      }
    } catch (error) {
      console.error('Erreur lors du chargement du journal:', error)
    } finally {
      setLoading(false)
    }
  }, [actorId])

  // Charger les données
  useEffect(() => {
    loadJournal()
    loadChantiers()
  }, [loadJournal])

  const loadChantiers = async () => {
    try {
      const response = await fetch(`/api/chantiers?pageSize=100`)
      if (response.ok) {
        const data = await response.json()
        console.log('Données chantiers reçues:', data)
        // L'API retourne soit un tableau direct, soit un objet avec pagination
        if (Array.isArray(data)) {
          setChantiers(data)
        } else if (data.chantiers && Array.isArray(data.chantiers)) {
          setChantiers(data.chantiers)
        } else {
          console.error('Format de données chantiers inattendu:', data)
          setChantiers([])
        }
      } else {
        console.error('Erreur API chantiers:', response.status)
      }
    } catch (error) {
      console.error('Erreur lors du chargement des chantiers:', error)
    }
  }

  const handleValider = async (entryId: string) => {
    try {
      const response = await fetch(`/api/journal/ouvrier/${entryId}/valider`, {
        method: 'POST'
      })
      if (response.ok) {
        loadJournal()
      }
    } catch (error) {
      console.error('Erreur lors de la validation:', error)
    }
  }

  const handleDevalider = async (entryId: string) => {
    try {
      const response = await fetch(`/api/journal/ouvrier/${entryId}/devalider`, {
        method: 'POST'
      })
      if (response.ok) {
        loadJournal()
      }
    } catch (error) {
      console.error('Erreur lors de la dévalidation:', error)
    }
  }

  const handleDelete = async (entryId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette entrée ?')) return
    
    try {
      const response = await fetch(`/api/journal/ouvrier/${entryId}`, {
        method: 'DELETE'
      })
      if (response.ok) {
        loadJournal()
      }
    } catch (error) {
      console.error('Erreur lors de la suppression:', error)
    }
  }

  const canModify = (entry: JournalEntry) => {
    return new Date() < new Date(entry.modifiableJusquA)
  }

  const getTodayEntries = () => {
    const today = new Date().toISOString().split('T')[0]
    return journalEntries.filter(entry => entry.date === today)
  }

  const getTodayStatus = () => {
    const todayEntries = getTodayEntries()
    if (todayEntries.length === 0) return 'empty'
    return todayEntries.every(entry => entry.estValide) ? 'validated' : 'pending'
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-4">
      <div className="max-w-2xl mx-auto space-y-4">
        {/* En-tête */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl shadow text-white">
          <div className="p-4 flex items-center gap-2">
            <button 
              onClick={() => router.back()} 
              className="inline-flex items-center text-white/90 hover:text-white"
            >
              <ArrowLeftIcon className="h-5 w-5 mr-1"/>
              {t('back')}
            </button>
            <div className="flex items-center ml-auto gap-2">
              <CalendarDaysIcon className="h-5 w-5 text-white/90"/>
              <span className="font-medium">Mon Journal</span>
              <select 
                value={lang} 
                onChange={(e) => setLang(e.target.value as 'fr'|'en'|'pt'|'ro')} 
                className="ml-2 bg-white/90 text-gray-900 border-0 rounded px-2 py-1 text-sm"
              >
                <option value="fr">FR</option>
                <option value="en">EN</option>
                <option value="pt">PT</option>
                <option value="ro">RO</option>
              </select>
            </div>
          </div>
        </div>

        {/* Statut du jour */}
        <div className="bg-white rounded-xl p-4 shadow">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">Aujourd'hui - {new Date().toLocaleDateString('fr-FR')}</h3>
              <p className="text-sm text-gray-600">
                {getTodayStatus() === 'empty' && 'Aucune activité enregistrée'}
                {getTodayStatus() === 'pending' && 'Journée en cours'}
                {getTodayStatus() === 'validated' && 'Journée validée ✅'}
              </p>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <PlusIcon className="h-5 w-5 mr-2"/>
              Nouvelle activité
            </button>
          </div>
        </div>

        {/* Liste des entrées */}
        {loading ? (
          <div className="bg-white rounded-xl p-4 shadow text-center">
            Chargement...
          </div>
        ) : journalEntries.length === 0 ? (
          <div className="bg-white rounded-xl p-6 shadow text-center text-gray-500">
            Aucune entrée dans le journal
          </div>
        ) : (
          <div className="space-y-3">
            {journalEntries.map((entry) => (
              <div key={entry.id} className="bg-white rounded-xl p-4 shadow border border-gray-100">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* En-tête avec date et heures */}
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                      <span>{new Date(entry.date).toLocaleDateString('fr-FR')}</span>
                      <span>•</span>
                      <span>{entry.heureDebut} - {entry.heureFin}</span>
                      {entry.estValide && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-700">
                          ✅ Validé
                        </span>
                      )}
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
                    <p className="text-gray-900 text-sm mb-2">{entry.description}</p>

                    {/* Photos */}
                    {entry.photos && entry.photos.length > 0 && (
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <span>📷 {entry.photos.length} photo{entry.photos.length > 1 ? 's' : ''}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 ml-4">
                    {canModify(entry) && (
                      <>
                        {!entry.estValide ? (
                          <button
                            onClick={() => handleValider(entry.id)}
                            className="p-2 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors"
                            title="Valider cette entrée"
                          >
                            <CheckIcon className="h-4 w-4"/>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleDevalider(entry.id)}
                            className="p-2 text-orange-600 hover:text-orange-700 hover:bg-orange-50 rounded-lg transition-colors"
                            title="Dévalider cette entrée"
                          >
                            <XMarkIcon className="h-4 w-4"/>
                          </button>
                        )}
                        
                        <button
                          onClick={() => setEditingEntry(entry)}
                          className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Modifier cette entrée"
                        >
                          <PencilIcon className="h-4 w-4"/>
                        </button>
                        
                        <button
                          onClick={() => handleDelete(entry.id)}
                          className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                          title="Supprimer cette entrée"
                        >
                          <TrashIcon className="h-4 w-4"/>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Formulaire d'ajout/modification */}
        {(showForm || editingEntry) && (
          <JournalForm
            entry={editingEntry}
            chantiers={chantiers}
            actorId={actorId}
            onClose={() => {
              setShowForm(false)
              setEditingEntry(null)
            }}
            onSave={() => {
              loadJournal()
              setShowForm(false)
              setEditingEntry(null)
            }}
          />
        )}
      </div>
    </div>
  )
}

// Composant formulaire
function JournalForm({ 
  entry, 
  chantiers, 
  actorId,
  onClose, 
  onSave 
}: { 
  entry: JournalEntry | null
  chantiers: Chantier[]
  actorId: string
  onClose: () => void
  onSave: () => void
}) {
  const [formData, setFormData] = useState({
    date: entry?.date || new Date().toISOString().split('T')[0],
    heureDebut: entry?.heureDebut || '',
    heureFin: entry?.heureFin || '',
    chantierId: entry?.chantierId || '',
    lieuLibre: entry?.lieuLibre || '',
    description: entry?.description || ''
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const url = entry 
        ? `/api/journal/ouvrier/${entry.id}`
        : '/api/journal/ouvrier'
      
      const method = entry ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ouvrierId: actorId, // Utilise l'ID de l'acteur depuis l'URL
          ...formData
        })
      })

      if (response.ok) {
        onSave()
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4">
          {entry ? 'Modifier l\'entrée' : 'Nouvelle activité'}
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Heure début</label>
              <input
                type="time"
                value={formData.heureDebut}
                onChange={(e) => setFormData({ ...formData, heureDebut: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Heure fin</label>
              <input
                type="time"
                value={formData.heureFin}
                onChange={(e) => setFormData({ ...formData, heureFin: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Lieu de travail</label>
            <select
              value={formData.chantierId || 'libre'}
              onChange={(e) => {
                if (e.target.value === 'libre') {
                  setFormData({ ...formData, chantierId: '', lieuLibre: '' })
                } else {
                  setFormData({ ...formData, chantierId: e.target.value, lieuLibre: '' })
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Sélectionner un chantier</option>
              <option value="libre">🏢 Chantier libre / Déplacement</option>
              {Array.isArray(chantiers) && chantiers.map((chantier) => (
                <option key={chantier.chantierId} value={chantier.chantierId}>
                  🏗️ {chantier.nomChantier} ({chantier.chantierId})
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
                placeholder="Déplacement, formation, bureau, etc."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Décrivez ce que vous avez fait..."
              required
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Sauvegarde...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Page(props: { params: Promise<{ type: 'ouvrier'|'soustraitant'; actorId: string }> }) {
  const p = React.use(props.params)
  return (
    <PortalI18nProvider>
      <InnerPage params={p} />
    </PortalI18nProvider>
  )
}
