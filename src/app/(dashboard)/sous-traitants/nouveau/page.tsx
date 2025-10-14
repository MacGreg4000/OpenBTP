'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FormInput, Button } from '@/components/ui'

export const dynamic = 'force-dynamic'

interface FormData {
  nom: string
  email: string
  contact: string
  telephone: string
  adresse: string
  tva: string
}

export default function NouveauSousTraitantPage() {
  const router = useRouter()
  
  const [formData, setFormData] = useState<FormData>({
    nom: '',
    email: '',
    contact: '',
    telephone: '',
    adresse: '',
    tva: ''
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    console.log('Envoi des données du sous-traitant:', formData)

    try {
      const response = await fetch('/api/sous-traitants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()
      
      if (!response.ok) {
        console.error('Erreur de réponse:', data)
        throw new Error(data.error || 'Erreur lors de la création du sous-traitant')
      }

      console.log('Sous-traitant créé avec succès:', data)
      router.push('/sous-traitants')
      router.refresh()
    } catch (error) {
      console.error('Erreur détaillée:', error)
      setError(error instanceof Error ? error.message : 'Une erreur est survenue lors de la création du sous-traitant')
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
    
    // Réinitialiser l'erreur lorsque l'utilisateur modifie le formulaire
    if (error) setError(null)
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="md:flex md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 dark:text-white sm:truncate sm:text-3xl sm:tracking-tight">
            Nouveau Sous-Traitant
          </h2>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        {error && (
          <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800 dark:text-red-400">{error}</h3>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-6 bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <FormInput
            id="nom"
            name="nom"
            type="text"
            label="Nom de l'entreprise"
            required
            value={formData.nom}
            onChange={handleChange}
          />

          <FormInput
            id="email"
            name="email"
            type="email"
            label="Email"
            required
            value={formData.email}
            onChange={handleChange}
          />

          <FormInput
            id="contact"
            name="contact"
            type="text"
            label="Personne de contact"
            value={formData.contact}
            onChange={handleChange}
          />

          <FormInput
            id="tva"
            name="tva"
            type="text"
            label="Numéro de TVA"
            value={formData.tva}
            onChange={handleChange}
            placeholder="BE0123456789"
          />

          <FormInput
            id="telephone"
            name="telephone"
            type="tel"
            label="Téléphone"
            value={formData.telephone}
            onChange={handleChange}
          />

          <FormInput
            id="adresse"
            name="adresse"
            type="text"
            label="Adresse"
            value={formData.adresse}
            onChange={handleChange}
          />
        </div>

        <div className="flex justify-end space-x-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            Annuler
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={saving}
            isLoading={saving}
          >
            {saving ? 'Création...' : 'Créer le sous-traitant'}
          </Button>
        </div>
      </form>
    </div>
  )
} 