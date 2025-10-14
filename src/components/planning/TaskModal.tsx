'use client';

import { useState, useEffect } from 'react';
import { XMarkIcon, CalendarIcon, UserIcon, BuildingOfficeIcon } from '@heroicons/react/24/outline';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: TaskData) => void;
  task?: TaskData | null;
  chantiers: Chantier[];
  ouvriersInternes: OuvrierInterne[];
  soustraitants: Soustraitant[];
}

interface TaskData {
  id?: string;
  title: string;
  description?: string;
  start: string;
  end: string;
  status: 'PREVU' | 'EN_COURS' | 'TERMINE';
  chantierId?: string;
  ouvrierInterneIds: string[];
  soustraitantIds: string[];
}

interface Chantier {
  chantierId: string;
  nomChantier: string;
  statut: string;
}

interface OuvrierInterne {
  id: string;
  nom: string;
  prenom: string;
  poste?: string;
}

interface Soustraitant {
  id: string;
  nom: string;
}

export default function TaskModal({
  isOpen,
  onClose,
  onSave,
  task,
  chantiers,
  ouvriersInternes,
  soustraitants
}: TaskModalProps) {
  const [formData, setFormData] = useState<TaskData>({
    title: '',
    description: '',
    start: '',
    end: '',
    status: 'PREVU',
    chantierId: '',
    ouvrierInterneIds: [],
    soustraitantIds: []
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (task) {
      setFormData({
        id: task.id,
        title: task.title,
        description: task.description || '',
        start: task.start,
        end: task.end,
        status: task.status,
        chantierId: task.chantierId || '',
        ouvrierInterneIds: task.ouvrierInterneIds,
        soustraitantIds: task.soustraitantIds
      });
    } else {
      // Nouvelle tâche - valeurs par défaut
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(now.getDate() + 1);
      
      setFormData({
        title: '',
        description: '',
        start: now.toISOString().slice(0, 16),
        end: tomorrow.toISOString().slice(0, 16),
        status: 'PREVU',
        chantierId: '',
        ouvrierInterneIds: [],
        soustraitantIds: []
      });
    }
    setErrors({});
  }, [task, isOpen]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Le titre est requis';
    }

    if (!formData.start) {
      newErrors.start = 'La date de début est requise';
    }

    if (!formData.end) {
      newErrors.end = 'La date de fin est requise';
    }

    if (formData.start && formData.end && new Date(formData.start) >= new Date(formData.end)) {
      newErrors.end = 'La date de fin doit être après la date de début';
    }

    if (formData.ouvrierInterneIds.length === 0 && formData.soustraitantIds.length === 0) {
      newErrors.assignments = 'Au moins une ressource doit être assignée';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      onSave(formData);
      onClose();
    }
  };

  const handleOuvrierToggle = (ouvrierId: string) => {
    setFormData(prev => ({
      ...prev,
      ouvrierInterneIds: prev.ouvrierInterneIds.includes(ouvrierId)
        ? prev.ouvrierInterneIds.filter(id => id !== ouvrierId)
        : [...prev.ouvrierInterneIds, ouvrierId]
    }));
  };

  const handleSoustraitantToggle = (soustraitantId: string) => {
    setFormData(prev => ({
      ...prev,
      soustraitantIds: prev.soustraitantIds.includes(soustraitantId)
        ? prev.soustraitantIds.filter(id => id !== soustraitantId)
        : [...prev.soustraitantIds, soustraitantId]
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {task ? 'Modifier la tâche' : 'Nouvelle tâche'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Chantier - EN PREMIER */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <BuildingOfficeIcon className="h-4 w-4 inline mr-1" />
              Type de tâche *
            </label>
            <select
              value={formData.chantierId}
              onChange={(e) => {
                const selectedChantierId = e.target.value;
                const selectedChantier = chantiers.find(c => c.chantierId === selectedChantierId);
                
                setFormData(prev => ({
                  ...prev,
                  chantierId: selectedChantierId,
                  title: selectedChantier ? selectedChantier.nomChantier : ''
                }));
              }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">Tâche libre (sans chantier)</option>
              {Array.isArray(chantiers) && chantiers.map(chantier => (
                <option key={chantier.chantierId} value={chantier.chantierId}>
                  {chantier.nomChantier} ({chantier.chantierId})
                </option>
              ))}
            </select>
            {!Array.isArray(chantiers) && (
              <p className="mt-1 text-sm text-red-600">Erreur lors du chargement des chantiers</p>
            )}
          </div>

          {/* Titre */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Titre *
              {formData.chantierId && (
                <span className="text-xs text-blue-600 dark:text-blue-400 ml-2">
                  (Auto-rempli avec le nom du chantier)
                </span>
              )}
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              disabled={!!formData.chantierId}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.title ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              } ${formData.chantierId ? 'bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300' : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white'}`}
              placeholder={formData.chantierId ? "Titre automatique du chantier" : "Titre de la tâche"}
            />
            {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title}</p>}
            {formData.chantierId && (
              <p className="mt-1 text-xs text-blue-600 dark:text-blue-400">
                Le titre est automatiquement défini par le nom du chantier sélectionné
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Description de la tâche"
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <CalendarIcon className="h-4 w-4 inline mr-1" />
                Date de début *
              </label>
              <input
                type="date"
                value={formData.start.split('T')[0]}
                onChange={(e) => {
                  const dateValue = e.target.value;
                  setFormData(prev => ({ 
                    ...prev, 
                    start: dateValue + 'T09:00' // 9h00 par défaut
                  }));
                }}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.start ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                } bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
              />
              {errors.start && <p className="mt-1 text-sm text-red-600">{errors.start}</p>}
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Heure par défaut : 9h00
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <CalendarIcon className="h-4 w-4 inline mr-1" />
                Date de fin *
              </label>
              <input
                type="date"
                value={formData.end.split('T')[0]}
                onChange={(e) => {
                  const dateValue = e.target.value;
                  setFormData(prev => ({ 
                    ...prev, 
                    end: dateValue + 'T17:00' // 17h00 par défaut
                  }));
                }}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.end ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                } bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
              />
              {errors.end && <p className="mt-1 text-sm text-red-600">{errors.end}</p>}
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Heure par défaut : 17h00
              </p>
            </div>
          </div>



          {/* Assignations */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Ouvriers internes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <UserIcon className="h-4 w-4 inline mr-1" />
                Ouvriers internes
              </label>
              <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg p-3">
                {ouvriersInternes.map(ouvrier => (
                  <label key={ouvrier.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.ouvrierInterneIds.includes(ouvrier.id)}
                      onChange={() => handleOuvrierToggle(ouvrier.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-900 dark:text-white">
                      {ouvrier.prenom} {ouvrier.nom}
                      {ouvrier.poste && (
                        <span className="text-gray-500 ml-1">({ouvrier.poste})</span>
                      )}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Sous-traitants */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <BuildingOfficeIcon className="h-4 w-4 inline mr-1" />
                Sous-traitants
              </label>
              <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg p-3">
                {soustraitants.map(soustraitant => (
                  <label key={soustraitant.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.soustraitantIds.includes(soustraitant.id)}
                      onChange={() => handleSoustraitantToggle(soustraitant.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-900 dark:text-white">
                      {soustraitant.nom}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {errors.assignments && (
            <p className="text-sm text-red-600">{errors.assignments}</p>
          )}

          {/* Boutons */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {task ? 'Modifier' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
