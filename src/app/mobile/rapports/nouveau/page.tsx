'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import { useSelectedChantier } from '@/contexts/SelectedChantierContext'
import {
  ArrowLeftIcon,
  CameraIcon,
  XMarkIcon,
  UserGroupIcon,
  DocumentTextIcon,
  PaperAirplaneIcon,
  PlusIcon,
} from '@heroicons/react/24/outline'
import { format } from 'date-fns'

interface Photo {
  id: string
  file: File
  preview: string
  annotation: string
}

interface Personne {
  id: string
  nom: string
  fonction: string
}

export default function MobileNouveauRapportPage() {
  const router = useRouter()
  const { selectedChantier } = useSelectedChantier()
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [notes, setNotes] = useState('')
  const [photos, setPhotos] = useState<Photo[]>([])
  const [personnes, setPersonnes] = useState<Personne[]>([])
  const [nouveauNom, setNouveauNom] = useState('')
  const [nouvelleFonction, setNouvelleFonction] = useState('')
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!selectedChantier) {
      router.push('/mobile')
      return
    }
  }, [selectedChantier, router])

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    Array.from(files).forEach((file) => {
      const photo: Photo = {
        id: Math.random().toString(36).substring(2, 9),
        file,
        preview: URL.createObjectURL(file),
        annotation: '',
      }
      setPhotos((prev) => [...prev, photo])
    })

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedChantier) return

    if (!notes.trim() && photos.length === 0) {
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
        formData.append('tags', JSON.stringify(['Rapport']))

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
          notes: notes || [],
          personnes,
          photos: uploadedPhotos.map((p) => ({
            url: p.url,
            preview: p.url,
            caption: p.annotation,
          })),
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
      formData.append('notes', notes)

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
          <div className="bg-white rounded-xl p-4 shadow-lg border border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              <UserGroupIcon className="h-5 w-5 text-gray-600" />
              <h3 className="font-semibold text-gray-900">Personnes présentes</h3>
            </div>

            {personnes.length > 0 && (
              <div className="space-y-2 mb-3">
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

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes du rapport de visite..."
              rows={6}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Photos */}
          <div className="bg-white rounded-xl p-4 shadow-lg border border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              <CameraIcon className="h-5 w-5 text-gray-600" />
              <h3 className="font-semibold text-gray-900">Photos</h3>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              onChange={handlePhotoSelect}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-50 border-2 border-blue-200 rounded-xl text-blue-600 font-medium hover:bg-blue-100"
            >
              <CameraIcon className="h-5 w-5" />
              <span>Ajouter des photos</span>
            </button>

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
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bouton submit */}
          <button
            type="submit"
            disabled={saving || (!notes.trim() && photos.length === 0)}
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

