'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeftIcon,
  ClipboardDocumentListIcon,
  ClockIcon,
  CheckCircleIcon,
  CameraIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline'
import { usePortalI18n } from '../../i18n'
import Image from 'next/image'

interface Tache {
  id: string
  titre: string
  description: string | null
  dateExecution: string
  statut: string
  photos: { id: string; url: string; type: string }[]
}

export default function MagasinierTachesPage() {
  const router = useRouter()
  const { t } = usePortalI18n()
  const [me, setMe] = useState<{ magasinier: { id: string; nom: string }; tachesAFaire: number } | null>(null)
  const [taches, setTaches] = useState<Tache[]>([])
  const [dateDebut, setDateDebut] = useState<Date | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const [validatingId, setValidatingId] = useState<string | null>(null)
  const [modalTache, setModalTache] = useState<Tache | null>(null)
  const [modalPhotos, setModalPhotos] = useState<File[]>([])
  const [modalCommentaire, setModalCommentaire] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const meRes = await fetch('/api/public/portail/magasinier/me', { credentials: 'include' })
        if (!meRes.ok) {
          router.replace('/public/portail/magasinier')
          return
        }
        const meData = await meRes.json()
        setMe(meData)

        const dateStr = selectedDate.toISOString().slice(0, 10)
        const tRes = await fetch(
          `/api/public/portail/magasinier/taches?vue=a_faire&date=${dateStr}&jours=14`,
          { credentials: 'include' }
        )
        if (tRes.ok) {
          const data = await tRes.json()
          setTaches(data.taches || [])
          if (data.dateDebut) setDateDebut(new Date(data.dateDebut))
        }
      } catch {
        router.replace('/public/portail/magasinier')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [router, selectedDate])

  const handleLogout = () => {
    fetch('/api/public/portail/logout', { method: 'POST' })
    router.replace('/public/portail/magasinier')
  }

  const formatDate = (d: Date) => d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
  const isToday = (d: Date) =>
    d.getDate() === new Date().getDate() &&
    d.getMonth() === new Date().getMonth() &&
    d.getFullYear() === new Date().getFullYear()

  const changeDay = (delta: number) => {
    setSelectedDate((prev) => {
      const next = new Date(prev)
      next.setDate(next.getDate() + delta)
      return next
    })
  }

  const tachesForDay = taches.filter((t) => {
    const exec = new Date(t.dateExecution)
    return (
      exec.getDate() === selectedDate.getDate() &&
      exec.getMonth() === selectedDate.getMonth() &&
      exec.getFullYear() === selectedDate.getFullYear()
    )
  })

  const handleOpenValider = (tache: Tache) => {
    setModalTache(tache)
    setModalPhotos([])
    setModalCommentaire('')
  }

  const handleValider = async () => {
    if (!modalTache) return
    setValidatingId(modalTache.id)
    try {
      if (modalPhotos.length > 0) {
        const fd = new FormData()
        fd.append('commentaire', modalCommentaire)
        modalPhotos.forEach((f) => fd.append('photos', f))
        const res = await fetch(`/api/public/portail/magasinier/taches/${modalTache.id}/valider`, {
          method: 'POST',
          credentials: 'include',
          body: fd
        })
        if (res.ok) {
          setTaches((prev) => prev.filter((t) => t.id !== modalTache.id))
          setModalTache(null)
          if (me) setMe({ ...me, tachesAFaire: Math.max(0, me.tachesAFaire - 1) })
        } else {
          const err = await res.json()
          alert(err.error || 'Erreur')
        }
      } else {
        const res = await fetch(`/api/public/portail/magasinier/taches/${modalTache.id}/valider`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ commentaire: modalCommentaire || undefined })
        })
        if (res.ok) {
          setTaches((prev) => prev.filter((t) => t.id !== modalTache.id))
          setModalTache(null)
          if (me) setMe({ ...me, tachesAFaire: Math.max(0, me.tachesAFaire - 1) })
        } else {
          const err = await res.json()
          alert(err.error || 'Erreur')
        }
      }
    } catch {
      alert('Erreur')
    } finally {
      setValidatingId(null)
    }
  }

  const addPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files?.length) setModalPhotos((p) => [...p, ...Array.from(files)])
    e.target.value = ''
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-100">
      <header className="bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-lg">
        <div className="p-4 flex items-center justify-between">
          <button onClick={handleLogout} className="inline-flex items-center text-white/90 hover:text-white">
            <ArrowLeftIcon className="h-5 w-5 mr-1" />
            {t('logout')}
          </button>
          <div className="text-center">
            <div className="font-semibold">{me?.magasinier?.nom || ''}</div>
            <div className="text-sm text-white/80">
              {me?.tachesAFaire ?? 0} tâche(s) à faire
            </div>
          </div>
          <div className="w-16" />
        </div>
      </header>

      <nav className="flex border-b border-amber-200/50 bg-white/80">
        <button
          onClick={() => router.push('/public/portail/magasinier/taches')}
          className="flex-1 py-3 font-medium text-amber-700 border-b-2 border-amber-600"
        >
          <ClipboardDocumentListIcon className="h-5 w-5 inline mr-2" />
          Mes tâches
        </button>
        <button
          onClick={() => router.push('/public/portail/magasinier/historique')}
          className="flex-1 py-3 font-medium text-gray-600 hover:text-amber-600"
        >
          <ClockIcon className="h-5 w-5 inline mr-2" />
          Historique
        </button>
      </nav>

      <div className="p-4 max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => changeDay(-1)}
            className="p-2 rounded-full bg-white shadow hover:bg-amber-50"
          >
            <ChevronLeftIcon className="h-6 w-6 text-amber-700" />
          </button>
          <div className="text-center">
            <div className={`font-bold ${isToday(selectedDate) ? 'text-amber-700' : 'text-gray-800'}`}>
              {formatDate(selectedDate)}
            </div>
            {isToday(selectedDate) && (
              <div className="text-sm text-amber-600 font-medium">Aujourd&apos;hui</div>
            )}
          </div>
          <button
            onClick={() => changeDay(1)}
            className="p-2 rounded-full bg-white shadow hover:bg-amber-50"
          >
            <ChevronRightIcon className="h-6 w-6 text-amber-700" />
          </button>
        </div>

        <div className="space-y-3">
          {tachesForDay.map((t) => (
            <div
              key={t.id}
              className="bg-white rounded-xl p-4 shadow border border-amber-100"
            >
              <h3 className="font-semibold text-gray-900">{t.titre}</h3>
              {t.description && (
                <p className="text-sm text-gray-600 mt-1">{t.description}</p>
              )}
              {t.photos?.length > 0 && (
                <div className="flex gap-1 mt-2 overflow-x-auto">
                  {t.photos.map((p) => (
                    <div key={p.id} className="relative w-14 h-14 rounded-lg overflow-hidden flex-shrink-0">
                      <Image src={p.url} alt="" fill className="object-cover" sizes="56px" />
                    </div>
                  ))}
                </div>
              )}
              <button
                onClick={() => handleOpenValider(t)}
                className="mt-3 w-full py-3 bg-amber-600 text-white rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-amber-700"
              >
                <CheckCircleIcon className="h-5 w-5" />
                Marquer comme fait
              </button>
            </div>
          ))}
          {tachesForDay.length === 0 && (
            <div className="text-center py-12 text-gray-500 bg-white rounded-xl border border-amber-100">
              Aucune tâche pour ce jour
            </div>
          )}
        </div>
      </div>

      {modalTache && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b">
              <h3 className="font-bold text-lg">Marquer comme fait</h3>
              <p className="text-gray-600 mt-1">{modalTache.titre}</p>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Commentaire (optionnel)
                </label>
                <textarea
                  value={modalCommentaire}
                  onChange={(e) => setModalCommentaire(e.target.value)}
                  placeholder="Ajouter un commentaire..."
                  rows={2}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Photos (optionnel)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  multiple
                  onChange={addPhoto}
                  className="hidden"
                  id="mag-photo-input"
                />
                <label
                  htmlFor="mag-photo-input"
                  className="flex items-center justify-center gap-2 w-full py-3 border-2 border-dashed border-amber-300 rounded-lg text-amber-700 cursor-pointer hover:bg-amber-50"
                >
                  <CameraIcon className="h-5 w-5" />
                  {modalPhotos.length > 0 ? `${modalPhotos.length} photo(s)` : 'Prendre une photo'}
                </label>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setModalTache(null)}
                  className="flex-1 py-3 rounded-lg border border-gray-300 text-gray-700 font-medium"
                >
                  Annuler
                </button>
                <button
                  onClick={handleValider}
                  disabled={validatingId === modalTache.id}
                  className="flex-1 py-3 rounded-lg bg-amber-600 text-white font-medium disabled:opacity-60"
                >
                  {validatingId === modalTache.id ? '...' : 'Valider'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
