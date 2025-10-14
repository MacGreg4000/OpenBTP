'use client'

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui';
import Image from 'next/image';
import { FormInput, FormTextarea } from '@/components/ui';
import { XMarkIcon, PaperClipIcon, MapPinIcon } from '@heroicons/react/24/outline';

// Interfaces
interface PlanDocument {
  id: number;
  nom: string;
  url: string;
  mimeType: string;
}

interface ExistingPhoto {
  id: string; 
  url: string; 
  estPreuve: boolean;
}

interface RemarqueFormData {
  description: string;
  localisation: string;
  planId: number | null;
  coordonneesPlan: { x: number; y: number } | null;
  newPhotos: File[]; // Photos nouvellement ajoutées
  existingPhotos: ExistingPhoto[]; // Photos déjà présentes lors de l'initialisation
}

export interface RemarqueFormProps {
  chantierId: string;
  receptionId: string;
  initialData?: Partial<Omit<RemarqueFormData, 'newPhotos' | 'existingPhotos'>> & { id?: string; photos?: ExistingPhoto[] };
  availablePlans: PlanDocument[];
  onSubmit: (formData: FormData) => Promise<void>;
  onCancel: () => void;
  isSaving: boolean;
  submitButtonText?: string;
  formTitle?: string;
}

interface PreviewPhoto {
  url: string;
  name?: string; // Garder le nom pour les nouveaux fichiers, utile pour la key
  isNew: boolean;
  id?: string; // ID pour les photos existantes
}

