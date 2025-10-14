'use client'
import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation'
import { type Chantier } from '@/types/chantier'
import SelectField from '@/components/ui/SelectField'

interface Client {
  id: string
  nom: string
  email: string | null
  adresse: string | null
}

export default function EditChantierPage(props: { params: Promise<{ chantierId: string }> }) {
  const params = use(props.params);
  const chantierId = params.chantierId;
  const router = useRouter()
  const [chantier, setChantier] = useState<Chantier | null>(null)
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedClientId, setSelectedClientId] = useState<string>('')
  const [formData, setFormData] = useState({
    nomChantier: '',
    dateCommencement: '',
    etatChantier: 'En préparation',
    adresseChantier: '',
    dureeEnJours: ''
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const res = await fetch('/api/clients')
        const data = await res.json()
        setClients(data)
      } catch (error) {
        console.error('Erreur:', error)
        setError('Erreur lors de la récupération des clients')
      }
    }

    const fetchChantier = async () => {
      try {
        const res = await fetch(`/api/chantiers/${chantierId}`)
        const data = await res.json()
        setChantier(data)

        // Conversion du statut pour l'affichage
        let etatChantier = 'En préparation'
        if (data.statut === 'EN_COURS') etatChantier = 'En cours'
        else if (data.statut === 'TERMINE') etatChantier = 'Terminé'
        else if (data.statut === 'A_VENIR') etatChantier = 'À venir'

        setFormData({
          nomChantier: data.nomChantier,
          dateCommencement: data.dateDebut ? new Date(data.dateDebut).toISOString().split('T')[0] : '',
          etatChantier: etatChantier,
          adresseChantier: data.adresseChantier || '',
          dureeEnJours: data.dureeEnJours?.toString() || ''
        })
        setSelectedClientId(data.clientId || '')
        setLoading(false)
      } catch (error) {
        console.error('Erreur:', error)
        setError('Erreur lors de la récupération du chantier')
        setLoading(false)
      }
    }

    fetchClients()
    fetchChantier()
  }, [chantierId])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSaving(true)

    try {
      const res = await fetch(`/api/chantiers/${chantierId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          clientId: selectedClientId || null
        })
      })

      if (!res.ok) throw new Error('Erreur lors de la mise à jour')

      router.push('/chantiers')
    } catch (error) {
      console.error('Erreur:', error)
      setError('Erreur lors de la mise à jour du chantier')
    }
  }

  if (loading) return <div className="p-8">Chargement...</div>
  if (error) return <div className="p-8 text-red-500">{error}</div>
  if (!chantier) return <div className="p-8">Chantier non trouvé</div>

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-6 text-gray-900 dark:text-white">Modifier le chantier</h2>
        
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          <form onSubmit={handleSubmit} className="space-y-6 p-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Nom du chantier
                </label>
                <input
                  type="text"
                  name="nomChantier"
                  value={formData.nomChantier}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    nomChantier: e.target.value
                  }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  required
                />
              </div>

              <SelectField
                label="Client"
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                required
                className="mt-1"
              >
                <option value="">Sélectionner un client</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.nom}
                  </option>
                ))}
              </SelectField>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Date de commencement
                </label>
                <input
                  type="date"
                  name="dateCommencement"
                  value={formData.dateCommencement}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    dateCommencement: e.target.value
                  }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  required
                />
              </div>

              <SelectField
                label="État du chantier"
                name="etatChantier"
                value={formData.etatChantier}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  etatChantier: e.target.value
                }))}
                className="mt-1"
              >
                <option value="En préparation">En préparation</option>
                <option value="En cours">En cours</option>
                <option value="Terminé">Terminé</option>
              </SelectField>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Adresse du chantier
                </label>
                <input
                  type="text"
                  name="adresseChantier"
                  value={formData.adresseChantier}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    adresseChantier: e.target.value
                  }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>

              <div>
                <label htmlFor="dureeEnJours" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Durée (en jours)
                </label>
                <input
                  type="number"
                  name="dureeEnJours"
                  id="dureeEnJours"
                  min="1"
                  value={formData.dureeEnJours}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    dureeEnJours: e.target.value
                  }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => router.push('/chantiers')}
                className="px-4 py-2 border rounded-md text-gray-700 dark:text-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
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
      </div>
    </div>
  )
} 