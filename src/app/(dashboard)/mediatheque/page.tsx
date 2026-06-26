'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import {
  PhotoIcon,
  ArrowUpTrayIcon,
  MagnifyingGlassIcon,
  TagIcon,
  TrashIcon,
  PencilSquareIcon,
  XMarkIcon,
  ArrowDownTrayIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  CheckIcon,
  FunnelIcon,
  EyeIcon,
  PlayIcon,
  ShareIcon,
  FilmIcon
} from '@heroicons/react/24/outline'
import { PageHeader } from '@/components/PageHeader'
import { compressImage } from '@/lib/utils/image-compression'
import { toast } from 'react-hot-toast'

// ── Types ──────────────────────────────────────────────────────────────────────

interface MediaItem {
  id: number
  nom: string
  url: string
  taille: number
  mimeType: string | null
  isVideo: boolean
  description: string
  tags: string[]
  uploadedBy: string
  createdAt: string
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`
  return `${(bytes / 1024 / 1024).toFixed(1)} Mo`
}

async function shareMedia(item: MediaItem) {
  if (!navigator.share) return false
  try {
    // Essayer de partager avec le fichier (mobiles récents)
    const res = await fetch(item.url)
    const blob = await res.blob()
    const file = new File([blob], item.nom, { type: blob.type })
    await navigator.share({ files: [file], title: item.nom, text: item.description || undefined })
    return true
  } catch {
    // Fallback : partager l'URL seule
    try {
      await navigator.share({ title: item.nom, url: window.location.origin + item.url })
      return true
    } catch { return false }
  }
}

function TagChip({
  tag, count, active, onClick, removable, onRemove
}: {
  tag: string; count?: number; active?: boolean
  onClick?: () => void; removable?: boolean; onRemove?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-all select-none
        ${active
          ? 'bg-violet-600 text-white shadow-md shadow-violet-400/30'
          : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-violet-100 dark:hover:bg-violet-900/30 hover:text-violet-700 dark:hover:text-violet-300'
        }`}
    >
      <span>#{tag}</span>
      {count !== undefined && (
        <span className={`rounded-full px-1.5 text-[10px] ${active ? 'bg-white/20 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'}`}>
          {count}
        </span>
      )}
      {removable && onRemove && (
        <XMarkIcon className="h-3 w-3 ml-0.5 opacity-70 hover:opacity-100" onClick={e => { e.stopPropagation(); onRemove() }} />
      )}
    </button>
  )
}

// ── Composant principal ────────────────────────────────────────────────────────

