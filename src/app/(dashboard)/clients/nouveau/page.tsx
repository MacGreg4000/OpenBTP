'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FormInput, FormTextarea } from '@/components/ui'
import { Breadcrumb } from '@/components/Breadcrumb'
import { 
  BuildingStorefrontIcon,
  UserPlusIcon,
  ArrowLeftIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline'

interface FormData {
  nom: string
  email: string
  telephone: string
  adresse: string
}

export default function NouveauClientPage() {
  const router = useRouter()
  const [formData, setFormData] = useState<FormData>({
    nom: '',
    email: '',
    telephone: '',
    adresse: ''
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    // Réinitialiser l'erreur lorsque l'utilisateur modifie le formulaire
    if (error) setError(null)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    console.log('Envoi des données du client:', formData)

    try {
      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      })

      const data = await response.json()
      
      if (!response.ok) {
        console.error('Erreur de réponse:', data)
        throw new Error(data.error || 'Erreur lors de la création du client')
      }
      
      console.log('Client créé avec succès:', data)
      router.push('/clients')
    } catch (error: unknown) {
      console.error('Erreur détaillée:', error)
      const message = error instanceof Error ? error.message : 'Une erreur est survenue lors de la création du client'
      setError(message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* En-tête avec gradient cohérent avec /clients */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-700 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="md:flex md:items-center md:justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center">
                <UserPlusIcon className="h-8 w-8 text-white mr-3" />
                <div>
                  <h1 className="text-3xl font-bold text-white">
                    Nouveau Client
                  </h1>
                  <p className="mt-2 text-indigo-100">
                    Créez un nouveau client dans votre annuaire
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-4 md:mt-0">
              <button
                onClick={() => router.push('/clients')}
                className="inline-flex items-center px-4 py-2 border border-white/20 rounded-md shadow-sm text-sm font-medium text-white bg-white/10 hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
              >
                <ArrowLeftIcon className="h-4 w-4 mr-2" />
                Retour aux clients
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <Breadcrumb 
          items={[
            { label: 'Clients', href: '/clients' },
            { label: 'Nouveau client', href: '/clients/nouveau' }
          ]} 
        />
      </div>

      {/* Contenu principal */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <ExclamationCircleIcon className="h-5 w-5 text-red-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800 dark:text-red-200">{error}</h3>
              </div>
            </div>
          </div>
        )}
        
        <div className="bg-white dark:bg-gray-800 shadow-xl rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-8">
            <div className="flex items-center mb-8">
              <BuildingStorefrontIcon className="h-6 w-6 text-indigo-600 mr-3" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Informations du client</h2>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid grid-cols-1 gap-6">
                <FormInput
                  id="nom"
                  name="nom"
                  label="Nom du client"
                  value={formData.nom}
                  onChange={handleChange}
                  required
                  placeholder="Entrez le nom du client"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormInput
                  id="email"
                  name="email"
                  type="email"
                  label="Email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Entrez l'email du client"
                />

                <FormInput
                  id="telephone"
                  name="telephone"
                  type="tel"
                  label="Téléphone"
                  value={formData.telephone}
                  onChange={handleChange}
                  placeholder="+33 1 23 45 67 89"
                />
              </div>

              <div className="grid grid-cols-1 gap-6">
                <FormTextarea
                  id="adresse"
                  name="adresse"
                  label="Adresse complète"
                  value={formData.adresse}
                  onChange={handleChange}
                  rows={3}
                  placeholder="123 rue de la République, 75001 Paris"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => router.push('/clients')}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                >
                  <ArrowLeftIcon className="h-4 w-4 mr-2" />
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-300 transition-colors"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                      Création...
                    </>
                  ) : (
                    <>
                      <UserPlusIcon className="h-4 w-4 mr-2" />
                      Créer le client
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
} 