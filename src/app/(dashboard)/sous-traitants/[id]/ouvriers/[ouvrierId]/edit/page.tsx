'use client'
import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { FormInput, Button } from '@/components/ui'
import PageHeader from '@/components/PageHeader'
import { PencilSquareIcon } from '@heroicons/react/24/outline'

interface FormData {
  nom: string
  prenom: string
  email: string
  telephone: string
  dateEntree: string
  poste: string
}

export default function EditOuvrierPage(
  props: { 
    params: Promise<{ id: string, ouvrierId: string }> 
  }
) {
  const params = use(props.params);
  const router = useRouter()
  const { data: session } = useSession()
  const [formData, setFormData] = useState<FormData>({
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    dateEntree: '',
    poste: ''
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [pin, setPin] = useState('')
  const [savingPin, setSavingPin] = useState(false)
  const [sousTraitantNom, setSousTraitantNom] = useState('')
  const portalLink = typeof window !== 'undefined' 
    ? `${window.location.origin}/public/portail/ouvrier/${params.ouvrierId}` 
    : `/public/portail/ouvrier/${params.ouvrierId}`

  useEffect(() => {
    if (session) {
      fetch(`/api/sous-traitants/${params.id}/ouvriers/${params.ouvrierId}`)
        .then(res => res.json())
        .then(data => {
          setFormData({
            nom: data.nom,
            prenom: data.prenom,
            email: data.email || '',
            telephone: data.telephone || '',
            dateEntree: new Date(data.dateEntree).toISOString().split('T')[0],
            poste: data.poste
          })
          if (data.sousTraitant?.nom) {
            setSousTraitantNom(data.sousTraitant.nom)
          }
          setLoading(false)
        })
        .then(async ()=>{
          try {
            const resPin = await fetch(`/api/ouvriers-internes/${params.ouvrierId}/pin`)
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
  }, [session, params.id, params.ouvrierId])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const response = await fetch(`/api/sous-traitants/${params.id}/ouvriers/${params.ouvrierId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erreur lors de la mise à jour de l\'ouvrier')
      }

      router.push(`/sous-traitants/${params.id}/ouvriers`)
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

  if (loading) return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <PageHeader
        title={`Modifier ${formData.prenom} ${formData.nom}`}
        subtitle={`Ouvrier chez ${sousTraitantNom}`}
        icon={PencilSquareIcon}
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
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
            label="Nom"
            required
            value={formData.nom}
            onChange={handleChange}
          />

          <FormInput
            id="prenom"
            name="prenom"
            type="text"
            label="Prénom"
            required
            value={formData.prenom}
            onChange={handleChange}
          />

          <FormInput
            id="email"
            name="email"
            type="email"
            label="Email"
            value={formData.email}
            onChange={handleChange}
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
            id="dateEntree"
            name="dateEntree"
            type="date"
            label="Date d'entrée"
            value={formData.dateEntree}
            onChange={handleChange}
          />

          <FormInput
            id="poste"
            name="poste"
            type="text"
            label="Poste"
            value={formData.poste}
            onChange={handleChange}
          />

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
                  onClick={async ()=>{ setSavingPin(true); await fetch(`/api/ouvriers-internes/${params.ouvrierId}/pin`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin }) }); setSavingPin(false) }}
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
    </div>
  )
} 