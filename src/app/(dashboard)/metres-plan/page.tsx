'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { PageHeader } from '@/components/PageHeader'
import {
  PencilSquareIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  TrashIcon,
  FolderOpenIcon,
} from '@heroicons/react/24/outline'
import { LayoutGrid, List } from 'lucide-react'
import toast from 'react-hot-toast'

interface MetrePlan {
  id: string
  nom: string
  updatedAt: string
  createdAt: string
  chantier?: { chantierId: string; nomChantier: string } | null
}

interface Chantier {
  chantierId: string
  nomChantier: string
}

type SortKey = 'recent' | 'oldest' | 'name_asc' | 'name_desc'
type ViewMode = 'list' | 'grid'

export default function MetresPlanPage() {
  const router = useRouter()

  // ── Data ────────────────────────────────────────────────────────────────────
  const [projets, setProjets]   = useState<MetrePlan[]>([])
  const [chantiers, setChantiers] = useState<Chantier[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)

  // ── Filters / sort / view ────────────────────────────────────────────────────
  const [search, setSearch]           = useState('')
  const [filterChantier, setFilterChantier] = useState('')
  const [sort, setSort]               = useState<SortKey>('recent')
  const [view, setView]               = useState<ViewMode>('list')

  // ── Create dialog ───────────────────────────────────────────────────────────
  const [dialogOpen, setDialogOpen]   = useState(false)
  const [nomProjet, setNomProjet]     = useState('')
  const [chantierId, setChantierId]   = useState('')
  const [creating, setCreating]       = useState(false)

  // ── Delete confirm ──────────────────────────────────────────────────────────
  const [deleteId, setDeleteId]       = useState<string | null>(null)
  const [deleting, setDeleting]       = useState(false)

  // ── Load data ───────────────────────────────────────────────────────────────
  const loadProjets = async () => {
    try {
      setLoading(true); setError(null)
      const res = await fetch('/api/metres-plan')
      if (!res.ok) throw new Error('Erreur lors du chargement')
      const data = await res.json()
      setProjets(Array.isArray(data) ? data : data.data ?? [])
    } catch {
      setError('Impossible de charger les métrés sur plan')
      setProjets([])
    } finally {
      setLoading(false)
    }
  }

  const loadChantiers = async () => {
    try {
      const res = await fetch('/api/chantiers')
      if (!res.ok) return
      const data = await res.json()
      setChantiers(Array.isArray(data) ? data : (data.chantiers ?? data.data ?? []))
    } catch { /* silencieux */ }
  }

  useEffect(() => { loadProjets(); loadChantiers() }, [])

  // ── Filtered + sorted list ───────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = [...projets]
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(p =>
        p.nom.toLowerCase().includes(q) ||
        p.chantier?.nomChantier.toLowerCase().includes(q)
      )
    }
    if (filterChantier) {
      list = list.filter(p => p.chantier?.chantierId === filterChantier)
    }
    list.sort((a, b) => {
      switch (sort) {
        case 'recent':    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        case 'oldest':    return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
        case 'name_asc':  return a.nom.localeCompare(b.nom, 'fr')
        case 'name_desc': return b.nom.localeCompare(a.nom, 'fr')
      }
    })
    return list
  }, [projets, search, filterChantier, sort])

  // ── Create ───────────────────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!nomProjet.trim()) return
    try {
      setCreating(true)
      const body: Record<string, string> = { nom: nomProjet.trim() }
      if (chantierId) body.chantierId = chantierId
      const res = await fetch('/api/metres-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      const newId = data.id ?? data.data?.id
      setDialogOpen(false); setNomProjet(''); setChantierId('')
      if (newId) router.push(`/metres-plan/${newId}`)
      else loadProjets()
    } catch {
      toast.error('Impossible de créer le métré sur plan.')
    } finally {
      setCreating(false)
    }
  }

  // ── Delete ───────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteId) return
    try {
      setDeleting(true)
      const res = await fetch(`/api/metres-plan/${deleteId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setProjets(prev => prev.filter(p => p.id !== deleteId))
      toast.success('Métré supprimé')
    } catch {
      toast.error('Erreur lors de la suppression')
    } finally {
      setDeleting(false)
      setDeleteId(null)
    }
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const fmt = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })

  const actionButton = (
    <button
      onClick={() => setDialogOpen(true)}
      className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-blue-700 hover:from-indigo-700 hover:to-blue-800 text-white rounded-lg shadow-md hover:shadow-lg transition-all text-sm font-semibold"
    >
      <PlusIcon className="h-4 w-4" /> Nouveau métré
    </button>
  )

  // ── Skeleton ─────────────────────────────────────────────────────────────────
  const Skeleton = () => (
    <div className="space-y-2">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-14 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
      ))}
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/20 to-indigo-50/10 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
      <PageHeader
        title="Métrés sur plan"
        subtitle="Dessinez et mesurez directement sur vos plans PDF"
        icon={PencilSquareIcon}
        badgeColor="from-indigo-600 via-blue-600 to-sky-700"
        gradientColor="from-indigo-600/10 via-blue-600/10 to-sky-700/10"
        actions={actionButton}
      />

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* ── Toolbar filtre / tri / vue ─────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
          </div>

          {/* Filter by chantier */}
          <div className="relative">
            <FunnelIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <select
              value={filterChantier}
              onChange={e => setFilterChantier(e.target.value)}
              className="pl-9 pr-8 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none appearance-none"
            >
              <option value="">Tous les chantiers</option>
              {chantiers.map(c => (
                <option key={c.chantierId} value={c.chantierId}>{c.nomChantier}</option>
              ))}
            </select>
          </div>

          {/* Sort */}
          <select
            value={sort}
            onChange={e => setSort(e.target.value as SortKey)}
            className="px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none"
          >
            <option value="recent">Plus récent</option>
            <option value="oldest">Plus ancien</option>
            <option value="name_asc">Nom A → Z</option>
            <option value="name_desc">Nom Z → A</option>
          </select>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Result count */}
          {!loading && (
            <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
              {filtered.length} métré{filtered.length !== 1 ? 's' : ''}
            </span>
          )}

          {/* View toggle */}
          <div className="flex items-center gap-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-1">
            <button
              onClick={() => setView('list')}
              className={`p-1.5 rounded transition-colors ${view === 'list' ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
              title="Vue liste"
            >
              <List size={16} />
            </button>
            <button
              onClick={() => setView('grid')}
              className={`p-1.5 rounded transition-colors ${view === 'grid' ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
              title="Vue grille"
            >
              <LayoutGrid size={16} />
            </button>
          </div>
        </div>

        {/* ── Content ───────────────────────────────────────────────────────── */}
        {loading ? (
          <Skeleton />
        ) : error ? (
          <div className="text-center py-16">
            <p className="text-red-600 dark:text-red-400">{error}</p>
            <button onClick={loadProjets} className="mt-4 text-sm text-indigo-600 hover:underline">Réessayer</button>
          </div>
        ) : filtered.length === 0 && projets.length > 0 ? (
          <div className="text-center py-16">
            <MagnifyingGlassIcon className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400 font-medium">Aucun résultat pour cette recherche</p>
            <button onClick={() => { setSearch(''); setFilterChantier('') }} className="mt-3 text-sm text-indigo-600 dark:text-indigo-400 hover:underline">
              Effacer les filtres
            </button>
          </div>
        ) : projets.length === 0 ? (
          <div className="text-center py-20">
            <PencilSquareIcon className="h-20 w-20 text-gray-300 dark:text-gray-600 mx-auto mb-5" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Aucun métré sur plan</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">Commencez par créer un nouveau métré pour dessiner sur vos PDF.</p>
            <button
              onClick={() => setDialogOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-700 hover:from-indigo-700 hover:to-blue-800 text-white rounded-lg shadow-md text-sm font-semibold"
            >
              <PlusIcon className="h-4 w-4" /> Créer mon premier métré
            </button>
          </div>
        ) : view === 'list' ? (
          /* ── List view ──────────────────────────────────────────────────── */
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            {/* Header row */}
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-4 py-2 border-b border-gray-100 dark:border-gray-700 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              <span>Nom / Chantier</span>
              <span className="text-right w-36">Mis à jour</span>
              <span className="w-20 text-center">Ouvrir</span>
              <span className="w-8" />
            </div>
            {filtered.map((projet, i) => (
              <div
                key={projet.id}
                className={`grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${i < filtered.length - 1 ? 'border-b border-gray-100 dark:border-gray-700/50' : ''}`}
              >
                {/* Name + chantier */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-lg flex items-center justify-center shrink-0">
                    <PencilSquareIcon className="h-4 w-4 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{projet.nom}</p>
                    {projet.chantier ? (
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{projet.chantier.nomChantier}</p>
                    ) : (
                      <p className="text-xs text-gray-400 dark:text-gray-500 italic">Sans chantier</p>
                    )}
                  </div>
                </div>

                {/* Date */}
                <span className="text-xs text-gray-400 dark:text-gray-500 w-36 text-right whitespace-nowrap">
                  {fmt(projet.updatedAt)}
                </span>

                {/* Open */}
                <button
                  onClick={() => router.push(`/metres-plan/${projet.id}`)}
                  className="w-20 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-colors"
                >
                  <FolderOpenIcon className="h-3.5 w-3.5" /> Ouvrir
                </button>

                {/* Delete */}
                <button
                  onClick={() => setDeleteId(projet.id)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  title="Supprimer ce métré"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          /* ── Grid view ──────────────────────────────────────────────────── */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filtered.map(projet => (
              <div
                key={projet.id}
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow p-5 flex flex-col gap-3"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-lg flex items-center justify-center shrink-0">
                    <PencilSquareIcon className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">{projet.nom}</h3>
                    {projet.chantier ? (
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{projet.chantier.nomChantier}</p>
                    ) : (
                      <p className="text-xs text-gray-400 italic mt-0.5">Sans chantier</p>
                    )}
                  </div>
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500">Mis à jour le {fmt(projet.updatedAt)}</p>
                <div className="mt-auto flex gap-2">
                  <button
                    onClick={() => router.push(`/metres-plan/${projet.id}`)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-gradient-to-r from-indigo-600 to-blue-700 hover:from-indigo-700 hover:to-blue-800 text-white rounded-lg text-xs font-semibold transition-all"
                  >
                    <FolderOpenIcon className="h-3.5 w-3.5" /> Ouvrir
                  </button>
                  <button
                    onClick={() => setDeleteId(projet.id)}
                    className="px-2.5 py-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 border border-gray-200 dark:border-gray-700 transition-colors"
                    title="Supprimer"
                  >
                    <TrashIcon className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Dialog : Nouveau métré ──────────────────────────────────────────── */}
      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Nouveau métré sur plan</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nom du projet <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={nomProjet}
                  onChange={e => setNomProjet(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCreate()}
                  placeholder="Ex : Façade lot A"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Chantier associé <span className="text-gray-400">(optionnel)</span>
                </label>
                <select
                  value={chantierId}
                  onChange={e => setChantierId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="">— Aucun chantier —</option>
                  {chantiers.map(c => (
                    <option key={c.chantierId} value={c.chantierId}>{c.nomChantier}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => { setDialogOpen(false); setNomProjet(''); setChantierId('') }}
                className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleCreate}
                disabled={!nomProjet.trim() || creating}
                className="inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-indigo-600 to-blue-700 hover:from-indigo-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-semibold transition-all"
              >
                {creating ? 'Création…' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Dialog : Confirmation suppression ──────────────────────────────── */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                <TrashIcon className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white">Supprimer ce métré ?</h2>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
              Le métré <strong className="text-gray-700 dark:text-gray-200">{projets.find(p => p.id === deleteId)?.nom}</strong> et tous ses fichiers seront définitivement supprimés. Cette action est irréversible.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteId(null)}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition-colors"
              >
                {deleting ? 'Suppression…' : 'Supprimer définitivement'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
