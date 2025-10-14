'use client'
import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation'
import SelectField from '@/components/ui/SelectField'

interface FormData {
  nom: string
  modele: string
  numeroSerie: string
  localisation: string
  dateAchat: string
  commentaire: string
  statut: 'DISPONIBLE' | 'PRETE' | 'EN_PANNE' | 'EN_REPARATION' | 'MANQUE_CONSOMMABLE'
}

export default function EditMachinePage(props: { params: Promise<{ machineId: string }> }) {
  const params = use(props.params);
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState<FormData>({
    nom: '',
    modele: '',
    numeroSerie: '',
    localisation: '',
    dateAchat: '',
    commentaire: '',
    statut: 'DISPONIBLE'
  })

  useEffect(() => {
    fetchMachine()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.machineId])

  const fetchMachine = async () => {
    try {
      const response = await fetch(`/api/outillage/machines/${params.machineId}`)
      if (!response.ok) throw new Error('Erreur lors de la récupération de la machine')
      const data = await response.json()
      setFormData({
        nom: data.nom,
        modele: data.modele,
        numeroSerie: data.numeroSerie || '',
        localisation: data.localisation,
        dateAchat: data.dateAchat ? data.dateAchat.split('T')[0] : '',
        commentaire: data.commentaire || '',
        statut: data.statut
      })
    } catch (error) {
      console.error('Erreur:', error)
      alert("Erreur lors de la récupération des données de la machine")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSaving(true)

    try {
      const response = await fetch(`/api/outillage/machines/${params.machineId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        throw new Error('Erreur lors de la mise à jour de la machine')
      }

      router.push(`/outillage/${params.machineId}`)
      router.refresh()
    } catch (error) {
      console.error('Erreur:', error)
      alert("Une erreur s'est produite lors de la mise à jour de la machine")
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  if (loading) {
    return <div className="p-4">Chargement...</div>
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="md:flex md:items-center md:justify-between md:space-x-4 xl:border-b xl:pb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Modifier la machine</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 mt-6">
        <div>
          <label htmlFor="nom" className="block text-sm font-medium text-gray-700">
            Nom de la machine *
          </label>
          <input
            type="text"
            name="nom"
            id="nom"
            required
            value={formData.nom}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>

        <div>
          <label htmlFor="modele" className="block text-sm font-medium text-gray-700">
            Modèle *
          </label>
          <input
            type="text"
            name="modele"
            id="modele"
            required
            value={formData.modele}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>

        <div>
          <label htmlFor="numeroSerie" className="block text-sm font-medium text-gray-700">
            Numéro de série
          </label>
          <input
            type="text"
            name="numeroSerie"
            id="numeroSerie"
            value={formData.numeroSerie}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>

        <div>
          <label htmlFor="localisation" className="block text-sm font-medium text-gray-700">
            Localisation *
          </label>
          <input
            type="text"
            name="localisation"
            id="localisation"
            required
            value={formData.localisation}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>

        <SelectField
          label="Statut"
          name="statut"
          id="statut"
          required
          value={formData.statut}
          onChange={handleChange}
          className="mt-1"
        >
          <option value="DISPONIBLE">Disponible</option>
          <option value="PRETE">Prêtée</option>
          <option value="EN_PANNE">En panne</option>
          <option value="EN_REPARATION">En réparation</option>
          <option value="MANQUE_CONSOMMABLE">Manque consommable</option>
        </SelectField>

        <div>
          <label htmlFor="dateAchat" className="block text-sm font-medium text-gray-700">
            Date d'achat
          </label>
          <input
            type="date"
            name="dateAchat"
            id="dateAchat"
            value={formData.dateAchat}
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
          />
        </div>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </form>
    </div>
  )
} 