'use client'

import { useState, useEffect, FormEvent } from 'react';
import { XMarkIcon, PaperAirplaneIcon, UserCircleIcon, EnvelopeIcon as EnvelopeSolidIcon, PaperClipIcon } from '@heroicons/react/24/solid';
import { EtatAvancementEtendu } from '@/types/etat-avancement'; // Corrigé : Import depuis les types partagés
import { Chantier } from '@/types/chantier'; // Adapter le chemin si nécessaire
// Remplacer le type Contact Prisma par un type local minimal
type Contact = { id: string; prenom?: string; nom?: string; email?: string }
import { toast } from 'react-hot-toast';
import { Session } from 'next-auth'; // Importer le type Session

// Type guard pour vérifier si c'est un état sous-traitant
function isSoustraitantEtat(etat: EtatAvancementEtendu): etat is EtatAvancementEtendu & { typeSoustraitant: true; soustraitantId: string } {
  return !!(etat.typeSoustraitant || etat.soustraitantId)
}

interface EmailEtatAvancementModalProps {
  isOpen: boolean;
  onClose: () => void;
  etatAvancement: EtatAvancementEtendu;
  chantier: Chantier | null; // Rendre chantier optionnel si pas toujours dispo au montage
  session: Session | null; // Ajouter la prop session
}