export default function MediathequePage() {
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === 'ADMIN'
  const canShare = typeof navigator !== 'undefined' && !!navigator.share

  // État principal
  const [items, setItems] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTags, setActiveTags] = useState<string[]>([])
  const [search, setSearch] = useState('')

  // Upload
  const [uploadDialog, setUploadDialog] = useState(false)
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [uploadTags, setUploadTags] = useState<string[]>([])
  const [uploadDescription, setUploadDescription] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [allTags, setAllTags] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Lightbox
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null)

  // Édition
  const [editingItem, setEditingItem] = useState<MediaItem | null>(null)
  const [editTags, setEditTags] = useState<string[]>([])
  const [editDescription, setEditDescription] = useState('')
  const [editTagInput, setEditTagInput] = useState('')
  const [saving, setSaving] = useState(false)

  // Sélection multiple
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [selectMode, setSelectMode] = useState(false)

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchItems = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (activeTags.length) params.set('tags', activeTags.join(','))
      const res = await fetch(`/api/mediatheque?${params}`)
      if (res.ok) setItems(await res.json())
    } finally {
      setLoading(false)
    }
  }, [activeTags])

  const fetchTags = useCallback(async () => {
    try {
      const res = await fetch('/api/tags')
      if (res.ok) {
        const data = await res.json()
        setAllTags(Array.isArray(data) ? data.map((t: { nom: string }) => t.nom) : [])
      }
    } catch { /* silent */ }
  }, [])

  useEffect(() => { fetchItems() }, [fetchItems])
  useEffect(() => { fetchTags() }, [fetchTags])

  // Compteurs de tags
  const tagCounts = useMemo(() => {
    const map: Record<string, number> = {}
    for (const item of items) for (const t of item.tags) map[t] = (map[t] ?? 0) + 1
    return map
  }, [items])

  const sortedTagCounts = useMemo(
    () => Object.entries(tagCounts).sort((a, b) => b[1] - a[1]),
    [tagCounts]
  )

  // Filtrage client
  const filtered = useMemo(() => {
    if (!search) return items
    const q = search.toLowerCase()
    return items.filter(p =>
      p.nom.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.tags.some(t => t.includes(q))
    )
  }, [items, search])

  const photoCount = useMemo(() => items.filter(i => !i.isVideo).length, [items])
  const videoCount = useMemo(() => items.filter(i => i.isVideo).length, [items])

  // ── Upload ─────────────────────────────────────────────────────────────────

  const ACCEPTED = ['image/', 'video/']
  const isAccepted = (f: File) => ACCEPTED.some(prefix => f.type.startsWith(prefix))

  const openUploadDialog = (files: File[]) => {
    const valid = files.filter(isAccepted)
    if (!valid.length) { toast.error('Formats acceptés : images et vidéos uniquement'); return }
    const rejected = files.length - valid.length
    if (rejected > 0) toast(`${rejected} fichier(s) ignoré(s) — format non accepté`, { icon: '⚠️' })
    setPendingFiles(valid)
    setUploadTags([])
    setUploadDescription('')
    setTagInput('')
    setUploadDialog(true)
  }

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) openUploadDialog(Array.from(e.target.files))
    e.target.value = ''
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false)
    openUploadDialog(Array.from(e.dataTransfer.files))
  }

  const addUploadTag = (tag: string) => {
    const n = tag.trim().toLowerCase()
    if (n && !uploadTags.includes(n)) setUploadTags(prev => [...prev, n])
    setTagInput('')
  }

  const handleUploadSubmit = async () => {
    if (!pendingFiles.length) return
    setUploading(true); setUploadProgress(0)
    let success = 0
    try {
      for (let i = 0; i < pendingFiles.length; i++) {
        const file = pendingFiles[i]
        let toUpload: File = file
        if (file.type.startsWith('image/')) {
          try { toUpload = await compressImage(file, 1920, 1920, 0.85) }
          catch { /* HEIC/format exotique → original */ }
        }
        const fd = new FormData()
        fd.append('file', toUpload)
        fd.append('tags', JSON.stringify(uploadTags))
        fd.append('description', uploadDescription)
        const res = await fetch('/api/mediatheque', { method: 'POST', body: fd })
        if (res.ok) { success++; setUploadProgress(Math.round(((i + 1) / pendingFiles.length) * 100)) }
        else { const err = await res.json(); toast.error(`${file.name} : ${err.error}`) }
      }
      if (success > 0) {
        toast.success(`${success} fichier${success > 1 ? 's' : ''} ajouté${success > 1 ? 's' : ''}`)
        setUploadDialog(false)
        await fetchItems(); await fetchTags()
      }
    } finally { setUploading(false); setUploadProgress(0) }
  }

  // ── Suppression ────────────────────────────────────────────────────────────

  const deleteItem = async (id: number) => {
    if (!confirm('Supprimer ce fichier ?')) return
    const res = await fetch(`/api/mediatheque/${id}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('Supprimé')
      setItems(prev => prev.filter(p => p.id !== id))
      if (lightboxIdx !== null) setLightboxIdx(null)
    } else { toast.error('Erreur lors de la suppression') }
  }

  const deleteSelected = async () => {
    if (!confirm(`Supprimer ${selected.size} fichier${selected.size > 1 ? 's' : ''} ?`)) return
    let ok = 0
    for (const id of selected) {
      const res = await fetch(`/api/mediatheque/${id}`, { method: 'DELETE' })
      if (res.ok) ok++
    }
    toast.success(`${ok} fichier${ok > 1 ? 's' : ''} supprimé${ok > 1 ? 's' : ''}`)
    setSelected(new Set()); setSelectMode(false)
    await fetchItems()
  }

  // ── Edition ────────────────────────────────────────────────────────────────

  const openEdit = (item: MediaItem, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingItem(item); setEditTags([...item.tags])
    setEditDescription(item.description); setEditTagInput('')
  }

  const addEditTag = (tag: string) => {
    const n = tag.trim().toLowerCase()
    if (n && !editTags.includes(n)) setEditTags(prev => [...prev, n])
    setEditTagInput('')
  }

  const saveEdit = async () => {
    if (!editingItem) return
    setSaving(true)
    try {
      const res = await fetch(`/api/mediatheque/${editingItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: editTags, description: editDescription })
      })
      if (res.ok) {
        toast.success('Mis à jour')
        setItems(prev => prev.map(p =>
          p.id === editingItem.id ? { ...p, tags: editTags, description: editDescription } : p
        ))
        setEditingItem(null); await fetchTags()
      } else { toast.error('Erreur lors de la sauvegarde') }
    } finally { setSaving(false) }
  }

  // ── Lightbox ───────────────────────────────────────────────────────────────

  const currentItem = lightboxIdx !== null ? filtered[lightboxIdx] ?? null : null

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (lightboxIdx === null) return
      if (e.key === 'Escape') setLightboxIdx(null)
      if (e.key === 'ArrowRight') setLightboxIdx(i => i !== null ? Math.min(i + 1, filtered.length - 1) : null)
      if (e.key === 'ArrowLeft') setLightboxIdx(i => i !== null ? Math.max(i - 1, 0) : null)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [lightboxIdx, filtered.length])

  // ── Sélection ──────────────────────────────────────────────────────────────

  const toggleSelect = (id: number, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) { next.delete(id) } else { next.add(id) }
      return next
    })
  }

  // ── Autocomplete tags ──────────────────────────────────────────────────────

  const tagSuggestions = (input: string, current: string[]) =>
    input.length >= 1
      ? allTags.filter(t => t.includes(input.toLowerCase()) && !current.includes(t)).slice(0, 6)
      : []

  // ── Stats header ───────────────────────────────────────────────────────────

  const statsCards = (
    <div className="flex items-center gap-2 flex-wrap">
      {[
        { label: 'Photos', value: photoCount, icon: '🖼️' },
        { label: 'Vidéos', value: videoCount, icon: '🎬' },
        { label: 'Tags', value: sortedTagCounts.length, icon: '🏷️' }
      ].map(s => (
        <div key={s.label} className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg px-3 py-2 border border-gray-200/50 dark:border-gray-700/50 shadow-md">
          <div className="text-[10px] font-medium text-gray-500 dark:text-gray-400">{s.label}</div>
          <div className="text-sm font-bold text-gray-900 dark:text-white">{s.value}</div>
        </div>
      ))}
    </div>
  )

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-gray-50 via-violet-50/20 to-gray-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900"
      onDragOver={e => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(false) }}
      onDrop={handleDrop}
    >
      {/* Overlay drag & drop */}
      {dragOver && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-violet-600/20 backdrop-blur-sm pointer-events-none">
          <div className="bg-white/90 dark:bg-gray-900/90 rounded-3xl p-10 shadow-2xl border-2 border-dashed border-violet-400 text-center">
            <ArrowUpTrayIcon className="h-14 w-14 mx-auto mb-3 text-violet-500" />
            <p className="text-xl font-semibold text-violet-700 dark:text-violet-300">Déposez ici</p>
            <p className="text-sm text-gray-500 mt-1">photos & vidéos acceptées</p>
          </div>
        </div>
      )}

      <PageHeader
        title="Photothèque"
        subtitle="Bibliothèque de référence — photos & vidéos par tags"
        icon={PhotoIcon}
        badgeColor="from-violet-500 via-purple-500 to-fuchsia-600"
        gradientColor="from-violet-500/10 via-purple-500/10 to-fuchsia-600/10"
        stats={statsCards}
        actions={
          <div className="flex items-center gap-2">
            {selectMode && selected.size > 0 && (
              <button onClick={deleteSelected} className="inline-flex items-center gap-1.5 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold shadow-lg transition">
                <TrashIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Supprimer ({selected.size})</span>
                <span className="sm:hidden">({selected.size})</span>
              </button>
            )}
            <button
              onClick={() => { setSelectMode(v => !v); setSelected(new Set()) }}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition
                ${selectMode ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200' : 'bg-white/80 dark:bg-gray-800/80 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700'}`}
            >
              <CheckIcon className="h-4 w-4" />
              <span className="hidden sm:inline">{selectMode ? 'Annuler' : 'Sélectionner'}</span>
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-700 hover:to-purple-800 text-white rounded-lg shadow-lg transition-all text-sm font-semibold"
            >
              <ArrowUpTrayIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Ajouter</span>
            </button>
            <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={handleFilePick} />
          </div>
        }
      />

      <div className="max-w-[1600px] mx-auto px-3 sm:px-6 lg:px-8 py-6 space-y-5">

        {/* Recherche */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Recherche instantanée — nom, tag, description…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-violet-400 focus:border-transparent outline-none shadow-sm"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 rounded">
                <XMarkIcon className="h-4 w-4" />
              </button>
            )}
          </div>
          {activeTags.length > 0 && (
            <button
              onClick={() => setActiveTags([])}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-violet-600 dark:text-violet-300 bg-violet-50 dark:bg-violet-900/20 rounded-xl border border-violet-200 dark:border-violet-700 hover:bg-violet-100 transition whitespace-nowrap"
            >
              <FunnelIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Effacer filtres</span>
              <span className="sm:hidden">{activeTags.length}</span>
            </button>
          )}
        </div>

        {/* Nuage de tags */}
        {sortedTagCounts.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {sortedTagCounts.map(([tag, count]) => (
              <TagChip
                key={tag} tag={tag} count={count}
                active={activeTags.includes(tag)}
                onClick={() => setActiveTags(prev =>
                  prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
                )}
              />
            ))}
          </div>
        )}

        {/* Résultat de recherche */}
        {(search || activeTags.length > 0) && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {filtered.length} résultat{filtered.length !== 1 ? 's' : ''} sur {items.length}
          </p>
        )}

        {/* Galerie masonry */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center text-gray-400 dark:text-gray-500">
            <PhotoIcon className="h-16 w-16 mb-4 opacity-20" />
            <p className="text-lg font-medium text-gray-500 dark:text-gray-400">
              {items.length === 0 ? 'Aucun fichier pour l\'instant' : 'Aucun résultat'}
            </p>
            <p className="text-sm mt-1">
              {items.length === 0
                ? 'Glissez-déposez des photos ou vidéos, ou cliquez sur « Ajouter »'
                : 'Modifiez la recherche ou effacez les filtres de tags'}
            </p>
          </div>
        ) : (
          <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 xl:columns-6 gap-2.5">
            {filtered.map((item, idx) => (
              <MediaCard
                key={item.id}
                item={item}
                idx={idx}
                selectMode={selectMode}
                selected={selected.has(item.id)}
                isOwner={isAdmin || item.uploadedBy === session?.user?.name}
                onOpen={() => setLightboxIdx(idx)}
                onToggleSelect={e => toggleSelect(item.id, e)}
                onEdit={e => openEdit(item, e)}
                onDelete={() => deleteItem(item.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Lightbox ────────────────────────────────────────────────────────── */}
      {lightboxIdx !== null && currentItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95"
          onClick={() => setLightboxIdx(null)}
        >
          {/* Barre actions haut */}
          <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-3 z-10 bg-gradient-to-b from-black/60 to-transparent">
            <div className="flex items-center gap-2 min-w-0">
              {currentItem.isVideo
                ? <FilmIcon className="h-4 w-4 text-white/60 shrink-0" />
                : <PhotoIcon className="h-4 w-4 text-white/60 shrink-0" />}
              <span className="text-white/80 text-sm truncate">{currentItem.nom}</span>
              <span className="text-white/40 text-xs hidden sm:inline">— {formatSize(currentItem.taille)}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {canShare && (
                <button
                  onClick={async e => {
                    e.stopPropagation()
                    const ok = await shareMedia(currentItem)
                    if (!ok) toast.error('Partage non disponible')
                  }}
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition"
                  title="Partager"
                >
                  <ShareIcon className="h-5 w-5" />
                </button>
              )}
              <a
                href={currentItem.url}
                download={currentItem.nom}
                onClick={e => e.stopPropagation()}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition"
                title="Télécharger"
              >
                <ArrowDownTrayIcon className="h-5 w-5" />
              </a>
              <button
                onClick={e => openEdit(currentItem, e)}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition"
                title="Modifier les tags"
              >
                <PencilSquareIcon className="h-5 w-5" />
              </button>
              {(isAdmin || currentItem.uploadedBy === session?.user?.name) && (
                <button
                  onClick={e => { e.stopPropagation(); deleteItem(currentItem.id) }}
                  className="p-2 rounded-full bg-red-500/40 hover:bg-red-500/70 text-white transition"
                  title="Supprimer"
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              )}
              <button onClick={() => setLightboxIdx(null)} className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Prev */}
          {lightboxIdx > 0 && (
            <button
              onClick={e => { e.stopPropagation(); setLightboxIdx(i => i !== null ? i - 1 : null) }}
              className="absolute left-2 sm:left-4 z-10 p-2.5 rounded-full bg-white/10 hover:bg-white/25 text-white transition"
            >
              <ChevronLeftIcon className="h-6 w-6 sm:h-7 sm:w-7" />
            </button>
          )}

          {/* Média */}
          <div
            className="max-w-5xl w-full max-h-[85vh] mx-12 sm:mx-20 flex flex-col items-center gap-3 px-2"
            onClick={e => e.stopPropagation()}
          >
            {currentItem.isVideo ? (
              <video
                src={currentItem.url}
                controls
                autoPlay
                className="max-h-[72vh] max-w-full rounded-xl shadow-2xl bg-black"
                onClick={e => e.stopPropagation()}
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={currentItem.url}
                alt={currentItem.nom}
                className="max-h-[72vh] max-w-full object-contain rounded-xl shadow-2xl"
              />
            )}
            {/* Infos bas */}
            {(currentItem.description || currentItem.tags.length > 0) && (
              <div className="text-center space-y-1.5 px-4 pb-2">
                {currentItem.description && (
                  <p className="text-white/80 text-sm leading-relaxed">{currentItem.description}</p>
                )}
                {currentItem.tags.length > 0 && (
                  <div className="flex flex-wrap justify-center gap-1.5">
                    {currentItem.tags.map(t => (
                      <span key={t} className="text-xs bg-white/15 text-white/80 rounded-full px-2.5 py-0.5">#{t}</span>
                    ))}
                  </div>
                )}
              </div>
            )}
            {/* Compteur */}
            <p className="text-white/30 text-xs pb-1">{lightboxIdx + 1} / {filtered.length}</p>
          </div>

          {/* Next */}
          {lightboxIdx < filtered.length - 1 && (
            <button
              onClick={e => { e.stopPropagation(); setLightboxIdx(i => i !== null ? i + 1 : null) }}
              className="absolute right-2 sm:right-4 z-10 p-2.5 rounded-full bg-white/10 hover:bg-white/25 text-white transition"
            >
              <ChevronRightIcon className="h-6 w-6 sm:h-7 sm:w-7" />
            </button>
          )}
        </div>
      )}

      {/* ── Dialog upload ───────────────────────────────────────────────────── */}
      {uploadDialog && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4">
          <div className="bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg border-t sm:border border-gray-200 dark:border-gray-700 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-900 z-10">
              <div>
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                  Ajouter des fichiers
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {pendingFiles.length} fichier{pendingFiles.length > 1 ? 's' : ''} — {pendingFiles.filter(f => f.type.startsWith('video/')).length} vidéo{pendingFiles.filter(f => f.type.startsWith('video/')).length > 1 ? 's' : ''}
                </p>
              </div>
              <button onClick={() => setUploadDialog(false)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-4">
              {/* Aperçus */}
              <div className="flex gap-2 flex-wrap">
                {pendingFiles.slice(0, 8).map((f, i) => (
                  <div key={i} className="relative h-14 w-14 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 shrink-0 border border-gray-200 dark:border-gray-700">
                    {f.type.startsWith('video/') ? (
                      <div className="h-full w-full flex items-center justify-center">
                        <FilmIcon className="h-6 w-6 text-gray-400" />
                      </div>
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={URL.createObjectURL(f)} alt={f.name} className="h-full w-full object-cover" />
                    )}
                  </div>
                ))}
                {pendingFiles.length > 8 && (
                  <div className="h-14 w-14 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xs text-gray-500 font-medium shrink-0 border border-gray-200 dark:border-gray-700">
                    +{pendingFiles.length - 8}
                  </div>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Description <span className="text-gray-400">(optionnel)</span>
                </label>
                <textarea
                  value={uploadDescription}
                  onChange={e => setUploadDescription(e.target.value)}
                  placeholder="Ex : marche en granit poli, fabrication atelier, arrondi R10…"
                  rows={2}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-violet-400 focus:border-transparent outline-none resize-none"
                />
              </div>

              {/* Tags */}
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  <TagIcon className="h-3.5 w-3.5 inline mr-1" />Tags
                </label>
                {uploadTags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {uploadTags.map(t => (
                      <TagChip key={t} tag={t} removable onRemove={() => setUploadTags(prev => prev.filter(x => x !== t))} />
                    ))}
                  </div>
                )}
                <div className="relative">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addUploadTag(tagInput) } }}
                    placeholder="Tapez un tag et appuyez sur Entrée…"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-violet-400 focus:border-transparent outline-none pr-10"
                  />
                  {tagInput && (
                    <button onClick={() => addUploadTag(tagInput)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-lg bg-violet-100 dark:bg-violet-900/30 text-violet-600 hover:bg-violet-200 transition">
                      <PlusIcon className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                {tagSuggestions(tagInput, uploadTags).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {tagSuggestions(tagInput, uploadTags).map(t => (
                      <button key={t} onClick={() => addUploadTag(t)} className="text-xs px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-violet-100 dark:hover:bg-violet-900/30 hover:text-violet-700 transition">
                        +{t}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Barre de progression */}
              {uploading && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Envoi en cours…</span><span>{uploadProgress}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-violet-500 to-purple-600 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-100 dark:border-gray-800 sticky bottom-0 bg-white dark:bg-gray-900">
              <button onClick={() => setUploadDialog(false)} className="px-4 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 transition rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800">
                Annuler
              </button>
              <button
                onClick={handleUploadSubmit}
                disabled={uploading}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-700 hover:to-purple-800 disabled:opacity-60 text-white rounded-xl text-sm font-semibold shadow-lg transition"
              >
                {uploading
                  ? <><div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />Envoi…</>
                  : <><ArrowUpTrayIcon className="h-4 w-4" />Publier {pendingFiles.length > 1 ? `(${pendingFiles.length})` : ''}</>
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Dialog édition ──────────────────────────────────────────────────── */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4">
          <div className="bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md border-t sm:border border-gray-200 dark:border-gray-700 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-900 z-10">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">Modifier</h2>
              <button onClick={() => setEditingItem(null)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="px-5 py-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Description</label>
                <textarea value={editDescription} onChange={e => setEditDescription(e.target.value)} rows={2}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-violet-400 focus:border-transparent outline-none resize-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Tags</label>
                {editTags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {editTags.map(t => (
                      <TagChip key={t} tag={t} removable onRemove={() => setEditTags(prev => prev.filter(x => x !== t))} />
                    ))}
                  </div>
                )}
                <div className="relative">
                  <input type="text" value={editTagInput} onChange={e => setEditTagInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addEditTag(editTagInput) } }}
                    placeholder="Ajouter un tag…"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-violet-400 focus:border-transparent outline-none pr-10" />
                  {editTagInput && (
                    <button onClick={() => addEditTag(editTagInput)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-lg bg-violet-100 dark:bg-violet-900/30 text-violet-600 hover:bg-violet-200 transition">
                      <PlusIcon className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                {tagSuggestions(editTagInput, editTags).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {tagSuggestions(editTagInput, editTags).map(t => (
                      <button key={t} onClick={() => addEditTag(t)} className="text-xs px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-violet-100 dark:hover:bg-violet-900/30 hover:text-violet-700 transition">+{t}</button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-100 dark:border-gray-800 sticky bottom-0 bg-white dark:bg-gray-900">
              <button onClick={() => setEditingItem(null)} className="px-4 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 transition rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800">Annuler</button>
              <button onClick={saveEdit} disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-700 hover:to-purple-800 disabled:opacity-60 text-white rounded-xl text-sm font-semibold shadow-lg transition">
                {saving ? <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : <CheckIcon className="h-4 w-4" />}
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Carte média (extractée pour perf) ─────────────────────────────────────────

interface MediaCardProps {
  item: MediaItem
  idx: number
  selectMode: boolean
  selected: boolean
  isOwner: boolean
  onOpen: () => void
  onToggleSelect: (e: React.MouseEvent) => void
  onEdit: (e: React.MouseEvent) => void
  onDelete: () => void
}

function MediaCard({ item, selectMode, selected, isOwner, onOpen, onToggleSelect, onEdit, onDelete }: MediaCardProps) {
  return (
    <div
      className={`relative group break-inside-avoid rounded-2xl overflow-hidden cursor-pointer mb-2.5
        bg-gray-100 dark:bg-gray-800
        shadow-sm hover:shadow-xl
        transition-all duration-200 ease-out
        ${selected ? 'ring-2 ring-violet-500 ring-offset-2 dark:ring-offset-gray-900' : ''}
      `}
      onClick={() => selectMode ? onOpen() : onOpen()}
    >
      {/* Média */}
      {item.isVideo ? (
        <div className="relative w-full">
          <video
            src={item.url + '#t=0.5'}
            className="w-full object-cover"
            preload="metadata"
            muted
            playsInline
          />
          {/* Badge vidéo */}
          <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/60 text-white rounded-full px-2 py-0.5">
            <PlayIcon className="h-3 w-3" />
            <span className="text-[10px] font-medium">Vidéo</span>
          </div>
        </div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.url} alt={item.nom} className="w-full object-cover" loading="lazy" />
      )}

      {/* Overlay hover — œil centré + barre basse */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-200 flex flex-col">
        {/* Icône œil centrée */}
        <div className="flex-1 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <button
            onClick={e => { e.stopPropagation(); onOpen() }}
            className="p-3 rounded-full bg-white/20 hover:bg-white/40 backdrop-blur-sm text-white transition-all hover:scale-110"
            title="Voir en grand"
          >
            <EyeIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Barre basse : download + edit + delete */}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 px-2 pb-2">
          <div className="flex items-center justify-end gap-1.5">
            <a
              href={item.url}
              download={item.nom}
              onClick={e => e.stopPropagation()}
              className="p-1.5 rounded-lg bg-white/20 hover:bg-white/40 text-white transition"
              title="Télécharger"
            >
              <ArrowDownTrayIcon className="h-4 w-4" />
            </a>
            <button onClick={onEdit} className="p-1.5 rounded-lg bg-white/20 hover:bg-white/40 text-white transition" title="Modifier">
              <PencilSquareIcon className="h-4 w-4" />
            </button>
            {isOwner && (
              <button
                onClick={e => { e.stopPropagation(); onDelete() }}
                className="p-1.5 rounded-lg bg-red-500/50 hover:bg-red-500/80 text-white transition"
                title="Supprimer"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Checkbox mode sélection */}
      {selectMode && (
        <div
          className={`absolute top-2 left-2 h-5 w-5 rounded-full border-2 flex items-center justify-center transition cursor-pointer
            ${selected ? 'bg-violet-600 border-violet-600' : 'bg-white/70 border-white'}`}
          onClick={onToggleSelect}
        >
          {selected && <CheckIcon className="h-3 w-3 text-white" />}
        </div>
      )}

      {/* Tags discrets (toujours visibles, en bas) */}
      {item.tags.length > 0 && (
        <div className="absolute bottom-0 left-0 right-0 p-1.5 flex gap-1 flex-wrap opacity-0 group-hover:opacity-0 pointer-events-none" />
      )}
    </div>
  )
}
