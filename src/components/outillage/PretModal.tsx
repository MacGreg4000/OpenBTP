'use client'
import { useState } from 'react'
import { Dialog } from '@headlessui/react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { addDays } from 'date-fns'
import { toast } from 'react-hot-toast'

interface PretModalProps {
  machineId: string
  onClose: () => void
  onSuccess: () => void
}

interface FormData {
  dateRetourPrevue: string
  emprunteur: string
  commentaire: string
}

export default function PretModal({ machineId, onClose, onSuccess }: PretModalProps) {
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState<FormData>({
    dateRetourPrevue: addDays(new Date(), 7).toISOString().split('T')[0], // Date par défaut : aujourd'hui + 7 jours
    emprunteur: '',
    commentaire: ''
  })

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSaving(true)

    try {
      const response = await fetch(`/api/outillage/machines/${machineId}/prets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        throw new Error('Erreur lors de la création du prêt')
      }

      onSuccess()
      toast.success('Prêt créé avec succès')
    } catch (error) {
      console.error('Erreur:', error)
      toast.error("Une erreur s'est produite lors de la création du prêt")
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
    <Dialog
      as="div"
      className="fixed inset-0 z-10 overflow-y-auto"
      onClose={onClose}
      open={true}
    >
      <div className="flex min-h-screen items-center justify-center">
        <Dialog.Overlay className="fixed inset-0 bg-black opacity-30" />

        <div className="relative bg-white dark:bg-gray-800 rounded-lg w-full max-w-md mx-4 p-6">
          <div className="absolute top-4 right-4">
            <button
              type="button"
              className="text-gray-400 hover:text-gray-500 dark:text-gray-300 dark:hover:text-gray-200"
              onClick={onClose}
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <Dialog.Title
            as="h3"
            className="text-lg font-medium leading-6 text-gray-900 dark:text-white mb-4"
          >
            Nouveau prêt
          </Dialog.Title>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="emprunteur" className="block text-sm font-medium text-gray-700">
                Emprunteur *
              </label>
              <input
                type="text"
                name="emprunteur"
                id="emprunteur"
                required
                value={formData.emprunteur}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="Nom de l'emprunteur"
              />
            </div>

            <div>
              <label htmlFor="dateRetourPrevue" className="block text-sm font-medium text-gray-700">
                Date de retour prévue *
              </label>
              <input
                type="date"
                name="dateRetourPrevue"
                id="dateRetourPrevue"
                required
                min={new Date().toISOString().split('T')[0]}
                value={formData.dateRetourPrevue}
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
                placeholder="Informations complémentaires..."
              />
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {saving ? 'Création...' : 'Créer le prêt'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Dialog>
  )
} 