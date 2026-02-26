'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeftIcon,
  PlusIcon,
  CheckIcon,
  XMarkIcon,
  PencilIcon,
  TrashIcon,
  CalendarDaysIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ClipboardDocumentListIcon,
  ClockIcon,
} from '@heroicons/react/24/outline'
import { usePortalI18n } from '../../i18n'

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
  chantier?: { chantierId: string; nomChantier: string }
}

type Chantier = {
  chantierId: string
  nomChantier: string
}

function MonthGroup({
  monthLabel,
  entries,
  canModify,
  handleValider,
  handleDevalider,
  setEditingEntry,
  handleDelete,
  isCurrentMonth = false,
  t,
  locale,
}: {
  monthLabel: string
  entries: JournalEntry[]
  canModify: (entry: JournalEntry) => boolean
  handleValider: (id: string) => void
  handleDevalider: (id: string) => void
  setEditingEntry: (entry: JournalEntry) => void
  handleDelete: (id: string) => void
  isCurrentMonth?: boolean
  t: (key: string) => string
  locale: string
}) {
  const [isExpanded, setIsExpanded] = useState(isCurrentMonth)

  return (
    <div className="bg-white rounded-xl shadow border border-gray-100">
      <div
        className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isExpanded ? (
              <ChevronDownIcon className="h-5 w-5 text-gray-500" />
            ) : (
              <ChevronRightIcon className="h-5 w-5 text-gray-500" />
            )}
            <h3 className="text-lg font-semibold text-gray-900">{monthLabel}</h3>
            <span className="text-sm text-gray-500">
              ({entries.length} {entries.length === 1 ? t('activity') : t('activities')})
            </span>
          </div>
        </div>
      </div>
      {isExpanded && (
        <div className="border-t border-gray-100">
          <div className="space-y-3 p-4">
            {entries.map((entry) => (
              <div key={entry.id} className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                      <span>{new Date(entry.date).toLocaleDateString(locale)}</span>
                      <span>•</span>
                      <span>
                        {entry.heureDebut} - {entry.heureFin}
                      </span>
                      {entry.estValide && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-700">
                          ✅ {t('validated')}
                        </span>
                      )}
                    </div>
                    <div className="mb-2">
                      {entry.chantier ? (
                        <div className="flex items-center gap-1 text-sm text-gray-700 bg-white px-2 py-1 rounded-md">
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
                    <p className="text-gray-900 text-sm mb-2">{entry.description}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    {canModify(entry) && (
                      <>
                        {!entry.estValide ? (
                          <button
                            onClick={() => handleValider(entry.id)}
                            className="p-2 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors"
                            title={t('validate_entry')}
                          >
                            <CheckIcon className="h-4 w-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleDevalider(entry.id)}
                            className="p-2 text-orange-600 hover:text-orange-700 hover:bg-orange-50 rounded-lg transition-colors"
                            title={t('unvalidate_entry')}
                          >
                            <XMarkIcon className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => setEditingEntry(entry)}
                          className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                          title={t('edit_entry')}
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(entry.id)}
                          className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                          title={t('delete_entry')}
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function JournalForm({
  entry,
  chantiers,
  actorId,
  onClose,
  onSave,
}: {
  entry: JournalEntry | null
  chantiers: Chantier[]
  actorId: string
  onClose: () => void
  onSave: () => void
}) {
  const { t } = usePortalI18n()
  const [formError, setFormError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    date: entry?.date || new Date().toISOString().split('T')[0],
    heureDebut: entry?.heureDebut || '08:00',
    heureFin: entry?.heureFin || '17:00',
    chantierId: entry?.chantierId || '',
    lieuLibre: entry?.lieuLibre || '',
    description: entry?.description || '',
  })
  const [journeeEntiere, setJourneeEntiere] = useState(true)
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.chantierId && !formData.lieuLibre?.trim()) {
      setFormError(`⚠️ ${t('error_chantier_required')}`)
      return
    }

    if (!formData.description?.trim()) {
      setFormError(`⚠️ ${t('error_description_required')}`)
      return
    }

    setFormError(null)
    setSaving(true)

    try {
      const url = entry ? `/api/journal/ouvrier/${entry.id}` : '/api/journal/ouvrier'
      const method = entry ? 'PUT' : 'POST'
      const payload = {
        ouvrierId: actorId,
        ...formData,
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include',
      })

      if (response.ok) {
        setFormError(null)
        onSave()
      } else {
        const errorData = await response.json()
        let errorMessage = t('error_save')
        if (errorData.error === 'Chantier ou lieu libre requis') {
          errorMessage = `⚠️ ${t('error_chantier_required')}`
        } else if (errorData.error === 'Données manquantes') {
          errorMessage = `⚠️ ${t('error_fill_required')}`
        } else {
          errorMessage = `❌ ${errorData.error || t('error_unknown')}`
        }
        setFormError(errorMessage)
      }
    } catch (error) {
      setFormError(`❌ ${t('error_connection')}: ${error}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4">
          {entry ? t('modal_edit_entry') : t('modal_new_activity')}
        </h3>

        {formError && (
          <div className="mb-3 rounded-lg bg-red-50 text-red-700 px-3 py-2 text-sm border border-red-200">
            {formError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('date')}</label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="flex items-center gap-2 mb-3">
            <input
              type="checkbox"
              id="journeeEntiere"
              checked={journeeEntiere}
              onChange={(e) => {
                setJourneeEntiere(e.target.checked)
                if (e.target.checked) {
                  setFormData({ ...formData, heureDebut: '08:00', heureFin: '17:00' })
                }
              }}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="journeeEntiere" className="text-sm font-medium text-gray-700">
              ☀️ {t('full_day_label')}
            </label>
          </div>

          {!journeeEntiere && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('start_time')}</label>
                <input
                  type="time"
                  value={formData.heureDebut}
                  onChange={(e) => setFormData({ ...formData, heureDebut: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('end_time')}</label>
                <input
                  type="time"
                  value={formData.heureFin}
                  onChange={(e) => setFormData({ ...formData, heureFin: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('work_place')}</label>
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
              <option value="">{t('select_site')}</option>
              <option value="libre">🏢 {t('free_site')}</option>
              {chantiers.map((chantier) => (
                <option key={chantier.chantierId} value={chantier.chantierId}>
                  🏗️ {chantier.nomChantier} ({chantier.chantierId})
                </option>
              ))}
            </select>
          </div>

          {(!formData.chantierId || formData.chantierId === '') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('free_place')}</label>
              <input
                type="text"
                value={formData.lieuLibre}
                onChange={(e) => setFormData({ ...formData, lieuLibre: e.target.value })}
                placeholder={t('free_place_placeholder')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('description')}</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={t('description_placeholder_journal')}
              required
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? t('saving') : t('save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function MagasinierJournalPage() {
  const router = useRouter()
  const { t } = usePortalI18n()
  const [magasinierId, setMagasinierId] = useState<string | null>(null)
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([])
  const [chantiers, setChantiers] = useState<Chantier[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null)

  const loadJournal = useCallback(async () => {
    if (!magasinierId) return
    try {
      const response = await fetch(`/api/journal/ouvrier?ouvrierId=${magasinierId}`, {
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        setJournalEntries(data)
      }
    } catch (error) {
      console.error('Erreur lors du chargement du journal:', error)
    } finally {
      setLoading(false)
    }
  }, [magasinierId])

  useEffect(() => {
    const load = async () => {
      try {
        const meRes = await fetch('/api/public/portail/magasinier/me', { credentials: 'include' })
        if (!meRes.ok) {
          router.replace('/public/portail/magasinier')
          return
        }
        const meData = await meRes.json()
        setMagasinierId(meData?.magasinier?.id ?? null)

        const chantiersRes = await fetch('/api/chantiers?pageSize=100', { credentials: 'include' })
        if (chantiersRes.ok) {
          const data = await chantiersRes.json()
          const list = Array.isArray(data) ? data : data?.chantiers ?? []
          setChantiers(list)
        }
      } catch {
        router.replace('/public/portail/magasinier')
      }
    }
    load()
  }, [router])

  useEffect(() => {
    if (magasinierId) {
      setLoading(true)
      loadJournal()
    }
  }, [magasinierId, loadJournal])

  const handleValider = async (entryId: string) => {
    try {
      const res = await fetch(`/api/journal/ouvrier/${entryId}/valider`, {
        method: 'POST',
        credentials: 'include',
      })
      if (res.ok) loadJournal()
    } catch (error) {
      console.error('Erreur validation:', error)
    }
  }

  const handleDevalider = async (entryId: string) => {
    try {
      const res = await fetch(`/api/journal/ouvrier/${entryId}/devalider`, {
        method: 'POST',
        credentials: 'include',
      })
      if (res.ok) loadJournal()
    } catch (error) {
      console.error('Erreur dévalidation:', error)
    }
  }

  const handleDelete = async (entryId: string) => {
    if (!confirm(t('confirm_delete'))) return
    try {
      const res = await fetch(`/api/journal/ouvrier/${entryId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (res.ok) loadJournal()
    } catch (error) {
      console.error('Erreur suppression:', error)
    }
  }

  const canModify = (entry: JournalEntry) => new Date() < new Date(entry.modifiableJusquA)

  const getTodayEntries = () => {
    const today = new Date().toISOString().split('T')[0]
    return journalEntries.filter((e) => e.date === today)
  }

  const getTodayStatus = () => {
    const todayEntries = getTodayEntries()
    if (todayEntries.length === 0) return 'empty'
    return todayEntries.every((e) => e.estValide) ? 'validated' : 'pending'
  }

  const handleLogout = () => {
    fetch('/api/public/portail/logout', { method: 'POST' })
    router.replace('/public/portail/magasinier')
  }

  const locale = 'fr-FR'

  if (!magasinierId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-4 pb-24">
      <div className="max-w-md mx-auto space-y-4">
        <header className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl shadow text-white">
          <div className="p-4 flex items-center justify-between">
            <button
              onClick={() => router.push('/public/portail/magasinier/taches')}
              className="inline-flex items-center text-white/90 hover:text-white"
            >
              <ArrowLeftIcon className="h-5 w-5 mr-1" />
              {t('back')}
            </button>
            <div className="flex items-center gap-2">
              <CalendarDaysIcon className="h-5 w-5 text-white/90" />
              <span className="font-medium">{t('my_journal')}</span>
            </div>
            <button onClick={handleLogout} className="p-2 text-white/90 hover:text-white">
              {t('logout')}
            </button>
          </div>
        </header>

        <nav className="flex border-b border-gray-200 bg-white shadow-sm rounded-xl overflow-x-auto">
          <button
            onClick={() => router.push('/public/portail/magasinier/taches')}
            className="flex-1 min-w-0 py-3 px-2 font-medium text-gray-600 hover:text-blue-600 flex items-center justify-center gap-1"
          >
            <ClipboardDocumentListIcon className="h-5 w-5 flex-shrink-0" />
            <span>Tâches</span>
          </button>
          <button
            onClick={() => router.push('/public/portail/magasinier/historique')}
            className="flex-1 min-w-0 py-3 px-2 font-medium text-gray-600 hover:text-blue-600 flex items-center justify-center gap-1"
          >
            <ClockIcon className="h-5 w-5 flex-shrink-0" />
            <span>Historique</span>
          </button>
          <button
            onClick={() => router.push('/public/portail/magasinier/journal')}
            className="flex-1 min-w-0 py-3 px-2 font-medium text-blue-700 border-b-2 border-blue-600 bg-blue-50 flex items-center justify-center gap-1"
          >
            <CalendarDaysIcon className="h-5 w-5 flex-shrink-0" />
            <span>Journal</span>
          </button>
        </nav>

        <div className="bg-white rounded-xl p-4 shadow">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">
                {t('today')} - {new Date().toLocaleDateString(locale)}
              </h3>
              <p className="text-sm text-gray-600">
                {getTodayStatus() === 'empty' && t('no_activity_today')}
                {getTodayStatus() === 'pending' && t('day_in_progress')}
                {getTodayStatus() === 'validated' && t('day_validated')}
              </p>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              {t('new_activity')}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-xl p-4 shadow text-center">
            {t('loading')}
          </div>
        ) : journalEntries.length === 0 ? (
          <div className="bg-white rounded-xl p-6 shadow text-center text-gray-500">
            {t('no_activity_today')}
          </div>
        ) : (
          <div className="space-y-4">
            {(() => {
              const now = new Date()
              const currentMonthKey = now.toISOString().slice(0, 7)
              const months = []

              for (let i = 0; i < 6; i++) {
                const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
                const monthKey = monthDate.toISOString().slice(0, 7)
                const monthLabel = monthDate.toLocaleDateString(locale, { month: 'long', year: 'numeric' })
                const monthEntries = journalEntries
                  .filter((e) => e.date.startsWith(monthKey))
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

                if (monthEntries.length > 0) {
                  months.push({
                    monthKey,
                    monthLabel,
                    entries: monthEntries,
                    isCurrentMonth: monthKey === currentMonthKey,
                  })
                }
              }

              return months.map(({ monthKey, monthLabel, entries, isCurrentMonth }) => (
                <MonthGroup
                  key={monthKey}
                  monthLabel={monthLabel}
                  entries={entries}
                  canModify={canModify}
                  handleValider={handleValider}
                  handleDevalider={handleDevalider}
                  setEditingEntry={setEditingEntry}
                  handleDelete={handleDelete}
                  isCurrentMonth={isCurrentMonth}
                  t={t}
                  locale={locale}
                />
              ))
            })()}
          </div>
        )}

        {(showForm || editingEntry) && (
          <JournalForm
            entry={editingEntry}
            chantiers={chantiers}
            actorId={magasinierId}
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
