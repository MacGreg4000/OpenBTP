'use client'
import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { FormInput, Button } from '@/components/ui'

interface FormData {
  nom: string
  email: string
  contact: string
  telephone: string
  adresse: string
  tva: string
  logo?: string
}

export default function EditSousTraitantPage(
  props: { 
    params: Promise<{ id: string }> 
  }
) {
  const params = use(props.params);
  const router = useRouter()
  const { data: session } = useSession()
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
  const [loading, setLoading] = useState(true)
  const [pin, setPin] = useState<string>('')
  const [savingPin, setSavingPin] = useState(false)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const portalLink = typeof window !== 'undefined' 
    ? `${window.location.origin}/public/portail/soustraitant/${params.id}` 
    : `/public/portail/soustraitant/${params.id}`

  useEffect(() => {
    if (session) {
      fetch(`/api/sous-traitants/${params.id}`)
        .then(res => res.json())
        .then(data => {
          setFormData({
            nom: data.nom,
            email: data.email,
            contact: data.contact || '',
            telephone: data.telephone || '',
            adresse: data.adresse || '',
            tva: data.tva || '',
            logo: data.logo || ''
          })
          if (data.logo) {
            setLogoPreview(data.logo)
          }
          setLoading(false)
        })
        .then(async ()=>{
          try {
            const resPin = await fetch(`/api/sous-traitants/${params.id}/pin`)
            const dataPin = await resPin.json()
            setPin(dataPin.pin || '')
          } catch {}
        })
        .catch(error => {
          console.error('Erreur:', error)
          setError('Erreur lors du chargement des données')
          setLoading(false)
        })
    }
  }, [session, params.id])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    console.log('Envoi des données du sous-traitant pour mise à jour:', formData)

    try {
      // Récupérer d'abord les données complètes du sous-traitant
      const soustraitantResponse = await fetch(`/api/sous-traitants/${params.id}`);
      const existingData = await soustraitantResponse.json();
      
      // Fusionner les données existantes avec les données du formulaire
      const updatedData = {
        ...existingData,
        nom: formData.nom,
        email: formData.email,
        contact: formData.contact || null,
        telephone: formData.telephone || null,
        adresse: formData.adresse || null,
        tva: formData.tva || null,
        logo: formData.logo || null
      };
      
      console.log('Données fusionnées pour mise à jour:', updatedData);

      const response = await fetch(`/api/sous-traitants/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedData),
      })

      if (!response.ok) {
        throw new Error('Erreur lors de la mise à jour du sous-traitant')
      }

      router.push('/sous-traitants')
      router.refresh()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Une erreur est survenue')
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

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingLogo(true)
    const formDataUpload = new FormData()
    formDataUpload.append('logo', file)
    
    // Récupérer l'ID du sous-traitant depuis les params
    const soustraitantId = (await props.params).id
    formDataUpload.append('soustraitantId', soustraitantId)

    try {
      const res = await fetch('/api/uploads/soustraitant-logo', {
        method: 'POST',
        body: formDataUpload
      })

      if (res.ok) {
        const { url } = await res.json()
        setFormData(prev => ({ ...prev, logo: url }))
        setLogoPreview(url)
        
        // Sauvegarder immédiatement le logo dans la base de données
        try {
          const saveResponse = await fetch(`/api/sous-traitants/${params.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              logo: url
            }),
          })
          
          if (!saveResponse.ok) {
            console.error('Erreur lors de la sauvegarde du logo dans la base de données')
          }
        } catch (saveError) {
          console.error('Erreur lors de la sauvegarde du logo:', saveError)
        }
      } else {
        throw new Error('Erreur lors de l\'upload du logo')
      }
    } catch (error) {
      console.error('Erreur upload logo:', error)
      setError('Erreur lors de l\'upload du logo')
    } finally {
      setUploadingLogo(false)
    }
  }

  if (loading) return <div className="p-8">Chargement...</div>

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="md:flex md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 dark:text-white sm:truncate sm:text-3xl sm:tracking-tight">
            Modifier le Sous-Traitant
          </h2>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        {error && (
          <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
            <div className="flex">
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

          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Accès Portail (PIN)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
              <FormInput
                id="pin"
                name="pin"
                type="text"
                label="Code PIN (4-8 chiffres)"
                value={pin}
                onChange={(e)=> setPin(e.target.value.replace(/\D/g, ''))}
              />
              <div>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={savingPin || pin.length<4}
                  onClick={async ()=>{ setSavingPin(true); await fetch(`/api/sous-traitants/${params.id}/pin`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin }) }); setSavingPin(false) }}
                >
                  {savingPin ? 'Enregistrement...' : 'Enregistrer le PIN'}
                </Button>
              </div>
            </div>
            <div className="mt-3 text-sm text-gray-700 dark:text-gray-300">
              Lien d'accès public:
              <div className="flex items-center gap-3 mt-1">
                <a href={portalLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  {portalLink}
                </a>
                <button
                  type="button"
                  onClick={() => { try { navigator.clipboard.writeText(portalLink) } catch {} }}
                  className="px-2 py-1 border rounded text-xs"
                >
                  Copier
                </button>
              </div>
            </div>
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
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </div>
      </form>
    </div>
  )
} 