'use client'
import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { FormInput, Button } from '@/components/ui'
import { 
  PencilSquareIcon,
  ArrowLeftIcon,
  KeyIcon,
  LinkIcon
} from '@heroicons/react/24/outline'
import { toast, Toaster } from 'react-hot-toast'

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
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Erreur lors de la mise à jour du sous-traitant')
      }

      toast.success('Sous-traitant modifié avec succès')
      
      // Rediriger vers la page de consultation du sous-traitant
      router.push(`/sous-traitants/${params.id}`)
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Toaster position="top-right" />
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header moderne */}
        <div className="mb-6">
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-2 border-white/50 dark:border-gray-700/50 rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/60 via-indigo-700/60 to-purple-800/60 dark:from-blue-600/30 dark:via-indigo-700/30 dark:to-purple-800/30"></div>

            <div className="relative z-10 p-4 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => router.push(`/sous-traitants/${params.id}`)}
                    className="p-2 bg-white/30 backdrop-blur-sm rounded-lg hover:bg-white/40 transition-all duration-200"
                  >
                    <ArrowLeftIcon className="h-5 w-5 text-blue-900 dark:text-white" />
                  </button>
                  <div className="flex flex-col gap-3">
                    <div className="inline-flex items-center px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full shadow-lg ring-2 ring-white/30">
                      <PencilSquareIcon className="w-6 h-6 mr-3 text-blue-900 dark:text-white" />
                      <h1 className="text-xl font-bold text-blue-900 dark:text-white">
                        Modifier le Sous-Traitant
                      </h1>
                    </div>
                    {formData.nom && (
                      <span className="px-3 py-1 rounded-full bg-white/30 backdrop-blur-sm text-blue-900 dark:text-white shadow-sm text-xs sm:text-sm font-semibold inline-flex w-max">
                        {formData.nom}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-xl bg-red-50 dark:bg-red-900/20 p-4 border border-red-200 dark:border-red-800">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800 dark:text-red-400">{error}</h3>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-6 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
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

          <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-4">
              <KeyIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Accès Portail (PIN)</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
              <div className="sm:col-span-2">
                <FormInput
                  id="pin"
                  name="pin"
                  type="text"
                  label="Code PIN (4-8 chiffres)"
                  value={pin}
                  onChange={(e)=> setPin(e.target.value.replace(/\D/g, ''))}
                  maxLength={8}
                />
              </div>
              <div>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={savingPin || pin.length < 4}
                  onClick={async () => { 
                    setSavingPin(true)
                    try {
                      const response = await fetch(`/api/sous-traitants/${params.id}/pin`, { 
                        method: 'PUT', 
                        headers: { 'Content-Type': 'application/json' }, 
                        body: JSON.stringify({ pin }) 
                      })
                      if (response.ok) {
                        toast.success('PIN enregistré avec succès')
                      } else {
                        toast.error('Erreur lors de l\'enregistrement du PIN')
                      }
                    } catch {
                      toast.error('Erreur lors de l\'enregistrement du PIN')
                    } finally {
                      setSavingPin(false)
                    }
                  }}
                  className="w-full"
                >
                  {savingPin ? 'Enregistrement...' : 'Enregistrer le PIN'}
                </Button>
              </div>
            </div>
            <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <LinkIcon className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Lien d'accès public:</span>
              </div>
              <div className="flex items-center gap-3">
                <a 
                  href={portalLink} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-blue-600 dark:text-blue-400 hover:underline text-sm break-all flex-1"
                >
                  {portalLink}
                </a>
                <button
                  type="button"
                  onClick={async () => { 
                    try { 
                      await navigator.clipboard.writeText(portalLink)
                      toast.success('Lien copié dans le presse-papiers')
                    } catch {
                      toast.error('Impossible de copier le lien')
                    }
                  }}
                  className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-xs font-medium hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                >
                  Copier
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(`/sous-traitants/${params.id}`)}
            className="px-6"
          >
            Annuler
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={saving}
            isLoading={saving}
            className="px-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700"
          >
            {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
          </Button>
        </div>
      </form>
      </div>
    </div>
  )
} 