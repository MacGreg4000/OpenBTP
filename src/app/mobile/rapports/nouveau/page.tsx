'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import { useSelectedChantier } from '@/contexts/SelectedChantierContext'
import { compressImages } from '@/lib/utils/image-compression'
import {
  ArrowLeftIcon,
  CameraIcon,
  XMarkIcon,
  UserGroupIcon,
  DocumentTextIcon,
  PaperAirplaneIcon,
  PlusIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  TagIcon,
} from '@heroicons/react/24/outline'
import { format } from 'date-fns'

const TAGS_PAR_DEFAUT = ['Général']

interface Photo {
  id: string
  file: File
  preview: string
  annotation: string
  tags: string[]
}

interface Personne {
  id: string
  nom: string
  fonction: string
}

interface Note {
  id: string
  contenu: string
  tags: string[]
}

export default function MobileNouveauRapportPage() {
  const router = useRouter()
  const { selectedChantier } = useSelectedChantier()
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [notes, setNotes] = useState<Note[]>([])
  const [photos, setPhotos] = useState<Photo[]>([])
  const [personnes, setPersonnes] = useState<Personne[]>([])
  const [nouveauNom, setNouveauNom] = useState('')
  const [nouvelleFonction, setNouvelleFonction] = useState('')
  const [nouvelleNote, setNouvelleNote] = useState('')
  const [noteTags, setNoteTags] = useState<string[]>(['Général'])
  const [tagsDisponibles, setTagsDisponibles] = useState<string[]>([...TAGS_PAR_DEFAUT])
  const [nouveauTag, setNouveauTag] = useState('')
  const [tagsMenuOpen, setTagsMenuOpen] = useState(false)
  const [personnesSectionOpen, setPersonnesSectionOpen] = useState(true)
  const [saving, setSaving] = useState(false)
  const [compressing, setCompressing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!selectedChantier) {
      router.push('/mobile')
      return
    }
    // Charger les tags personnalisés depuis le localStorage
    try {
      const savedTags = localStorage.getItem('tags_personnalises')
      if (savedTags) {
        const parsedTags = JSON.parse(savedTags)
        if (Array.isArray(parsedTags) && parsedTags.length > 0) {
          const filteredTags = parsedTags.filter(
            (tag: string) =>
              tag !== 'testag' && tag.trim() !== '' && tag.length > 0 && !TAGS_PAR_DEFAUT.includes(tag)
          )
          setTagsDisponibles([...TAGS_PAR_DEFAUT, ...filteredTags])
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement des tags personnalisés:', error)
    }
  }, [selectedChantier, router])

  // Sauvegarder les tags personnalisés
  const saveTagsToLocalStorage = (tags: string[]) => {
    try {
      const customTags = tags.filter((tag) => !TAGS_PAR_DEFAUT.includes(tag))
      localStorage.setItem('tags_personnalises', JSON.stringify(customTags))
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des tags personnalisés:', error)
    }
  }

  const handleAddGlobalTag = () => {
    if (!nouveauTag.trim()) return

    if (!tagsDisponibles.includes(nouveauTag.trim())) {
      const newTags = [...tagsDisponibles, nouveauTag.trim()]
      setTagsDisponibles(newTags)
      saveTagsToLocalStorage(newTags)
      setNouveauTag('')
    }
  }

  const handleRemoveGlobalTag = (tag: string) => {
    if (TAGS_PAR_DEFAUT.includes(tag)) return

    const newTags = tagsDisponibles.filter((t) => t !== tag)
    setTagsDisponibles(newTags)
    saveTagsToLocalStorage(newTags)

    // Retirer le tag des notes et photos qui l'utilisent
    setNotes((prev) =>
      prev.map((note) => ({
        ...note,
        tags: note.tags.filter((t) => t !== tag),
      }))
    )
    setPhotos((prev) =>
      prev.map((photo) => ({
        ...photo,
        tags: (photo.tags || []).filter((t) => t !== tag),
      }))
    )
    if (noteTags.includes(tag)) {
      setNoteTags((prev) => prev.filter((t) => t !== tag))
    }
  }

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    try {
      setCompressing(true)
      
      // Convertir FileList en tableau
      const fileArray = Array.from(files)
      
      // Compresser les images (max 1920px, qualité 0.8)
      const compressedFiles = await compressImages(fileArray, 1920, 1920, 0.8)
      
      // Créer les photos avec les fichiers compressés
      compressedFiles.forEach((file) => {
        const photo: Photo = {
          id: Math.random().toString(36).substring(2, 9),
          file,
          preview: URL.createObjectURL(file),
          annotation: '',
          tags: ['Rapport'],
        }
        setPhotos((prev) => [...prev, photo])
      })
    } catch (error) {
      console.error('Erreur lors de la compression:', error)
      // En cas d'erreur, utiliser les fichiers originaux
      Array.from(files).forEach((file) => {
        const photo: Photo = {
          id: Math.random().toString(36).substring(2, 9),
          file,
          preview: URL.createObjectURL(file),
          annotation: '',
          tags: ['Rapport'],
        }
        setPhotos((prev) => [...prev, photo])
      })
    } finally {
      setCompressing(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      if (cameraInputRef.current) {
        cameraInputRef.current.value = ''
      }
    }
  }

  const handleRemovePhoto = (id: string) => {
    setPhotos((prev) => {
      const photo = prev.find((p) => p.id === id)
      if (photo) {
        URL.revokeObjectURL(photo.preview)
      }
      return prev.filter((p) => p.id !== id)
    })
  }

  const handleAddPersonne = () => {
    if (!nouveauNom.trim()) return

    setPersonnes((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).substring(2, 9),
        nom: nouveauNom.trim(),
        fonction: nouvelleFonction.trim() || 'Présent',
      },
    ])
    setNouveauNom('')
    setNouvelleFonction('')
  }

  const handleRemovePersonne = (id: string) => {
    setPersonnes((prev) => prev.filter((p) => p.id !== id))
  }

  const handleAddNote = () => {
    if (!nouvelleNote.trim()) return

    const note: Note = {
      id: Math.random().toString(36).substring(2, 9),
      contenu: nouvelleNote.trim(),
      tags: [...noteTags],
    }

    setNotes((prev) => [...prev, note])
    setNouvelleNote('')
    setNoteTags(['Général'])
  }

  const handleRemoveNote = (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id))
  }

  const handleUpdateNoteContent = (id: string, contenu: string) => {
    setNotes((prev) =>
      prev.map((note) => (note.id === id ? { ...note, contenu } : note))
    )
  }

  const handleToggleNoteTag = (noteId: string, tag: string) => {
    setNotes((prev) =>
      prev.map((note) => {
        if (note.id === noteId) {
          if (note.tags.includes(tag)) {
            return { ...note, tags: note.tags.filter((t) => t !== tag) }
          } else {
            return { ...note, tags: [...note.tags, tag] }
          }
        }
        return note
      })
    )
  }

  const handleToggleNewNoteTag = (tag: string) => {
    if (noteTags.includes(tag)) {
      setNoteTags((prev) => prev.filter((t) => t !== tag))
    } else {
      setNoteTags((prev) => [...prev, tag])
    }
  }

  const handlePhotoTagToggle = (photoId: string, tag: string) => {
    setPhotos((prev) =>
      prev.map((photo) => {
        if (photo.id === photoId) {
          const tags = photo.tags || []
          if (tags.includes(tag)) {
            return { ...photo, tags: tags.filter((t) => t !== tag) }
          } else {
            return { ...photo, tags: [...tags, tag] }
          }
        }
        return photo
      })
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedChantier) return

    if (notes.length === 0 && photos.length === 0) {
      alert('Veuillez ajouter au moins une note ou une photo')
      return
    }

    setSaving(true)

    try {
      // Uploader les photos d'abord et mapper avec leurs annotations
      const uploadedPhotos: Array<{ url: string; annotation: string }> = []
      for (const photo of photos) {
        const formData = new FormData()
        formData.append('file', photo.file)
        formData.append('chantierId', selectedChantier.chantierId)
        formData.append('annotation', photo.annotation || '')
        formData.append('tags', JSON.stringify(photo.tags.length > 0 ? photo.tags : ['Rapport']))

        const response = await fetch('/api/rapports/upload-photo', {
          method: 'POST',
          body: formData,
        })

        if (response.ok) {
          const data = await response.json()
          uploadedPhotos.push({
            url: data.url || data.documentUrl,
            annotation: photo.annotation || '',
          })
        }
      }

      // Générer le PDF du rapport
      const pdfResponse = await fetch('/api/rapports/generate-pdf-modern', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chantierId: selectedChantier.chantierId,
          date,
          notes: notes,
          personnes,
          photos: uploadedPhotos.map((p, index) => {
            const photo = photos[index]
            return {
              url: p.url,
              preview: p.url,
              caption: p.annotation,
              tags: photo?.tags || ['Rapport'],
            }
          }),
        }),
      })

      if (!pdfResponse.ok) {
        throw new Error('Erreur lors de la génération du PDF')
      }

      const pdfBlob = await pdfResponse.blob()

      // Uploader le PDF du rapport
      const formData = new FormData()
      const fileName = `rapport-visite-${selectedChantier.nomChantier.replace(/\s+/g, '-')}-${date}.pdf`
      formData.append('file', pdfBlob, fileName)
      formData.append('type', 'rapport-visite')
      formData.append('personnesPresentes', JSON.stringify(personnes))
      formData.append('tags', JSON.stringify([]))
      formData.append('notes', JSON.stringify(notes.map(n => n.contenu).join('\n\n')))

      const uploadResponse = await fetch(
        `/api/chantiers/${selectedChantier.chantierId}/documents`,
        {
          method: 'POST',
          body: formData,
        }
      )

      if (!uploadResponse.ok) {
        throw new Error('Erreur lors de l\'upload du rapport')
      }

      router.push('/mobile/documents')
    } catch (error) {
      console.error('Erreur:', error)
      alert('Erreur lors de l\'enregistrement du rapport')
    } finally {
      setSaving(false)
    }
  }

  if (!selectedChantier) {
    return null
  }

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-700 text-white">
        <div className="max-w-md mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => router.push('/mobile/dashboard')}
              className="p-2 -ml-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <ArrowLeftIcon className="h-6 w-6" />
            </button>
            <h1 className="text-xl font-black">Nouveau rapport</h1>
            <div className="w-10"></div>
          </div>
          <p className="text-sm text-blue-100">{selectedChantier.nomChantier}</p>
        </div>
      </div>

      {/* Formulaire */}
      <div className="max-w-md mx-auto px-4 py-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* Personnes présentes */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <button
              type="button"
              onClick={() => setPersonnesSectionOpen(!personnesSectionOpen)}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <UserGroupIcon className="h-5 w-5 text-gray-600" />
                <h3 className="font-semibold text-gray-900">Personnes présentes</h3>
                {personnes.length > 0 && (
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                    {personnes.length}
                  </span>
                )}
              </div>
              {personnesSectionOpen ? (
                <ChevronUpIcon className="h-5 w-5 text-gray-400" />
              ) : (
                <ChevronDownIcon className="h-5 w-5 text-gray-400" />
              )}
            </button>

            {personnesSectionOpen && (
              <div className="px-4 pb-4 space-y-3">

                {personnes.length > 0 && (
                  <div className="space-y-2">
                    {personnes.map((personne) => (
                      <div
                        key={personne.id}
                        className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-900">{personne.nom}</p>
                          <p className="text-xs text-gray-500">{personne.fonction}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemovePersonne(personne.id)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                        >
                          <XMarkIcon className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Nom"
                    value={nouveauNom}
                    onChange={(e) => setNouveauNom(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Fonction"
                    value={nouvelleFonction}
                    onChange={(e) => setNouvelleFonction(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                  <button
                    type="button"
                    onClick={handleAddPersonne}
                    className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <PlusIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Gestion des tags */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <button
              type="button"
              onClick={() => setTagsMenuOpen(!tagsMenuOpen)}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <TagIcon className="h-5 w-5 text-gray-600" />
                <h3 className="font-semibold text-gray-900">Tags disponibles</h3>
                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                  {tagsDisponibles.length}
                </span>
              </div>
              {tagsMenuOpen ? (
                <ChevronUpIcon className="h-5 w-5 text-gray-400" />
              ) : (
                <ChevronDownIcon className="h-5 w-5 text-gray-400" />
              )}
            </button>

            {tagsMenuOpen && (
              <div className="px-4 pb-4 space-y-3 border-t border-gray-200">
                {/* Ajouter un nouveau tag */}
                <div className="flex gap-2 pt-3">
                  <input
                    type="text"
                    placeholder="Nouveau tag (ex: électricien, carreleur, client...)"
                    value={nouveauTag}
                    onChange={(e) => setNouveauTag(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddGlobalTag()
                      }
                    }}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                  <button
                    type="button"
                    onClick={handleAddGlobalTag}
                    disabled={!nouveauTag.trim()}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <PlusIcon className="h-5 w-5" />
                  </button>
                </div>

                {/* Liste des tags disponibles */}
                <div className="flex flex-wrap gap-2">
                  {tagsDisponibles.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800 border border-purple-200"
                    >
                      {tag}
                      {!TAGS_PAR_DEFAUT.includes(tag) && (
                        <button
                          type="button"
                          onClick={() => handleRemoveGlobalTag(tag)}
                          className="ml-2 p-0.5 text-purple-600 hover:text-purple-800 rounded-full hover:bg-purple-200"
                        >
                          <XMarkIcon className="h-3 w-3" />
                        </button>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="bg-white rounded-xl p-4 shadow-lg border border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              <DocumentTextIcon className="h-5 w-5 text-gray-600" />
              <h3 className="font-semibold text-gray-900">Notes</h3>
            </div>

            {/* Liste des notes existantes */}
            {notes.length > 0 && (
              <div className="space-y-3 mb-3">
                {notes.map((note) => (
                  <div
                    key={note.id}
                    className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <textarea
                        value={note.contenu}
                        onChange={(e) => handleUpdateNoteContent(note.id, e.target.value)}
                        placeholder="Contenu de la note..."
                        rows={3}
                        className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveNote(note.id)}
                        className="ml-2 p-1 text-red-600 hover:bg-red-50 rounded"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </div>
                    {/* Tags de la note */}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {tagsDisponibles.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => handleToggleNoteTag(note.id, tag)}
                          className={`px-2 py-1 text-xs rounded-full ${
                            note.tags.includes(tag)
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-200 text-gray-700'
                          }`}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Formulaire pour ajouter une nouvelle note */}
            <div className="space-y-2">
              <textarea
                value={nouvelleNote}
                onChange={(e) => setNouvelleNote(e.target.value)}
                placeholder="Ajouter une nouvelle note..."
                rows={3}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
              {/* Tags pour la nouvelle note */}
              <div className="flex flex-wrap gap-1 mb-2">
                {tagsDisponibles.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleToggleNewNoteTag(tag)}
                    className={`px-2 py-1 text-xs rounded-full ${
                      noteTags.includes(tag)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={handleAddNote}
                disabled={!nouvelleNote.trim()}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 border-2 border-blue-200 rounded-xl text-blue-600 font-medium hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <PlusIcon className="h-4 w-4" />
                <span>Ajouter la note</span>
              </button>
            </div>
          </div>

          {/* Photos */}
          <div className="bg-white rounded-xl p-4 shadow-lg border border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              <CameraIcon className="h-5 w-5 text-gray-600" />
              <h3 className="font-semibold text-gray-900">Photos</h3>
            </div>

            {/* Input pour la photothèque (multiple) */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handlePhotoSelect}
              className="hidden"
            />
            
            {/* Input pour l'appareil photo (sans multiple) */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhotoSelect}
              className="hidden"
            />

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                disabled={compressing}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 transition-colors disabled:opacity-50"
              >
                {compressing ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span className="text-sm">Compression...</span>
                  </>
                ) : (
                  <>
                    <CameraIcon className="h-5 w-5" />
                    <span className="text-sm">Prendre une photo</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={compressing}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-50 border-2 border-blue-200 rounded-xl text-blue-600 font-medium hover:bg-blue-100 disabled:opacity-50"
              >
                {compressing ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                    <span className="text-sm">Compression...</span>
                  </>
                ) : (
                  <>
                    <CameraIcon className="h-5 w-5" />
                    <span className="text-sm">Photothèque</span>
                  </>
                )}
              </button>
            </div>

            {photos.length > 0 && (
              <div className="grid grid-cols-2 gap-3 mt-4">
                {photos.map((photo) => (
                  <div key={photo.id} className="relative">
                    <img
                      src={photo.preview}
                      alt="Preview"
                      className="w-full h-32 object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(photo.id)}
                      className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full hover:bg-red-700"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                    <input
                      type="text"
                      placeholder="Annotation..."
                      value={photo.annotation}
                      onChange={(e) =>
                        setPhotos((prev) =>
                          prev.map((p) =>
                            p.id === photo.id ? { ...p, annotation: e.target.value } : p
                          )
                        )
                      }
                      className="w-full mt-2 px-2 py-1 text-xs border border-gray-300 rounded"
                    />
                    {/* Tags pour la photo */}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {tagsDisponibles.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => handlePhotoTagToggle(photo.id, tag)}
                          className={`px-2 py-1 text-xs rounded-full ${
                            (photo.tags || []).includes(tag)
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-200 text-gray-700'
                          }`}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bouton submit */}
          <button
            type="submit"
            disabled={saving || (notes.length === 0 && photos.length === 0)}
            className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium shadow-lg hover:from-blue-700 hover:to-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <PaperAirplaneIcon className="h-5 w-5" />
            <span>{saving ? 'Enregistrement...' : 'Enregistrer le rapport'}</span>
          </button>
        </form>
      </div>
    </div>
  )
}