const RemarqueForm: React.FC<RemarqueFormProps> = ({
  chantierId: _chantierId,
  receptionId: _receptionId,
  initialData,
  availablePlans,
  onSubmit,
  onCancel,
  isSaving,
  submitButtonText = "Enregistrer",
  formTitle = "Nouvelle Remarque"
}) => {
  // Neutraliser les props non utilisées pour ESLint
  void _chantierId;
  void _receptionId;
  const [formData, setFormData] = useState<RemarqueFormData>({
    description: initialData?.description || '',
    localisation: initialData?.localisation || '',
    planId: initialData?.planId || null,
    coordonneesPlan: initialData?.coordonneesPlan || null,
    newPhotos: [],
    existingPhotos: initialData?.photos || []
  });
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [previewPhotos, setPreviewPhotos] = useState<PreviewPhoto[]>([]);

  const [selectedPlanForAnnotation, setSelectedPlanForAnnotation] = useState<PlanDocument | null>(null);
  const [clickedCoords, setClickedCoords] = useState<{ x: number; y: number; displayX: number; displayY: number } | null>(null);
  const planImageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (initialData?.planId) {
      const plan = availablePlans.find(p => p.id === initialData.planId);
      if (plan) {
        setSelectedPlanForAnnotation(plan);
        if (initialData.coordonneesPlan) {
           setClickedCoords({ 
             x: initialData.coordonneesPlan.x, 
             y: initialData.coordonneesPlan.y,
             displayX: 0, 
             displayY: 0
            });
        }
      }
    }
    // Initialiser les aperçus des photos
    const initialPreviews: PreviewPhoto[] = [];
    if (initialData?.photos) {
      initialData.photos.forEach(p => initialPreviews.push({ url: p.url, id: p.id, isNew: false }));
    }
    setPreviewPhotos(initialPreviews);
    // Réinitialiser les newPhotos au cas où le formulaire est réutilisé dynamiquement
    setFormData(prev => ({...prev, newPhotos: []})); 
    console.log('[RemarqueForm] useEffect initialData - initialPreviews:', initialPreviews);
  }, [initialData, availablePlans]);

  // Cleanup pour les Object URLs créées pour les nouvelles photos
  useEffect(() => {
    return () => {
      previewPhotos.forEach(p => {
        if (p.isNew) {
          URL.revokeObjectURL(p.url);
        }
      });
    };
  }, [previewPhotos]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setFormData(prev => ({ ...prev, newPhotos: [...prev.newPhotos, ...filesArray] }));
      
      const newPreviews: PreviewPhoto[] = filesArray.map(file => ({
        url: URL.createObjectURL(file),
        name: file.name,
        isNew: true
      }));
      setPreviewPhotos(prev => {
        const updatedPreviews = [...prev, ...newPreviews];
        console.log('[RemarqueForm] handleFileChange - updated Previews:', updatedPreviews);
        return updatedPreviews;
      });
    }
  };

  const removePhoto = (indexToRemove: number) => {
    const photoToRemove = previewPhotos[indexToRemove];
    
    if (photoToRemove.isNew) {
      // C'est une nouvelle photo, la retirer de formData.newPhotos et de previewPhotos
      // Et révoquer son Object URL
      URL.revokeObjectURL(photoToRemove.url);

      setFormData(prev => ({
        ...prev,
        // Filtrer newPhotos en comparant les ObjectURLs indirectement si nécessaire ou par une autre propriété unique
        // Pour l'instant, on suppose que l'ordre ou la référence à l'objet File suffit si on le stockait.
        // Si on ne stocke que le nom, et que les noms peuvent ne pas être uniques, il faut améliorer.
        // Ici, on va filtrer newPhotos en cherchant celui dont l'URL.createObjectURL correspondrait.
        // C'est un peu indirect. Idéalement on aurait un ID temporaire ou l'objet File lui-même.
        newPhotos: prev.newPhotos.filter(file => URL.createObjectURL(file) !== photoToRemove.url) 
        // Alternative plus simple si l'index est fiable pour les newPhotos aussi:
        // newPhotos: prev.newPhotos.filter((_, idx) => {
        //   // Trouver l'index correspondant dans previewPhotos pour les nouvelles photos
        //   const newPhotoPreviewIndexes = previewPhotos.map((p, i) => p.isNew ? i : -1).filter(i => i !== -1);
        //   const originalFileIndexInNewPhotos = newPhotoPreviewIndexes.indexOf(indexToRemove);
        //   return idx !== originalFileIndexInNewPhotos; 
        // })
      }));
    } else {
      // C'est une photo existante, la retirer de formData.existingPhotos
      setFormData(prev => ({
        ...prev,
        existingPhotos: prev.existingPhotos.filter(p => p.id !== photoToRemove.id)
      }));
    }
    // Dans tous les cas, retirer de previewPhotos
    setPreviewPhotos(prev => prev.filter((_, i) => i !== indexToRemove));
  };
  
  const handlePlanSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const planId = e.target.value ? parseInt(e.target.value) : null;
    setFormData(prev => ({ ...prev, planId, coordonneesPlan: null }));
    setClickedCoords(null);
    setSelectedPlanForAnnotation(planId ? availablePlans.find(p => p.id === planId) || null : null);
  };

  const handlePlanImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!planImageRef.current) return;
    const rect = planImageRef.current.getBoundingClientRect();
    const displayX = e.clientX - rect.left;
    const displayY = e.clientY - rect.top;
    const normalizedX = displayX / rect.width;
    const normalizedY = displayY / rect.height;

    setClickedCoords({ x: normalizedX, y: normalizedY, displayX, displayY });
    setFormData(prev => ({ ...prev, coordonneesPlan: { x: normalizedX, y: normalizedY } }));
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const dataToSend = new FormData();
    dataToSend.append('description', formData.description);
    dataToSend.append('localisation', formData.localisation || '');
    
    if (formData.planId !== null) {
      dataToSend.append('planId', String(formData.planId));
    }
    if (formData.coordonneesPlan !== null) {
      dataToSend.append('coordonneesPlan', JSON.stringify(formData.coordonneesPlan));
    }

    formData.newPhotos.forEach(photoFile => {
      dataToSend.append('photos', photoFile); // 'photos' est pour les nouveaux fichiers
    });
    
    if (initialData?.id) {
        dataToSend.append('remarqueId', initialData.id);
        const keptExistingPhotoIds = formData.existingPhotos.map(p => p.id);
        dataToSend.append('existingPhotoIds', JSON.stringify(keptExistingPhotoIds));
    }

    try {
      await onSubmit(dataToSend);
      // Nettoyer les previews des nouvelles photos après soumission réussie
      previewPhotos.forEach(p => {
        if (p.isNew) {
          URL.revokeObjectURL(p.url);
        }
      });
      // Reset local state if needed, or rely on onCancel/parent component to close/reset
    } catch (apiError: unknown) {
      const message = apiError instanceof Error ? apiError.message : "Erreur lors de l'enregistrement.";
      setError(message);
    }
  };

  useEffect(() => {
    if (selectedPlanForAnnotation?.mimeType.startsWith('image/') && planImageRef.current && formData.coordonneesPlan) {
      const img = planImageRef.current;
      const updateDisplayCoords = () => {
        if (!planImageRef.current || !formData.coordonneesPlan) return;
        const rect = planImageRef.current.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;

        setClickedCoords({
          x: formData.coordonneesPlan.x,
          y: formData.coordonneesPlan.y,
          displayX: formData.coordonneesPlan.x * rect.width,
          displayY: formData.coordonneesPlan.y * rect.height,
        });
      };
      
      if (img.complete && img.naturalWidth > 0) {
        updateDisplayCoords();
      } else {
        img.onload = updateDisplayCoords;
        // En cas de problème de chargement, on peut ajouter un img.onerror
      }
    }
  }, [selectedPlanForAnnotation, formData.coordonneesPlan, clickedCoords?.displayX]);

  useEffect(() => {
    // Fonction de nettoyage à exécuter lorsque le composant est démonté
    // ou lorsque initialData change (ce qui signifie que la modale pourrait être réutilisée pour une autre remarque)
    return () => {
      previewPhotos.forEach(photo => {
        if (photo.isNew) {
          URL.revokeObjectURL(photo.url);
        }
      });
    };
  }, [previewPhotos]); // Exécuter au montage/démontage et quand la liste change pour révoquer correctement
           // Si initialData change et que la modale est réutilisée, l'autre useEffect s'en occupe déjà.

  return (
    <form onSubmit={handleSubmitForm} className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">{formTitle}</h2>
        <Button type="button" variant="outline" onClick={onCancel} aria-label="Fermer" className="p-2">
            <XMarkIcon className="h-5 w-5" />
        </Button>
      </div>
      {error && (
        <div className="mb-4 rounded-md bg-red-50 dark:bg-red-900/20 p-4 text-red-700 dark:text-red-200">
          {error}
        </div>
      )}

      <FormTextarea
        id="description"
        name="description"
        label="Description de la remarque"
        placeholder="Décrivez la remarque en détail..."
        value={formData.description}
        onChange={handleChange}
        rows={5}
        required
      />

      <FormInput
        id="localisation"
        name="localisation"
        type="text"
        label="Localisation (optionnel)"
        placeholder="Ex: Étage 2, Pièce 3, Mur nord"
        value={formData.localisation}
        onChange={handleChange}
      />

      <div>
        <label htmlFor="plan-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Lier à un plan (optionnel)
        </label>
        <select
          id="plan-select"
          name="planId"
          value={formData.planId || ''}
          onChange={handlePlanSelect}
          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        >
          <option value="">Aucun plan sélectionné</option>
          {availablePlans.map(plan => (
            <option key={plan.id} value={plan.id}>{plan.nom}</option>
          ))}
        </select>
      </div>

      {selectedPlanForAnnotation && (
        <div className="mt-4 p-4 border rounded-md dark:border-gray-700">
          <h4 className="text-md font-semibold mb-2 dark:text-gray-200">{selectedPlanForAnnotation.nom}</h4>
          {selectedPlanForAnnotation.mimeType.startsWith('image/') ? (
            <div className="relative w-full max-w-2xl mx-auto bg-gray-100 dark:bg-gray-700 rounded overflow-hidden cursor-crosshair">
              <Image
                ref={planImageRef as unknown as React.LegacyRef<HTMLImageElement>}
                src={selectedPlanForAnnotation.url}
                alt={`Plan ${selectedPlanForAnnotation.nom}`}
                className="w-full h-auto object-contain max-h-[50vh]"
                onClick={handlePlanImageClick}
                width={1200}
                height={800}
              />
              {clickedCoords?.displayX !== undefined && clickedCoords?.displayY !== undefined && (
                <MapPinIcon
                  className="absolute text-red-500 w-6 h-6 transform -translate-x-1/2 -translate-y-full pointer-events-none"
                  style={{
                    left: `${clickedCoords.displayX}px`,
                    top: `${clickedCoords.displayY}px`,
                  }}
                />
              )}
            </div>
          ) : (
            <p className="p-4 text-center text-gray-600 dark:text-gray-400">
              {selectedPlanForAnnotation.mimeType === 'application/pdf' 
                ? <a href={selectedPlanForAnnotation.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Ouvrir le PDF</a>
                : "Aperçu du pointage non disponible pour ce type de plan."
              }
            </p>
          )}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Photos (optionnel)
        </label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center"
        >
          <PaperClipIcon className="h-5 w-5 mr-2" />
          Ajouter des photos
        </Button>
        <input
          type="file" ref={fileInputRef} multiple accept="image/*" onChange={handleFileChange} className="hidden"
        />
        {previewPhotos.length > 0 && (
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {/* {console.log('[RemarqueForm] Rendering previewPhotos:', previewPhotos)} */}
            {previewPhotos.map((photo, index) => {
              // Log des détails de la photo avant de rendre l'image
              console.log(`[RemarqueForm] Rendering photo ${index + 1} details:`, { url: photo.url, isNew: photo.isNew, id: photo.id });
              return (
                <div key={photo.isNew ? photo.url : photo.id} className="relative group">
                  <Image
                    src={photo.url}
                    alt={`Aperçu ${index + 1}`}
                    className="w-full h-32 object-cover rounded-md border dark:border-gray-600"
                    onError={() => { console.warn("[RemarqueForm] Erreur chargement image preview:", photo.url); }}
                    width={300}
                    height={200}
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(index)}
                    className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-75 group-hover:opacity-100 hover:bg-red-700 transition-all"
                    aria-label="Supprimer la photo"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="pt-6 flex justify-end space-x-3">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
          Annuler
        </Button>
        <Button type="submit" variant="primary" disabled={isSaving} className="flex items-center min-w-[120px] justify-center">
          {isSaving && (
            <svg className="animate-spin h-5 w-5 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          )}
          {isSaving ? 'En cours...' : submitButtonText}
        </Button>
      </div>
    </form>
  );
};

export default RemarqueForm;