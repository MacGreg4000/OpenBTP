'use client'
import { useState, useEffect } from 'react'
import { Dialog } from '@headlessui/react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { FormSelect, Button } from '@/components/ui'

interface SousTraitant {
  id: string
  nom: string
  email: string
}

interface SousTraitantSelectModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (sousTraitantId: string) => void
}

export default function SousTraitantSelectModal({
  isOpen,
  onClose,
  onSubmit
}: SousTraitantSelectModalProps) {
  const [sousTraitants, setSousTraitants] = useState<SousTraitant[]>([])
  const [selectedSousTraitantId, setSelectedSousTraitantId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    const fetchSousTraitants = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/sous-traitants')
        if (!response.ok) {
          throw new Error('Erreur lors de la récupération des sous-traitants')
        }
        const data = await response.json()
        setSousTraitants(data)
        if (data.length > 0) {
          setSelectedSousTraitantId(data[0].id)
        }
      } catch (error) {
        console.error('Erreur:', error)
        setError('Erreur lors du chargement des sous-traitants')
      } finally {
        setLoading(false)
      }
    }

    if (isOpen) {
      fetchSousTraitants()
    }
  }, [isOpen])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    if (!selectedSousTraitantId) {
      setError('Veuillez sélectionner un sous-traitant')
      setIsSubmitting(false)
      return
    }
    
    onSubmit(selectedSousTraitantId)
    setIsSubmitting(false)
  }

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      className="fixed inset-0 z-10 overflow-y-auto"
    >
      <div className="flex min-h-screen items-center justify-center">
        <Dialog.Overlay className="fixed inset-0 bg-black opacity-30" />

        <div className="relative bg-white dark:bg-gray-800 rounded-lg w-full max-w-md mx-4 p-6">
          <div className="absolute top-4 right-4">
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 dark:text-gray-300 dark:hover:text-gray-200"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <Dialog.Title className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Sélectionner un sous-traitant
          </Dialog.Title>

          {loading ? (
            <div className="py-4 text-center">Chargement des sous-traitants...</div>
          ) : error ? (
            <div className="py-4 text-center text-red-500">{error}</div>
          ) : sousTraitants.length === 0 ? (
            <div className="py-4 text-center">
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Aucun sous-traitant n&apos;est disponible.
              </p>
              <Button
                type="button"
                variant="primary"
                onClick={() => window.open('/sous-traitants', '_blank')}
              >
                Créer un sous-traitant
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <FormSelect
                id="sousTraitant"
                label="Sous-traitant"
                value={selectedSousTraitantId}
                options={sousTraitants.map(st => ({ value: st.id, label: `${st.nom} (${st.email})` }))}
                onChange={(e) => setSelectedSousTraitantId(e.target.value)}
                required
              />

              <div className="mt-6 flex justify-end space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={isSubmitting}
                  disabled={!selectedSousTraitantId}
                >
                  {isSubmitting ? 'Chargement...' : 'Confirmer'}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </Dialog>
  )
} 