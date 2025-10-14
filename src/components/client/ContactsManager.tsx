'use client'

import { useState, useEffect, useCallback } from 'react'
import { usePermission } from '@/hooks/usePermission'

interface Contact {
  id: string
  nom: string
  prenom: string
  fonction?: string
  email: string
  telephone?: string
  estPrincipal: boolean
  clientId: string
  createdAt: string
  updatedAt: string
}

interface ContactFormData {
  nom: string
  prenom: string
  fonction: string
  email: string
  telephone: string
  estPrincipal: boolean
}

interface ContactsManagerProps {
  clientId: string
}

export default function ContactsManager({ clientId }: ContactsManagerProps) {
  const canEditClient = usePermission('client-edit')
  const [contacts, setContacts] = useState<Contact[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  const [showForm, setShowForm] = useState(false)
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const [formData, setFormData] = useState<ContactFormData>({
    nom: '',
    prenom: '',
    fonction: '',
    email: '',
    telephone: '',
    estPrincipal: false
  })
  
  // Récupérer les contacts
  const fetchContacts = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/clients/${clientId}/contacts`)
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erreur lors de la récupération des contacts')
      }
      
      const data = await response.json()
      setContacts(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur s\'est produite')
    } finally {
      setIsLoading(false)
    }
  }, [clientId])
  
  // Charger les contacts au chargement du composant
  useEffect(() => {
    fetchContacts()
  }, [fetchContacts])
  
  // Gérer les changements dans le formulaire
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' 
        ? (e.target as HTMLInputElement).checked 
        : value
    }))
  }
  
  // Réinitialiser le formulaire
  const resetForm = () => {
    setFormData({
      nom: '',
      prenom: '',
      fonction: '',
      email: '',
      telephone: '',
      estPrincipal: false
    })
    setEditingContact(null)
    setShowForm(false)
  }
  
  // Préparer le formulaire pour l'édition
  const handleEdit = (contact: Contact) => {
    setFormData({
      nom: contact.nom,
      prenom: contact.prenom,
      fonction: contact.fonction || '',
      email: contact.email,
      telephone: contact.telephone || '',
      estPrincipal: contact.estPrincipal
    })
    setEditingContact(contact)
    setShowForm(true)
  }
  
  // Soumettre le formulaire (ajout ou modification)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    
    try {
      const url = editingContact 
        ? `/api/clients/${clientId}/contacts/${editingContact.id}` 
        : `/api/clients/${clientId}/contacts`
      
      const method = editingContact ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || `Erreur lors de l'${editingContact ? 'édition' : 'ajout'} du contact`)
      }
      
      const data = await response.json()
      
      setSuccess(data.message || `Contact ${editingContact ? 'modifié' : 'ajouté'} avec succès`)
      fetchContacts()
      resetForm()
      
      // Effacer le message de succès après 3 secondes
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur s\'est produite')
    }
  }
  
  // Supprimer un contact
  const handleDelete = async (contactId: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce contact ?')) {
      return
    }
    
    setError(null)
    setSuccess(null)
    
    try {
      const response = await fetch(`/api/clients/${clientId}/contacts/${contactId}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erreur lors de la suppression du contact')
      }
      
      const data = await response.json()
      
      setSuccess(data.message || 'Contact supprimé avec succès')
      fetchContacts()
      
      // Effacer le message de succès après 3 secondes
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur s\'est produite')
    }
  }
  
  return (
    <div className="bg-white shadow-md rounded-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Contacts</h2>
        
        {canEditClient && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowForm(!showForm);
            }}
            className="py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {showForm ? 'Annuler' : 'Ajouter un contact'}
          </button>
        )}
      </div>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}
      
      {success && (
        <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
          {success}
        </div>
      )}
      
      {/* Formulaire d'ajout/modification */}
      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 bg-gray-50 p-4 rounded-md border border-gray-200">
          <h3 className="font-medium mb-4">
            {editingContact ? 'Modifier le contact' : 'Ajouter un nouveau contact'}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label htmlFor="nom" className="block text-sm font-medium text-gray-700 mb-1">
                Nom *
              </label>
              <input
                type="text"
                id="nom"
                name="nom"
                value={formData.nom}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label htmlFor="prenom" className="block text-sm font-medium text-gray-700 mb-1">
                Prénom *
              </label>
              <input
                type="text"
                id="prenom"
                name="prenom"
                value={formData.prenom}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label htmlFor="fonction" className="block text-sm font-medium text-gray-700 mb-1">
                Fonction
              </label>
              <input
                type="text"
                id="fonction"
                name="fonction"
                value={formData.fonction}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email *
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label htmlFor="telephone" className="block text-sm font-medium text-gray-700 mb-1">
                Téléphone
              </label>
              <input
                type="text"
                id="telephone"
                name="telephone"
                value={formData.telephone}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="estPrincipal"
                name="estPrincipal"
                checked={formData.estPrincipal}
                onChange={handleChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="estPrincipal" className="ml-2 block text-sm text-gray-700">
                Contact principal
              </label>
            </div>
          </div>
          
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={resetForm}
              className="py-2 px-4 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Annuler
            </button>
            
            <button
              type="submit"
              className="py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {editingContact ? 'Mettre à jour' : 'Ajouter'}
            </button>
          </div>
        </form>
      )}
      
      {/* Liste des contacts */}
      {isLoading ? (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : contacts.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nom
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fonction
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Principal
                </th>
                {canEditClient && (
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {contacts.map((contact) => (
                <tr key={contact.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{contact.nom} {contact.prenom}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-gray-500">{contact.fonction || '-'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{contact.email}</div>
                    {contact.telephone && (
                      <div className="text-sm text-gray-500">{contact.telephone}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {contact.estPrincipal ? (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        Oui
                      </span>
                    ) : (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                        Non
                      </span>
                    )}
                  </td>
                  {canEditClient && (
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleEdit(contact)}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        Modifier
                      </button>
                      <button
                        onClick={() => handleDelete(contact.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Supprimer
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          Aucun contact enregistré pour ce client.
        </div>
      )}
    </div>
  )
} 