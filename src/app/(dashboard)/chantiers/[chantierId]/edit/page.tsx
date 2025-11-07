'use client'
import { useState, useEffect, use, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation'
import { DocumentExpirationAlert } from '@/components/DocumentExpirationAlert'
import { PencilSquareIcon, EyeIcon } from '@heroicons/react/24/outline'
import { SearchableSelect } from '@/components/SearchableSelect'
import { PPSSUpdateModal } from '@/components/modals/PPSSUpdateModal'

interface ChantierData {
  id?: string;
  nomChantier: string;
  numeroIdentification?: string | null;
  dateDebut?: string | null;
  statut?: 'EN_COURS' | 'TERMINE' | 'A_VENIR' | string;
  adresseChantier?: string | null;
  dureeEnJours?: number | null;
  typeDuree?: 'CALENDRIER' | 'OUVRABLE' | string | null;
  clientId?: string | null;
  contactId?: string | null;
}

interface Client {
  id: string
  nom: string
  email: string | null
  adresse: string | null
}

interface Contact {
  id: string;
  prenom: string;
  nom: string;
}

interface FormData {
  nomChantier: string
  numeroIdentification: string
  dateDebut: string
  statut: string
  adresseChantier: string
  dureeEnJours: string
  typeDuree: string
  clientId: string
  contactId?: string
}

export default function EditChantierPage(props: { params: Promise<{ chantierId: string }> }) {
  const params = use(props.params);
  const router = useRouter()
  const [chantier, setChantier] = useState<ChantierData | null>(null)
  const [clients, setClients] = useState<Client[]>([])
  const [contactsDuClient, setContactsDuClient] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingContacts, setLoadingContacts] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedClientId, setSelectedClientId] = useState<string>('')
  const [selectedContactId, setSelectedContactId] = useState<string>('')
  const [formData, setFormData] = useState<FormData>({
    nomChantier: '',
    numeroIdentification: '',
    dateDebut: '',
    statut: 'En préparation',
    adresseChantier: '',
    dureeEnJours: '',
    typeDuree: 'CALENDRIER',
    clientId: '',
    contactId: ''
  })
  const [saving, setSaving] = useState(false)
  const isInitialLoad = useRef(true)
  const [showPPSSModal, setShowPPSSModal] = useState(false)
  const [ppssModalData, setPpssModalData] = useState<{
    success: boolean
    message: string
    warning?: string
  } | null>(null)

  const fetchContactsForClient = useCallback(async (clientId: string, preserveContactId?: string) => {
    if (!clientId) {
      setContactsDuClient([]);
      return;
    }

    setLoadingContacts(true);
    try {
      const response = await fetch(`/api/clients/${clientId}/contacts`);
      if (response.ok) {
        const contacts = await response.json();
        setContactsDuClient(contacts);
        
        // Si on préserve un contactId et qu'il existe dans la liste, s'assurer qu'il est sélectionné
        if (preserveContactId && contacts.some((c: Contact) => c.id === preserveContactId)) {
          setSelectedContactId(preserveContactId);
        }
      } else {
        console.error('Erreur lors du chargement des contacts');
        setContactsDuClient([]);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des contacts:', error);
      setContactsDuClient([]);
    } finally {
      setLoadingContacts(false);
    }
  }, []);

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const response = await fetch('/api/clients')
        const data = await response.json()
        const sortedClients = data.sort((a: Client, b: Client) => a.nom.localeCompare(b.nom, 'fr', { sensitivity: 'base' }))
        setClients(sortedClients)
      } catch (error) {
        console.error('Erreur lors du chargement des clients:', error)
        setError('Erreur lors du chargement des clients')
      }
    }

    const fetchChantier = async () => {
      setLoading(true);
      try {
        const chantierResponse = await fetch(`/api/chantiers/${params.chantierId}`)
        const chantierData = await chantierResponse.json()
        console.log("Données du chantier chargées:", chantierData)
        setChantier(chantierData)
        setSelectedClientId(chantierData.clientId || '')
        setSelectedContactId(chantierData.contactId || '')
        
        let statusForDisplay = 'En préparation';
        if (chantierData.statut === 'EN_COURS') statusForDisplay = 'En cours';
        else if (chantierData.statut === 'TERMINE') statusForDisplay = 'Terminé';
        else if (chantierData.statut === 'A_VENIR') statusForDisplay = 'À venir';
        
        setFormData({
          nomChantier: chantierData.nomChantier,
          numeroIdentification: chantierData.numeroIdentification || '',
          dateDebut: chantierData.dateDebut ? new Date(chantierData.dateDebut).toISOString().split('T')[0] : '',
          statut: statusForDisplay,
          adresseChantier: chantierData.adresseChantier || '',
          dureeEnJours: chantierData.dureeEnJours?.toString() || '',
          typeDuree: chantierData.typeDuree || 'CALENDRIER',
          clientId: chantierData.clientId || '',
          contactId: chantierData.contactId || ''
        })

        if (chantierData.clientId) {
          // Préserver le contactId lors du chargement initial
          fetchContactsForClient(chantierData.clientId, chantierData.contactId || undefined);
        }

        // Marquer que le chargement initial est terminé
        isInitialLoad.current = false;

      } catch (error) {
        console.error('Erreur:', error)
        setError('Erreur lors du chargement du chantier')
      } finally {
        setLoading(false)
      }
    }

    fetchClients()
    fetchChantier()
  }, [params.chantierId, fetchContactsForClient])

  useEffect(() => {
    // Ne pas réinitialiser le contact lors du chargement initial
    if (isInitialLoad.current) {
      return;
    }

    if (selectedClientId && chantier) {
      const currentChantierClient = chantier?.clientId;
      // Réinitialiser le contact seulement si l'utilisateur change vraiment le client
      if (selectedClientId !== currentChantierClient) {
        setSelectedContactId('');
        setFormData(prev => ({ ...prev, contactId: '' }));
      }
      fetchContactsForClient(selectedClientId);
    } else if (!selectedClientId) {
      setContactsDuClient([]);
      setSelectedContactId('');
      setFormData(prev => ({ ...prev, contactId: '' }));
    }
  }, [selectedClientId, fetchContactsForClient, chantier]);

  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      contactId: selectedContactId
    }));
  }, [selectedContactId]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSaving(true)

    try {
      const chantierActuelResponse = await fetch(`/api/chantiers/${params.chantierId}`);
      if (!chantierActuelResponse.ok) throw new Error('Impossible de récupérer les données actuelles du chantier');
      const chantierActuelData = await chantierActuelResponse.json();
      
      const dataToSend = {
        ...chantierActuelData,
        ...formData,
        statut: formData.statut,
        dateDebut: formData.dateDebut ? new Date(formData.dateDebut).toISOString() : chantierActuelData.dateDebut,
        dureeEnJours: formData.dureeEnJours ? parseInt(formData.dureeEnJours) : chantierActuelData.dureeEnJours,
        contactId: formData.contactId || null
      };

      console.log("Données envoyées pour mise à jour:", dataToSend);
      
      const response = await fetch(`/api/chantiers/${params.chantierId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSend),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erreur inconnue lors de la mise à jour' }));
        throw new Error(errorData.error || 'Erreur lors de la mise à jour');
      }

      const result = await response.json();
      
      // Vérifier si le PPSS a été généré avec succès
      if (result.ppssError) {
        console.warn('Problème avec la génération du PPSS:', result.ppssError);
        // Afficher un message d'avertissement mais continuer
        setPpssModalData({
          success: true,
          message: 'Chantier mis à jour avec succès !',
          warning: result.ppssError
        })
        setShowPPSSModal(true)
      } else {
        // Tout s'est bien passé, y compris le PPSS
        setPpssModalData({
          success: true,
          message: 'Le PPSS a été automatiquement régénéré.'
        })
        setShowPPSSModal(true)
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error)
      setError(error instanceof Error ? error.message : 'Erreur lors de la mise à jour du chantier')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
    </div>
  )

  if (error) return (
    <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-lg border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400">
      {error}
    </div>
  )

  if (!chantier) return (
    <div className="bg-yellow-50 dark:bg-yellow-900/10 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-400">
      Chantier non trouvé
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <DocumentExpirationAlert />
      
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* En-tête moderne harmonisé avec la page Consulter */}
        <div className="mb-6">
          <div className="relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-2 border-white/50 dark:border-gray-700/50 rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-sky-600/60 via-sky-700/60 to-cyan-800/60 dark:from-sky-600/30 dark:via-sky-700/30 dark:to-cyan-800/30" />

            <div className="relative z-10 p-4 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-col gap-3">
                  <div className="inline-flex items-center px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full shadow-lg ring-2 ring-white/30">
                    <PencilSquareIcon className="w-6 h-6 mr-3 text-sky-900 dark:text-white" />
                    <h1 className="text-xl font-bold text-sky-900 dark:text-white">
                      Éditer
                    </h1>
                  </div>
                  {chantier.numeroIdentification && (
                    <span className="px-3 py-1 rounded-full bg-white/30 backdrop-blur-sm text-sky-900 dark:text-white shadow-sm text-xs sm:text-sm font-semibold inline-flex w-max">
                      N° {chantier.numeroIdentification}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => router.push(`/chantiers/${params.chantierId}`)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white/30 backdrop-blur-sm rounded-lg text-sm font-semibold shadow-lg hover:bg-white/40 transition-all duration-200 text-sky-900 dark:text-white"
                  >
                    <EyeIcon className="h-5 w-5" />
                    Consulter
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Contenu principal */}
        <div className="space-y-8">
          {/* Section Modification du chantier */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-sky-500 via-sky-600 to-cyan-700 text-white rounded-full shadow-lg ring-2 ring-sky-200 dark:ring-sky-700">
                <PencilSquareIcon className="w-5 h-5 mr-2" />
                <span className="font-bold text-lg">Informations du chantier</span>
              </div>
            </div>
            <div className="p-6">
              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Section Informations générales */}
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200 border-b border-gray-200 dark:border-gray-600 pb-2">
                    Informations générales
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                        placeholder="Ex: CH-2025-001 (optionnel)"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Client
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
                          setSelectedClientId(clientId);
                          setFormData(prev => ({
                            ...prev,
                            clientId: clientId
                          }));
                        }}
                        placeholder="Sélectionner un client"
                        searchPlaceholder="Rechercher un client..."
                        emptyMessage="Aucun client trouvé"
                        showAllOption={false}
                      />
                    </div>

                    {selectedClientId && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Contact principal <span className="text-xs text-gray-500">(Optionnel)</span>
                        </label>
                        <SearchableSelect
                          options={contactsDuClient.map((contact) => ({
                            value: contact.id,
                            label: `${contact.prenom} ${contact.nom}`
                          }))}
                          value={selectedContactId || null}
                          onChange={(v) => {
                            setSelectedContactId(v as string);
                          }}
                          disabled={loadingContacts || contactsDuClient.length === 0}
                          placeholder={loadingContacts ? "Chargement..." : (contactsDuClient.length === 0 ? "Aucun contact" : "Sélectionner un contact")}
                          searchPlaceholder="Rechercher un contact..."
                          emptyMessage="Aucun contact trouvé"
                          showAllOption={false}
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Date de commencement
                      </label>
                      <input
                        type="date"
                        name="dateDebut"
                        value={formData.dateDebut}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          dateDebut: e.target.value
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        État du chantier
                      </label>
                      <select
                        name="statut"
                        value={formData.statut}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          statut: e.target.value
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      >
                        <option value="En préparation">En préparation</option>
                        <option value="En cours">En cours</option>
                        <option value="Terminé">Terminé</option>
                      </select>
                    </div>
                  </div>
                </div>
                
                {/* Section Détails du chantier */}
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200 border-b border-gray-200 dark:border-gray-600 pb-2">
                    Détails du chantier
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Type de durée
                      </label>
                      <select
                        name="typeDuree"
                        value={formData.typeDuree}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          typeDuree: e.target.value
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      >
                        <option value="CALENDRIER">Jours calendrier (tous les jours)</option>
                        <option value="OUVRABLE">Jours ouvrables (lun-ven)</option>
                      </select>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Ce choix affecte le calcul de la date de fin dans le planning.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Boutons d'action */}
                <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <button
                    type="button"
                    onClick={() => router.push(`/chantiers`)}
                    className="px-6 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-lg shadow-sm hover:from-blue-700 hover:to-indigo-800 transition-all duration-200 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Enregistrement...</span>
                      </>
                    ) : (
                      <>
                        <PencilSquareIcon className="h-5 w-5 mr-2" />
                        <span>Enregistrer</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de confirmation PPSS */}
      {ppssModalData && (
        <PPSSUpdateModal
          isOpen={showPPSSModal}
          onClose={() => {
            setShowPPSSModal(false)
            setPpssModalData(null)
            router.push('/chantiers')
          }}
          success={ppssModalData.success}
          message={ppssModalData.message}
          warning={ppssModalData.warning}
        />
      )}
    </div>
  )
} 