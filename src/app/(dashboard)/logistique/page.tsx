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
  PencilSquareIcon,
  ChatBubbleLeftEllipsisIcon,
  PhotoIcon,
  XMarkIcon
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
  commentaire: string | null
  dateValidation: string | null
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
  const [filterStatut, setFilterStatut] = useState('A_FAIRE')
  const fileInputRef = useRef<HTMLInputElement>(null)
  // Gestion PIN magasinier inline
  const [pinState, setPinState] = useState<Record<string, {pin: string; visible: boolean; loading: boolean; saving: boolean; loaded: boolean}>>({})
  const [editMagId, setEditMagId] = useState<string | null>(null)
  const [editMagNom, setEditMagNom] = useState('')
  const [savingMagNom, setSavingMagNom] = useState(false)
  // Édition de tâche
  const [editTache, setEditTache] = useState<Tache | null>(null)
  const [editTitre, setEditTitre] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [editDate, setEditDate] = useState('')
  const [editMagasinierId, setEditMagasinierId] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)

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

  // Pré-sélectionner le magasinier s'il n'y en a qu'un
  useEffect(() => {
    if (magasiniers.length === 1 && !newTacheMagasinierId) {
      setNewTacheMagasinierId(magasiniers[0].id)
    }
  }, [magasiniers, newTacheMagasinierId])

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

  const handleOpenEdit = (tache: Tache) => {
    setEditTache(tache)
    setEditTitre(tache.titre)
    setEditDesc(tache.description || '')
    setEditDate(new Date(tache.dateExecution).toISOString().slice(0, 10))
    setEditMagasinierId(tache.magasinier.id)
  }

  const handleSaveEdit = async () => {
    if (!editTache || !editTitre.trim()) return
    setSavingEdit(true)
    try {
      const res = await fetch(`/api/logistique/taches/${editTache.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titre: editTitre.trim(),
          description: editDesc.trim() || undefined,
          dateExecution: editDate,
          magasinierId: editMagasinierId
        })
      })
      if (res.ok) {
        setEditTache(null)
        loadData()
      } else {
        const err = await res.json()
        alert(err.error || 'Erreur')
      }
    } catch {
      alert('Erreur réseau')
    } finally {
      setSavingEdit(false)
    }
  }

  const handleDeleteTache = async (id: string) => {
    if (!confirm('Supprimer cette tâche ?')) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/logistique/taches/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setTaches((prev) => prev.filter((t) => t.id !== id))
      } else {
        alert('Erreur lors de la suppression')
      }
    } catch {
      alert('Erreur réseau')
    } finally {
      setDeletingId(null)
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
                {/* Stats */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow border border-gray-100 dark:border-gray-700 text-center">
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">{taches.length}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Total</div>
                  </div>
                  <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3 shadow border border-amber-100 dark:border-amber-800/30 text-center">
                    <div className="text-2xl font-bold text-amber-700 dark:text-amber-400">{taches.filter(t => t.statut === 'A_FAIRE').length}</div>
                    <div className="text-xs text-amber-600 dark:text-amber-500 mt-0.5">À faire</div>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-3 shadow border border-green-100 dark:border-green-800/30 text-center">
                    <div className="text-2xl font-bold text-green-700 dark:text-green-400">{taches.filter(t => t.statut === 'VALIDEE').length}</div>
                    <div className="text-xs text-green-600 dark:text-green-500 mt-0.5">Validées</div>
                  </div>
                </div>

                {/* Filtres */}
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

                {/* Liste */}
                <div className="space-y-3">
                  {taches.map((t) => {
                    const photosAFaire = t.photos?.filter(p => p.type === 'A_FAIRE') ?? []
                    const photosPreuve = t.photos?.filter(p => p.type === 'PREUVE') ?? []
                    return (
                      <div
                        key={t.id}
                        className={`bg-white dark:bg-gray-800 rounded-xl shadow border overflow-hidden ${
                          t.statut === 'VALIDEE'
                            ? 'border-green-200 dark:border-green-800/40'
                            : 'border-gray-100 dark:border-gray-700'
                        }`}
                      >
                        <div className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-semibold text-gray-900 dark:text-white">{t.titre}</h3>
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
                              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                                {t.magasinier.nom} • {formatDate(t.dateExecution)}
                              </p>
                              {t.description && (
                                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{t.description}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <button
                                onClick={() => handleOpenEdit(t)}
                                className="p-1.5 text-gray-400 hover:text-amber-600 rounded-lg transition-colors"
                                title="Modifier"
                              >
                                <PencilSquareIcon className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteTache(t.id)}
                                disabled={deletingId === t.id}
                                className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg transition-colors disabled:opacity-50"
                                title="Supprimer"
                              >
                                {deletingId === t.id
                                  ? <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-red-600" />
                                  : <TrashIcon className="h-4 w-4" />
                                }
                              </button>
                            </div>
                          </div>

                          {/* Photos de référence (A_FAIRE) */}
                          {photosAFaire.length > 0 && (
                            <div className="mt-3">
                              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
                                <PhotoIcon className="h-3.5 w-3.5" />
                                Photos de référence
                              </p>
                              <div className="flex gap-1.5 flex-wrap">
                                {photosAFaire.map((p) => (
                                  <button
                                    key={p.id}
                                    onClick={() => setLightboxUrl(p.url)}
                                    className="relative w-14 h-14 rounded-lg overflow-hidden bg-gray-100 hover:opacity-80 transition-opacity"
                                  >
                                    <Image src={p.url} alt="" fill className="object-cover" sizes="56px" />
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Retour magasinier (si validée) */}
                          {t.statut === 'VALIDEE' && (
                            <div className="mt-3 pt-3 border-t border-green-100 dark:border-green-800/30">
                              <p className="text-xs font-medium text-green-700 dark:text-green-400 mb-1 flex items-center gap-1">
                                <CheckCircleIcon className="h-3.5 w-3.5" />
                                Validée le {t.dateValidation ? formatDate(t.dateValidation) : '—'}
                              </p>
                              {t.commentaire && (
                                <div className="flex items-start gap-1.5 mt-1">
                                  <ChatBubbleLeftEllipsisIcon className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
                                  <p className="text-sm text-gray-700 dark:text-gray-300 italic">{t.commentaire}</p>
                                </div>
                              )}
                              {photosPreuve.length > 0 && (
                                <div className="mt-2">
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
                                    <CameraIcon className="h-3.5 w-3.5" />
                                    Photos de preuve
                                  </p>
                                  <div className="flex gap-1.5 flex-wrap">
                                    {photosPreuve.map((p) => (
                                      <button
                                        key={p.id}
                                        onClick={() => setLightboxUrl(p.url)}
                                        className="relative w-14 h-14 rounded-lg overflow-hidden bg-gray-100 border-2 border-green-300 dark:border-green-700 hover:opacity-80 transition-opacity"
                                      >
                                        <Image src={p.url} alt="" fill className="object-cover" sizes="56px" />
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                  {taches.length === 0 && (
                    <div className="text-center py-16 text-gray-500 dark:text-gray-400">
                      <ArchiveBoxIcon className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p className="font-medium">Aucune tâche</p>
                      {filterStatut === 'A_FAIRE' && (
                        <p className="text-sm mt-1 opacity-70">Toutes les tâches sont validées !</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Lightbox photo */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 cursor-zoom-out"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            className="absolute top-4 right-4 p-2 text-white bg-black/40 rounded-full hover:bg-black/60 transition-colors"
            onClick={() => setLightboxUrl(null)}
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
          <div className="relative max-w-3xl max-h-[90vh] w-full h-full" onClick={e => e.stopPropagation()}>
            <Image
              src={lightboxUrl}
              alt="Photo agrandie"
              fill
              className="object-contain cursor-default"
              sizes="(max-width: 768px) 100vw, 768px"
            />
          </div>
        </div>
      )}

      {/* Modale d'édition de tâche */}
      {editTache && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg shadow-xl">
            <div className="p-5 border-b border-gray-100 dark:border-gray-700">
              <h3 className="font-bold text-lg text-gray-900 dark:text-white">Modifier la tâche</h3>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Titre *</label>
                <input
                  type="text"
                  value={editTitre}
                  onChange={(e) => setEditTitre(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-4 py-3"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-4 py-3"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date d&apos;exécution</label>
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-4 py-3"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Magasinier</label>
                  <select
                    value={editMagasinierId}
                    onChange={(e) => setEditMagasinierId(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-4 py-3"
                  >
                    {magasiniers.map((m) => (
                      <option key={m.id} value={m.id}>{m.nom}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-gray-100 dark:border-gray-700">
              <button
                onClick={() => setEditTache(null)}
                className="flex-1 py-3 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={savingEdit || !editTitre.trim()}
                className="flex-1 py-3 rounded-xl bg-amber-600 text-white font-medium disabled:opacity-50 hover:bg-amber-700 transition-colors"
              >
                {savingEdit ? 'Enregistrement...' : 'Sauvegarder'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
