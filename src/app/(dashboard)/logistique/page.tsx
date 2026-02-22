'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import {
  ArchiveBoxIcon,
  PlusIcon,
  UserGroupIcon,
  CheckCircleIcon,
  ClockIcon,
  CameraIcon,
  CalendarIcon,
  ListBulletIcon,
  TrashIcon,
  LockClosedIcon,
  ChevronDownIcon,
  KeyIcon,
  EyeIcon,
  EyeSlashIcon,
  PencilSquareIcon
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
  // Gestion PIN magasinier inline
  const [pinState, setPinState] = useState<Record<string, {pin: string; visible: boolean; loading: boolean; saving: boolean; loaded: boolean}>>({})
  const [editMagId, setEditMagId] = useState<string | null>(null)
  const [editMagNom, setEditMagNom] = useState('')
  const [savingMagNom, setSavingMagNom] = useState(false)

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
      const params = new URLSearchParams()
      if (filterMagasinier) params.set('magasinierId', filterMagasinier)
      if (filterStatut) params.set('statut', filterStatut)
      const query = params.toString()
      const [mRes, tRes] = await Promise.all([
        fetch('/api/magasiniers'),
        fetch('/api/logistique/taches' + (query ? '?' + query : ''))
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

  const loadPin = async (magId: string) => {
    if (pinState[magId]?.loaded) return
    setPinState(prev => ({...prev, [magId]: {pin:'', visible:false, loading:true, saving:false, loaded:false}}))
    try {
      const res = await fetch(`/api/magasiniers/${magId}/pin`)
      const data = await res.json()
      setPinState(prev => ({...prev, [magId]: {pin: data.pin || '', visible:false, loading:false, saving:false, loaded:true}}))
    } catch {
      setPinState(prev => ({...prev, [magId]: {pin:'', visible:false, loading:false, saving:false, loaded:true}}))
    }
  }

  const savePin = async (magId: string) => {
    const ps = pinState[magId]
    if (!ps) return
    const pin = ps.pin.replace(/\D/g,'')
    if (pin.length < 4) { alert('PIN doit contenir au moins 4 chiffres'); return }
    setPinState(prev => ({...prev, [magId]: {...prev[magId], saving:true}}))
    try {
      const res = await fetch(`/api/magasiniers/${magId}/pin`, {
        method: 'PUT',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ pin })
      })
      if (res.ok) {
        setPinState(prev => ({...prev, [magId]: {...prev[magId], saving:false, pin}}))
      } else {
        const err = await res.json()
        alert(err.error || 'Erreur PIN')
        setPinState(prev => ({...prev, [magId]: {...prev[magId], saving:false}}))
      }
    } catch {
      alert('Erreur réseau')
      setPinState(prev => ({...prev, [magId]: {...prev[magId], saving:false}}))
    }
  }

  const handleSaveMagNom = async (magId: string) => {
    if (!editMagNom.trim()) return
    setSavingMagNom(true)
    try {
      const res = await fetch(`/api/magasiniers/${magId}`, {
        method: 'PATCH',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ nom: editMagNom.trim() })
      })
      if (res.ok) {
        setMagasiniers(prev => prev.map(m => m.id === magId ? {...m, nom: editMagNom.trim()} : m))
        setEditMagId(null)
      } else {
        alert('Erreur lors de la mise à jour')
      }
    } catch {
      alert('Erreur réseau')
    } finally {
      setSavingMagNom(false)
    }
  }

  const formatDate = (s: string) => new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })

  const portailUrl = typeof window !== 'undefined' ? `${window.location.origin}/public/portail/magasinier` : ''

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <PageHeader
        title="Logistique"
        subtitle="Tâches magasiniers"
        icon={ArchiveBoxIcon}
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
                  <div className="space-y-4">
                    {magasiniers.map((m) => {
                      const ps = pinState[m.id]
                      return (
                        <div key={m.id} className="rounded-xl bg-gray-50 dark:bg-gray-700/50 overflow-hidden">
                          {/* En-tête magasinier */}
                          <div className="flex items-center justify-between p-4">
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              {editMagId === m.id ? (
                                <div className="flex items-center gap-2 flex-1">
                                  <input
                                    className="flex-1 px-3 py-1.5 rounded-lg border border-amber-300 dark:border-amber-600 dark:bg-gray-700 dark:text-white text-sm"
                                    value={editMagNom}
                                    onChange={e => setEditMagNom(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') handleSaveMagNom(m.id); if (e.key === 'Escape') setEditMagId(null) }}
                                    autoFocus
                                  />
                                  <button
                                    onClick={() => handleSaveMagNom(m.id)}
                                    disabled={savingMagNom}
                                    className="px-3 py-1.5 text-xs bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50"
                                  >
                                    {savingMagNom ? '...' : 'OK'}
                                  </button>
                                  <button
                                    onClick={() => setEditMagId(null)}
                                    className="px-2 py-1.5 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                  >
                                    ✕
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <span className="font-medium text-gray-900 dark:text-white">{m.nom}</span>
                                  {m._count != null && (
                                    <span className="text-sm text-gray-500 dark:text-gray-400">{m._count.taches} tâche(s)</span>
                                  )}
                                </>
                              )}
                            </div>
                            <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                              {editMagId !== m.id && (
                                <button
                                  onClick={() => { setEditMagId(m.id); setEditMagNom(m.nom) }}
                                  className="p-1.5 text-gray-400 hover:text-amber-600 rounded transition-colors"
                                  title="Renommer"
                                >
                                  <PencilSquareIcon className="h-4 w-4" />
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  if (ps?.loaded) {
                                    setPinState(prev => {
                                      const next = {...prev}
                                      delete next[m.id]
                                      return next
                                    })
                                  } else {
                                    loadPin(m.id)
                                  }
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors"
                                title="Gérer le PIN"
                              >
                                <KeyIcon className="h-3.5 w-3.5" />
                                PIN
                              </button>
                              <a
                                href={portailUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-amber-600 dark:text-amber-400 hover:underline"
                              >
                                Portail
                              </a>
                            </div>
                          </div>

                          {/* Section PIN (visible si ouvert) */}
                          {ps && (
                            <div className="border-t border-gray-200 dark:border-gray-600 px-4 py-3 bg-amber-50/50 dark:bg-amber-900/10">
                              {ps.loading ? (
                                <p className="text-sm text-gray-500">Chargement du PIN...</p>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <KeyIcon className="h-4 w-4 text-amber-600 flex-shrink-0" />
                                  <div className="relative flex-1 max-w-xs">
                                    <input
                                      type={ps.visible ? 'text' : 'password'}
                                      inputMode="numeric"
                                      maxLength={8}
                                      value={ps.pin}
                                      onChange={e => setPinState(prev => ({...prev, [m.id]: {...prev[m.id], pin: e.target.value.replace(/\D/g,'') }}))}
                                      placeholder="4-8 chiffres"
                                      className="w-full px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm pr-8"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => setPinState(prev => ({...prev, [m.id]: {...prev[m.id], visible: !prev[m.id].visible}}))}
                                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                      {ps.visible
                                        ? <EyeSlashIcon className="h-4 w-4" />
                                        : <EyeIcon className="h-4 w-4" />
                                      }
                                    </button>
                                  </div>
                                  <button
                                    onClick={() => savePin(m.id)}
                                    disabled={ps.saving}
                                    className="px-3 py-1.5 text-xs bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 whitespace-nowrap"
                                  >
                                    {ps.saving ? '...' : 'Sauver PIN'}
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
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
