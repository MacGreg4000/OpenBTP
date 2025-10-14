'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface FormData {
  nom: string
  modele: string
  numeroSerie: string
  localisation: string
  dateAchat: string
  commentaire: string
}

export default function NouvelleMachinePage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState<FormData>({
    nom: '',
    modele: '',
    numeroSerie: '',
    localisation: '',
    dateAchat: '',
    commentaire: ''
  })

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSaving(true)

    try {
      const response = await fetch('/api/outillage/machines', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('Réponse d\'erreur:', response.status, errorData)
        throw new Error(errorData.error || `Erreur lors de la création de la machine (${response.status})`)
      }

      router.push('/outillage')
      router.refresh()
    } catch (error: unknown) {
      console.error('Erreur:', error)
      const message = error instanceof Error ? error.message : 'Erreur inconnue'
      alert(`Une erreur s'est produite lors de la création de la machine: ${message}`)
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="md:flex md:items-center md:justify-between md:space-x-4 xl:border-b xl:pb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nouvelle machine</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 mt-6">
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
            {saving ? 'Création...' : 'Créer la machine'}
          </button>
        </div>
      </form>
    </div>
  )
} 