'use client'

import { useState } from 'react'
import { TrashIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline'

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

interface DetailChoixCardProps {
  detail: DetailChoix
  index: number
  onUpdate: (updated: DetailChoix) => void
  onDelete: () => void
  paletteColors: Array<{ nom: string; hex: string }>
}

const LOCALISATIONS_DEFAUT = [
  'Séjour', 'Cuisine', 'Salle de bain', 'Chambre 1', 'Chambre 2', 'Chambre 3',
  'Hall d\'entrée', 'Couloir', 'WC', 'Garage', 'Terrasse', 'Escalier'
]

const FINITIONS = [
  { value: 'BRILLANT', label: 'Brillant' },
  { value: 'MAT', label: 'Mat' },
  { value: 'SATINE', label: 'Satiné' },
  { value: 'STRUCTURE', label: 'Structuré' },
  { value: 'POLI', label: 'Poli' },
  { value: 'ANTIDERAPANT', label: 'Anti-dérapant' }
]

const TYPES_JOINT = [
  { value: 'EPOXY', label: 'Époxy' },
  { value: 'CIMENT', label: 'Ciment' },
  { value: 'SILICONE', label: 'Silicone' },
  { value: 'POLYURETHANE', label: 'Polyuréthane' }
]

export default function DetailChoixCard({ detail, index, onUpdate, onDelete, paletteColors }: DetailChoixCardProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [localisations, setLocalisations] = useState<string[]>(detail.localisations || [])
  const [nouvelleLocalisation, setNouvelleLocalisation] = useState('')

  const handleFieldChange = (field: string, value: string | number | string[]) => {
    onUpdate({ ...detail, [field]: value })
  }

  const handleToggleLocalisation = (loc: string) => {
    const updated = localisations.includes(loc)
      ? localisations.filter(l => l !== loc)
      : [...localisations, loc]
    setLocalisations(updated)
    handleFieldChange('localisations', updated)
  }

  const handleAddLocalisation = () => {
    if (nouvelleLocalisation.trim() && !localisations.includes(nouvelleLocalisation.trim())) {
      const updated = [...localisations, nouvelleLocalisation.trim()]
      setLocalisations(updated)
      handleFieldChange('localisations', updated)
      setNouvelleLocalisation('')
    }
  }

  const handleRemoveLocalisation = (loc: string) => {
    const updated = localisations.filter(l => l !== loc)
    setLocalisations(updated)
    handleFieldChange('localisations', updated)
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border-2 border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div 
        className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        style={{ borderLeft: `6px solid ${detail.couleurPlan}` }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            <div className="flex items-center gap-2">
              <div 
                className="w-8 h-8 rounded-full border-2 border-white shadow-md"
                style={{ backgroundColor: detail.couleurPlan }}
              />
              <span className="font-bold text-gray-900 dark:text-white">
                Choix #{index + 1}
              </span>
            </div>
            {detail.marque && detail.modele && (
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {detail.marque} - {detail.modele}{detail.couleur && ` - ${detail.couleur}`}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-md"
            >
              {isExpanded ? (
                <ChevronUpIcon className="h-5 w-5" />
              ) : (
                <ChevronDownIcon className="h-5 w-5" />
              )}
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md"
            >
              <TrashIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Contenu */}
      {isExpanded && (
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 space-y-6">
          {/* Couleur de repérage */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Couleur de repérage sur le plan
            </label>
            <div className="flex flex-wrap gap-2">
              {paletteColors.map((color) => (
                <button
                  key={color.hex}
                  type="button"
                  onClick={() => handleFieldChange('couleurPlan', color.hex)}
                  className={`w-10 h-10 rounded-full border-2 ${
                    detail.couleurPlan === color.hex 
                      ? 'border-gray-900 dark:border-white ring-2 ring-blue-500' 
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                  style={{ backgroundColor: color.hex }}
                  title={color.nom}
                />
              ))}
            </div>
          </div>

          {/* Localisations */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Localisation(s) *
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {LOCALISATIONS_DEFAUT.map((loc) => (
                <button
                  key={loc}
                  type="button"
                  onClick={() => handleToggleLocalisation(loc)}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                    localisations.includes(loc)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  {loc}
                </button>
              ))}
            </div>
            {localisations.filter(l => !LOCALISATIONS_DEFAUT.includes(l)).map((loc) => (
              <div key={loc} className="inline-flex items-center gap-1 px-3 py-1 bg-green-600 text-white rounded-full text-sm mr-2 mb-2">
                {loc}
                <button
                  type="button"
                  onClick={() => handleRemoveLocalisation(loc)}
                  className="ml-1 hover:text-red-200"
                >
                  ×
                </button>
              </div>
            ))}
            <div className="flex gap-2 mt-2">
              <input
                type="text"
                value={nouvelleLocalisation}
                onChange={(e) => setNouvelleLocalisation(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddLocalisation())}
                placeholder="Ajouter une localisation personnalisée"
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              />
              <button
                type="button"
                onClick={handleAddLocalisation}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm"
              >
                Ajouter
              </button>
            </div>
          </div>

          {/* Type de pose */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Type
            </label>
            <div className="flex gap-4">
              {[
                { value: 'SOL', label: 'Sol' },
                { value: 'MUR', label: 'Mur' },
                { value: 'DECOR', label: 'Décor' }
              ].map((option) => (
                <label key={option.value} className="flex items-center">
                  <input
                    type="radio"
                    value={option.value}
                    checked={detail.type === option.value}
                    onChange={(e) => handleFieldChange('type', e.target.value)}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {option.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Produit */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Marque *
              </label>
              <input
                type="text"
                value={detail.marque}
                onChange={(e) => handleFieldChange('marque', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Collection
              </label>
              <input
                type="text"
                value={detail.collection}
                onChange={(e) => handleFieldChange('collection', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Modèle *
              </label>
              <input
                type="text"
                value={detail.modele}
                onChange={(e) => handleFieldChange('modele', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Référence
              </label>
              <input
                type="text"
                value={detail.reference}
                onChange={(e) => handleFieldChange('reference', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Couleur
              </label>
              <input
                type="text"
                value={detail.couleur}
                onChange={(e) => handleFieldChange('couleur', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Finition
              </label>
              <select
                value={detail.finition || ''}
                onChange={(e) => handleFieldChange('finition', e.target.value || null)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">Sélectionner...</option>
                {FINITIONS.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Format */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Longueur (cm)
              </label>
              <input
                type="number"
                step="0.01"
                value={detail.formatLongueur || ''}
                onChange={(e) => handleFieldChange('formatLongueur', e.target.value ? parseFloat(e.target.value) : null)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Largeur (cm)
              </label>
              <input
                type="number"
                step="0.01"
                value={detail.formatLargeur || ''}
                onChange={(e) => handleFieldChange('formatLargeur', e.target.value ? parseFloat(e.target.value) : null)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Épaisseur (mm)
              </label>
              <input
                type="number"
                step="0.01"
                value={detail.epaisseur || ''}
                onChange={(e) => handleFieldChange('epaisseur', e.target.value ? parseFloat(e.target.value) : null)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          {/* Surface */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Surface estimée (m²)
            </label>
            <input
              type="number"
              step="0.01"
              value={detail.surfaceEstimee || ''}
              onChange={(e) => handleFieldChange('surfaceEstimee', e.target.value ? parseFloat(e.target.value) : null)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          {/* Joints */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Couleur des joints
              </label>
              <input
                type="text"
                value={detail.couleurJoint}
                onChange={(e) => handleFieldChange('couleurJoint', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Largeur des joints (mm)
              </label>
              <input
                type="number"
                step="0.1"
                value={detail.largeurJoint || ''}
                onChange={(e) => handleFieldChange('largeurJoint', e.target.value ? parseFloat(e.target.value) : null)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Type de joint
              </label>
              <select
                value={detail.typeJoint || ''}
                onChange={(e) => handleFieldChange('typeJoint', e.target.value || null)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">Sélectionner...</option>
                {TYPES_JOINT.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Pose */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Type de pose
              </label>
              <input
                type="text"
                value={detail.typePose}
                onChange={(e) => handleFieldChange('typePose', e.target.value)}
                placeholder="Droite, Diagonale, Chevron..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Sens de pose
              </label>
              <input
                type="text"
                value={detail.sensPose}
                onChange={(e) => handleFieldChange('sensPose', e.target.value)}
                placeholder="Longueur, Largeur..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Particularités de pose
            </label>
            <textarea
              value={detail.particularitesPose}
              onChange={(e) => handleFieldChange('particularitesPose', e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Notes
            </label>
            <textarea
              value={detail.notes}
              onChange={(e) => handleFieldChange('notes', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
        </div>
      )}
    </div>
  )
}

