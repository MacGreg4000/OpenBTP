'use client'
import { useState } from 'react'
import { Dialog } from '@headlessui/react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import SelectField from '@/components/ui/SelectField'

interface RetourPretModalProps {
  pretId: string
  onClose: () => void
  onSuccess: () => void
}

interface FormData {
  nouveauStatut: 'DISPONIBLE' | 'EN_PANNE' | 'MANQUE_CONSOMMABLE'
  commentaire: string
}

export default function RetourPretModal({ pretId, onClose, onSuccess }: RetourPretModalProps) {
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState<FormData>({
    nouveauStatut: 'DISPONIBLE',
    commentaire: ''
  })

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSaving(true)

    try {
      const response = await fetch(`/api/outillage/prets/${pretId}/retour`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        throw new Error('Erreur lors du retour du prêt')
      }

      onSuccess()
    } catch (error) {
      console.error('Erreur:', error)
      alert("Une erreur s'est produite lors du retour du prêt")
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLTextAreaElement>) => {
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
            Retour de prêt
          </Dialog.Title>

          <form onSubmit={handleSubmit} className="space-y-4">
            <SelectField
              label="État de la machine"
              name="nouveauStatut"
              id="nouveauStatut"
              required
              value={formData.nouveauStatut}
              onChange={handleChange}
              className="mt-1"
            >
              <option value="DISPONIBLE">Disponible</option>
              <option value="EN_PANNE">En panne</option>
              <option value="MANQUE_CONSOMMABLE">Manque consommable</option>
            </SelectField>

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
                placeholder="État de la machine, problèmes rencontrés..."
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
                {saving ? 'Enregistrement...' : 'Confirmer le retour'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Dialog>
  )
} 