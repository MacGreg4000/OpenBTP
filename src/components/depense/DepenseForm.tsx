'use client'
import { useState, useEffect, useCallback } from 'react'
import { DepenseFormData, CATEGORIES_DEPENSE } from '@/types/depense'
import { toast } from 'react-hot-toast'
// import { format } from 'date-fns'
import SelectField from '@/components/ui/SelectField'

interface DepenseFormProps {
  chantierId: string
  depenseId?: string
  onSuccess: () => void
  onCancel: () => void
}

export default function DepenseForm({
  chantierId,
  depenseId,
  onSuccess,
  onCancel
}: DepenseFormProps) {
  const [formData, setFormData] = useState<DepenseFormData>({
    date: new Date().toISOString().split('T')[0],
    montant: 0,
    description: '',
    categorie: CATEGORIES_DEPENSE[0],
    fournisseur: '',
    reference: '',
    justificatif: null
  })
  const [montantInput, setMontantInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

  const fetchDepense = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/chantiers/${chantierId}/depenses/${depenseId}`)
      if (!response.ok) {
        throw new Error('Erreur lors de la récupération de la dépense')
      }
      const depense = await response.json()
      
      setFormData({
        date: new Date(depense.date).toISOString().split('T')[0],
        montant: depense.montant,
        description: depense.description,
        categorie: depense.categorie,
        fournisseur: depense.fournisseur || '',
        reference: depense.reference || '',
        justificatif: null
      })
      
      // Initialiser le champ montant avec la valeur formatée
      setMontantInput(depense.montant > 0 ? depense.montant.toString() : '')
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors de la récupération de la dépense')
    } finally {
      setLoading(false)
    }
  }, [chantierId, depenseId])

  useEffect(() => {
    if (depenseId) {
      setIsEditing(true)
      fetchDepense()
    }
  }, [depenseId, fetchDepense])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    
    if (name === 'montant') {
      // Gérer séparément le champ montant
      setMontantInput(value)
      setFormData(prev => ({
        ...prev,
        montant: value === '' ? 0 : parseFloat(value) || 0
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }))
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFormData(prev => ({
        ...prev,
        justificatif: e.target.files![0]
      }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (loading) return
    
    // Validation des champs obligatoires
    if (!formData.date || !formData.description || !formData.categorie || montantInput === '') {
      toast.error('Veuillez remplir tous les champs obligatoires')
      return
    }
    
    // Validation du montant
    const montant = parseFloat(montantInput.replace(',', '.'))
    if (isNaN(montant) || montant <= 0) {
      toast.error('Le montant doit être un nombre positif')
      return
    }
    
    try {
      setLoading(true)
      
      const formDataToSend = new FormData()
      formDataToSend.append('date', formData.date)
      formDataToSend.append('montant', montant.toString())
      formDataToSend.append('description', formData.description)
      formDataToSend.append('categorie', formData.categorie)
      formDataToSend.append('fournisseur', formData.fournisseur || '')
      formDataToSend.append('reference', formData.reference || '')
      
      if (formData.justificatif) {
        formDataToSend.append('justificatif', formData.justificatif)
      }
      
      const url = isEditing 
        ? `/api/chantiers/${chantierId}/depenses/${depenseId}`
        : `/api/chantiers/${chantierId}/depenses`
      
      const method = isEditing ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        body: formDataToSend
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erreur lors de l\'enregistrement')
      }
      
      const result = await response.json()
      
      // Déclencher l'événement de mise à jour
      const eventName = isEditing ? 'depense-updated' : 'depense-added'
      window.dispatchEvent(new CustomEvent(eventName, {
        detail: { depense: result }
      }))
      
      toast.success(isEditing ? 'Dépense mise à jour avec succès' : 'Dépense ajoutée avec succès')
      onSuccess()
      
    } catch (error) {
      console.error('Erreur:', error)
      toast.error(error instanceof Error ? error.message : 'Erreur lors de l\'enregistrement')
    } finally {
      setLoading(false)
    }
  }

  if (loading && isEditing) {
    return <div className="p-4 text-center">Chargement...</div>
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            id="date"
            name="date"
            value={formData.date}
            onChange={handleChange}
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
          />
        </div>
        
        <div>
          <label htmlFor="montant" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Montant (€) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            id="montant"
            name="montant"
            value={montantInput}
            onChange={handleChange}
            placeholder="0,00"
            step="0.01"
            min="0"
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
          />
        </div>
      </div>
      
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Description <span className="text-red-500">*</span>
        </label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          required
          rows={3}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SelectField
          label="Catégorie"
          id="categorie"
          name="categorie"
          value={formData.categorie}
          onChange={handleChange}
          required
          className="mt-1"
        >
          {CATEGORIES_DEPENSE.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </SelectField>
        
        <div>
          <label htmlFor="fournisseur" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Fournisseur
          </label>
          <input
            type="text"
            id="fournisseur"
            name="fournisseur"
            value={formData.fournisseur}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
          />
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="reference" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Référence
          </label>
          <input
            type="text"
            id="reference"
            name="reference"
            value={formData.reference}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
          />
        </div>
        
        <div>
          <label htmlFor="justificatif" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Justificatif
          </label>
          <input
            type="file"
            id="justificatif"
            name="justificatif"
            onChange={handleFileChange}
            className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:text-gray-400 dark:file:bg-gray-700 dark:file:text-gray-300"
          />
        </div>
      </div>
      
      <div className="flex justify-end space-x-2 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-700 dark:text-white dark:border-gray-600 dark:hover:bg-gray-600"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-blue-700 dark:hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Enregistrement...' : isEditing ? 'Mettre à jour' : 'Ajouter'}
        </button>
      </div>
    </form>
  )
} 