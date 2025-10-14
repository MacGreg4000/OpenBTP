'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
// import { useSession } from 'next-auth/react'
import Link from 'next/link'
import React from 'react'
import Select from 'react-select'
import { 
  ArrowLeftIcon, 
  PhotoIcon, 
  XMarkIcon,
  MapPinIcon,
} from '@heroicons/react/24/outline'
import { Button, FormInput, FormTextarea } from '@/components/ui'

// interfaces inutilisées supprimées

interface SousTraitantOption {
  value: string
  label: string
  email: string
}

// Interface pour les documents qui sont des plans
interface PlanDocument {
  id: number;
  nom: string;
  url: string;
  mimeType: string; // Ajout de mimeType
}

export default function NouvelleRemarquePage({ 
  params 
}: { 
  params: Promise<{ chantierId: string, id: string }> 
}) {
  // Utiliser React.use pour déballer la Promise params
  const { chantierId, id: receptionId } = React.use(params)
  const router = useRouter()
  // const { data: session } = useSession()
  const [chantier, setChantier] = useState<{ nomChantier?: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [soustraitants, setSoustraitants] = useState<SousTraitantOption[]>([])
  const [selectedSoustraitant, setSelectedSoustraitant] = useState<SousTraitantOption | null>(null)
  const [photoFiles, setPhotoFiles] = useState<File[]>([])
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const planImageRef = useRef<HTMLImageElement>(null); // Référence à l'image du plan

  // Nouveaux états pour la gestion des plans
  const [availablePlans, setAvailablePlans] = useState<PlanDocument[]>([]);
  const [selectedPlanForAnnotation, setSelectedPlanForAnnotation] = useState<PlanDocument | null>(null);
  const [clickedCoords, setClickedCoords] = useState<{ x: number; y: number; displayX: number; displayY: number } | null>(null);
  
  const [formData, setFormData] = useState({
    description: '',
    localisation: '',
    planId: null as number | null, // ID du document plan sélectionné
    coordonneesPlan: null as { x: number; y: number } | null, // Coordonnées normalisées (0-1)
  })

  useEffect(() => {
    const fetchChantier = async () => {
      try {
        const response = await fetch(`/api/chantiers/${chantierId}`)
        if (!response.ok) throw new Error('Erreur lors du chargement du chantier')
        const data = await response.json()
        setChantier(data)
        setLoading(false)
      } catch (error) {
        console.error('Erreur:', error)
        setError('Erreur lors du chargement du chantier')
        setLoading(false)
      }
    }

    const fetchSoustraitants = async () => {
      try {
        const response = await fetch('/api/soustraitants/select')
        if (!response.ok) throw new Error('Erreur lors du chargement des sous-traitants')
        const data = await response.json()
        
        // Ajouter l'option "Équipe interne" au début de la liste des sous-traitants
        const optionsWithInternal = [
          {
            value: 'equipe-interne',
            label: 'Équipe interne',
            email: ''
          },
          ...data
        ]
        
        setSoustraitants(optionsWithInternal)
      } catch (error) {
        console.error('Erreur:', error)
        setError('Erreur lors du chargement des sous-traitants')
      }
    }

    fetchChantier()
    fetchSoustraitants()

    // Récupérer les documents du chantier qui sont des plans
    const fetchPlansForChantier = async () => {
      if (!chantierId) return;
      try {
        const res = await fetch(`/api/chantiers/${chantierId}/documents`);
        if (!res.ok) {
          throw new Error('Erreur lors de la récupération des documents du chantier');
        }
        const allDocuments = await res.json();
        const planDocuments = allDocuments
          .filter((doc: { estPlan?: boolean; mimeType?: string }) => doc.estPlan === true && ((doc.mimeType||'').startsWith('image/') || doc.mimeType === 'application/pdf'))
          .map((doc: { id: number; nom: string; url: string; mimeType: string }) => ({ id: doc.id, nom: doc.nom, url: doc.url, mimeType: doc.mimeType }));
        setAvailablePlans(planDocuments);
      } catch (err) {
        console.error("Erreur fetchPlansForChantier:", err);
        // Gérer l'erreur (par exemple, afficher un message à l'utilisateur)
      }
    };

    fetchPlansForChantier();

    // Cleanup pour les URLs d'objet de prévisualisation lors du démontage du composant
    return () => {
      photoPreviews.forEach(url => URL.revokeObjectURL(url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chantierId]); // `photoPreviews` n'est pas ajouté ici pour éviter des re-exécutions inutiles du fetch, 
                     // le cleanup se fera avec la dernière valeur de photoPreviews au moment du unmount.

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFilesArray = Array.from(e.target.files);
      setPhotoFiles(prevFiles => [...prevFiles, ...newFilesArray]);

      const newPreviewsArray = newFilesArray.map(file => URL.createObjectURL(file));
      setPhotoPreviews(prevPreviews => [...prevPreviews, ...newPreviewsArray]);
    }
  }

  const handleRemovePhoto = (indexToRemove: number) => {
    // Retirer le fichier
    setPhotoFiles(prevFiles => prevFiles.filter((_, i) => i !== indexToRemove));

    // Retirer l'aperçu et révoquer l'URL de l'objet
    setPhotoPreviews(prevPreviews => {
      const urlToRevoke = prevPreviews[indexToRemove];
      if (urlToRevoke) {
        URL.revokeObjectURL(urlToRevoke);
      }
      return prevPreviews.filter((_, i) => i !== indexToRemove);
    });
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);

    // Récupérer les valeurs actuelles des états ou des refs pour planId et coordonneesPlan
    // Ceci est une supposition, adaptez selon comment vous stockez ces valeurs
    const currentPlanId = formData.planId; // Supposons que vous avez un état formData.planId
    const currentCoordonnees = formData.coordonneesPlan; // Supposons que vous avez un état formData.coordonneesPlan

    console.log("Formulaire Nouvelle Remarque - Envoi vers API : planId =", currentPlanId);
    console.log("Formulaire Nouvelle Remarque - Envoi vers API : coordonneesPlan =", JSON.stringify(currentCoordonnees));

    const formDataToSend = new FormData(event.currentTarget);
    
    // Ajouter les fichiers photo au FormData
    photoFiles.forEach((file) => {
      formDataToSend.append('photos', file); // 'photos' est le nom de champ attendu par l'API
    });

    // coordonneesPlan n'a pas de champ de formulaire direct, donc ajout manuel nécessaire
    if (currentCoordonnees) {
      formDataToSend.append('coordonneesPlan', JSON.stringify(currentCoordonnees));
    }

    // Afficher toutes les données du FormData juste avant l'envoi pour vérification complète
    console.log("Formulaire Nouvelle Remarque - Contenu complet du FormData avant envoi:");
    for (const [key, value] of formDataToSend.entries()) {
      console.log(`${key}:`, value);
      if (key === 'photos' && value instanceof File) {
        console.log(`  Photo details: name=${value.name}, size=${value.size}, type=${value.type}`);
      }
    }

    try {
      const response = await fetch(`/api/chantiers/${chantierId}/reception/${receptionId}/remarques`, {
        method: 'POST',
        body: formDataToSend
      })

      if (!response.ok) {
        const data = await response.json()
        setError(data.error || 'Erreur lors de la création de la remarque')
        setSaving(false)
        return;
      }
      
      // Si la réponse est OK (status 201), elle contient la remarque créée
      await response.json();

      // Vider les previews après soumission réussie pour libérer les URLs
      photoPreviews.forEach(url => URL.revokeObjectURL(url));
      setPhotoPreviews([]);
      setPhotoFiles([]);

      // Rediriger vers la page de détails de la réception
      router.push(`/chantiers/${chantierId}/reception/${receptionId}`)
    } catch (error) {
      console.error('Erreur:', error)
      setError(error instanceof Error ? error.message : 'Une erreur est survenue')
      setSaving(false)
    }
  }

  // Handler pour la sélection d'un plan
  const handlePlanSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const planId = e.target.value ? parseInt(e.target.value) : null;
    if (planId) {
      const plan = availablePlans.find(p => p.id === planId);
      setSelectedPlanForAnnotation(plan || null);
      setFormData(prev => ({ ...prev, planId: plan?.id || null, coordonneesPlan: null }));
      setClickedCoords(null);
    } else {
      setSelectedPlanForAnnotation(null);
      setFormData(prev => ({ ...prev, planId: null, coordonneesPlan: null }));
      setClickedCoords(null);
    }
  };

  // Handler pour le clic sur l'image du plan
  const handlePlanImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!planImageRef.current) return;

    const rect = planImageRef.current.getBoundingClientRect();
    const displayX = e.clientX - rect.left;
    const displayY = e.clientY - rect.top;

    // Coordonnées normalisées (pourcentage par rapport à la taille de l'image)
    const normalizedX = displayX / rect.width;
    const normalizedY = displayY / rect.height;

    setClickedCoords({ x: normalizedX, y: normalizedY, displayX, displayY });
    setFormData(prev => ({ ...prev, coordonneesPlan: { x: normalizedX, y: normalizedY } }));
  };

  if (loading) return <div className="p-8">Chargement...</div>
  if (!chantier) return <div className="p-8">Chantier non trouvé</div>

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center mb-6">
        <Link 
          href={`/chantiers/${chantierId}/reception/${receptionId}`}
          className="mr-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          <ArrowLeftIcon className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Nouvelle remarque - {chantier.nomChantier}
        </h1>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-4 rounded-md bg-red-50 dark:bg-red-900/20 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400 dark:text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800 dark:text-red-200">{error}</h3>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-6">
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Assigner à
              </label>
              <div className="mt-1">
                <Select
                  className="react-select-container"
                  classNamePrefix="react-select"
                  options={soustraitants}
                  value={selectedSoustraitant}
                  onChange={(selected) => setSelectedSoustraitant(selected as SousTraitantOption)}
                  placeholder="Sélectionner une équipe ou un sous-traitant..."
                  isClearable
                  isSearchable
                  noOptionsMessage={() => "Aucune option trouvée"}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Photos (optionnel)
              </label>
              <div className="mt-2 flex items-center">
                <label htmlFor="photo-upload" className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:hover:bg-gray-600">
                  <PhotoIcon className="h-5 w-5 mr-2" />
                  Ajouter des photos
                </label>
                <input
                  id="photo-upload"
                  type="file"
                  className="hidden"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoUpload}
                  ref={fileInputRef}
                />
                
                {photoPreviews.length > 0 && (
                  <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {photoPreviews.map((previewUrl, index) => (
                      <div key={previewUrl} className="relative group">
                        <div className="h-40 w-full rounded-md overflow-hidden bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                          <img
                            src={previewUrl}
                            alt={`Aperçu ${index + 1}`}
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemovePhoto(index)}
                          className="absolute top-2 right-2 bg-red-100 text-red-600 rounded-full p-1 hover:bg-red-200 dark:bg-red-900 dark:text-red-300 dark:hover:bg-red-800"
                        >
                          <XMarkIcon className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Section pour lier un plan */}
            <div>
              <label htmlFor="plan-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Lier à un plan (optionnel)
              </label>
              {availablePlans.length > 0 ? (
                <select
                  id="plan-select"
                  name="planId"
                  value={formData.planId || ''}
                  onChange={handlePlanSelect}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                >
                  <option value="">Aucun plan sélectionné</option>
                  {availablePlans.map(plan => (
                    <option key={plan.id} value={plan.id}>
                      {plan.nom}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Aucun document marqué comme plan pour ce chantier.</p>
              )}
            </div>

            {/* Affichage du plan sélectionné et pointage */} 
            {selectedPlanForAnnotation && (
              <div className="mt-4">
                <h3 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-2">Pointer sur le plan: {selectedPlanForAnnotation.nom}</h3>
                {selectedPlanForAnnotation.mimeType.startsWith('image/') ? (
                  <div className="relative w-full max-w-2xl mx-auto border border-gray-300 dark:border-gray-600 rounded overflow-hidden" style={{ cursor: 'crosshair' }}>
                    <img 
                      ref={planImageRef}
                      src={selectedPlanForAnnotation.url}
                      alt={`Plan ${selectedPlanForAnnotation.nom}`}
                      onClick={handlePlanImageClick}
                      className="w-full h-auto object-contain"
                    />
                    {clickedCoords && (
                      <MapPinIcon 
                        className="absolute text-red-500 w-8 h-8"
                        style={{
                          left: `calc(${clickedCoords.displayX}px - 0.75rem)`, // Ajuster pour centrer la base de l'icône
                          top: `calc(${clickedCoords.displayY}px - 1.5rem)`   // Ajuster pour centrer la base de l'icône
                        }}
                      />
                    )}
                  </div>
                ) : selectedPlanForAnnotation.mimeType === 'application/pdf' ? (
                  <div className="p-4 border border-dashed border-gray-300 dark:border-gray-600 rounded-md">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Le pointage sur les plans PDF n'est pas encore supporté. Vous pouvez lier ce plan PDF à la remarque, mais le pointage précis doit se faire manuellement pour l'instant.
                    </p>
                    <a href={selectedPlanForAnnotation.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                      Ouvrir le PDF : {selectedPlanForAnnotation.nom}
                    </a>
                  </div>
                ) : (
                    <p className="text-sm text-red-500 dark:text-red-400">Type de plan non supporté pour l'aperçu.</p>
                )}
                {formData.coordonneesPlan && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Pointage enregistré à X: {formData.coordonneesPlan.x.toFixed(3)}, Y: {formData.coordonneesPlan.y.toFixed(3)} (relatif)
                  </p>
                )}
              </div>
            )}
            {/* Fin section plan */}

            <div className="pt-4 flex justify-end">
              <Link
                href={`/chantiers/${chantierId}/reception/${receptionId}`}
                className="mr-3 inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:hover:bg-gray-600"
              >
                Annuler
              </Link>
              <Button
                type="submit"
                variant="primary"
                disabled={saving}
                className="inline-flex items-center"
              >
                {saving ? 'Enregistrement...' : 'Enregistrer la remarque'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
} 