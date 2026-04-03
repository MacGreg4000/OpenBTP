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
  ChevronDownIcon,
  KeyIcon,
  EyeIcon,
  EyeSlashIcon,
  PencilSquareIcon,
  ChatBubbleLeftEllipsisIcon,
  PhotoIcon,
  XMarkIcon,
  FunnelIcon,
  ClipboardDocumentListIcon,
  DocumentArrowDownIcon,
  MapPinIcon,
  PrinterIcon,
} from '@heroicons/react/24/outline'
import { PageHeader } from '@/components/PageHeader'
import Image from 'next/image'

interface Magasinier {
  id: string
  nom: string
  actif: boolean
  _count?: { taches: number }
}

interface LigneBonPrep {
  description: string
  quantite: string
  unite: string
}

interface BonPreparation {
  id: string
  client: string
  localisation: string | null
  statut: string
  lignes: LigneBonPrep[]
  magasinier: { id: string; nom: string }
  createdAt: string
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
  const editFileInputRef = useRef<HTMLInputElement>(null)
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
  const [editPhotos, setEditPhotos] = useState<File[]>([])
  const [savingEdit, setSavingEdit] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  // Lightbox & modale détails
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const [viewTache, setViewTache] = useState<Tache | null>(null)
  // Bons de préparation
  const [bonsPreparation, setBonsPreparation] = useState<BonPreparation[]>([])
  const [showBonPrep, setShowBonPrep] = useState(false)
  const [bonPrepClient, setBonPrepClient] = useState('')
  const [bonPrepLocalisation, setBonPrepLocalisation] = useState('')
  const [bonPrepMagasinierId, setBonPrepMagasinierId] = useState('')
  const [bonPrepLignes, setBonPrepLignes] = useState<LigneBonPrep[]>([{ description: '', quantite: '', unite: '' }])
  const [savingBonPrep, setSavingBonPrep] = useState(false)
  const [deletingBonId, setDeletingBonId] = useState<string | null>(null)

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
      const [mRes, tRes, bRes] = await Promise.all([
        fetch('/api/magasiniers'),
        fetch('/api/logistique/taches' + (query ? '?' + query : '')),
        fetch('/api/logistique/bons-preparation?statut=A_FAIRE'),
      ])
      if (mRes.ok) setMagasiniers(await mRes.json())
      if (tRes.ok) setTaches(await tRes.json())
      if (bRes.ok) setBonsPreparation(await bRes.json())
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
    if (files?.length) setNewTachePhotos((prev) => [...prev, ...Array.from(files)])
    e.target.value = ''
  }

  const handleEditPhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files?.length) setEditPhotos((prev) => [...prev, ...Array.from(files)])
    e.target.value = ''
  }

  const loadPin = async (magId: string) => {
    if (pinState[magId]?.loaded) return
    setPinState(prev => ({...prev, [magId]: {pin:'', visible:false, loading:true, saving:false, loaded:false}}))
    try {
      const res = await fetch(`/api/magasiniers/${magId}/pin`)
      const data = await res.json()
      setPinState(prev => ({...prev, [magId]: {pin: '', visible:false, loading:false, saving:false, loaded:true}}))
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
    setEditPhotos([])
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
      if (!res.ok) {
        const err = await res.json()
        alert(err.error || 'Erreur')
        return
      }
      // Upload des photos ajoutées lors de l'édition
      if (editPhotos.length > 0) {
        const fd = new FormData()
        fd.append('type', 'A_FAIRE')
        editPhotos.forEach(f => fd.append('photos', f))
        const photoRes = await fetch(`/api/logistique/taches/${editTache.id}/photos`, { method: 'POST', body: fd })
        if (!photoRes.ok) {
          const err = await photoRes.json().catch(() => ({}))
          alert(err.error || 'Erreur lors de l\'upload des photos')
          return
        }
      }
      setEditTache(null)
      setEditPhotos([])
      loadData()
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

  const handleCreateBonPrep = async () => {
    const lignesValides = bonPrepLignes.filter(l => l.description.trim())
    if (!bonPrepClient.trim() || !bonPrepMagasinierId || lignesValides.length === 0) return
    setSavingBonPrep(true)
    try {
      const res = await fetch('/api/logistique/bons-preparation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client: bonPrepClient.trim(),
          localisation: bonPrepLocalisation.trim() || null,
          magasinierId: bonPrepMagasinierId,
          lignes: lignesValides.map(l => ({ description: l.description.trim(), quantite: parseFloat(l.quantite) || 0, unite: l.unite.trim() })),
        }),
      })
      if (res.ok) {
        const bon = await res.json()
        setShowBonPrep(false)
        setBonPrepClient('')
        setBonPrepLocalisation('')
        setBonPrepMagasinierId('')
        setBonPrepLignes([{ description: '', quantite: '', unite: '' }])
        loadData()
        setPrintBonAdmin(bon)
      } else {
        const err = await res.json()
        alert(err.error || 'Erreur lors de la création')
      }
    } catch (e) {
      console.error(e)
      alert('Erreur réseau')
    } finally {
      setSavingBonPrep(false)
    }
  }

  const handleDeleteBonPrep = async (bonId: string) => {
    if (!confirm('Supprimer ce bon de préparation ?')) return
    setDeletingBonId(bonId)
    try {
      const res = await fetch(`/api/logistique/bons-preparation/${bonId}`, { method: 'DELETE' })
      if (res.ok) loadData()
      else alert('Erreur lors de la suppression')
    } catch (e) {
      console.error(e)
    } finally {
      setDeletingBonId(null)
    }
  }

  const portailUrl = typeof window !== 'undefined' ? `${window.location.origin}/public/portail/magasinier` : ''

  const statsCards = !loading ? (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg px-3 py-2 border border-gray-200/50 dark:border-gray-700/50 shadow-md">
        <div className="flex items-center gap-2">
          <ArchiveBoxIcon className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <div>
            <div className="text-[10px] font-medium text-gray-600 dark:text-gray-400">Total</div>
            <div className="text-sm font-bold text-gray-900 dark:text-white">{taches.length}</div>
          </div>
        </div>
      </div>
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg px-3 py-2 border border-gray-200/50 dark:border-gray-700/50 shadow-md">
        <div className="flex items-center gap-2">
          <ClockIcon className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <div>
            <div className="text-[10px] font-medium text-gray-600 dark:text-gray-400">À faire</div>
            <div className="text-sm font-bold text-gray-900 dark:text-white">{taches.filter(t => t.statut === 'A_FAIRE').length}</div>
          </div>
        </div>
      </div>
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg px-3 py-2 border border-gray-200/50 dark:border-gray-700/50 shadow-md">
        <div className="flex items-center gap-2">
          <CheckCircleIcon className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <div>
            <div className="text-[10px] font-medium text-gray-600 dark:text-gray-400">Validées</div>
            <div className="text-sm font-bold text-gray-900 dark:text-white">{taches.filter(t => t.statut === 'VALIDEE').length}</div>
          </div>
        </div>
      </div>
    </div>
  ) : undefined

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-amber-50/20 to-orange-50/10 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
      <PageHeader
        title="Logistique"
        subtitle="Tâches magasiniers"
        icon={ArchiveBoxIcon}
        badgeColor="from-amber-600 via-orange-600 to-red-600"
        gradientColor="from-amber-600/10 via-orange-600/10 to-red-600/10"
        stats={statsCards}
      />

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          <button
            onClick={() => setActiveTab('consultation')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium whitespace-nowrap transition-all text-sm ${
              activeTab === 'consultation'
                ? 'bg-amber-600 text-white shadow-md'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-amber-300 dark:hover:border-amber-600'
            }`}
          >
            <ListBulletIcon className="h-4 w-4" />
            Consultation
          </button>
          <button
            onClick={() => setActiveTab('nouvelle')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium whitespace-nowrap transition-all text-sm ${
              activeTab === 'nouvelle'
                ? 'bg-amber-600 text-white shadow-md'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-amber-300 dark:hover:border-amber-600'
            }`}
          >
            <PlusIcon className="h-4 w-4" />
            Nouvelle tâche
          </button>
          <button
            onClick={() => setActiveTab('magasiniers')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium whitespace-nowrap transition-all text-sm ${
              activeTab === 'magasiniers'
                ? 'bg-amber-600 text-white shadow-md'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-amber-300 dark:hover:border-amber-600'
            }`}
          >
            <UserGroupIcon className="h-4 w-4" />
            Magasiniers
          </button>
          <button
            onClick={() => setShowBonPrep(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium whitespace-nowrap transition-all text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-amber-300 dark:hover:border-amber-600"
          >
            <ClipboardDocumentListIcon className="h-4 w-4" />
            Préparation commande
          </button>
        </div>

        {/* ===== TAB CONSULTATION ===== */}
        {activeTab === 'consultation' && (
          <>
            {/* Filtres */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border-2 border-gray-200 dark:border-gray-700 p-5 mb-6">
              <div className="flex items-center gap-3 mb-4">
                <FunnelIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">Filtres</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Magasinier</label>
                  <select
                    value={filterMagasinier}
                    onChange={(e) => setFilterMagasinier(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                  >
                    <option value="">Tous les magasiniers</option>
                    {magasiniers.map((m) => (
                      <option key={m.id} value={m.id}>{m.nom}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Statut</label>
                  <select
                    value={filterStatut}
                    onChange={(e) => setFilterStatut(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                  >
                    <option value="">Tous les statuts</option>
                    <option value="A_FAIRE">À faire</option>
                    <option value="VALIDEE">Validée</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Liste des tâches */}
            {loading ? (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border-2 border-gray-200 dark:border-gray-700 p-10 text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-600 mx-auto" />
                <p className="mt-4 text-gray-500 dark:text-gray-400">Chargement...</p>
              </div>
            ) : taches.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border-2 border-gray-200 dark:border-gray-700 p-10 text-center">
                <ArchiveBoxIcon className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="font-semibold text-gray-900 dark:text-white">Aucune tâche</p>
                {filterStatut === 'A_FAIRE' && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Toutes les tâches sont validées !</p>
                )}
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border-2 border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-900">
                      <tr>
                        <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tâche</th>
                        <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Statut</th>
                        <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Magasinier</th>
                        <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                        <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Photos</th>
                        <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {taches.map((t) => {
                        const photosRef = t.photos?.filter(p => p.type === 'A_FAIRE') ?? []
                        const photosPreuve = t.photos?.filter(p => p.type === 'PREUVE') ?? []
                        return (
                          <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                            <td className="px-5 py-4">
                              <div className="font-semibold text-gray-900 dark:text-white text-sm">{t.titre}</div>
                              {t.description && (
                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate max-w-xs">{t.description}</div>
                              )}
                            </td>
                            <td className="px-5 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                                t.statut === 'VALIDEE'
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                  : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                              }`}>
                                {t.statut === 'VALIDEE'
                                  ? <CheckCircleIcon className="h-3 w-3" />
                                  : <ClockIcon className="h-3 w-3" />
                                }
                                {t.statut === 'VALIDEE' ? 'Validée' : 'À faire'}
                              </span>
                            </td>
                            <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{t.magasinier.nom}</td>
                            <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{formatDate(t.dateExecution)}</td>
                            <td className="px-5 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                {photosRef.length > 0 && (
                                  <span className="flex items-center gap-1">
                                    <PhotoIcon className="h-3.5 w-3.5" />{photosRef.length}
                                  </span>
                                )}
                                {photosPreuve.length > 0 && (
                                  <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                                    <CameraIcon className="h-3.5 w-3.5" />{photosPreuve.length}
                                  </span>
                                )}
                                {photosRef.length === 0 && photosPreuve.length === 0 && (
                                  <span className="text-gray-300 dark:text-gray-600">—</span>
                                )}
                              </div>
                            </td>
                            <td className="px-5 py-4 whitespace-nowrap text-right">
                              <div className="flex justify-end gap-1">
                                {/* Voir détails magasinier */}
                                <button
                                  onClick={() => setViewTache(t)}
                                  className="rounded-lg border border-gray-200 dark:border-gray-700 p-2 text-gray-500 hover:border-amber-400 hover:text-amber-600 dark:hover:border-amber-500 dark:hover:text-amber-400 transition-colors"
                                  title="Voir le retour magasinier"
                                >
                                  <EyeIcon className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleOpenEdit(t)}
                                  className="rounded-lg border border-gray-200 dark:border-gray-700 p-2 text-gray-500 hover:border-blue-400 hover:text-blue-600 dark:hover:border-blue-500 dark:hover:text-blue-400 transition-colors"
                                  title="Modifier"
                                >
                                  <PencilSquareIcon className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteTache(t.id)}
                                  disabled={deletingId === t.id}
                                  className="rounded-lg border border-gray-200 dark:border-gray-700 p-2 text-red-400 hover:border-red-400 hover:text-red-600 disabled:opacity-50 transition-colors"
                                  title="Supprimer"
                                >
                                  {deletingId === t.id
                                    ? <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-red-600" />
                                    : <TrashIcon className="h-4 w-4" />
                                  }
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          {/* Bons de préparation en cours */}
          {bonsPreparation.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center gap-3 mb-3">
                <ClipboardDocumentListIcon className="h-5 w-5 text-blue-500" />
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">Bons de préparation en cours ({bonsPreparation.length})</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {bonsPreparation.map(bon => (
                  <div key={bon.id} className="bg-white dark:bg-gray-800 rounded-xl border-2 border-blue-200 dark:border-blue-800 p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div>
                        <p className="font-bold text-gray-900 dark:text-white text-sm">{bon.client}</p>
                        {bon.localisation && (
                          <p className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1 mt-0.5">
                            <MapPinIcon className="h-3 w-3" />{bon.localisation}
                          </p>
                        )}
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{bon.magasinier.nom} · {formatDate(bon.createdAt)}</p>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={async () => {
                            try {
                              const res = await fetch(`/api/logistique/bons-preparation/${bon.id}/pdf`)
                              if (!res.ok) {
                                alert('Erreur lors de la génération du PDF')
                                return
                              }
                              const blob = await res.blob()
                              const url = URL.createObjectURL(blob)
                              // Ouvrir dans un nouvel onglet pour que l'utilisateur puisse imprimer
                              const win = window.open(url, '_blank')
                              if (!win) {
                                // Fallback téléchargement
                                const a = document.createElement('a')
                                a.href = url
                                a.download = `bon-preparation-${bon.id.slice(0, 8)}.pdf`
                                a.click()
                              }
                            } catch {
                              alert('Erreur réseau lors de la génération du PDF')
                            }
                          }}
                          className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                          title="Imprimer"
                        >
                          <PrinterIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteBonPrep(bon.id)}
                          disabled={deletingBonId === bon.id}
                          className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                          title="Supprimer"
                        >
                          {deletingBonId === bon.id
                            ? <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-red-500" />
                            : <TrashIcon className="h-4 w-4" />
                          }
                        </button>
                      </div>
                    </div>
                    <ul className="space-y-1">
                      {(bon.lignes as LigneBonPrep[]).map((l, i) => (
                        <li key={i} className="flex items-baseline justify-between text-xs text-gray-700 dark:text-gray-300">
                          <span className="truncate flex-1">{l.description}</span>
                          <span className="ml-2 font-semibold whitespace-nowrap">{l.quantite} {l.unite}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}
          </>
        )}

        {/* ===== TAB NOUVELLE TÂCHE ===== */}
        {activeTab === 'nouvelle' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border-2 border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Nouvelle tâche</h2>
            <form onSubmit={handleAddTache} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Titre *</label>
                <input
                  type="text"
                  value={newTacheTitre}
                  onChange={(e) => setNewTacheTitre(e.target.value)}
                  placeholder="Ex: Rangement étagère A3"
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description (optionnel)</label>
                <textarea
                  value={newTacheDesc}
                  onChange={(e) => setNewTacheDesc(e.target.value)}
                  placeholder="Détails..."
                  rows={2}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date d&apos;exécution</label>
                  <input
                    type="date"
                    value={newTacheDate}
                    onChange={(e) => setNewTacheDate(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Magasinier *</label>
                  <select
                    value={newTacheMagasinierId}
                    onChange={(e) => setNewTacheMagasinierId(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="">Choisir...</option>
                    {magasiniers.map((m) => (
                      <option key={m.id} value={m.id}>{m.nom}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Photo de référence (optionnel)</label>
                <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handlePhotoCapture} className="hidden" />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-amber-400 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors text-sm"
                >
                  <CameraIcon className="h-5 w-5" />
                  Ajouter une photo
                </button>
                {newTachePhotos.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {newTachePhotos.map((f, i) => (
                      <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden bg-gray-100 border-2 border-amber-300 dark:border-amber-600 group">
                        <img
                          src={URL.createObjectURL(f)}
                          alt={f.name}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => setNewTachePhotos((p) => p.filter((_, j) => j !== i))}
                          className="absolute top-0.5 right-0.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >×</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={savingTache || !newTacheTitre.trim() || !newTacheMagasinierId}
                  className="px-8 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold disabled:opacity-50 flex items-center gap-2 transition-colors"
                >
                  {savingTache ? 'Enregistrement...' : 'Créer la tâche'}
                  <PlusIcon className="h-5 w-5" />
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ===== TAB MAGASINIERS ===== */}
        {activeTab === 'magasiniers' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border-2 border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-bold mb-5 text-gray-900 dark:text-white">Ajouter un magasinier</h2>
              <form onSubmit={handleAddMagasinier}>
                <div className="grid gap-4 sm:grid-cols-2 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nom</label>
                    <input
                      type="text"
                      value={newMagasinierNom}
                      onChange={(e) => setNewMagasinierNom(e.target.value)}
                      placeholder="Nom du magasinier"
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Code PIN (optionnel)</label>
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={8}
                      value={newMagasinierPin}
                      onChange={(e) => setNewMagasinierPin(e.target.value.replace(/\D/g, ''))}
                      placeholder="1234"
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={savingMagasinier || !newMagasinierNom.trim()}
                  className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-medium disabled:opacity-50 transition-colors"
                >
                  {savingMagasinier ? 'Ajout...' : 'Ajouter'}
                </button>
              </form>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border-2 border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-bold mb-5 text-gray-900 dark:text-white">Liste des magasiniers</h2>
              <div className="space-y-3">
                {magasiniers.map((m) => {
                  const ps = pinState[m.id]
                  return (
                    <div key={m.id} className="rounded-xl bg-gray-50 dark:bg-gray-700/50 overflow-hidden border border-gray-200 dark:border-gray-600">
                      <div className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          {editMagId === m.id ? (
                            <div className="flex items-center gap-2 flex-1">
                              <input
                                className="flex-1 px-3 py-1.5 rounded-lg border border-amber-300 dark:border-amber-600 dark:bg-gray-700 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                                value={editMagNom}
                                onChange={e => setEditMagNom(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') handleSaveMagNom(m.id); if (e.key === 'Escape') setEditMagId(null) }}
                                autoFocus
                              />
                              <button onClick={() => handleSaveMagNom(m.id)} disabled={savingMagNom} className="px-3 py-1.5 text-xs bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50">
                                {savingMagNom ? '...' : 'OK'}
                              </button>
                              <button onClick={() => setEditMagId(null)} className="px-2 py-1.5 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400">✕</button>
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
                            <button onClick={() => { setEditMagId(m.id); setEditMagNom(m.nom) }} className="p-1.5 text-gray-400 hover:text-amber-600 rounded transition-colors" title="Renommer">
                              <PencilSquareIcon className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={() => {
                              if (ps?.loaded) {
                                setPinState(prev => { const next = {...prev}; delete next[m.id]; return next })
                              } else {
                                loadPin(m.id)
                              }
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors"
                          >
                            <KeyIcon className="h-3.5 w-3.5" />
                            PIN
                          </button>
                          <a href={portailUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-amber-600 dark:text-amber-400 hover:underline">
                            Portail
                          </a>
                        </div>
                      </div>
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
                                  className="w-full px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm pr-8 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                />
                                <button
                                  type="button"
                                  onClick={() => setPinState(prev => ({...prev, [m.id]: {...prev[m.id], visible: !prev[m.id].visible}}))}
                                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                  {ps.visible ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                                </button>
                              </div>
                              <button onClick={() => savePin(m.id)} disabled={ps.saving} className="px-3 py-1.5 text-xs bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 whitespace-nowrap">
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
                  <p className="text-gray-500 dark:text-gray-400 py-4 text-sm">Aucun magasinier</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ===== MODALE BON DE PRÉPARATION ===== */}
      {showBonPrep && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <ClipboardDocumentListIcon className="h-6 w-6 text-blue-500" />
                <h3 className="font-bold text-lg text-gray-900 dark:text-white">Nouveau bon de préparation</h3>
              </div>
              <button onClick={() => setShowBonPrep(false)} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg transition-colors">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              {/* Magasinier */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Magasinier *</label>
                <select
                  value={bonPrepMagasinierId}
                  onChange={e => setBonPrepMagasinierId(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Sélectionner un magasinier</option>
                  {magasiniers.map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}
                </select>
              </div>
              {/* Client */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nom du client / chantier *</label>
                <input
                  type="text"
                  value={bonPrepClient}
                  onChange={e => setBonPrepClient(e.target.value)}
                  placeholder="Ex: Résidence Les Pins - Dupont"
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {/* Localisation */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Localisation palette (optionnel)</label>
                <input
                  type="text"
                  value={bonPrepLocalisation}
                  onChange={e => setBonPrepLocalisation(e.target.value)}
                  placeholder="Ex: Allée B, rack 3 — Quai 2"
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {/* Lignes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Articles *</label>
                <div className="space-y-3">
                  {bonPrepLignes.map((ligne, i) => (
                    <div key={i} className="rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 w-5 flex-shrink-0">{i + 1}.</span>
                        <input
                          type="text"
                          value={ligne.description}
                          onChange={e => {
                            const l = [...bonPrepLignes]; l[i].description = e.target.value; setBonPrepLignes(l)
                          }}
                          placeholder="Description de l'article"
                          className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        {bonPrepLignes.length > 1 && (
                          <button type="button" onClick={() => setBonPrepLignes(bonPrepLignes.filter((_, j) => j !== i))} className="p-1.5 text-red-400 hover:text-red-600 transition-colors rounded flex-shrink-0">
                            <XMarkIcon className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                      <div className="flex gap-2 pl-7">
                        <div className="flex-1">
                          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Quantité</label>
                          <input
                            type="number"
                            value={ligne.quantite}
                            onChange={e => {
                              const l = [...bonPrepLignes]; l[i].quantite = e.target.value; setBonPrepLignes(l)
                            }}
                            placeholder="0"
                            min="0"
                            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Unité</label>
                          <input
                            type="text"
                            value={ligne.unite}
                            onChange={e => {
                              const l = [...bonPrepLignes]; l[i].unite = e.target.value; setBonPrepLignes(l)
                            }}
                            placeholder="m², ml, u…"
                            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setBonPrepLignes([...bonPrepLignes, { description: '', quantite: '', unite: '' }])}
                  className="mt-2 flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  <PlusIcon className="h-4 w-4" /> Ajouter une ligne
                </button>
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-gray-100 dark:border-gray-700">
              <button
                type="button"
                onClick={() => setShowBonPrep(false)}
                className="flex-1 py-3 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleCreateBonPrep}
                disabled={savingBonPrep || !bonPrepClient.trim() || !bonPrepMagasinierId || bonPrepLignes.filter(l => l.description.trim()).length === 0}
                className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-medium disabled:opacity-50 hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                {savingBonPrep ? (
                  <><div className="h-4 w-4 animate-spin rounded-full border-b-2 border-white" /> Création...</>
                ) : (
                  <><ClipboardDocumentListIcon className="h-4 w-4" /> Créer le bon</>  
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== LIGHTBOX ===== */}
      {lightboxUrl && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 cursor-zoom-out" onClick={() => setLightboxUrl(null)}>
          <button className="absolute top-4 right-4 p-2 text-white bg-black/40 rounded-full hover:bg-black/60 transition-colors" onClick={() => setLightboxUrl(null)}>
            <XMarkIcon className="h-6 w-6" />
          </button>
          <div className="relative max-w-3xl max-h-[90vh] w-full h-full" onClick={e => e.stopPropagation()}>
            <Image src={lightboxUrl} alt="Photo agrandie" fill className="object-contain cursor-default" sizes="(max-width: 768px) 100vw, 768px" />
          </div>
        </div>
      )}

      {/* ===== MODALE DÉTAILS MAGASINIER ===== */}
      {viewTache && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700">
              <div>
                <h3 className="font-bold text-lg text-gray-900 dark:text-white">{viewTache.titre}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{viewTache.magasinier.nom} · {formatDate(viewTache.dateExecution)}</p>
              </div>
              <button onClick={() => setViewTache(null)} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg transition-colors">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
              {/* Statut */}
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${
                  viewTache.statut === 'VALIDEE'
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                }`}>
                  {viewTache.statut === 'VALIDEE' ? <CheckCircleIcon className="h-4 w-4" /> : <ClockIcon className="h-4 w-4" />}
                  {viewTache.statut === 'VALIDEE' ? 'Validée' : 'À faire'}
                </span>
                {viewTache.dateValidation && (
                  <span className="text-sm text-gray-500 dark:text-gray-400">le {formatDate(viewTache.dateValidation)}</span>
                )}
              </div>

              {/* Photos de référence */}
              {viewTache.photos?.filter(p => p.type === 'A_FAIRE').length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <PhotoIcon className="h-4 w-4" /> Photos de référence
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    {viewTache.photos.filter(p => p.type === 'A_FAIRE').map(p => (
                      <button key={p.id} onClick={() => setLightboxUrl(p.url)} className="relative w-16 h-16 rounded-xl overflow-hidden bg-gray-100 hover:opacity-80 transition-opacity">
                        <Image src={p.url} alt="" fill className="object-cover" sizes="64px" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Retour magasinier */}
              {viewTache.statut === 'VALIDEE' ? (
                <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 border border-green-200 dark:border-green-800/40">
                  <p className="text-xs font-semibold text-green-700 dark:text-green-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <CheckCircleIcon className="h-4 w-4" /> Retour du magasinier
                  </p>
                  {viewTache.commentaire ? (
                    <div className="flex items-start gap-2 mb-3">
                      <ChatBubbleLeftEllipsisIcon className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-gray-700 dark:text-gray-300 italic">{viewTache.commentaire}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 dark:text-gray-500 italic mb-3">Aucun commentaire</p>
                  )}
                  {viewTache.photos?.filter(p => p.type === 'PREUVE').length > 0 ? (
                    <div>
                      <p className="text-xs text-green-600 dark:text-green-400 font-medium mb-2 flex items-center gap-1">
                        <CameraIcon className="h-3.5 w-3.5" /> Photos de preuve
                      </p>
                      <div className="flex gap-2 flex-wrap">
                        {viewTache.photos.filter(p => p.type === 'PREUVE').map(p => (
                          <button key={p.id} onClick={() => setLightboxUrl(p.url)} className="relative w-16 h-16 rounded-xl overflow-hidden bg-gray-100 border-2 border-green-300 dark:border-green-700 hover:opacity-80 transition-opacity">
                            <Image src={p.url} alt="" fill className="object-cover" sizes="64px" />
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 dark:text-gray-500 italic">Aucune photo de preuve</p>
                  )}
                </div>
              ) : (
                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 border border-amber-200 dark:border-amber-800/40">
                  <p className="text-sm text-amber-700 dark:text-amber-400 flex items-center gap-2">
                    <ClockIcon className="h-4 w-4 flex-shrink-0" />
                    Cette tâche n&apos;a pas encore été traitée par le magasinier.
                  </p>
                </div>
              )}
            </div>
            <div className="p-5 border-t border-gray-100 dark:border-gray-700 flex justify-end">
              <button onClick={() => setViewTache(null)} className="px-5 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm">
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODALE ÉDITION ===== */}
      {editTache && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-gray-100 dark:border-gray-700">
              <h3 className="font-bold text-lg text-gray-900 dark:text-white">Modifier la tâche</h3>
            </div>
            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Titre *</label>
                <input
                  type="text"
                  value={editTitre}
                  onChange={(e) => setEditTitre(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date d&apos;exécution</label>
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Magasinier</label>
                  <select
                    value={editMagasinierId}
                    onChange={(e) => setEditMagasinierId(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    {magasiniers.map((m) => (
                      <option key={m.id} value={m.id}>{m.nom}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Photos existantes */}
              {editTache.photos?.filter(p => p.type === 'A_FAIRE').length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Photos actuelles</label>
                  <div className="flex gap-2 flex-wrap">
                    {editTache.photos.filter(p => p.type === 'A_FAIRE').map(p => (
                      <button key={p.id} type="button" onClick={() => setLightboxUrl(p.url)} className="relative w-14 h-14 rounded-lg overflow-hidden bg-gray-100 hover:opacity-80 transition-opacity">
                        <Image src={p.url} alt="" fill className="object-cover" sizes="56px" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Ajout de photos */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Ajouter des photos</label>
                <input ref={editFileInputRef} type="file" accept="image/*" multiple onChange={handleEditPhotoCapture} className="hidden" />
                <button
                  type="button"
                  onClick={() => editFileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-amber-400 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors text-sm"
                >
                  <CameraIcon className="h-5 w-5" />
                  Sélectionner des photos
                </button>
                {editPhotos.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {editPhotos.map((f, i) => (
                      <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden bg-gray-100 border-2 border-amber-300 dark:border-amber-600 group">
                        <img src={URL.createObjectURL(f)} alt={f.name} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setEditPhotos(p => p.filter((_, j) => j !== i))}
                          className="absolute top-0.5 right-0.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >×</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-gray-100 dark:border-gray-700">
              <button
                onClick={() => { setEditTache(null); setEditPhotos([]) }}
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
