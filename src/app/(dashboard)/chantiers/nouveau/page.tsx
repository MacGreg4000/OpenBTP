'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ArrowLeftIcon, BuildingOfficeIcon, MapPinIcon, CalendarIcon, ClockIcon, PlusIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline'
import { Breadcrumb } from '@/components/Breadcrumb'
import { toast } from 'react-hot-toast'
import { SearchableSelect } from '@/components/SearchableSelect'

interface Client {
  id: string
  nom: string
  email: string
  adresse: string
}

interface Contact {
  id: string
  prenom: string
  nom: string
  email: string
  telephone: string
  clientId: string
}

interface FormData {
  nomChantier: string
  numeroIdentification: string
  dateCommencement: string
  etatChantier: string
  adresseChantier: string
  dureeEnJours: string
  typeDuree: string
  clientId: string
  contactId?: string
}

export default function NouveauChantierPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [clients, setClients] = useState<Client[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingContacts, setLoadingContacts] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Lire les paramètres d'URL pour pré-sélectionner le client
  const clientIdFromUrl = searchParams.get('clientId') || ''
  const [selectedClientId, setSelectedClientId] = useState<string>(clientIdFromUrl)
  const [selectedContactId, setSelectedContactId] = useState<string>('')
  const [formData, setFormData] = useState<FormData>({
    nomChantier: '',
    numeroIdentification: '',
    dateCommencement: '',
    etatChantier: 'En préparation',
    adresseChantier: '',
    dureeEnJours: '',
    typeDuree: 'CALENDRIER',
    clientId: clientIdFromUrl,
    contactId: ''
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const response = await fetch('/api/clients')
        if (response.ok) {
          const data = await response.json()
          setClients(data)
          
          // Si un clientId est passé en paramètre, charger les contacts pour ce client
          if (clientIdFromUrl) {
            setSelectedClientId(clientIdFromUrl)
            setFormData(prev => ({ ...prev, clientId: clientIdFromUrl }))
            
            // Charger les contacts pour le client pré-sélectionné
            const contactsResponse = await fetch(`/api/clients/${clientIdFromUrl}/contacts`)
            if (contactsResponse.ok) {
              const contactsData = await contactsResponse.json()
              setContacts(contactsData)
            }
          }
        }
      } catch (error) {
        console.error('Erreur lors du chargement des clients:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchClients()
  }, [clientIdFromUrl])

  useEffect(() => {
    const fetchContacts = async () => {
      if (!selectedClientId) {
        setContacts([])
        setSelectedContactId('')
        return
      }

      setLoadingContacts(true)
      try {
        const response = await fetch(`/api/clients/${selectedClientId}/contacts`)
        if (response.ok) {
          const data = await response.json()
          setContacts(data)
        }
      } catch (error) {
        console.error('Erreur lors du chargement des contacts:', error)
      } finally {
        setLoadingContacts(false)
      }
    }

    fetchContacts()
  }, [selectedClientId])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSaving(true)

    try {
      const selectedClient = clients.find(client => client.id === selectedClientId)
      
      const dataToSend = {
        ...formData,
        clientId: selectedClientId, // Utiliser selectedClientId au lieu de formData.clientId
        clientNom: selectedClient?.nom || null,
        clientEmail: selectedClient?.email || null,
        clientAdresse: selectedClient?.adresse || null,
      };
      if (dataToSend.contactId === '') delete dataToSend.contactId;

      const response = await fetch('/api/chantiers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSend),
      })

      if (!response.ok) throw new Error('Erreur lors de la création')

      toast.success('Chantier créé avec succès !')
      router.push('/chantiers')
    } catch (error) {
      console.error('Erreur:', error)
      setError('Erreur lors de la création du chantier')
      toast.error('Erreur lors de la création du chantier')
    } finally {
      setSaving(false)
    }
  }

  if (loading && clients.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Chargement des clients...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* En-tête avec gradient cohérent avec /chantiers */}
      <div className="bg-gradient-to-r from-amber-600 to-orange-700 shadow-lg">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="md:flex md:items-center md:justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center">
                <PlusIcon className="h-8 w-8 text-white mr-3" />
                <div>
                  <h1 className="text-3xl font-bold text-white">
                    Nouveau Chantier
                  </h1>
                  <p className="mt-2 text-amber-100">
                    Créez un nouveau projet de construction
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-4 md:mt-0">
              <button
                onClick={() => router.push('/chantiers')}
                className="inline-flex items-center px-4 py-2 border border-white/20 rounded-md shadow-sm text-sm font-medium text-white bg-white/10 hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-colors duration-200"
              >
                <ArrowLeftIcon className="h-4 w-4 mr-2" />
                Retour aux chantiers
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <Breadcrumb 
          items={[
            { label: 'Chantiers', href: '/chantiers' },
            { label: 'Nouveau chantier', href: '/chantiers/nouveau' }
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
              <BuildingOfficeIcon className="h-6 w-6 text-amber-600 mr-3" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Informations du chantier</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Section Informations générales */}
              <div>
                <div className="flex items-center mb-6">
                  <div className="flex items-center justify-center w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-lg mr-3">
                    <BuildingOfficeIcon className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    Informations générales
                  </h3>
                </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Nom du chantier *
                  </label>
                  <input
                    type="text"
                    name="nomChantier"
                    value={formData.nomChantier}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      nomChantier: e.target.value
                    }))}
                    required
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 dark:bg-gray-700 dark:text-white transition-colors duration-200"
                    placeholder="Ex: Rénovation appartement rue de la Paix"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Numéro d'identification
                  </label>
                  <input
                    type="text"
                    name="numeroIdentification"
                    value={formData.numeroIdentification}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      numeroIdentification: e.target.value
                    }))}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 dark:bg-gray-700 dark:text-white transition-colors duration-200"
                    placeholder="Ex: CH-2025-001 (optionnel)"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Client *
                  </label>
                  <SearchableSelect
                    options={clients.map((client) => ({
                      value: client.id,
                      label: client.nom,
                      subtitle: client.email || undefined
                    }))}
                    value={selectedClientId || null}
                    onChange={(v) => {
                      const clientId = v as string
                      setSelectedClientId(clientId)
                      setFormData(prev => ({ ...prev, clientId }))
                    }}
                    placeholder="Sélectionner un client"
                    searchPlaceholder="Rechercher un client..."
                    emptyMessage="Aucun client trouvé"
                    showAllOption={false}
                  />
                </div>

                {selectedClientId && (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Contact principal
                    </label>
                    <SearchableSelect
                      options={contacts.map((contact) => ({
                        value: contact.id,
                        label: `${contact.prenom} ${contact.nom}`,
                        subtitle: contact.email || contact.telephone || undefined
                      }))}
                      value={selectedContactId || null}
                      onChange={(v) => {
                        setSelectedContactId(v as string)
                        setFormData(prev => ({ ...prev, contactId: v as string }))
                      }}
                      disabled={loadingContacts || contacts.length === 0}
                      placeholder={
                        loadingContacts ? "Chargement des contacts..." : 
                        (contacts.length === 0 ? "Aucun contact pour ce client" : 
                         "Sélectionner un contact (optionnel)")
                      }
                      searchPlaceholder="Rechercher un contact..."
                      emptyMessage="Aucun contact trouvé"
                      showAllOption={false}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Date de commencement *
                  </label>
                  <div className="relative">
                    <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="date"
                      name="dateCommencement"
                      value={formData.dateCommencement}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        dateCommencement: e.target.value
                      }))}
                      required
                      className="w-full pl-12 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-colors duration-200"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    État du chantier
                  </label>
                                     <SelectField
                     label=""
                     name="etatChantier"
                     value={formData.etatChantier}
                     onChange={(e) => setFormData(prev => ({
                       ...prev,
                       etatChantier: e.target.value
                     }))}
                     className="w-full"
                   >
                    <option value="En préparation">En préparation</option>
                    <option value="En cours">En cours</option>
                    <option value="Terminé">Terminé</option>
                  </SelectField>
                </div>
              </div>
            </div>

              {/* Section Localisation */}
              <div>
                <div className="flex items-center mb-6">
                  <div className="flex items-center justify-center w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg mr-3">
                    <MapPinIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    Localisation du chantier
                  </h3>
                </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Adresse du chantier
                </label>
                <div className="relative">
                  <MapPinIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    name="adresseChantier"
                    value={formData.adresseChantier}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      adresseChantier: e.target.value
                    }))}
                    className="w-full pl-12 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-colors duration-200"
                    placeholder="Ex: 123 Rue de la Paix, 75001 Paris"
                  />
                </div>
              </div>
            </div>

              {/* Section Planning */}
              <div>
                <div className="flex items-center mb-6">
                  <div className="flex items-center justify-center w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg mr-3">
                    <ClockIcon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    Planning et durée
                  </h3>
                </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Durée (en jours)
                  </label>
                  <input
                    type="number"
                    name="dureeEnJours"
                    value={formData.dureeEnJours}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      dureeEnJours: e.target.value
                    }))}
                    min="1"
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 dark:bg-gray-700 dark:text-white transition-colors duration-200"
                    placeholder="Ex: 30"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Type de durée
                  </label>
                  <select
                    name="typeDuree"
                    value={formData.typeDuree}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      typeDuree: e.target.value
                    }))}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 dark:bg-gray-700 dark:text-white transition-colors duration-200"
                  >
                    <option value="CALENDRIER">Jours calendrier (tous les jours)</option>
                    <option value="OUVRABLE">Jours ouvrables (lun-ven)</option>
                  </select>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Ce choix affectera le calcul de la date de fin dans le planning.
                  </p>
                </div>
              </div>
            </div>

              {/* Boutons d'action */}
              <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => router.push('/chantiers')}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-colors"
                >
                  <ArrowLeftIcon className="h-4 w-4 mr-2" />
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:bg-amber-300 transition-colors"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                      Création...
                    </>
                  ) : (
                    <>
                      <PlusIcon className="h-4 w-4 mr-2" />
                      Créer le chantier
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