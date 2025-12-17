'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FormInput, Button } from '@/components/ui'
import PageHeader from '@/components/PageHeader'
import { BuildingOffice2Icon } from '@heroicons/react/24/outline'

export const dynamic = 'force-dynamic'

interface FormData {
  nom: string
  email: string
  contact: string
  telephone: string
  adresse: string
  tva: string
  logo?: string
  logoFile?: File
}

export default function NouveauSousTraitantPage() {
  const router = useRouter()
  
  const [formData, setFormData] = useState<FormData>({
    nom: '',
    email: '',
    contact: '',
    telephone: '',
    adresse: '',
    tva: '',
    logo: ''
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [uploadingLogo, setUploadingLogo] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    console.log('Envoi des données du sous-traitant:', formData)

    try {
      // Créer le sous-traitant sans le logo d'abord
      const { logo: _logo, ...formDataWithoutLogo } = formData
      const response = await fetch('/api/sous-traitants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formDataWithoutLogo),
      })

      const data = await response.json()
      
      if (!response.ok) {
        console.error('Erreur de réponse:', data)
        throw new Error(data.error || 'Erreur lors de la création du sous-traitant')
      }

      console.log('Sous-traitant créé avec succès:', data)

      // Si un logo a été sélectionné, l'uploader après la création
      const logoFile = formData.logoFile
      if (logoFile) {
        const soustraitantId = data.id || data.soustraitantId
        if (soustraitantId) {
          const formDataUpload = new FormData()
          formDataUpload.append('logo', logoFile)
          formDataUpload.append('soustraitantId', soustraitantId.toString())

          const logoRes = await fetch('/api/uploads/soustraitant-logo', {
            method: 'POST',
            body: formDataUpload
          })

          if (logoRes.ok) {
            const { url } = await logoRes.json()
            // Mettre à jour le sous-traitant avec le chemin du logo
            await fetch(`/api/sous-traitants/${soustraitantId}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ logo: url }),
            })
          }
        }
      }

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

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingLogo(true)
    
    // Pour un nouveau sous-traitant, on stocke le fichier temporairement
    // et on l'uploadera après la création
    try {
      // Créer une URL temporaire pour la prévisualisation
      const tempUrl = URL.createObjectURL(file)
      setLogoPreview(tempUrl)
      
      // Stocker le fichier dans le state pour l'uploader après la création
      setFormData(prev => ({ 
        ...prev, 
        logo: tempUrl,
        logoFile: file // Stocker le fichier pour l'upload ultérieur
      }))
    } catch (error) {
      console.error('Erreur upload logo:', error)
      setError('Erreur lors de la préparation du logo')
    } finally {
      setUploadingLogo(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <PageHeader
        title="Nouveau Sous-Traitant"
        icon={BuildingOffice2Icon}
        breadcrumbs={[
          { label: 'Sous-traitants', href: '/sous-traitants' },
          { label: 'Nouveau', href: '/sous-traitants/nouveau' }
        ]}
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
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

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Logo (optionnel)
            </label>
            <div className="flex items-center gap-4">
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoChange}
                disabled={uploadingLogo}
                className="block w-full text-sm text-gray-500 dark:text-gray-400
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-lg file:border-0
                  file:text-sm file:font-semibold
                  file:bg-blue-50 file:text-blue-700
                  hover:file:bg-blue-100
                  dark:file:bg-blue-900 dark:file:text-blue-300
                  dark:hover:file:bg-blue-800
                  disabled:opacity-50 disabled:cursor-not-allowed"
              />
              {uploadingLogo && (
                <span className="text-sm text-gray-500">Upload en cours...</span>
              )}
            </div>
            {logoPreview && (
              <div className="mt-2">
                <img
                  src={logoPreview}
                  alt="Logo preview"
                  className="h-20 w-20 object-contain border border-gray-300 dark:border-gray-600 rounded"
                />
              </div>
            )}
          </div>
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
    </div>
  )
} 