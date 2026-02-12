'use client'

import { useState, useEffect, useMemo } from 'react'
import { 
  PlusIcon,
  DocumentArrowUpIcon
} from '@heroicons/react/24/outline'
import DetailChoixCard from './DetailChoixCard'
import { SearchableSelect, SearchableSelectOption } from '@/components/SearchableSelect'
import { toast } from 'react-hot-toast'

interface Chantier {
  chantierId: string
  nomChantier: string
}

interface DetailChoix {
  id?: string
  numeroChoix: number
  couleurPlan: string
  localisations: string[]
  type: string
  marque: string
  collection?: string
  modele: string
  reference?: string
  couleur?: string
  formatLongueur?: number
  formatLargeur?: number
  epaisseur?: number
  finition?: string
  surfaceEstimee?: number
  couleurJoint?: string
  largeurJoint?: number
  typeJoint?: string
  typePose?: string
  sensPose?: string
  particularitesPose?: string
  photosShowroom?: string[]
  notes?: string
  zoneDessineeData?: unknown
}

interface ChoixClientFormProps {
  initialData?: {
    id?: string
    nomClient?: string
    telephoneClient?: string
    emailClient?: string
    chantierId?: string
    dateVisite?: string
    statut?: string
    notesGenerales?: string
    documents?: string[]
    detailsChoix?: DetailChoix[]
  }
  onSubmit: (data: {
    nomClient: string
    telephoneClient?: string
    emailClient?: string
    chantierId?: string
    statut: string
    notesGenerales?: string
    documents?: string[]
    detailsChoix?: DetailChoix[]
  }) => Promise<void>
  saving: boolean
}

const PALETTE_COULEURS = [
  { nom: 'Bleu', hex: '#3B82F6' },
  { nom: 'Rouge', hex: '#EF4444' },
  { nom: 'Vert', hex: '#10B981' },
  { nom: 'Jaune', hex: '#F59E0B' },
  { nom: 'Violet', hex: '#8B5CF6' },
  { nom: 'Orange', hex: '#F97316' },
  { nom: 'Rose', hex: '#EC4899' },
  { nom: 'Cyan', hex: '#06B6D4' },
  { nom: 'Indigo', hex: '#6366F1' },
  { nom: 'Marron', hex: '#92400E' }
]

