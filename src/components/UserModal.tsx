'use client'
import { useState } from 'react'
import { Dialog } from '@headlessui/react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { FormInput, FormSelect, Button } from '@/components/ui'

interface UserFormData {
  name: string
  email: string
  password?: string
  role: 'ADMIN' | 'MANAGER' | 'USER'
}

interface UserModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: UserFormData) => Promise<void>
  initialData?: Partial<UserFormData>
  title: string
  buttonText: string
  isEdit?: boolean
}

export default function UserModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  title,
  buttonText,
  isEdit = false
}: UserModalProps) {
  const [formData, setFormData] = useState<UserFormData>({
    name: initialData?.name || '',
    email: initialData?.email || '',
    password: '',
    role: initialData?.role || 'USER'
  })
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      await onSubmit(formData)
      onClose()
    } catch {
      setError('Une erreur est survenue')
    } finally {
      setIsSubmitting(false)
    }
  }

  const roleOptions = [
    { value: 'USER', label: 'Utilisateur' },
    { value: 'MANAGER', label: 'Manager' },
    { value: 'ADMIN', label: 'Administrateur' }
  ]

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
            {title}
          </Dialog.Title>

          <form onSubmit={handleSubmit} className="space-y-4">
            <FormInput
              id="name"
              label="Nom"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            />

            <FormInput
              id="email"
              type="email"
              label="Email"
              required
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            />

            {!isEdit && (
              <FormInput
                id="password"
                type="password"
                label="Mot de passe"
                required={!isEdit}
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
              />
            )}

            <FormSelect
              id="role"
              label="Rôle"
              value={formData.role}
              options={roleOptions}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                role: e.target.value as 'ADMIN' | 'MANAGER' | 'USER'
              }))}
            />

            {error && (
              <p className="text-sm text-red-600 dark:text-red-400 mt-2">{error}</p>
            )}

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
              >
                {isSubmitting ? 'Chargement...' : buttonText}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </Dialog>
  )
} 