export default function EmailEtatAvancementModal({
  isOpen,
  onClose,
  etatAvancement,
  chantier,
  session, // Récupérer la session
}: EmailEtatAvancementModalProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContactId, setSelectedContactId] = useState<string>('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  // const [clientName, setClientName] = useState<string>('');
  const [companyName, setCompanyName] = useState<string>(''); // État pour le nom de l'entreprise
  const [pdfFileName, setPdfFileName] = useState<string>(''); // État pour le nom du fichier PDF

  useEffect(() => {
    if (isOpen && chantier) {
      const fetchContactsAndSettings = async () => {
        try {
          // Vérifier si c'est un état d'avancement sous-traitant
          const isSoustraitant = isSoustraitantEtat(etatAvancement);
          const soustraitantId = etatAvancement.soustraitantId;

          let contactsData: Contact[] = [];

          if (isSoustraitant && soustraitantId) {
            // Récupérer les informations du sous-traitant
            const soustraitantResponse = await fetch(`/api/sous-traitants/${soustraitantId}`);
            if (!soustraitantResponse.ok) throw new Error('Erreur lors de la récupération du sous-traitant');
            const soustraitantData = await soustraitantResponse.json();
            
            // Créer un contact avec les informations du sous-traitant
            if (soustraitantData.email) {
              contactsData = [{
                id: 'soustraitant',
                prenom: '',
                nom: soustraitantData.nom || 'Sous-traitant',
                email: soustraitantData.email
              }];
            }
          } else if (chantier.clientId) {
            // Récupérer les contacts du client
            const contactsResponse = await fetch(`/api/clients/${chantier.clientId}/contacts`);
            if (!contactsResponse.ok) throw new Error('Erreur lors de la récupération des contacts');
            contactsData = await contactsResponse.json();
          }

          setContacts(contactsData);
          if (contactsData.length > 0) setSelectedContactId(contactsData[0].id);

          // Récupérer les paramètres de l'entreprise (pour le nom)
          const settingsResponse = await fetch('/api/settings/company'); // Supposant une API pour les companySettings
          if (settingsResponse.ok) {
            const settingsData = await settingsResponse.json();
            setCompanyName(settingsData.name || 'Votre Entreprise');
          } else {
            setCompanyName('Votre Entreprise'); // Fallback
          }

        } catch (error) {
          console.error(error);
          toast.error('Impossible de charger les contacts ou les paramètres de l\'entreprise.');
          setCompanyName('Votre Entreprise'); // Fallback en cas d'erreur
        }
      };
      fetchContactsAndSettings();
    }
  }, [isOpen, chantier, etatAvancement]);

  useEffect(() => {
    if (etatAvancement && chantier) {
      const loadBodyWithGestionnaires = async () => {
        const defaultSubject = `État d\'avancement N° ${etatAvancement.numero} - Chantier: ${chantier.nomChantier}`;
        setSubject(defaultSubject);

        const selectedContact = contacts.find(c => c.id === selectedContactId);
        const contactFullName = selectedContact ? `${selectedContact.prenom} ${selectedContact.nom}` : '';
        
        const userName = session?.user?.name || '[Votre Nom]';
        
        // Récupérer les gestionnaires du chantier
        let replyMessage = '';
        try {
          const gestionnairesResponse = await fetch(`/api/chantiers/${chantier.chantierId}/gestionnaires`);
          if (gestionnairesResponse.ok) {
            const gestionnaires = await gestionnairesResponse.json();
            if (gestionnaires.length > 0) {
              const gestionnairesList = gestionnaires
                .map((g: { user: { name: string | null; email: string } }) => {
                  const name = g.user.name || g.user.email;
                  return `${name} (${g.user.email})`;
                })
                .join(', ');
              replyMessage = `\nCeci est une adresse d'envoi, merci de répondre ${gestionnaires.length > 1 ? 'aux gestionnaires' : 'au gestionnaire'} du chantier : ${gestionnairesList}\n`;
            } else {
              replyMessage = `\nCeci est une adresse d'envoi, merci de répondre au gestionnaire du chantier.\n`;
            }
          } else {
            replyMessage = `\nCeci est une adresse d'envoi, merci de répondre au gestionnaire du chantier.\n`;
          }
        } catch (error) {
          console.error('Erreur lors de la récupération des gestionnaires:', error);
          replyMessage = `\nCeci est une adresse d'envoi, merci de répondre au gestionnaire du chantier.\n`;
        }

        const signature = `Cordialement,\n${userName}\n${companyName}`;

        const defaultBody = selectedContact 
          ? `Bonjour ${contactFullName},\n\nVeuillez trouver ci-joint l\'état d\'avancement N° ${etatAvancement.numero} concernant le chantier ${chantier.nomChantier} situé à ${chantier.adresseChantier}.${replyMessage}\n${signature}`
          : `Bonjour,\n\nVeuillez trouver ci-joint l\'état d\'avancement N° ${etatAvancement.numero} concernant le chantier ${chantier.nomChantier} situé à ${chantier.adresseChantier}.${replyMessage}\n${signature}`;
        setBody(defaultBody);

        // Construire le nom du fichier PDF pour l'affichage
        // Utiliser chantier.chantierId (ID lisible) comme dans l'API de génération de nom de fichier PDF
        const fileName = `Etat_Avancement_${chantier.chantierId}_N${etatAvancement.numero}.pdf`;
        setPdfFileName(fileName);
      };
      
      loadBodyWithGestionnaires();
    }
  }, [etatAvancement, chantier, selectedContactId, contacts, session, companyName]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const selectedContact = contacts.find(c => c.id === selectedContactId);
    if (!selectedContact || !selectedContact.email) {
      toast.error('Veuillez sélectionner un contact avec une adresse e-mail valide.');
      setIsLoading(false);
      return;
    }

    try {
      // Le `chantierId` envoyé doit correspondre à l'identifiant lisible attendu par l'API

      const response = await fetch('/api/email/send-etat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          etatAvancementId: etatAvancement.id, // Ceci est l'ID numérique de l'état (PK)
          chantierId: chantier?.chantierId, // Utiliser l'ID externe (chantierId) au lieu de l'ID interne (id)
          recipientEmail: selectedContact.email,
          recipientName: `${selectedContact.prenom} ${selectedContact.nom}`,
          subject,
          body,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de l\'envoi de l\'e-mail');
      }

      toast.success('E-mail envoyé avec succès!');
      onClose();
    } catch (error: unknown) {
      console.error(error);
      toast.error((error as Error).message || 'Erreur lors de l\'envoi de l\'e-mail.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex justify-center items-center">
      <div className="relative mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white dark:bg-gray-800">
        <div className="flex justify-between items-center pb-3 border-b dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
            <EnvelopeSolidIcon className="h-6 w-6 mr-2 text-blue-500" />
            Envoyer l&apos;état d&apos;avancement N° {etatAvancement.numero}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            aria-label="Fermer"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label htmlFor="contact" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Destinataire {isSoustraitantEtat(etatAvancement) ? '(Sous-traitant)' : '(Contact Client)'}
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <UserCircleIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                </div>
                <select
                id="contact"
                name="contact"
                value={selectedContactId}
                onChange={(e) => setSelectedContactId(e.target.value)}
                className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                required
                >
                {contacts.length === 0 && <option value="" disabled>Aucun contact trouvé</option>}
                {contacts.map((contact) => (
                    <option key={contact.id} value={contact.id}>
                    {contact.prenom} {contact.nom} ({contact.email})
                    </option>
                ))}
                </select>
            </div>
          </div>

          <div>
            <label htmlFor="subject" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Sujet
            </label>
            <input
              type="text"
              name="subject"
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              required
            />
          </div>

          <div>
            <label htmlFor="body" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Corps du message
            </label>
            <textarea
              id="body"
              name="body"
              rows={10}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              required
            />
          </div>

          {/* Indicateur de pièce jointe PDF */}
          {pdfFileName && (
            <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-md border border-gray-200 dark:border-gray-600">
              <div className="flex items-center text-sm text-gray-700 dark:text-gray-300">
                <PaperClipIcon className="h-5 w-5 mr-2 text-gray-400 dark:text-gray-500" />
                <span>Pièce jointe :</span>
                <span className="ml-1 font-medium text-gray-800 dark:text-gray-200 truncate" title={pdfFileName}>{pdfFileName}</span>
              </div>
            </div>
          )}

          <div className="pt-4 border-t dark:border-gray-700 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded-md shadow-sm transition-colors dark:bg-gray-600 dark:hover:bg-gray-500 dark:text-gray-200 disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-md shadow-sm transition-colors flex items-center justify-center disabled:opacity-50"
            >
              {isLoading ? (
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <PaperAirplaneIcon className="h-5 w-5 mr-2" />
              )}
              {isLoading ? 'Envoi en cours...' : 'Envoyer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 