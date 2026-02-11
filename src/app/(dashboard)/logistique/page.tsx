'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import {
  TruckIcon,
  PlusIcon,
  UserGroupIcon,
  CheckCircleIcon,
  ClockIcon,
  CameraIcon,
  CalendarIcon,
  ListBulletIcon,
  TrashIcon,
  LockClosedIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline'
import { PageHeader } from '@/components/PageHeader'
import Image from 'next/image'

interface Magasinier {
  id: string
  nom: string
  actif: boolean
  _count?: { taches: number }
}

interface Tache {
  id: string
  titre: string
  description: string | null
  dateEncodage: string
  dateExecution: string
  statut: string
  magasinier: { id: string; nom: string }
  photos: { id: string; url: string; type: string }[]
}

export default function LogistiquePage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [magasiniers, setMagasiniers] = useState<Magasinier[]>([])
  const [taches, setTaches] = useState<Tache[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'consultation' | 'nouvelle' | 'magasiniers'>('consultation')
  const [newMagasinierNom, setNewMagasinierNom] = useState('')
  const [newMagasinierPin, setNewMagasinierPin] = useState('')
  const [savingMagasinier, setSavingMagasinier] = useState(false)
  const [newTacheTitre, setNewTacheTitre] = useState('')
  const [newTacheDesc, setNewTacheDesc] = useState('')
  const [newTacheDate, setNewTacheDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [newTacheMagasinierId, setNewTacheMagasinierId] = useState('')
  const [newTachePhotos, setNewTachePhotos] = useState<File[]>([])
  const [savingTache, setSavingTache] = useState(false)
  const [filterMagasinier, setFilterMagasinier] = useState('')
  const [filterStatut, setFilterStatut] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (status === 'loading') return
    if (status === 'unauthenticated') {
      router.push('/auth/login')
      return
    }
    if (session?.user?.role !== 'ADMIN' && session?.user?.role !== 'MANAGER') {
      router.push('/')
      return
    }
    loadData()
  }, [router, session, status])

  const loadData = async () => {
    try {
      setLoading(true)
      const [mRes, tRes] = await Promise.all([
        fetch('/api/magasiniers'),
        fetch('/api/logistique/taches?' + new URLSearchParams({
          ...(filterMagasinier && { magasinierId: filterMagasinier }),
          ...(filterStatut && { statut: filterStatut })
        }).toString()
      ])
      if (mRes.ok) setMagasiniers(await mRes.json())
      if (tRes.ok) setTaches(await tRes.json())
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (session?.user?.role === 'ADMIN' || session?.user?.role === 'MANAGER') {
      loadData()
    }
  }, [filterMagasinier, filterStatut])

  const handleAddMagasinier = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMagasinierNom.trim()) return
    setSavingMagasinier(true)
    try {
      const res = await fetch('/api/magasiniers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nom: newMagasinierNom.trim(), pin: newMagasinierPin || undefined })
      })
      if (res.ok) {
        setNewMagasinierNom('')
        setNewMagasinierPin('')
        loadData()
      } else {
        const err = await res.json()
        alert(err.error || 'Erreur')
      }
    } catch (e) {
      alert('Erreur')
    } finally {
      setSavingMagasinier(false)
    }
  }

  const handleAddTache = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTacheTitre.trim() || !newTacheMagasinierId) {
      alert('Titre et magasinier requis')
      return
    }
    setSavingTache(true)
    try {
      let res: Response
      if (newTachePhotos.length > 0) {
        const fd = new FormData()
        fd.append('titre', newTacheTitre.trim())
        fd.append('description', newTacheDesc.trim())
        fd.append('dateExecution', newTacheDate)
        fd.append('magasinierId', newTacheMagasinierId)
        newTachePhotos.forEach((f) => fd.append('photos', f))
        res = await fetch('/api/logistique/taches', { method: 'POST', body: fd })
      } else {
        res = await fetch('/api/logistique/taches', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            titre: newTacheTitre.trim(),
            description: newTacheDesc.trim() || undefined,
            dateExecution: newTacheDate,
            magasinierId: newTacheMagasinierId
          })
        })
      }
      if (res.ok) {
        setNewTacheTitre('')
        setNewTacheDesc('')
        setNewTacheDate(new Date().toISOString().slice(0, 10))
        setNewTachePhotos([])
        loadData()
        setActiveTab('consultation')
      } else {
        const err = await res.json()
        alert(err.error || 'Erreur')
      }
    } catch (e) {
      alert('Erreur')
    } finally {
      setSavingTache(false)
    }
  }

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files?.length) {
      setNewTachePhotos((prev) => [...prev, ...Array.from(files)])
    }
    e.target.value = ''
  }

  const formatDate = (s: string) => new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })

  const portailUrl = typeof window !== 'undefined' ? `${window.location.origin}/public/portail/magasinier` : ''

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <PageHeader
        title="Logistique"
        subtitle="Tâches magasiniers"
        icon={TruckIcon}
        badgeColor="from-amber-600 via-orange-600 to-red-600"
        gradientColor="from-amber-600/10 via-orange-600/10 to-red-600/10"
        actions={
          <a
            href={portailUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/30"
          >
            <LockClosedIcon className="h-4 w-4" />
            Portail magasinier
          </a>
        }
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          <button
            onClick={() => setActiveTab('consultation')}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl font-medium whitespace-nowrap transition-colors ${
              activeTab === 'consultation'
                ? 'bg-amber-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-amber-50 dark:hover:bg-amber-900/20'
            }`}
          >
            <ListBulletIcon className="h-5 w-5" />
            Consultation
          </button>
          <button
            onClick={() => setActiveTab('nouvelle')}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl font-medium whitespace-nowrap transition-colors ${
              activeTab === 'nouvelle'
                ? 'bg-amber-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-amber-50 dark:hover:bg-amber-900/20'
            }`}
          >
            <PlusIcon className="h-5 w-5" />
            Nouvelle tâche
          </button>
          <button
            onClick={() => setActiveTab('magasiniers')}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl font-medium whitespace-nowrap transition-colors ${
              activeTab === 'magasiniers'
                ? 'bg-amber-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-amber-50 dark:hover:bg-amber-900/20'
            }`}
          >
            <UserGroupIcon className="h-5 w-5" />
            Magasiniers
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600" />
          </div>
        ) : (
          <>
            {activeTab === 'magasiniers' && (
              <div className="space-y-6">
                <form onSubmit={handleAddMagasinier} className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
                  <h2 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Ajouter un magasinier</h2>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nom</label>
                      <input
                        type="text"
                        value={newMagasinierNom}
                        onChange={(e) => setNewMagasinierNom(e.target.value)}
                        placeholder="Nom du magasinier"
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-4 py-3"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Code PIN (optionnel, 4-8 chiffres)</label>
                      <input
                        type="password"
                        inputMode="numeric"
                        maxLength={8}
                        value={newMagasinierPin}
                        onChange={(e) => setNewMagasinierPin(e.target.value.replace(/\D/g, ''))}
                        placeholder="1234"
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-4 py-3"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={savingMagasinier || !newMagasinierNom.trim()}
                    className="mt-4 w-full sm:w-auto px-6 py-3 bg-amber-600 text-white rounded-xl font-medium disabled:opacity-50"
                  >
                    {savingMagasinier ? 'Ajout...' : 'Ajouter'}
                  </button>
                </form>
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
                  <h2 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Liste des magasiniers</h2>
                  <div className="space-y-3">
                    {magasiniers.map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-700/50"
                      >
                        <div>
                          <span className="font-medium text-gray-900 dark:text-white">{m.nom}</span>
                          {m._count != null && (
                            <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                              {m._count.taches} tâche(s)
                            </span>
                          )}
                        </div>
                        <a
                          href={`${portailUrl}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-amber-600 dark:text-amber-400 hover:underline"
                        >
                          Portail
                        </a>
                      </div>
                    ))}
                    {magasiniers.length === 0 && (
                      <p className="text-gray-500 dark:text-gray-400 py-4">Aucun magasinier</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'nouvelle' && (
              <form onSubmit={handleAddTache} className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg space-y-4">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Nouvelle tâche</h2>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Titre *</label>
                  <input
                    type="text"
                    value={newTacheTitre}
                    onChange={(e) => setNewTacheTitre(e.target.value)}
                    placeholder="Ex: Rangement étagère A3"
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-4 py-3 text-base"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description (optionnel)</label>
                  <textarea
                    value={newTacheDesc}
                    onChange={(e) => setNewTacheDesc(e.target.value)}
                    placeholder="Détails..."
                    rows={2}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-4 py-3"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date d&apos;exécution</label>
                    <input
                      type="date"
                      value={newTacheDate}
                      onChange={(e) => setNewTacheDate(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-4 py-3"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Magasinier *</label>
                    <select
                      value={newTacheMagasinierId}
                      onChange={(e) => setNewTacheMagasinierId(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-4 py-3"
                    >
                      <option value="">Choisir...</option>
                      {magasiniers.map((m) => (
                        <option key={m.id} value={m.id}>{m.nom}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Photo (optionnel)</label>
                  <div className="flex flex-wrap gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      multiple
                      onChange={handlePhotoCapture}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-amber-400 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                    >
                      <CameraIcon className="h-6 w-6" />
                      <span>Prendre une photo</span>
                    </button>
                    {newTachePhotos.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {newTachePhotos.map((f, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-sm"
                          >
                            {f.name}
                            <button
                              type="button"
                              onClick={() => setNewTachePhotos((p) => p.filter((_, j) => j !== i))}
                              className="text-amber-700 dark:text-amber-400"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={savingTache || !newTacheTitre.trim() || !newTacheMagasinierId}
                  className="w-full sm:w-auto px-8 py-4 bg-amber-600 text-white rounded-xl font-bold text-lg disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {savingTache ? 'Enregistrement...' : 'Créer la tâche'}
                  <PlusIcon className="h-5 w-5" />
                </button>
              </form>
            )}

            {activeTab === 'consultation' && (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <select
                    value={filterMagasinier}
                    onChange={(e) => setFilterMagasinier(e.target.value)}
                    className="rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2 text-sm"
                  >
                    <option value="">Tous les magasiniers</option>
                    {magasiniers.map((m) => (
                      <option key={m.id} value={m.id}>{m.nom}</option>
                    ))}
                  </select>
                  <select
                    value={filterStatut}
                    onChange={(e) => setFilterStatut(e.target.value)}
                    className="rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2 text-sm"
                  >
                    <option value="">Tous les statuts</option>
                    <option value="A_FAIRE">À faire</option>
                    <option value="VALIDEE">Validée</option>
                  </select>
                </div>
                <div className="space-y-3">
                  {taches.map((t) => (
                    <div
                      key={t.id}
                      className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow border border-gray-100 dark:border-gray-700"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-gray-900 dark:text-white">{t.titre}</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                            {t.magasinier.nom} • {formatDate(t.dateExecution)}
                          </p>
                          {t.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">{t.description}</p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                                t.statut === 'VALIDEE'
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                  : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                              }`}
                            >
                              {t.statut === 'VALIDEE' ? <CheckCircleIcon className="h-3 w-3" /> : <ClockIcon className="h-3 w-3" />}
                              {t.statut === 'VALIDEE' ? 'Validée' : 'À faire'}
                            </span>
                          </div>
                        </div>
                        {t.photos?.length > 0 && (
                          <div className="flex gap-1 flex-shrink-0">
                            {t.photos.slice(0, 3).map((p) => (
                              <div key={p.id} className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-100">
                                <Image
                                  src={p.url}
                                  alt=""
                                  fill
                                  className="object-cover"
                                  sizes="48px"
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {taches.length === 0 && (
                    <p className="text-center text-gray-500 dark:text-gray-400 py-12">Aucune tâche</p>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