export default function ChoixClientForm({ initialData, onSubmit, saving }: ChoixClientFormProps) {
  // États du formulaire
  const [nomClient, setNomClient] = useState(initialData?.nomClient || '')
  const [telephoneClient, setTelephoneClient] = useState(initialData?.telephoneClient || '')
  const [emailClient, setEmailClient] = useState(initialData?.emailClient || '')
  const [chantierId, setChantierId] = useState(initialData?.chantierId || '')
  const [dateVisite, setDateVisite] = useState(
    initialData?.dateVisite ? new Date(initialData.dateVisite).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
  )
  const [statut, setStatut] = useState(initialData?.statut || 'BROUILLON')
  const [notesGenerales, setNotesGenerales] = useState(initialData?.notesGenerales || '')
  const [detailsChoix, setDetailsChoix] = useState(initialData?.detailsChoix || [])
  const [documents, setDocuments] = useState<string[]>(initialData?.documents || [])
  const [uploadingDocument, setUploadingDocument] = useState(false)
  
  // Chantiers disponibles
  const [chantiers, setChantiers] = useState<Chantier[]>([])

  useEffect(() => {
    fetchChantiers()
  }, [])

  const fetchChantiers = async () => {
    try {
      const response = await fetch('/api/chantiers?etat=tous&pageSize=100')
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`)
      }
      const data = await response.json()
      // L'API retourne { chantiers: [...], meta: {...} }
      if (data.chantiers && Array.isArray(data.chantiers)) {
        setChantiers(data.chantiers)
      } else if (data.data && Array.isArray(data.data)) {
        // Fallback pour l'ancien format
        setChantiers(data.data)
      } else if (Array.isArray(data)) {
        // Fallback si l'API retourne directement un array
        setChantiers(data)
      } else {
        console.warn('Format de réponse inattendu pour /api/chantiers:', data)
        setChantiers([])
      }
    } catch (error) {
      console.error('Erreur lors du chargement des chantiers:', error)
      setChantiers([])
    }
  }

  const handleAddDetailChoix = () => {
    const couleursUtilisees = detailsChoix.map((d: DetailChoix) => d.couleurPlan)
    const couleurDisponible = PALETTE_COULEURS.find(c => !couleursUtilisees.includes(c.hex))
    
    const nouveauDetail = {
      id: `temp-${Date.now()}`,
      numeroChoix: detailsChoix.length + 1,
      couleurPlan: couleurDisponible?.hex || PALETTE_COULEURS[0].hex,
      localisations: [],
      type: 'SOL',
      marque: '',
      collection: '',
      modele: '',
      reference: '',
      couleur: '',
      formatLongueur: null,
      formatLargeur: null,
      epaisseur: null,
      finition: 'MAT',
      surfaceEstimee: null,
      couleurJoint: '',
      largeurJoint: 2,
      typeJoint: 'CIMENT',
      typePose: '',
      sensPose: '',
      particularitesPose: '',
      photosShowroom: [],
      notes: '',
      zoneDessineeData: null
    }
    
    setDetailsChoix([...detailsChoix, nouveauDetail])
  }

  const handleUpdateDetailChoix = (index: number, updatedDetail: DetailChoix) => {
    const updated = [...detailsChoix]
    updated[index] = { ...updated[index], ...updatedDetail }
    setDetailsChoix(updated)
  }

  const handleDeleteDetailChoix = (index: number) => {
    setDetailsChoix(detailsChoix.filter((_, i: number) => i !== index))
  }

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !initialData?.id) return

    try {
      setUploadingDocument(true)
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', 'document')

      const response = await fetch(`/api/choix-clients/${initialData.id}/upload`, {
        method: 'POST',
        body: formData
      })

      const data = await response.json()
      
      if (data.success) {
        setDocuments([...documents, data.url])
        toast.success('Document uploadé avec succès')
      } else {
        toast.error('Erreur lors de l\'upload du document')
      }
    } catch (error) {
      console.error('Erreur upload:', error)
      toast.error('Erreur lors de l\'upload du document')
    } finally {
      setUploadingDocument(false)
    }
  }

  const handleDeleteDocument = (index: number) => {
    setDocuments(documents.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!nomClient.trim()) {
      toast.error('Le nom du client est requis')
      return
    }

    const formData = {
      nomClient,
      telephoneClient,
      emailClient,
      chantierId: chantierId || null,
      dateVisite,
      statut,
      notesGenerales,
      documents,
      detailsChoix: detailsChoix.map((detail: DetailChoix, index: number) => ({
        ...detail,
        numeroChoix: index + 1
      }))
    }

    await onSubmit(formData)
  }

  const chantierOptions = useMemo<SearchableSelectOption[]>(() => {
    const base: SearchableSelectOption[] = [{ value: null, label: 'Aucun (client en réflexion)' }]
    const others = chantiers.map((c) => ({ value: c.chantierId, label: c.nomChantier }))
    return [...base, ...others]
  }, [chantiers])

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Informations client */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          Informations Client
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nom du client *
            </label>
            <input
              type="text"
              value={nomClient}
              onChange={(e) => setNomClient(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Téléphone
            </label>
            <input
              type="tel"
              value={telephoneClient}
              onChange={(e) => setTelephoneClient(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email
            </label>
            <input
              type="email"
              value={emailClient}
              onChange={(e) => setEmailClient(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Date de visite
            </label>
            <input
              type="date"
              value={dateVisite}
              onChange={(e) => setDateVisite(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Chantier associé
            </label>
            <SearchableSelect
              options={chantierOptions}
              value={chantierId || null}
              onChange={(value) => setChantierId(value ? String(value) : '')}
              placeholder="Rechercher un chantier..."
              searchPlaceholder="Rechercher un chantier..."
              emptyMessage="Aucun chantier trouvé"
              showAllOption={true}
              allOptionLabel="Aucun (client en réflexion)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Statut
            </label>
            <div className="flex gap-4">
              {[
                { value: 'BROUILLON', label: 'Brouillon' },
                { value: 'PRE_CHOIX', label: 'Pré-choix' },
                { value: 'CHOIX_DEFINITIF', label: 'Choix définitif' }
              ].map((option) => (
                <label key={option.value} className="flex items-center">
                  <input
                    type="radio"
                    value={option.value}
                    checked={statut === option.value}
                    onChange={(e) => setStatut(e.target.value)}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {option.label}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Notes générales
          </label>
          <textarea
            value={notesGenerales}
            onChange={(e) => setNotesGenerales(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Documents joints */}
      {initialData?.id && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Documents Joints
          </h2>
          
          <div className="space-y-4">
            {/* Liste des documents */}
            {documents.length > 0 && (
              <div className="space-y-2">
                {documents.map((doc, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <a
                      href={doc}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      <span className="text-sm">{doc.split('/').pop()}</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => handleDeleteDocument(index)}
                      className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                    >
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Bouton d'upload */}
            <div>
              <label className="inline-flex items-center px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg cursor-pointer transition-colors">
                <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                {uploadingDocument ? 'Upload en cours...' : 'Ajouter un document'}
                <input
                  type="file"
                  onChange={handleDocumentUpload}
                  disabled={uploadingDocument}
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                />
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                PDF, Images, Documents Word acceptés
              </p>
            </div>
          </div>
        </div>
      )}

      {!initialData?.id && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <p className="text-sm text-blue-800 dark:text-blue-300">
            💡 Les documents pourront être ajoutés après la création du choix client
          </p>
        </div>
      )}

      {/* Détails des choix */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Choix des revêtements
          </h2>
          <button
            type="button"
            onClick={handleAddDetailChoix}
            className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Ajouter un choix
          </button>
        </div>

        {detailsChoix.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
            <DocumentArrowUpIcon className="h-12 w-12 mx-auto text-gray-400 mb-3" />
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Aucun choix ajouté pour le moment
            </p>
            <button
              type="button"
              onClick={handleAddDetailChoix}
              className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Ajouter le premier choix
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {detailsChoix.map((detail: DetailChoix, index: number) => (
              <DetailChoixCard
                key={detail.id || `temp-${index}`}
                detail={detail}
                index={index}
                onUpdate={(updated) => handleUpdateDetailChoix(index, updated)}
                onDelete={() => handleDeleteDetailChoix(index)}
                paletteColors={PALETTE_COULEURS}
              />
            ))}
            
            {/* Bouton pour ajouter un choix en bas de la liste */}
            <div className="flex justify-center pt-4">
              <button
                type="button"
                onClick={handleAddDetailChoix}
                className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors shadow-sm"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Ajouter un choix
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Boutons d'action */}
      <div className="flex justify-end pt-6 border-t border-gray-200 dark:border-gray-700">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        >
          {saving ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </div>
    </form>
  )
}

