'use client'
import { useState, useEffect } from 'react'
import { XMarkIcon, EnvelopeIcon, UserGroupIcon, TagIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

interface SendRapportEmailModalProps {
  isOpen: boolean
  onClose: () => void
  rapportId: number
  rapportNom: string
  chantierId: string
}

interface Contact {
  id: string
  email: string
  nom: string
  type: 'client' | 'soustraitant'
}

export function SendRapportEmailModal({
  isOpen,
  onClose,
  rapportId,
  rapportNom,
  chantierId
}: SendRapportEmailModalProps) {
  const [loading, setLoading] = useState(false)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [selectedContacts, setSelectedContacts] = useState<string[]>([])
  const [availableTags, setAvailableTags] = useState<string[]>(['Tous', 'Général'])
  const [selectedTag, setSelectedTag] = useState<string>('Tous')
  const [customEmail, setCustomEmail] = useState<string>('')

  // Charger les contacts et tags disponibles
  useEffect(() => {
    if (isOpen) {
      loadContacts()
      loadTags()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, chantierId])

  const loadContacts = async () => {
    try {
      // Récupérer les informations du chantier pour obtenir l'email du client
      const chantierRes = await fetch(`/api/chantiers/${chantierId}`)
      const chantier = await chantierRes.json()
      
      const contactsList: Contact[] = []
      
      // Ajouter le client s'il a un email
      if (chantier.clientEmail) {
        contactsList.push({
          id: 'client',
          email: chantier.clientEmail,
          nom: chantier.clientNom || 'Client',
          type: 'client'
        })
        // Sélectionner le client par défaut
        setSelectedContacts(['client'])
      }
      
      // TODO: Récupérer les sous-traitants du chantier avec leurs emails
      // Pour l'instant, on peut ajouter cette fonctionnalité plus tard
      
      setContacts(contactsList)
    } catch (error) {
      console.error('Erreur lors du chargement des contacts:', error)
      toast.error('Erreur lors du chargement des contacts')
    }
  }

  const loadTags = () => {
    try {
      const savedTags = localStorage.getItem('tags_personnalises')
      if (savedTags) {
        const parsedTags = JSON.parse(savedTags)
        setAvailableTags(['Tous', 'Général', ...parsedTags])
      }
    } catch (error) {
      console.error('Erreur lors du chargement des tags:', error)
    }
  }

  const handleToggleContact = (contactId: string) => {
    setSelectedContacts(prev => 
      prev.includes(contactId)
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    )
  }

  const handleAddCustomEmail = () => {
    if (customEmail && customEmail.includes('@')) {
      const customId = `custom_${Date.now()}`
      setContacts(prev => [...prev, {
        id: customId,
        email: customEmail,
        nom: customEmail,
        type: 'client'
      }])
      setSelectedContacts(prev => [...prev, customId])
      setCustomEmail('')
    } else {
      toast.error('Veuillez entrer une adresse email valide')
    }
  }

  const handleSend = async () => {
    if (selectedContacts.length === 0) {
      toast.error('Veuillez sélectionner au moins un destinataire')
      return
    }

    setLoading(true)
    const loadingToast = toast.loading('Génération et envoi du rapport...')

    try {
      // Récupérer les emails sélectionnés
      const recipients = contacts
        .filter(c => selectedContacts.includes(c.id))
        .map(c => c.email)

      // Envoyer la requête avec le tag sélectionné
      const res = await fetch(`/api/chantiers/${chantierId}/rapports/${rapportId}/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          recipients,
          tagFilter: selectedTag
        })
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.message || 'Erreur lors de l\'envoi')
      }

      await res.json()
      toast.success(
        `Rapport${selectedTag !== 'Tous' ? ` (${selectedTag})` : ''} envoyé à ${recipients.join(', ')}`,
        {
          id: loadingToast,
          duration: 5000,
          icon: '📧'
        }
      )
      
      onClose()
    } catch (error) {
      console.error('Erreur:', error)
      toast.error(
        error instanceof Error ? error.message : 'Erreur lors de l\'envoi du rapport',
        {
          id: loadingToast,
          duration: 5000
        }
      )
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Overlay */}
        <div 
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75 dark:bg-gray-900 dark:bg-opacity-80"
          onClick={onClose}
        ></div>

        {/* Modal */}
        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-blue-600 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-white/20">
                  <EnvelopeIcon className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <h3 className="text-xl font-bold text-white">
                    Envoyer le rapport par email
                  </h3>
                  <p className="text-sm text-indigo-100 mt-1">
                    {rapportNom}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-white hover:text-indigo-100 transition-colors"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="px-6 py-6 space-y-6">
            {/* Sélection du tag */}
            <div>
              <label className="flex items-center text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                <TagIcon className="h-5 w-5 mr-2 text-indigo-600" />
                Type de rapport à générer
              </label>
              <select
                value={selectedTag}
                onChange={(e) => setSelectedTag(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              >
                {availableTags.map(tag => (
                  <option key={tag} value={tag}>
                    {tag === 'Tous' ? 'Rapport complet (tous les tags)' : `Rapport filtré: ${tag}`}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Sélectionnez "Tous" pour un rapport complet ou choisissez un tag spécifique pour un rapport filtré
              </p>
            </div>

            {/* Sélection des destinataires */}
            <div>
              <label className="flex items-center text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                <UserGroupIcon className="h-5 w-5 mr-2 text-indigo-600" />
                Destinataires
              </label>
              
              {contacts.length === 0 ? (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    Aucun contact disponible. Ajoutez une adresse email ci-dessous.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 mb-4">
                  {contacts.map(contact => (
                    <label
                      key={contact.id}
                      className="flex items-center p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedContacts.includes(contact.id)}
                        onChange={() => handleToggleContact(contact.id)}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                      <div className="ml-3 flex-1">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {contact.nom}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {contact.email}
                        </div>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        contact.type === 'client' 
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200' 
                          : 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200'
                      }`}>
                        {contact.type === 'client' ? 'Client' : 'Sous-traitant'}
                      </span>
                    </label>
                  ))}
                </div>
              )}

              {/* Ajouter un email personnalisé */}
              <div className="mt-4">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Ajouter un autre destinataire
                </label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={customEmail}
                    onChange={(e) => setCustomEmail(e.target.value)}
                    placeholder="exemple@email.com"
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomEmail}
                    disabled={!customEmail}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                  >
                    Ajouter
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 dark:bg-gray-900/50 px-6 py-4 flex items-center justify-between">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {selectedContacts.length > 0 ? (
                <span className="flex items-center">
                  <UserGroupIcon className="h-4 w-4 mr-1" />
                  {selectedContacts.length} destinataire(s) sélectionné(s)
                </span>
              ) : (
                <span className="text-yellow-600 dark:text-yellow-400">
                  Aucun destinataire sélectionné
                </span>
              )}
            </div>
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSend}
                disabled={loading || selectedContacts.length === 0}
                className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-lg hover:from-indigo-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium shadow-lg hover:shadow-xl flex items-center"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Envoi en cours...
                  </>
                ) : (
                  <>
                    <PaperAirplaneIcon className="h-4 w-4 mr-2" />
                    Envoyer le rapport
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

