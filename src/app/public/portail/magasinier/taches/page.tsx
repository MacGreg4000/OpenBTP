'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeftIcon,
  ClipboardDocumentListIcon,
  ClockIcon,
  CheckCircleIcon,
  CameraIcon,
  CalendarDaysIcon,
  XMarkIcon,
  MapPinIcon,
  PrinterIcon,
} from '@heroicons/react/24/outline'
import { usePortalI18n } from '../../i18n'
import Image from 'next/image'
import Link from 'next/link'

interface Tache {
  id: string
  titre: string
  description: string | null
  dateExecution: string
  statut: string
  photos: { id: string; url: string; type: string }[]
}

interface LigneBonPrep {
  description: string
  quantite: number | string
  unite: string
}

interface BonPreparation {
  id: string
  client: string
  localisation: string | null
  lignes: LigneBonPrep[]
  createdAt: string
}

export default function MagasinierTachesPage() {
  const router = useRouter()
  const { t } = usePortalI18n()
  const [me, setMe] = useState<{ magasinier: { id: string; nom: string }; tachesAFaire: number } | null>(null)
  const [taches, setTaches] = useState<Tache[]>([])
  const [loading, setLoading] = useState(true)
  const [validatingId, setValidatingId] = useState<string | null>(null)
  const [modalTache, setModalTache] = useState<Tache | null>(null)
  const [modalPhotos, setModalPhotos] = useState<File[]>([])
  const [modalCommentaire, setModalCommentaire] = useState('')
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const [bonsPreparation, setBonsPreparation] = useState<BonPreparation[]>([])
  const [terminantBonId, setTerminantBonId] = useState<string | null>(null)
  const [printBon, setPrintBon] = useState<BonPreparation | null>(null)

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

        const today = new Date()
        const dateStr = today.toISOString().slice(0, 10)
        const [tRes, bRes] = await Promise.all([
          fetch(`/api/public/portail/magasinier/taches?vue=a_faire&date=${dateStr}&jours=14`, { credentials: 'include' }),
          fetch('/api/public/portail/magasinier/bons-preparation', { credentials: 'include' }),
        ])
        if (tRes.ok) {
          const data = await tRes.json()
          setTaches(data.taches || [])
        }
        if (bRes.ok) setBonsPreparation(await bRes.json())
      } catch {
        router.replace('/public/portail/magasinier')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [router])

  const handleTerminerBon = async (bonId: string) => {
    setTerminantBonId(bonId)
    try {
      const res = await fetch(`/api/public/portail/magasinier/bons-preparation/${bonId}/terminer`, {
        method: 'POST',
        credentials: 'include',
      })
      if (res.ok) {
        setBonsPreparation(prev => prev.filter(b => b.id !== bonId))
        setPrintBon(null)
      }
    } catch {
      alert('Erreur')
    } finally {
      setTerminantBonId(null)
    }
  }

  const handleLogout = () => {
    fetch('/api/public/portail/logout', { method: 'POST' })
    router.replace('/public/portail/magasinier')
  }

  const today = new Date()
  const locale = 'fr-FR'
  const localDateKey = (d: Date) => {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${dd}`
  }
  const weekdayOf = (d: Date) => d.toLocaleDateString(locale, { weekday: 'long' })
  const monthYearOf = (d: Date) => d.toLocaleDateString(locale, { month: 'long', year: 'numeric' })

  // Regrouper les tâches par jour.
  // Les tâches dont la dateExecution est dans le passé sont remontées à aujourd'hui.
  const groupsMap = useMemo(() => {
    const todayKey = localDateKey(today)
    const map = new Map<string, Tache[]>()
    taches.forEach((t) => {
      const exec = new Date(t.dateExecution)
      const key = localDateKey(exec)
      // Si la date est passée (avant aujourd'hui), on regroupe sous aujourd'hui
      const effectiveKey = key < todayKey ? todayKey : key
      const arr = map.get(effectiveKey) || []
      arr.push(t)
      map.set(effectiveKey, arr)
    })
    for (const [, arr] of map.entries()) {
      arr.sort((a, b) => new Date(a.dateExecution).getTime() - new Date(b.dateExecution).getTime())
    }
    return map
  }, [taches])

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <header className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-lg">
        <div className="p-4 flex items-center justify-between">
          <button onClick={handleLogout} className="inline-flex items-center text-white/90 hover:text-white">
            <ArrowLeftIcon className="h-5 w-5 mr-1" />
            {t('logout')}
          </button>
          <div className="text-center flex-1">
            <div className="font-semibold">{me?.magasinier?.nom || ''}</div>
            <div className="text-sm text-white/80">
              {me?.tachesAFaire ?? 0} tâche(s) à faire
            </div>
          </div>
          <Link
            href="/public/portail/magasinier/journal"
            className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium flex items-center gap-1"
          >
            <CalendarDaysIcon className="h-4 w-4" />
            Journal
          </Link>
        </div>
      </header>

      <nav className="flex border-b border-gray-200 bg-white shadow-sm overflow-x-auto">
        <button
          onClick={() => router.push('/public/portail/magasinier/taches')}
          className="flex-1 min-w-0 py-3 px-2 font-medium text-blue-700 border-b-2 border-blue-600 text-sm flex items-center justify-center gap-1"
        >
          <ClipboardDocumentListIcon className="h-5 w-5 flex-shrink-0" />
          <span>Tâches</span>
        </button>
        <button
          onClick={() => router.push('/public/portail/magasinier/historique')}
          className="flex-1 min-w-0 py-3 px-2 font-medium text-gray-600 hover:text-blue-600 transition-colors text-sm flex items-center justify-center gap-1"
        >
          <ClockIcon className="h-5 w-5 flex-shrink-0" />
          <span>Historique</span>
        </button>
      </nav>

      <div className="p-4 max-w-lg mx-auto">
        {/* Bons de préparation */}
        {bonsPreparation.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <ClipboardDocumentListIcon className="h-5 w-5 text-orange-500" />
              <h2 className="font-bold text-gray-900">Commandes à préparer ({bonsPreparation.length})</h2>
            </div>
            <div className="space-y-3">
              {bonsPreparation.map(bon => (
                <div key={bon.id} className="bg-orange-50 border-2 border-orange-200 rounded-xl p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <p className="font-bold text-gray-900 text-base">{bon.client}</p>
                      {bon.localisation && (
                        <p className="text-sm text-orange-700 flex items-center gap-1 mt-0.5">
                          <MapPinIcon className="h-4 w-4" />{bon.localisation}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={async () => {
                        try {
                          const res = await fetch(`/api/public/portail/magasinier/bons-preparation/${bon.id}/pdf`, {
                            credentials: 'include',
                          })
                          if (!res.ok) {
                            alert('Erreur lors de la génération du PDF')
                            return
                          }
                          const blob = await res.blob()
                          const url = URL.createObjectURL(blob)
                          const win = window.open(url, '_blank')
                          if (!win) {
                            const a = document.createElement('a')
                            a.href = url
                            a.download = `bon-preparation-${bon.id.slice(0, 8)}.pdf`
                            a.click()
                          }
                        } catch {
                          alert('Erreur réseau lors de la génération du PDF')
                        }
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-orange-300 text-orange-700 rounded-lg text-sm font-medium hover:bg-orange-50 transition-colors"
                    >
                      <PrinterIcon className="h-4 w-4" />
                      Imprimer
                    </button>
                  </div>
                  <ul className="space-y-1.5 mb-3">
                    {(bon.lignes as LigneBonPrep[]).map((l, i) => (
                      <li key={i} className="flex items-baseline justify-between text-sm text-gray-700 bg-white rounded-lg px-3 py-2">
                        <span className="flex-1">{l.description}</span>
                        <span className="ml-3 font-bold text-gray-900 whitespace-nowrap">{l.quantite} {l.unite}</span>
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => handleTerminerBon(bon.id)}
                    disabled={terminantBonId === bon.id}
                    className="w-full py-2.5 bg-green-600 text-white rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-green-700 disabled:opacity-50 transition-colors"
                  >
                    {terminantBonId === bon.id
                      ? <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-white" />
                      : <CheckCircleIcon className="h-5 w-5" />
                    }
                    Commande préparée
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-4">
          {Array.from({ length: 14 }).map((_, idx) => {
            const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + idx)
            const key = localDateKey(d)
            const dayTasks = groupsMap.get(key) || []
            const isTodayDate =
              d.getDate() === today.getDate() &&
              d.getMonth() === today.getMonth() &&
              d.getFullYear() === today.getFullYear()
            return (
              <div key={key} className="flex items-stretch gap-3">
                {/* Colonne gauche: carte calendrier */}
                <div className="flex-shrink-0 bg-white rounded-2xl shadow border border-gray-100 overflow-hidden">
                  <div
                    className={`px-3 py-2 text-center text-[10px] uppercase tracking-wide text-white ${
                      isTodayDate ? 'bg-blue-600' : 'bg-blue-400'
                    }`}
                  >
                    {weekdayOf(d)}
                  </div>
                  <div className="px-4 py-2 text-center">
                    <div className="text-4xl font-bold text-gray-900 leading-none">{d.getDate()}</div>
                    <div className="text-[11px] text-gray-500 -mt-0.5">{monthYearOf(d)}</div>
                    {isTodayDate && (
                      <div className="text-[10px] font-medium text-blue-600 mt-0.5">Aujourd&apos;hui</div>
                    )}
                  </div>
                </div>
                {/* Colonne droite: tâches du jour */}
                <div className="flex-1 space-y-2">
                  {dayTasks.length === 0 ? (
                    <div className="bg-white rounded-xl p-4 shadow border border-gray-100 text-gray-400 text-sm min-h-[80px] flex items-center justify-center">
                      —
                    </div>
                  ) : (
                    dayTasks.map((t) => (
                      <div
                        key={t.id}
                        className="bg-white rounded-xl p-4 shadow border border-gray-100"
                      >
                        <h3 className="font-semibold text-gray-900">{t.titre}</h3>
                        {t.description && (
                          <p className="text-sm text-gray-600 mt-1">{t.description}</p>
                        )}
                        {t.photos?.length > 0 && (
                          <div className="flex gap-1 mt-2 overflow-x-auto">
                            {t.photos.map((p) => (
                              <button
                                key={p.id}
                                onClick={() => setLightboxUrl(p.url)}
                                className="relative w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 hover:opacity-80 active:scale-95 transition"
                              >
                                <Image src={p.url} alt="" fill className="object-cover" sizes="56px" />
                              </button>
                            ))}
                          </div>
                        )}
                        <button
                          onClick={() => handleOpenValider(t)}
                          className="mt-3 w-full py-3 bg-blue-600 text-white rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-blue-700 active:scale-[0.99] transition"
                        >
                          <CheckCircleIcon className="h-5 w-5" />
                          Marquer comme fait
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Lightbox photo */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            className="absolute top-4 right-4 p-2 text-white bg-black/50 rounded-full"
            onClick={() => setLightboxUrl(null)}
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
          <div className="relative max-w-full max-h-[90vh] w-full h-full" onClick={e => e.stopPropagation()}>
            <Image
              src={lightboxUrl}
              alt="Photo agrandie"
              fill
              className="object-contain"
              sizes="100vw"
            />
          </div>
          <p className="absolute bottom-4 text-white/60 text-sm">Appuyer pour fermer</p>
        </div>
      )}

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
                  multiple
                  onChange={addPhoto}
                  className="hidden"
                  id="mag-photo-input"
                />
                <label
                  htmlFor="mag-photo-input"
                  className="flex items-center justify-center gap-2 w-full py-3 border-2 border-dashed border-blue-300 rounded-lg text-blue-700 cursor-pointer hover:bg-blue-50 transition-colors"
                >
                  <CameraIcon className="h-5 w-5" />
                  {modalPhotos.length > 0 ? `${modalPhotos.length} photo(s)` : 'Photo (appareil ou bibliothèque)'}
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
                  className="flex-1 py-3 rounded-lg bg-blue-600 text-white font-medium disabled:opacity-60 hover:bg-blue-700 transition-colors"
                >
                  {validatingId === modalTache.id ? '...' : 'Valider'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal impression bon de préparation */}
      {printBon && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
          {/* Zone imprimable */}
          <style>{`
            @media print {
              body > * { display: none !important; }
              #print-bon-prep { display: block !important; position: fixed; inset: 0; padding: 20px; background: white; z-index: 99999; }
              #print-bon-prep * { color: black !important; background: white !important; }
              #print-bon-prep table { border-collapse: collapse; width: 100%; }
              #print-bon-prep td, #print-bon-prep th { border: 1px solid #333; padding: 8px; }
              #print-bon-prep .no-print { display: none !important; }
            }
          `}</style>
          <div id="print-bon-prep" className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            {/* En-tête modal (caché à l'impression) */}
            <div className="no-print flex items-center justify-between p-4 border-b">
              <h3 className="font-bold text-gray-900">Bon de préparation</h3>
              <button onClick={() => setPrintBon(null)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            {/* Contenu imprimable */}
            <div className="p-5">
              <div className="text-center mb-4">
                <h2 className="text-xl font-bold tracking-widest uppercase">BON DE PRÉPARATION</h2>
                <p className="text-xs text-gray-500 mt-1">À coller sur la palette</p>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="border-2 border-gray-800 rounded-lg p-3">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Client / Chantier</p>
                  <p className="font-bold text-gray-900">{printBon.client}</p>
                </div>
                <div className="border-2 border-gray-800 rounded-lg p-3">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Localisation palette</p>
                  <p className="font-bold text-gray-900">{printBon.localisation || '—'}</p>
                </div>
              </div>
              <table className="w-full text-sm border-collapse mb-4">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-400 px-2 py-2 text-left text-xs uppercase">N°</th>
                    <th className="border border-gray-400 px-2 py-2 text-left text-xs uppercase">Description</th>
                    <th className="border border-gray-400 px-2 py-2 text-center text-xs uppercase">Qté</th>
                    <th className="border border-gray-400 px-2 py-2 text-center text-xs uppercase">Unité</th>
                  </tr>
                </thead>
                <tbody>
                  {(printBon.lignes as LigneBonPrep[]).map((l, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="border border-gray-300 px-2 py-2 text-center text-gray-500">{i + 1}</td>
                      <td className="border border-gray-300 px-2 py-2">{l.description}</td>
                      <td className="border border-gray-300 px-2 py-2 text-center font-bold">{l.quantite}</td>
                      <td className="border border-gray-300 px-2 py-2 text-center text-gray-600">{l.unite}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="border border-gray-300 rounded p-3 h-16 mb-1">
                <p className="text-xs text-gray-400 uppercase tracking-wide">Remarques</p>
              </div>
              <p className="text-xs text-gray-400 text-right mt-1">
                {new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date())}
              </p>
            </div>
            {/* Boutons (cachés à l'impression) */}
            <div className="no-print flex gap-3 p-4 border-t">
              <button
                onClick={() => window.print()}
                className="flex-1 py-3 bg-orange-500 text-white rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-orange-600 transition-colors"
              >
                <PrinterIcon className="h-5 w-5" /> Imprimer
              </button>
              <button
                onClick={() => handleTerminerBon(printBon.id)}
                disabled={terminantBonId === printBon.id}
                className="flex-1 py-3 bg-green-600 text-white rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                <CheckCircleIcon className="h-5 w-5" /> Terminé
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
