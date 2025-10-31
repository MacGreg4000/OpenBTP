'use client'
import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
// import { type Chantier } from '@/types/chantier'
import { FormInput, FormTextarea, Button } from '@/components/ui'

interface Client {
  id: string
  nom: string
  email: string | null
  adresse: string | null
  telephone: string | null
  numeroTva: string | null
  Chantier: Array<{
    chantierId: string
    nomChantier: string
    dateDebut: string
    statut: string
    budget: number
  }>
}

export default function EditClientPage(props: { params: Promise<{ clientId: string }> }) {
  const params = use(props.params);
  const router = useRouter()
  const { data: session } = useSession()
  const [client, setClient] = useState<Client | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!session) return

    fetch(`/api/clients/${params.clientId}`)
      .then(res => res.json())
      .then(data => {
        setClient(data)
        setLoading(false)
      })
      .catch(error => {
        console.error('Erreur:', error)
        setError('Erreur lors de la récupération du client')
        setLoading(false)
      })
  }, [params.clientId, session])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSaving(true)

    try {
      // Récupérer les données complètes du client avant modification
      const clientResponse = await fetch(`/api/clients/${params.clientId}`);
      const clientData = await clientResponse.json();
      
      // Mise à jour uniquement des champs du formulaire tout en préservant le reste
      const updatedClientData = {
        ...clientData,
        nom: client?.nom || clientData.nom,
        email: client?.email || clientData.email,
        adresse: client?.adresse || clientData.adresse,
        telephone: client?.telephone || clientData.telephone,
        numeroTva: client?.numeroTva || clientData.numeroTva,
      };
      
      console.log("Données client envoyées pour mise à jour:", updatedClientData);
      
      const response = await fetch(`/api/clients/${params.clientId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedClientData)
      })

      if (!response.ok) throw new Error('Erreur lors de la mise à jour')
      
      router.push('/clients')
    } catch (error) {
      console.error('Erreur:', error)
      setError('Erreur lors de la mise à jour du client')
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setClient(prev => prev ? ({
      ...prev,
      [name]: value
    }) : null)
  }

  if (!session) {
    return <div className="p-8 text-red-600">Veuillez vous connecter pour accéder à cette page</div>
  }

  if (loading) return <div className="p-8">Chargement...</div>
  if (error) return <div className="p-8 text-red-600">Erreur: {error}</div>
  if (!client) return <div className="p-8">Client non trouvé</div>

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="space-y-8">
        {/* Formulaire d'édition */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          <form onSubmit={handleSubmit} className="space-y-6 p-6">
            <h2 className="text-xl font-bold dark:text-white">Informations du client</h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <FormInput
                id="nom"
                name="nom"
                type="text"
                label="Nom du client"
                value={client.nom}
                onChange={handleChange}
                required
              />

              <FormInput
                id="email"
                name="email"
                type="email"
                label="Email"
                value={client.email || ''}
                onChange={handleChange}
              />

              <FormInput
                id="telephone"
                name="telephone"
                type="tel"
                label="Téléphone"
                value={client.telephone || ''}
                onChange={handleChange}
              />

              <FormTextarea
                id="adresse"
                name="adresse"
                label="Adresse"
                value={client.adresse || ''}
                onChange={handleChange}
                rows={3}
              />

              <FormInput
                id="numeroTva"
                name="numeroTva"
                type="text"
                label="Numéro de TVA"
                value={client.numeroTva || ''}
                onChange={handleChange}
                placeholder="BE 1234.567.890"
              />
            </div>

            <div className="flex justify-end space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/clients')}
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

        {/* Historique des chantiers */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          <div className="p-6">
            <h2 className="text-xl font-bold mb-4 dark:text-white">Historique des chantiers</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Nom du chantier
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Date de commencement
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      État
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Montant
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {client.Chantier?.map((chantier) => (
                    <tr key={chantier.chantierId}>
                      <td className="px-6 py-4 whitespace-nowrap dark:text-gray-200">
                        {chantier.nomChantier}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap dark:text-gray-200">
                        {chantier.dateDebut ? new Date(chantier.dateDebut).toLocaleDateString() : 'Non définie'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusStyle(chantier.statut)}`}>
                          {formatStatus(chantier.statut)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap dark:text-gray-200">
                        {chantier.budget ? chantier.budget.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' }) : '0 €'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link
                          href={`/chantiers/${chantier.chantierId}/etats`}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          Voir le chantier
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function getStatusStyle(status: string) {
  // Convertir au format affiché si nécessaire
  const displayStatus = formatStatus(status);
  
  switch (displayStatus) {
    case 'En cours':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
    case 'Terminé':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
    case 'En préparation':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
    case 'À venir':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
    default:
      return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
  }
}

function formatStatus(status: string) {
  // Conversion des formats API (EN_COURS) vers formats d'affichage (En cours)
  switch (status) {
    case 'EN_COURS':
      return 'En cours'
    case 'TERMINE':
      return 'Terminé'
    case 'EN_PREPARATION':
      return 'En préparation'
    case 'A_VENIR':
      return 'À venir'
    // Déjà au format d'affichage
    case 'En cours':
    case 'Terminé':
    case 'En préparation':
    case 'À venir':
      return status
    default:
      return status || 'Inconnu'
  }
} 