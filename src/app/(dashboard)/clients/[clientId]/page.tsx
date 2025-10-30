'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeftIcon, PencilIcon, PlusCircleIcon, TrashIcon, BuildingOfficeIcon } from '@heroicons/react/24/outline';
import ContactForm from '@/components/clients/ContactForm';

// Types (à définir plus précisément)
interface ChantierSimplifie { // Nouvelle interface pour les chantiers du client
  chantierId: string;
  nomChantier: string;
  dateDebut?: string | null; 
  statut?: string;
  budget?: number | null;
  adresseChantier?: string | null;
}

interface ClientDetails {
  id: string;
  nom: string;
  email?: string;
  telephone?: string;
  adresse?: string;
  numeroTva?: string;
  Chantier?: ChantierSimplifie[]; // Modifié pour correspondre à l'API
  // ... autres champs du client
}

interface Contact {
  id: string;
  prenom: string;
  nom: string;
  email?: string;
  telephone?: string;
  fonction?: string;
  notes?: string;
}

export default function ClientDetailPage() {
  const params = useParams();
  const clientId = params.clientId as string;

  const [client, setClient] = useState<ClientDetails | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loadingClient, setLoadingClient] = useState(true);
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // États pour la modale de contact
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [isSubmittingContact, setIsSubmittingContact] = useState(false);

  // Fonction pour rafraîchir la liste des contacts, mémorisée avec useCallback
  const fetchContacts = useCallback(async () => {
    if (!clientId) return;
    setLoadingContacts(true);
    // Réinitialiser l'erreur spécifique aux contacts avant de fetcher
    // setError(prevError => prevError && prevError.includes("contacts") ? null : prevError);
    try {
      const res = await fetch(`/api/clients/${clientId}/contacts`);
      if (!res.ok) {
        throw new Error(`Erreur HTTP ${res.status} lors de la récupération des contacts`);
      }
      const data = await res.json();
      setContacts(data);
    } catch (err) {
      console.error("Erreur lors de la récupération des contacts:", err);
      const newError = err instanceof Error ? err.message : String(err);
      // setError(prev => prev ? `${prev}; ${newError}` : newError); // Pourrait concaténer les erreurs
      setError(newError); // Ou simplement la dernière erreur
    }
    setLoadingContacts(false);
  }, [clientId]); // Dépendance à clientId

  useEffect(() => {
    if (clientId) {
      const fetchClientDetails = async () => {
        setLoadingClient(true);
        // setError(prevError => prevError && prevError.includes("client") ? null : prevError);
        try {
          const res = await fetch(`/api/clients/${clientId}`);
          if (!res.ok) {
            throw new Error(`Erreur HTTP ${res.status} lors de la récupération du client`);
          }
          const data = await res.json();
          setClient(data);
        } catch (err) {
          console.error("Erreur lors de la récupération du client:", err);
          const newError = err instanceof Error ? err.message : String(err);
          // setError(prev => prev ? `${prev}; ${newError}` : newError);
          setError(newError);
        }
        setLoadingClient(false);
      };
      fetchClientDetails();
      fetchContacts(); 
    }
  }, [clientId, fetchContacts]); // fetchContacts est maintenant une dépendance stable

  const handleOpenAddContactModal = () => {
    setEditingContact(null); // Assure qu'on est en mode création
    setIsContactModalOpen(true);
  };

  const handleOpenEditContactModal = (contact: Contact) => {
    setEditingContact(contact);
    setIsContactModalOpen(true);
  };

  const handleCloseContactModal = () => {
    setIsContactModalOpen(false);
    setEditingContact(null); // Nettoyer au cas où
  };

  const handleSubmitContact = async (contactData: Omit<Contact, 'id'> & { id?: string }) => {
    setIsSubmittingContact(true);
    const url = contactData.id ? `/api/contacts/${contactData.id}` : `/api/clients/${clientId}/contacts`;
    const method = contactData.id ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contactData),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Erreur lors de la soumission du contact`);
      }
      await fetchContacts(); // Rafraîchir la liste des contacts
      handleCloseContactModal();
    } catch (err) {
      console.error("Erreur lors de la soumission du contact:", err);
      setError(err instanceof Error ? err.message : String(err));
      // Laisser la modale ouverte pour que l'utilisateur voie l'erreur et puisse corriger
    } finally {
      setIsSubmittingContact(false);
    }
  };
  
  const handleDeleteContact = async (contactId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce contact ?")) return;
    setIsSubmittingContact(true); // Peut utiliser un autre état si nécessaire pour les actions de suppression
    try {
      const response = await fetch(`/api/contacts/${contactId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la suppression du contact');
      }
      await fetchContacts(); // Rafraîchir la liste
    } catch (err) {
      console.error("Erreur lors de la suppression du contact:", err);
      setError(err instanceof Error ? err.message : String(err));
    }
    setIsSubmittingContact(false);
  };

  if (loadingClient || loadingContacts) {
    return <div className="p-6">Chargement des détails du client...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-500">Erreur: {error}</div>;
  }

  if (!client) {
    return <div className="p-6">Client non trouvé.</div>;
  }

  return (
    <div className="p-4 md:p-6">
      {/* Fil d'Ariane et bouton retour */}
      <div className="mb-6">
        <Link href="/clients" className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center">
          <ArrowLeftIcon className="h-5 w-5 mr-2" />
          Retour à la liste des clients
        </Link>
      </div>

      {/* Section Informations Générales */}
      <div className="bg-white dark:bg-gray-800 shadow sm:rounded-lg mb-8">
        <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
          <h2 className="text-xl font-semibold leading-6 text-gray-900 dark:text-white">
            {client.nom}
          </h2>
          <Link
            href={`/clients/${client.id}/edit`}
            className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
            title="Éditer le client"
          >
            <PencilIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </Link>
        </div>
        <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-5 sm:p-0">
          <dl className="sm:divide-y sm:divide-gray-200 dark:sm:divide-gray-700">
            <div className="py-3 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Email principal</dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white sm:mt-0 sm:col-span-2">{client.email || 'N/A'}</dd>
            </div>
            <div className="py-3 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Téléphone principal</dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white sm:mt-0 sm:col-span-2">{client.telephone || 'N/A'}</dd>
            </div>
            <div className="py-3 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Adresse</dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white sm:mt-0 sm:col-span-2">{client.adresse || 'N/A'}</dd>
            </div>
            <div className="py-3 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Numéro de TVA</dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white sm:mt-0 sm:col-span-2">
                <div className="flex items-center gap-3 flex-wrap">
                  <span>{client.numeroTva || 'N/A'}</span>
                  {client.numeroTva && (
                    <div className="flex gap-2">
                      {client.numeroTva.toUpperCase().startsWith('BE') && (() => {
                        // Extraire le numéro d'entreprise belge (sans BE, espaces, points, tirets)
                        const numeroEntreprise = client.numeroTva
                          .replace(/^BE/i, '')
                          .replace(/[\s.\-]/g, '');
                        return (
                          <a
                            href={`https://www.companyweb.be/fr/${numeroEntreprise}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                            title="Voir sur Companyweb"
                          >
                            Voir sur Companyweb
                          </a>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Section Contacts */}
      <div className="bg-white dark:bg-gray-800 shadow sm:rounded-lg mb-8">
        <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
          <h3 className="text-lg font-semibold leading-6 text-gray-900 dark:text-white">
            Contacts Associés
          </h3>
          <button 
            onClick={handleOpenAddContactModal} 
            className="p-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white flex items-center"
          >
            <PlusCircleIcon className="h-5 w-5 mr-1.5" />
            Ajouter un contact
          </button>
        </div>
        <div className="border-t border-gray-200 dark:border-gray-700">
          {contacts.length === 0 ? (
            <p className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">Aucun contact enregistré pour ce client.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Prénom & Nom</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Fonction</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Email</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Téléphone</th>
                    <th scope="col" className="relative px-6 py-3">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {contacts.map((contact) => (
                    <tr key={contact.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {contact.prenom} {contact.nom}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{contact.fonction || 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{contact.email || 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{contact.telephone || 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button 
                          onClick={() => handleOpenEditContactModal(contact)}
                          className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 mr-3"
                          title="Modifier le contact"
                        >
                          <PencilIcon className="h-5 w-5" />
                        </button>
                        <button 
                          onClick={() => handleDeleteContact(contact.id)}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                          title="Supprimer le contact"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Section Chantiers du client */}
      {client.Chantier && client.Chantier.length > 0 && (
        <div className="bg-white dark:bg-gray-800 shadow sm:rounded-lg mb-8">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg font-semibold leading-6 text-gray-900 dark:text-white">
              Chantiers de ce client
            </h3>
          </div>
          <div className="border-t border-gray-200 dark:border-gray-700">
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {client.Chantier.map((chantier) => (
                <li key={chantier.chantierId}>
                  <Link 
                    href={`/chantiers/${chantier.chantierId}`}
                    className="block px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {chantier.nomChantier}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {chantier.adresseChantier || 'Aucune adresse'}
                        </p>
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          chantier.statut === 'EN_COURS' ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' :
                          chantier.statut === 'EN_PREPARATION' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100' :
                          'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100'
                        }`}>
                          {chantier.statut || 'Non défini'}
                        </span>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Bouton pour créer un nouveau chantier */}
      <div className="bg-white dark:bg-gray-800 shadow sm:rounded-lg mb-8">
        <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold leading-6 text-gray-900 dark:text-white">
              Nouveau chantier
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Créer un nouveau chantier pour ce client
            </p>
          </div>
          <Link
            href={`/chantiers/nouveau?clientId=${client.id}&clientNom=${encodeURIComponent(client.nom)}`}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
          >
            <BuildingOfficeIcon className="h-5 w-5 mr-2" />
            Créer un chantier
          </Link>
        </div>
      </div>
      
      {/* Modale pour ajouter/modifier un contact */}
      <ContactForm 
        isOpen={isContactModalOpen}
        onClose={handleCloseContactModal}
        onSubmit={handleSubmitContact}
        initialData={editingContact}
        isSubmitting={isSubmittingContact}
      />
    </div>
  );
} 