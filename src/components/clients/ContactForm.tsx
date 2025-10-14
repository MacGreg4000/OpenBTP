'use client';

import { useState, useEffect, FormEvent } from 'react';
import { Button, FormInput, FormTextarea } from '@/components/ui'; // FormLabel supprimé de l'import

interface ContactData {
  id?: string; // Optionnel, pour la modification
  prenom: string;
  nom: string;
  email?: string;
  telephone?: string;
  fonction?: string;
  notes?: string;
}

interface ContactFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (contactData: ContactData) => Promise<void>;
  initialData?: ContactData | null;
  isSubmitting?: boolean;
}

export default function ContactForm({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  isSubmitting = false
}: ContactFormProps) {
  const [formData, setFormData] = useState<ContactData>({
    prenom: '',
    nom: '',
    email: '',
    telephone: '',
    fonction: '',
    notes: ''
  });

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      // Reset pour un nouveau formulaire
      setFormData({
        prenom: '',
        nom: '',
        email: '',
        telephone: '',
        fonction: '',
        notes: ''
      });
    }
  }, [initialData, isOpen]); // isOpen pour reset si la modale est réouverte pour un nouveau contact

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!formData.prenom || !formData.nom) {
      alert('Le prénom et le nom sont obligatoires.'); // Ou une meilleure gestion d'erreur/notification
      return;
    }
    await onSubmit(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex justify-center items-center">
      <div className="relative mx-auto p-5 border w-full max-w-lg shadow-lg rounded-md bg-white dark:bg-gray-800">
        <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white mb-4">
          {initialData?.id ? 'Modifier le contact' : 'Ajouter un nouveau contact'}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="prenom" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Prénom *</label>
              <FormInput type="text" name="prenom" id="prenom" value={formData.prenom} onChange={handleChange} required />
            </div>
            <div>
              <label htmlFor="nom" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nom *</label>
              <FormInput type="text" name="nom" id="nom" value={formData.nom} onChange={handleChange} required />
            </div>
          </div>
          <div>
            <label htmlFor="fonction" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fonction</label>
            <FormInput type="text" name="fonction" id="fonction" value={formData.fonction || ''} onChange={handleChange} />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
            <FormInput type="email" name="email" id="email" value={formData.email || ''} onChange={handleChange} />
          </div>
          <div>
            <label htmlFor="telephone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Téléphone</label>
            <FormInput type="tel" name="telephone" id="telephone" value={formData.telephone || ''} onChange={handleChange} />
          </div>
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
            <FormTextarea name="notes" id="notes" value={formData.notes || ''} onChange={handleChange} rows={3} />
          </div>
          <div className="mt-6 flex justify-end space-x-3">
            <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
              Annuler
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? (initialData?.id ? 'Modification...' : 'Ajout...') : (initialData?.id ? 'Enregistrer les modifications' : 'Ajouter le contact')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
} 