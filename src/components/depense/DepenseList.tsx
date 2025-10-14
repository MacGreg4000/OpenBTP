'use client'
import { useState, useEffect, useCallback } from 'react'
import { Depense } from '@/types/depense'
import { toast } from 'react-hot-toast'
import { PencilIcon, TrashIcon, DocumentIcon } from '@heroicons/react/24/outline'
import SelectField from '@/components/ui/SelectField'

interface DepenseListProps {
  chantierId: string
  onEdit: (depenseId: string) => void
}

export default function DepenseList({ chantierId, onEdit }: DepenseListProps) {
  const [depenses, setDepenses] = useState<Depense[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCategorie, setSelectedCategorie] = useState<string>('Toutes')
  const [totalDepenses, setTotalDepenses] = useState(0)

  const fetchDepenses = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/chantiers/${chantierId}/depenses`)
      if (!response.ok) {
        throw new Error('Erreur lors de la récupération des dépenses')
      }
      const data = await response.json()
      setDepenses(data)
      
      // Calculer le total des dépenses
      const total = data.reduce((sum: number, depense: Depense) => sum + depense.montant, 0)
      setTotalDepenses(total)
    } catch (error) {
      console.error('Erreur:', error)
      setError('Erreur lors du chargement des dépenses')
    } finally {
      setLoading(false)
    }
  }, [chantierId])

  useEffect(() => {
    fetchDepenses()
  }, [fetchDepenses])

  const handleDelete = async (depenseId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette dépense ?')) {
      return
    }

    try {
      const response = await fetch(`/api/chantiers/${chantierId}/depenses/${depenseId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Erreur lors de la suppression de la dépense')
      }

      // Mettre à jour la liste des dépenses
      setDepenses(depenses.filter(d => d.id !== depenseId))
      toast.success('Dépense supprimée avec succès')
      
      // Recalculer le total
      const newTotal = depenses
        .filter(d => d.id !== depenseId)
        .reduce((sum, depense) => sum + depense.montant, 0)
      setTotalDepenses(newTotal)
      
      // Déclencher l'événement de suppression
      window.dispatchEvent(new CustomEvent('depense-deleted', {
        detail: { depenseId }
      }))
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors de la suppression de la dépense')
    }
  }

  const filteredDepenses = selectedCategorie === 'Toutes'
    ? depenses
    : depenses.filter(d => d.categorie === selectedCategorie)

  if (loading) {
    return <div className="p-4 text-center">Chargement...</div>
  }

  if (error) {
    return <div className="p-4 text-center text-red-500">{error}</div>
  }

  if (depenses.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500 dark:text-gray-400">
        Aucune dépense enregistrée pour ce chantier.
      </div>
    )
  }

  // Obtenir les catégories uniques des dépenses
  const categories = ['Toutes', ...new Set(depenses.map(d => d.categorie))]

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <SelectField
            label="Filtrer par catégorie"
            id="categorie-filter"
            value={selectedCategorie}
            onChange={(e) => setSelectedCategorie(e.target.value)}
            className="rounded-md"
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </SelectField>
        </div>
        
        <div className="bg-blue-50 dark:bg-blue-900/30 p-3 rounded-md">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Total des dépenses: <span className="font-bold">{totalDepenses.toLocaleString('fr-FR')} €</span>
          </p>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">Description</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">Catégorie</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">Fournisseur</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">Référence</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">Montant</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-900 dark:divide-gray-700">
            {filteredDepenses.map((depense) => (
              <tr key={depense.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {new Date(depense.date).toLocaleDateString('fr-FR')}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900 dark:text-white max-w-xs truncate">
                  {depense.description}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {depense.categorie}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {depense.fournisseur || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {depense.reference || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white text-right font-medium">
                  {depense.montant.toLocaleString('fr-FR')} €
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end space-x-2">
                    {depense.justificatif && (
                      <a
                        href={depense.justificatif}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                        title="Voir le justificatif"
                      >
                        <DocumentIcon className="h-5 w-5" />
                      </a>
                    )}
                    <button
                      onClick={() => onEdit(depense.id)}
                      className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                      title="Modifier"
                    >
                      <PencilIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(depense.id)}
                      className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                      title="Supprimer"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
} 