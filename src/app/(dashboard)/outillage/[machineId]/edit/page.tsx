'use client'
import { useState, useEffect, use, useRef } from 'react';
import { useRouter } from 'next/navigation'
import SelectField from '@/components/ui/SelectField'
import { PhotoIcon, CameraIcon, TrashIcon } from '@heroicons/react/24/outline'
import Image from 'next/image'
import { useNotification } from '@/hooks/useNotification'

interface FormData {
  nom: string
  modele: string
  numeroSerie: string
  localisation: string
  dateAchat: string
  commentaire: string
  statut: 'DISPONIBLE' | 'PRETE' | 'EN_PANNE' | 'EN_REPARATION' | 'MANQUE_CONSOMMABLE'
}

export default function EditMachinePage(props: { params: Promise<{ machineId: string }> }) {
  const params = use(props.params);
  const router = useRouter()
  const { showNotification, NotificationComponent } = useNotification()
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [deletingPhoto, setDeletingPhoto] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [formData, setFormData] = useState<FormData>({
    nom: '',
    modele: '',
    numeroSerie: '',
    localisation: '',
    dateAchat: '',
    commentaire: '',
    statut: 'DISPONIBLE'
  })

  useEffect(() => {
    fetchMachine()
    fetchPhoto()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.machineId])

  const fetchMachine = async () => {
    try {
      const response = await fetch(`/api/outillage/machines/${params.machineId}`)
      if (!response.ok) throw new Error('Erreur lors de la récupération de la machine')
      const data = await response.json()
      setFormData({
        nom: data.nom,
        modele: data.modele,
        numeroSerie: data.numeroSerie || '',
        localisation: data.localisation,
        dateAchat: data.dateAchat ? data.dateAchat.split('T')[0] : '',
        commentaire: data.commentaire || '',
        statut: data.statut
      })
    } catch (error) {
      console.error('Erreur:', error)
      showNotification({
        type: 'error',
        title: 'Erreur',
        message: "Erreur lors de la récupération des données de la machine"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSaving(true)

    try {
      const response = await fetch(`/api/outillage/machines/${params.machineId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        throw new Error('Erreur lors de la mise à jour de la machine')
      }

      router.push(`/outillage/${params.machineId}`)
      router.refresh()
    } catch (error) {
      console.error('Erreur:', error)
      showNotification({
        type: 'error',
        title: 'Erreur',
        message: "Une erreur s'est produite lors de la mise à jour de la machine"
      })
    } finally {
      setSaving(false)
    }
  }

  const fetchPhoto = async () => {
    try {
      const response = await fetch(`/api/outillage/machines/${params.machineId}/photo`)
      if (response.ok) {
        const data = await response.json()
        if (data.exists) {
          setPhotoUrl(data.url)
        } else {
          setPhotoUrl(null)
        }
      }
    } catch (error) {
      console.error('Erreur lors de la récupération de la photo:', error)
    }
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Vérifier que c'est une image
    if (!file.type.startsWith('image/')) {
      showNotification('Erreur', 'Le fichier doit être une image', 'error')
      return
    }

    // Vérifier la taille (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      showNotification('Erreur', 'Le fichier est trop volumineux (max 10MB)', 'error')
      return
    }

    setUploadingPhoto(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch(`/api/outillage/machines/${params.machineId}/photo`, {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Erreur lors de l\'upload')
      }

      const data = await response.json()
      setPhotoUrl(data.url)
      showNotification('Succès', 'Photo uploadée avec succès', 'success')
    } catch (error) {
      console.error('Erreur lors de l\'upload:', error)
      showNotification('Erreur', `Erreur lors de l'upload: ${error instanceof Error ? error.message : 'Erreur inconnue'}`, 'error')
    } finally {
      setUploadingPhoto(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handlePhotoDelete = async () => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette photo ?')) {
      return
    }

    setDeletingPhoto(true)
    try {
      const response = await fetch(`/api/outillage/machines/${params.machineId}/photo`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Erreur lors de la suppression')
      }

      setPhotoUrl(null)
      showNotification('Succès', 'Photo supprimée avec succès', 'success')
    } catch (error) {
      console.error('Erreur lors de la suppression:', error)
      showNotification('Erreur', `Erreur lors de la suppression: ${error instanceof Error ? error.message : 'Erreur inconnue'}`, 'error')
    } finally {
      setDeletingPhoto(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  if (loading) {
    return <div className="p-4">Chargement...</div>
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="md:flex md:items-center md:justify-between md:space-x-4 xl:border-b xl:pb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Modifier la machine</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 mt-6">
        {/* Photo de la machine */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Photo de la machine
          </label>
          {photoUrl ? (
            <div className="relative">
              <div className="relative w-full h-64 rounded-lg overflow-hidden bg-gray-100 border border-gray-300">
                <Image
                  src={photoUrl}
                  alt="Photo de la machine"
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingPhoto}
                  className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  <CameraIcon className="h-4 w-4 mr-2" />
                  {uploadingPhoto ? 'Upload...' : 'Remplacer'}
                </button>
                <button
                  type="button"
                  onClick={handlePhotoDelete}
                  disabled={deletingPhoto}
                  className="inline-flex items-center justify-center px-4 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                >
                  <TrashIcon className="h-4 w-4 mr-2" />
                  Supprimer
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </div>
          ) : (
            <div>
              <label
                htmlFor="photo-upload"
                className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="flex flex-col items-center justify-center py-6">
                  <PhotoIcon className="w-12 h-12 mb-3 text-gray-400" />
                  <p className="mb-2 text-sm text-gray-500">
                    <span className="font-semibold">Cliquez pour ajouter une photo</span>
                  </p>
                  <p className="text-xs text-gray-500">
                    PNG, JPG, JPEG (max. 10Mo)
                  </p>
                </div>
                <input
                  id="photo-upload"
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                  ref={fileInputRef}
                />
              </label>
              {uploadingPhoto && (
                <p className="mt-2 text-sm text-gray-500 text-center">Upload en cours...</p>
              )}
            </div>
          )}
        </div>

        <div>
          <label htmlFor="nom" className="block text-sm font-medium text-gray-700">
            Nom de la machine *
          </label>
          <input
            type="text"
            name="nom"
            id="nom"
            required
            value={formData.nom}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>

        <div>
          <label htmlFor="modele" className="block text-sm font-medium text-gray-700">
            Modèle *
          </label>
          <input
            type="text"
            name="modele"
            id="modele"
            required
            value={formData.modele}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>

        <div>
          <label htmlFor="numeroSerie" className="block text-sm font-medium text-gray-700">
            Numéro de série
          </label>
          <input
            type="text"
            name="numeroSerie"
            id="numeroSerie"
            value={formData.numeroSerie}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>

        <div>
          <label htmlFor="localisation" className="block text-sm font-medium text-gray-700">
            Localisation *
          </label>
          <input
            type="text"
            name="localisation"
            id="localisation"
            required
            value={formData.localisation}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>

        <SelectField
          label="Statut"
          name="statut"
          id="statut"
          required
          value={formData.statut}
          onChange={handleChange}
          className="mt-1"
        >
          <option value="DISPONIBLE">Disponible</option>
          <option value="PRETE">Prêtée</option>
          <option value="EN_PANNE">En panne</option>
          <option value="EN_REPARATION">En réparation</option>
          <option value="MANQUE_CONSOMMABLE">Manque consommable</option>
        </SelectField>

        <div>
          <label htmlFor="dateAchat" className="block text-sm font-medium text-gray-700">
            Date d'achat
          </label>
          <input
            type="date"
            name="dateAchat"
            id="dateAchat"
            value={formData.dateAchat}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>

        <div>
          <label htmlFor="commentaire" className="block text-sm font-medium text-gray-700">
            Commentaire
          </label>
          <textarea
            name="commentaire"
            id="commentaire"
            rows={3}
            value={formData.commentaire}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </form>

      <NotificationComponent />
    </div>
  )
} 