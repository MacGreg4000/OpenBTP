'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import {
  ArrowLeftIcon,
  ArchiveBoxIcon,
  CameraIcon,
  CheckCircleIcon,
  XMarkIcon,
  PlusIcon,
  ListBulletIcon,
  PencilSquareIcon,
  TrashIcon,
  ClockIcon,
} from '@heroicons/react/24/outline'
import Image from 'next/image'

interface Magasinier {
  id: string
  nom: string
  actif: boolean
}

interface Tache {
  id: string
  titre: string
  description: string | null
  dateExecution: string
  statut: string
  magasinier: { id: string; nom: string }
  photos: { id: string; url: string; type: string }[]
}

export default function TacheRapidePage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const editFileInputRef = useRef<HTMLInputElement>(null)

  const [tab, setTab] = useState<'nouvelle' | 'liste'>('nouvelle')
  const [magasiniers, setMagasiniers] = useState<Magasinier[]>([])
  const [taches, setTaches] = useState<Tache[]>([])
  const [loadingMag, setLoadingMag] = useState(true)
  const [loadingTaches, setLoadingTaches] = useState(false)

  // Formulaire création
  const [magasinierId, setMagasinierId] = useState('')
  const [titre, setTitre] = useState('')
  const [description, setDescription] = useState('')
  const [dateExecution, setDateExecution] = useState(() => new Date().toISOString().slice(0, 10))
  const [photos, setPhotos] = useState<File[]>([])
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Édition
  const [editTache, setEditTache] = useState<Tache | null>(null)
  const [editTitre, setEditTitre] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [editDate, setEditDate] = useState('')
  const [editMagasinierId, setEditMagasinierId] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'loading') return
    if (status === 'unauthenticated') {
      router.push('/login?callbackUrl=/mobile/logistique/tache-rapide')
      return
    }
    if (session?.user?.role !== 'ADMIN' && session?.user?.role !== 'MANAGER') {
      router.push('/mobile')
      return
    }

    fetch('/api/magasiniers')
      .then(r => r.json())
      .then(data => setMagasiniers(Array.isArray(data) ? data.filter((m: Magasinier) => m.actif) : []))
      .catch(() => setMagasiniers([]))
      .finally(() => setLoadingMag(false))
  }, [status, session, router])

  // Pré-sélectionner le magasinier s'il n'y en a qu'un
  useEffect(() => {
    if (magasiniers.length === 1 && !magasinierId) {
      setMagasinierId(magasiniers[0].id)
    }
  }, [magasiniers, magasinierId])

  const loadTaches = async () => {
    setLoadingTaches(true)
    try {
      const res = await fetch('/api/logistique/taches')
      if (res.ok) setTaches(await res.json())
    } catch {
      setTaches([])
    } finally {
      setLoadingTaches(false)
    }
  }

  useEffect(() => {
    if (tab === 'liste') loadTaches()
  }, [tab])

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    setPhotos(prev => [...prev, ...files])
    const urls = files.map(f => URL.createObjectURL(f))
    setPhotoPreviewUrls(prev => [...prev, ...urls])
    e.target.value = ''
  }

  const removePhoto = (index: number) => {
    URL.revokeObjectURL(photoPreviewUrls[index])
    setPhotos(prev => prev.filter((_, i) => i !== index))
    setPhotoPreviewUrls(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!magasinierId) { setError('Veuillez sélectionner un magasinier'); return }
    if (!titre.trim()) { setError('Le titre est obligatoire'); return }

    setSaving(true)
    try {
      let res: Response
      if (photos.length > 0) {
        const fd = new FormData()
        fd.append('titre', titre.trim())
        fd.append('description', description.trim())
        fd.append('dateExecution', dateExecution)
        fd.append('magasinierId', magasinierId)
        photos.forEach(f => fd.append('photos', f))
        res = await fetch('/api/logistique/taches', { method: 'POST', body: fd })
      } else {
        res = await fetch('/api/logistique/taches', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            titre: titre.trim(),
            description: description.trim() || undefined,
            dateExecution,
            magasinierId,
          })
        })
      }

      if (res.ok) {
        setSuccess(true)
        setTitre('')
        setDescription('')
        setDateExecution(new Date().toISOString().slice(0, 10))
        setMagasinierId('')
        photoPreviewUrls.forEach(url => URL.revokeObjectURL(url))
        setPhotos([])
        setPhotoPreviewUrls([])
      } else {
        const data = await res.json().catch(() => null)
        setError(data?.error || 'Erreur lors de la création de la tâche')
      }
    } catch {
      setError('Erreur réseau, veuillez réessayer')
    } finally {
      setSaving(false)
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
        loadTaches()
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
        setTaches(prev => prev.filter(t => t.id !== id))
      } else {
        alert('Erreur lors de la suppression')
      }
    } catch {
      alert('Erreur réseau')
    } finally {
      setDeletingId(null)
    }
  }

  const formatDate = (s: string) =>
    new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })

  if (status === 'loading' || loadingMag) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-600 to-orange-700 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white" />
      </div>
    )
  }

  // Écran de succès
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-100 flex flex-col items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full text-center space-y-5">
          <div className="flex items-center justify-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircleIcon className="h-10 w-10 text-green-600" />
            </div>
          </div>
          <h2 className="text-xl font-bold text-gray-900">Tâche créée !</h2>
          <p className="text-sm text-gray-600">
            La tâche a été assignée avec succès au magasinier.
          </p>
          <div className="space-y-3 pt-2">
            <button
              onClick={() => setSuccess(false)}
              className="w-full py-3 bg-amber-600 text-white rounded-xl font-semibold hover:bg-amber-700 transition-colors"
            >
              Créer une autre tâche
            </button>
            <button
              onClick={() => router.push('/mobile')}
              className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
            >
              Retour à l&apos;accueil
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-100 pb-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-lg sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => router.push('/mobile')}
            className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2 flex-1">
            <ArchiveBoxIcon className="h-6 w-6" />
            <div>
              <h1 className="font-bold text-lg leading-tight">Logistique</h1>
              <p className="text-xs text-amber-100">Tâches magasinier</p>
            </div>
          </div>
        </div>
        {/* Onglets */}
        <div className="flex border-t border-white/20">
          <button
            onClick={() => setTab('nouvelle')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
              tab === 'nouvelle' ? 'bg-white/20 text-white' : 'text-white/70 hover:text-white hover:bg-white/10'
            }`}
          >
            <PlusIcon className="h-4 w-4" />
            Nouvelle tâche
          </button>
          <button
            onClick={() => setTab('liste')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
              tab === 'liste' ? 'bg-white/20 text-white' : 'text-white/70 hover:text-white hover:bg-white/10'
            }`}
          >
            <ListBulletIcon className="h-4 w-4" />
            Liste des tâches
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">

        {/* ========== ONGLET NOUVELLE TÂCHE ========== */}
        {tab === 'nouvelle' && (
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Magasinier */}
            <div className="bg-white rounded-2xl shadow-sm p-4 space-y-2">
              <label className="block text-sm font-semibold text-gray-700">
                Magasinier <span className="text-red-500">*</span>
              </label>
              {magasiniers.length === 0 ? (
                <p className="text-sm text-gray-500 py-2">Aucun magasinier actif trouvé</p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {magasiniers.map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMagasinierId(m.id)}
                      className={`py-3 px-3 rounded-xl border-2 font-medium text-sm transition-all ${
                        magasinierId === m.id
                          ? 'border-amber-500 bg-amber-50 text-amber-800'
                          : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-amber-300 hover:bg-amber-50/50'
                      }`}
                    >
                      {m.nom}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Titre */}
            <div className="bg-white rounded-2xl shadow-sm p-4 space-y-2">
              <label className="block text-sm font-semibold text-gray-700">
                Titre de la tâche <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={titre}
                onChange={e => setTitre(e.target.value)}
                placeholder="Ex : Rangement étagère A3, Inventaire stock..."
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-400 text-base"
              />
            </div>

            {/* Description */}
            <div className="bg-white rounded-2xl shadow-sm p-4 space-y-2">
              <label className="block text-sm font-semibold text-gray-700">
                Description <span className="text-gray-400 font-normal text-xs">(optionnel)</span>
              </label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Détails supplémentaires..."
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-400 text-base resize-none"
              />
            </div>

            {/* Date d'exécution */}
            <div className="bg-white rounded-2xl shadow-sm p-4 space-y-2">
              <label className="block text-sm font-semibold text-gray-700">
                Date d&apos;exécution
              </label>
              <input
                type="date"
                value={dateExecution}
                onChange={e => setDateExecution(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-400 text-base"
              />
            </div>

            {/* Photos */}
            <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
              <label className="block text-sm font-semibold text-gray-700">
                Photos <span className="text-gray-400 font-normal text-xs">(optionnel)</span>
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-3 py-4 rounded-xl border-2 border-dashed border-amber-300 text-amber-700 hover:bg-amber-50 transition-colors"
              >
                <CameraIcon className="h-6 w-6" />
                <span className="font-medium">Prendre / Ajouter une photo</span>
              </button>

              {photoPreviewUrls.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {photoPreviewUrls.map((url, i) => (
                    <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-gray-100">
                      <Image
                        src={url}
                        alt={`Photo ${i + 1}`}
                        fill
                        className="object-cover"
                        sizes="120px"
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(i)}
                        className="absolute top-1 right-1 p-1 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
                      >
                        <XMarkIcon className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Erreur */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Bouton créer */}
            <button
              type="submit"
              disabled={saving || !titre.trim() || !magasinierId}
              className="w-full py-4 bg-amber-600 text-white rounded-2xl font-bold text-lg shadow-lg hover:bg-amber-700 active:bg-amber-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-3"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                  Création...
                </>
              ) : (
                <>
                  <PlusIcon className="h-6 w-6" />
                  Créer la tâche
                </>
              )}
            </button>

          </form>
        )}

        {/* ========== ONGLET LISTE DES TÂCHES ========== */}
        {tab === 'liste' && (
          <div className="space-y-3">
            {loadingTaches ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-600" />
              </div>
            ) : taches.length === 0 ? (
              <div className="text-center py-16 text-gray-500 bg-white rounded-2xl shadow-sm">
                <ArchiveBoxIcon className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                <p>Aucune tâche trouvée</p>
              </div>
            ) : (
              taches.map((t) => (
                <div
                  key={t.id}
                  className="bg-white rounded-2xl shadow-sm p-4 border border-gray-100"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-gray-900">{t.titre}</h3>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {t.magasinier.nom} • {formatDate(t.dateExecution)}
                      </p>
                      {t.description && (
                        <p className="text-sm text-gray-600 mt-1">{t.description}</p>
                      )}
                      <span
                        className={`inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full text-xs font-medium ${
                          t.statut === 'VALIDEE'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {t.statut === 'VALIDEE'
                          ? <><CheckCircleIcon className="h-3 w-3" /> Validée</>
                          : <><ClockIcon className="h-3 w-3" /> À faire</>
                        }
                      </span>
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      {t.photos?.length > 0 && (
                        <div className="flex gap-1">
                          {t.photos.slice(0, 2).map((p) => (
                            <div key={p.id} className="relative w-10 h-10 rounded-lg overflow-hidden bg-gray-100">
                              <Image src={p.url} alt="" fill className="object-cover" sizes="40px" />
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEdit(t)}
                          className="p-2 text-gray-400 hover:text-amber-600 rounded-lg transition-colors"
                          title="Modifier"
                        >
                          <PencilSquareIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteTache(t.id)}
                          disabled={deletingId === t.id}
                          className="p-2 text-gray-400 hover:text-red-600 rounded-lg transition-colors disabled:opacity-50"
                          title="Supprimer"
                        >
                          {deletingId === t.id
                            ? <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-red-600" />
                            : <TrashIcon className="h-5 w-5" />
                          }
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Modale d'édition */}
      {editTache && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50">
          <div className="bg-white rounded-t-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-lg text-gray-900">Modifier la tâche</h3>
              <button onClick={() => setEditTache(null)} className="p-2 text-gray-400 hover:text-gray-600">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Titre *</label>
                <input
                  type="text"
                  value={editTitre}
                  onChange={e => setEditTitre(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={editDesc}
                  onChange={e => setEditDesc(e.target.value)}
                  rows={2}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date d&apos;exécution</label>
                <input
                  type="date"
                  value={editDate}
                  onChange={e => setEditDate(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Magasinier</label>
                <div className="grid grid-cols-2 gap-2">
                  {magasiniers.map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setEditMagasinierId(m.id)}
                      className={`py-3 px-3 rounded-xl border-2 font-medium text-sm transition-all ${
                        editMagasinierId === m.id
                          ? 'border-amber-500 bg-amber-50 text-amber-800'
                          : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-amber-300'
                      }`}
                    >
                      {m.nom}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 p-4 border-t border-gray-100">
              <button
                onClick={() => setEditTache(null)}
                className="flex-1 py-3 rounded-xl border border-gray-300 text-gray-700 font-medium"
              >
                Annuler
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={savingEdit || !editTitre.trim()}
                className="flex-1 py-3 rounded-xl bg-amber-600 text-white font-medium disabled:opacity-50"
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
