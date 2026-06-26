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
  FunnelIcon
} from '@heroicons/react/24/outline'
import { PageHeader } from '@/components/PageHeader'
import { compressImage } from '@/lib/utils/image-compression'
import { toast } from 'react-hot-toast'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Photo {
  id: number
  nom: string
  url: string
  taille: number
  description: string
  tags: string[]
  uploadedBy: string
  createdAt: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function TagChip({
  tag,
  count,
  active,
  onClick,
  removable,
  onRemove
}: {
  tag: string
  count?: number
  active?: boolean
  onClick?: () => void
  removable?: boolean
  onRemove?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-all
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
        <XMarkIcon
          className="h-3 w-3 ml-0.5 opacity-70 hover:opacity-100"
          onClick={e => { e.stopPropagation(); onRemove() }}
        />
      )}
    </button>
  )
}

// ── Composant principal ────────────────────────────────────────────────────────

export default function MediathequePage() {
  const { data: session } = useSession()

  // ── État principal ─────────────────────────────────────────────────────────
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTags, setActiveTags] = useState<string[]>([])
  const [search, setSearch] = useState('')

  // ── Upload ─────────────────────────────────────────────────────────────────
  const [uploadDialog, setUploadDialog] = useState(false)
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [uploadTags, setUploadTags] = useState<string[]>([])
  const [uploadDescription, setUploadDescription] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [allTags, setAllTags] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Lightbox ───────────────────────────────────────────────────────────────
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null)

  // ── Edition tags ───────────────────────────────────────────────────────────
  const [editingPhoto, setEditingPhoto] = useState<Photo | null>(null)
  const [editTags, setEditTags] = useState<string[]>([])
  const [editDescription, setEditDescription] = useState('')
  const [editTagInput, setEditTagInput] = useState('')
  const [saving, setSaving] = useState(false)

  // ── Sélection multiple ─────────────────────────────────────────────────────
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [selectMode, setSelectMode] = useState(false)

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchPhotos = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (activeTags.length) params.set('tags', activeTags.join(','))
      const res = await fetch(`/api/mediatheque?${params}`)
      if (res.ok) setPhotos(await res.json())
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

  useEffect(() => { fetchPhotos() }, [fetchPhotos])
  useEffect(() => { fetchTags() }, [fetchTags])

  // ── Tags déduits des photos chargées + compteurs ───────────────────────────

  const tagCounts = useMemo(() => {
    const map: Record<string, number> = {}
    for (const p of photos) {
      for (const t of p.tags) map[t] = (map[t] ?? 0) + 1
    }
    return map
  }, [photos])

  const sortedTagCounts = useMemo(
    () => Object.entries(tagCounts).sort((a, b) => b[1] - a[1]),
    [tagCounts]
  )

  // ── Filtrage client (recherche textuelle) ─────────────────────────────────

  const filtered = useMemo(() => {
    if (!search) return photos
    const q = search.toLowerCase()
    return photos.filter(p =>
      p.nom.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.tags.some(t => t.includes(q))
    )
  }, [photos, search])

  // ── Upload ─────────────────────────────────────────────────────────────────

  const openUploadDialog = (files: File[]) => {
    const images = files.filter(f => f.type.startsWith('image/'))
    if (!images.length) { toast.error('Aucune image sélectionnée'); return }
    setPendingFiles(images)
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
    e.preventDefault()
    setDragOver(false)
    openUploadDialog(Array.from(e.dataTransfer.files))
  }

  const addUploadTag = (tag: string) => {
    const n = tag.trim().toLowerCase()
    if (n && !uploadTags.includes(n)) setUploadTags(prev => [...prev, n])
    setTagInput('')
  }

  const handleUploadSubmit = async () => {
    if (!pendingFiles.length) return
    setUploading(true)
    let success = 0
    try {
      for (const file of pendingFiles) {
        const compressed = await compressImage(file, 1920, 1920, 0.85)
        const fd = new FormData()
        fd.append('file', compressed)
        fd.append('tags', JSON.stringify(uploadTags))
        fd.append('description', uploadDescription)
        const res = await fetch('/api/mediatheque', { method: 'POST', body: fd })
        if (res.ok) success++
        else {
          const err = await res.json()
          toast.error(`${file.name} : ${err.error}`)
        }
      }
      if (success > 0) {
        toast.success(`${success} photo${success > 1 ? 's' : ''} ajoutée${success > 1 ? 's' : ''}`)
        setUploadDialog(false)
        await fetchPhotos()
        await fetchTags()
      }
    } finally {
      setUploading(false)
    }
  }

  // ── Suppression ────────────────────────────────────────────────────────────

  const deletePhoto = async (id: number) => {
    if (!confirm('Supprimer cette photo ?')) return
    const res = await fetch(`/api/mediatheque/${id}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('Photo supprimée')
      setPhotos(prev => prev.filter(p => p.id !== id))
      if (lightboxIdx !== null) setLightboxIdx(null)
    } else {
      toast.error('Erreur lors de la suppression')
    }
  }

  const deleteSelected = async () => {
    if (!confirm(`Supprimer ${selected.size} photo${selected.size > 1 ? 's' : ''} ?`)) return
    let ok = 0
    for (const id of selected) {
      const res = await fetch(`/api/mediatheque/${id}`, { method: 'DELETE' })
      if (res.ok) ok++
    }
    toast.success(`${ok} photo${ok > 1 ? 's' : ''} supprimée${ok > 1 ? 's' : ''}`)
    setSelected(new Set())
    setSelectMode(false)
    await fetchPhotos()
  }

  // ── Edition ────────────────────────────────────────────────────────────────

  const openEdit = (photo: Photo, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingPhoto(photo)
    setEditTags([...photo.tags])
    setEditDescription(photo.description)
    setEditTagInput('')
  }

  const addEditTag = (tag: string) => {
    const n = tag.trim().toLowerCase()
    if (n && !editTags.includes(n)) setEditTags(prev => [...prev, n])
    setEditTagInput('')
  }

  const saveEdit = async () => {
    if (!editingPhoto) return
    setSaving(true)
    try {
      const res = await fetch(`/api/mediatheque/${editingPhoto.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: editTags, description: editDescription })
      })
      if (res.ok) {
        toast.success('Mis à jour')
        setPhotos(prev => prev.map(p =>
          p.id === editingPhoto.id ? { ...p, tags: editTags, description: editDescription } : p
        ))
        setEditingPhoto(null)
        await fetchTags()
      } else {
        toast.error('Erreur lors de la sauvegarde')
      }
    } finally {
      setSaving(false)
    }
  }

  // ── Lightbox ───────────────────────────────────────────────────────────────

  const currentPhoto = lightboxIdx !== null ? filtered[lightboxIdx] ?? null : null

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
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // ── Autocomplete tags ──────────────────────────────────────────────────────

  const tagSuggestions = (input: string, current: string[]) =>
    input.length >= 1
      ? allTags.filter(t => t.includes(input.toLowerCase()) && !current.includes(t)).slice(0, 6)
      : []

  // ── Render ─────────────────────────────────────────────────────────────────

  const isAdmin = session?.user?.role === 'ADMIN'

  const statsCards = (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg px-3 py-2 border border-gray-200/50 dark:border-gray-700/50 shadow-md">
        <div className="text-[10px] font-medium text-gray-500 dark:text-gray-400">Photos</div>
        <div className="text-sm font-bold text-gray-900 dark:text-white">{photos.length}</div>
      </div>
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg px-3 py-2 border border-gray-200/50 dark:border-gray-700/50 shadow-md">
        <div className="text-[10px] font-medium text-gray-500 dark:text-gray-400">Tags</div>
        <div className="text-sm font-bold text-gray-900 dark:text-white">{sortedTagCounts.length}</div>
      </div>
    </div>
  )

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-gray-50 via-violet-50/20 to-purple-50/10 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900"
      onDragOver={e => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      {/* Overlay drag & drop global */}
      {dragOver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-violet-600/20 backdrop-blur-sm border-4 border-dashed border-violet-400 rounded-2xl pointer-events-none">
          <div className="text-center text-violet-700 dark:text-violet-300">
            <ArrowUpTrayIcon className="h-16 w-16 mx-auto mb-3" />
            <p className="text-xl font-semibold">Déposez vos photos ici</p>
          </div>
        </div>
      )}

      <PageHeader
        title="Photothèque"
        subtitle="Bibliothèque de référence — recherche par tags"
        icon={PhotoIcon}
        badgeColor="from-violet-500 via-purple-500 to-fuchsia-600"
        gradientColor="from-violet-500/10 via-purple-500/10 to-fuchsia-600/10"
        stats={statsCards}
        actions={
          <div className="flex items-center gap-2">
            {selectMode && selected.size > 0 && (
              <button
                onClick={deleteSelected}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold shadow-lg transition"
              >
                <TrashIcon className="h-4 w-4" />
                Supprimer ({selected.size})
              </button>
            )}
            <button
              onClick={() => { setSelectMode(v => !v); setSelected(new Set()) }}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold shadow-lg transition
                ${selectMode ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200' : 'bg-white/80 dark:bg-gray-800/80 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700'}`}
            >
              <CheckIcon className="h-4 w-4" />
              {selectMode ? 'Annuler sélection' : 'Sélectionner'}
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-700 hover:to-purple-800 text-white rounded-lg shadow-lg transition-all text-sm font-semibold"
            >
              <ArrowUpTrayIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Ajouter des photos</span>
              <span className="sm:hidden">Ajouter</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFilePick}
            />
          </div>
        }
      />

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* Barre de recherche + filtres */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par nom, tag ou description…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-violet-400 focus:border-transparent outline-none"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <XMarkIcon className="h-4 w-4" />
              </button>
            )}
          </div>
          {activeTags.length > 0 && (
            <button
              onClick={() => setActiveTags([])}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-violet-600 dark:text-violet-300 bg-violet-50 dark:bg-violet-900/20 rounded-xl border border-violet-200 dark:border-violet-700 hover:bg-violet-100 transition"
            >
              <FunnelIcon className="h-4 w-4" />
              Effacer filtres ({activeTags.length})
            </button>
          )}
        </div>

        {/* Nuage de tags */}
        {sortedTagCounts.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {sortedTagCounts.map(([tag, count]) => (
              <TagChip
                key={tag}
                tag={tag}
                count={count}
                active={activeTags.includes(tag)}
                onClick={() => setActiveTags(prev =>
                  prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
                )}
              />
            ))}
          </div>
        )}

        {/* Galerie masonry */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center text-gray-400 dark:text-gray-500">
            <PhotoIcon className="h-16 w-16 mb-4 opacity-30" />
            <p className="text-lg font-medium">
              {photos.length === 0 ? 'Aucune photo pour l\'instant' : 'Aucun résultat'}
            </p>
            <p className="text-sm mt-1">
              {photos.length === 0
                ? 'Glissez-déposez des images ou cliquez sur « Ajouter des photos »'
                : 'Modifiez votre recherche ou vos filtres de tags'}
            </p>
          </div>
        ) : (
          <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 gap-3 space-y-3">
            {filtered.map((photo, idx) => (
              <div
                key={photo.id}
                className={`relative group break-inside-avoid rounded-xl overflow-hidden cursor-pointer shadow-sm hover:shadow-lg transition-all
                  ${selected.has(photo.id) ? 'ring-2 ring-violet-500 ring-offset-2' : ''}`}
                onClick={() => selectMode ? toggleSelect(photo.id, { stopPropagation: () => {} } as React.MouseEvent) : setLightboxIdx(idx)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.url}
                  alt={photo.nom}
                  className="w-full object-cover"
                  loading="lazy"
                />

                {/* Overlay hover */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="absolute bottom-0 left-0 right-0 p-2">
                    {photo.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-1.5">
                        {photo.tags.slice(0, 3).map(t => (
                          <span key={t} className="text-[10px] bg-white/20 text-white rounded-full px-2 py-0.5">#{t}</span>
                        ))}
                        {photo.tags.length > 3 && (
                          <span className="text-[10px] bg-white/20 text-white rounded-full px-2 py-0.5">+{photo.tags.length - 3}</span>
                        )}
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 justify-end">
                      <a
                        href={photo.url}
                        download={photo.nom}
                        onClick={e => e.stopPropagation()}
                        className="p-1.5 rounded-lg bg-white/20 hover:bg-white/40 text-white transition"
                        title="Télécharger"
                      >
                        <ArrowDownTrayIcon className="h-4 w-4" />
                      </a>
                      <button
                        onClick={e => openEdit(photo, e)}
                        className="p-1.5 rounded-lg bg-white/20 hover:bg-white/40 text-white transition"
                        title="Modifier les tags"
                      >
                        <PencilSquareIcon className="h-4 w-4" />
                      </button>
                      {(isAdmin || photo.uploadedBy === session?.user?.name) && (
                        <button
                          onClick={e => { e.stopPropagation(); deletePhoto(photo.id) }}
                          className="p-1.5 rounded-lg bg-red-500/60 hover:bg-red-500 text-white transition"
                          title="Supprimer"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Checkbox sélection */}
                {selectMode && (
                  <div
                    className={`absolute top-2 left-2 h-5 w-5 rounded-full border-2 flex items-center justify-center transition
                      ${selected.has(photo.id) ? 'bg-violet-600 border-violet-600' : 'bg-white/70 border-gray-300'}`}
                    onClick={e => toggleSelect(photo.id, e)}
                  >
                    {selected.has(photo.id) && <CheckIcon className="h-3 w-3 text-white" />}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Lightbox ──────────────────────────────────────────────────────── */}
      {lightboxIdx !== null && currentPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
          onClick={() => setLightboxIdx(null)}
        >
          {/* Fermer */}
          <button
            onClick={() => setLightboxIdx(null)}
            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>

          {/* Prev */}
          {lightboxIdx > 0 && (
            <button
              onClick={e => { e.stopPropagation(); setLightboxIdx(i => i !== null ? i - 1 : null) }}
              className="absolute left-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition"
            >
              <ChevronLeftIcon className="h-8 w-8" />
            </button>
          )}

          {/* Photo */}
          <div className="max-w-5xl max-h-[90vh] mx-16 flex flex-col items-center gap-4" onClick={e => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={currentPhoto.url}
              alt={currentPhoto.nom}
              className="max-h-[75vh] max-w-full object-contain rounded-xl shadow-2xl"
            />
            <div className="text-center space-y-2 px-4">
              {currentPhoto.description && (
                <p className="text-white/90 text-sm">{currentPhoto.description}</p>
              )}
              {currentPhoto.tags.length > 0 && (
                <div className="flex flex-wrap justify-center gap-1.5">
                  {currentPhoto.tags.map(t => (
                    <span key={t} className="text-xs bg-white/15 text-white/90 rounded-full px-3 py-0.5">#{t}</span>
                  ))}
                </div>
              )}
              <p className="text-white/40 text-xs">{currentPhoto.nom} — {currentPhoto.uploadedBy}</p>
            </div>
          </div>

          {/* Next */}
          {lightboxIdx < filtered.length - 1 && (
            <button
              onClick={e => { e.stopPropagation(); setLightboxIdx(i => i !== null ? i + 1 : null) }}
              className="absolute right-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition"
            >
              <ChevronRightIcon className="h-8 w-8" />
            </button>
          )}
        </div>
      )}

      {/* ── Dialog upload ─────────────────────────────────────────────────── */}
      {uploadDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
              <div>
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">Ajouter des photos</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {pendingFiles.length} fichier{pendingFiles.length > 1 ? 's' : ''} sélectionné{pendingFiles.length > 1 ? 's' : ''}
                </p>
              </div>
              <button onClick={() => setUploadDialog(false)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="px-6 py-4 space-y-4">
              {/* Aperçus */}
              <div className="flex gap-2 flex-wrap">
                {pendingFiles.slice(0, 6).map((f, i) => (
                  <div key={i} className="relative h-14 w-14 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={URL.createObjectURL(f)}
                      alt={f.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ))}
                {pendingFiles.length > 6 && (
                  <div className="h-14 w-14 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xs text-gray-500 font-medium shrink-0">
                    +{pendingFiles.length - 6}
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
                  <TagIcon className="h-3.5 w-3.5 inline mr-1" />
                  Tags
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
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addUploadTag(tagInput) }
                    }}
                    placeholder="Tapez un tag et appuyez sur Entrée…"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-violet-400 focus:border-transparent outline-none pr-10"
                  />
                  {tagInput && (
                    <button
                      onClick={() => addUploadTag(tagInput)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-lg bg-violet-100 dark:bg-violet-900/30 text-violet-600 hover:bg-violet-200 transition"
                    >
                      <PlusIcon className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                {/* Suggestions */}
                {tagSuggestions(tagInput, uploadTags).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {tagSuggestions(tagInput, uploadTags).map(t => (
                      <button
                        key={t}
                        onClick={() => addUploadTag(t)}
                        className="text-xs px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-violet-100 dark:hover:bg-violet-900/30 hover:text-violet-700 transition"
                      >
                        +{t}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100 dark:border-gray-800">
              <button
                onClick={() => setUploadDialog(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 transition"
              >
                Annuler
              </button>
              <button
                onClick={handleUploadSubmit}
                disabled={uploading}
                className="inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-700 hover:to-purple-800 disabled:opacity-60 text-white rounded-xl text-sm font-semibold shadow-lg transition"
              >
                {uploading ? (
                  <><div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />Envoi…</>
                ) : (
                  <><ArrowUpTrayIcon className="h-4 w-4" />Publier {pendingFiles.length > 1 ? `(${pendingFiles.length})` : ''}</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Dialog édition tags ────────────────────────────────────────────── */}
      {editingPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">Modifier la photo</h2>
              <button onClick={() => setEditingPhoto(null)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Description</label>
                <textarea
                  value={editDescription}
                  onChange={e => setEditDescription(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-violet-400 focus:border-transparent outline-none resize-none"
                />
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
                  <input
                    type="text"
                    value={editTagInput}
                    onChange={e => setEditTagInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addEditTag(editTagInput) }
                    }}
                    placeholder="Ajouter un tag…"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-violet-400 focus:border-transparent outline-none pr-10"
                  />
                  {editTagInput && (
                    <button onClick={() => addEditTag(editTagInput)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-lg bg-violet-100 dark:bg-violet-900/30 text-violet-600 hover:bg-violet-200 transition">
                      <PlusIcon className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                {tagSuggestions(editTagInput, editTags).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {tagSuggestions(editTagInput, editTags).map(t => (
                      <button key={t} onClick={() => addEditTag(t)} className="text-xs px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-violet-100 dark:hover:bg-violet-900/30 hover:text-violet-700 transition">
                        +{t}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100 dark:border-gray-800">
              <button onClick={() => setEditingPhoto(null)} className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 transition">
                Annuler
              </button>
              <button
                onClick={saveEdit}
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-700 hover:to-purple-800 disabled:opacity-60 text-white rounded-xl text-sm font-semibold shadow-lg transition"
              >
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
