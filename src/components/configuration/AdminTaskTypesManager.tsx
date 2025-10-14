import { useState, useEffect } from 'react'
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon, 
  ArrowUpIcon, 
  ArrowDownIcon
} from '@heroicons/react/24/outline'

interface AdminTaskType {
  id: string
  taskType: string
  label: string
  category: string
  isActive: boolean
  ordre: number
  createdAt: string
  updatedAt: string
}

export default function AdminTaskTypesManager() {
  const [taskTypes, setTaskTypes] = useState<AdminTaskType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingType, setEditingType] = useState<AdminTaskType | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    taskType: '',
    label: '',
    category: 'administrative',
    isActive: true
  })

  // Fetch task types
  useEffect(() => {
    const fetchTaskTypes = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/admin-task-types')
        if (!response.ok) {
          throw new Error('Erreur lors de la récupération des types de tâches')
        }
        const data = await response.json()
        setTaskTypes(data)
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Erreur lors de la récupération des types de tâches')
      } finally {
        setLoading(false)
      }
    }

    fetchTaskTypes()
  }, [])

  // Add or edit task type
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const url = editingType 
        ? `/api/admin-task-types/${editingType.id}` 
        : '/api/admin-task-types'
      
      const method = editingType ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erreur lors de l\'enregistrement')
      }

      const savedType = await response.json()
      
      if (editingType) {
        // Update existing type
        setTaskTypes(taskTypes.map(t => 
          t.id === savedType.id ? savedType : t
        ))
      } else {
        // Add new type
        setTaskTypes([...taskTypes, savedType])
      }
      
      // Reset form and close modal
      resetForm()
      setIsModalOpen(false)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Erreur lors de l\'enregistrement')
    }
  }

  // Delete task type
  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce type de tâche ?')) {
      return
    }
    
    try {
      const response = await fetch(`/api/admin-task-types/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erreur lors de la suppression')
      }

      // Remove from state
      setTaskTypes(taskTypes.filter(t => t.id !== id))
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Erreur lors de la suppression')
    }
  }

  // Toggle task type active status
  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/admin-task-types/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isActive: !currentStatus })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erreur lors de la modification')
      }

      const updatedType = await response.json()
      
      // Update in state
      setTaskTypes(taskTypes.map(t => 
        t.id === id ? updatedType : t
      ))
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Erreur lors de la modification')
    }
  }

  // Change task type order
  const handleMoveOrder = async (id: string, direction: 'up' | 'down') => {
    const index = taskTypes.findIndex(t => t.id === id)
    if (
      (direction === 'up' && index === 0) || 
      (direction === 'down' && index === taskTypes.length - 1)
    ) {
      return // Can't move further
    }
    
    const newOrder = [...taskTypes]
    const temp = newOrder[index]
    
    if (direction === 'up') {
      newOrder[index] = newOrder[index - 1]
      newOrder[index - 1] = temp
    } else {
      newOrder[index] = newOrder[index + 1]
      newOrder[index + 1] = temp
    }
    
    // Update ordre values
    const updatedTypes = newOrder.map((type, idx) => ({
      ...type,
      ordre: idx + 1
    }))
    
    try {
      // Update each affected type
      await Promise.all(
        updatedTypes
          .filter((t, idx) => t.ordre !== taskTypes[idx].ordre)
          .map(type => 
            fetch(`/api/admin-task-types/${type.id}`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ ordre: type.ordre })
            })
          )
      )
      
      // Update local state
      setTaskTypes(updatedTypes)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Erreur lors de la modification de l\'ordre')
    }
  }

  // Open edit modal
  const handleEdit = (type: AdminTaskType) => {
    setEditingType(type)
    setFormData({
      taskType: type.taskType,
      label: type.label,
      category: type.category,
      isActive: type.isActive
    })
    setIsModalOpen(true)
  }

  // Open add modal
  const handleAdd = () => {
    resetForm()
    setEditingType(null)
    setIsModalOpen(true)
  }

  // Reset form
  const resetForm = () => {
    setFormData({
      taskType: '',
      label: '',
      category: 'administrative',
      isActive: true
    })
  }

  if (loading) {
    return <div className="p-6 text-center">Chargement des types de tâches...</div>
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      {error && (
        <div className="mb-4 p-4 text-sm text-red-700 bg-red-100 rounded-lg dark:bg-red-200 dark:text-red-800">
          {error}
        </div>
      )}
      
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-medium dark:text-white">Types de tâches administratives</h3>
        <button
          onClick={handleAdd}
          className="inline-flex items-center px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-blue-700 dark:hover:bg-blue-600"
        >
          <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
          Ajouter un type
        </button>
      </div>
      
      {taskTypes.length === 0 ? (
        <div className="text-center py-4 text-gray-500 dark:text-gray-400">
          Aucun type de tâche administrative n&apos;a été défini
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Ordre
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Type
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Libellé
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Catégorie
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Statut
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {taskTypes.map((type) => (
                <tr key={type.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium dark:text-gray-300">
                    <div className="flex items-center">
                      <span className="mr-2">{type.ordre}</span>
                      <div className="flex flex-col">
                        <button
                          onClick={() => handleMoveOrder(type.id, 'up')}
                          disabled={type.ordre === 1}
                          className="text-gray-400 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-300 disabled:opacity-50"
                        >
                          <ArrowUpIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleMoveOrder(type.id, 'down')}
                          disabled={type.ordre === taskTypes.length}
                          className="text-gray-400 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-300 disabled:opacity-50"
                        >
                          <ArrowDownIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium dark:text-gray-300">
                    {type.taskType}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    {type.label}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    {type.category}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        type.isActive
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                      }`}
                    >
                      {type.isActive ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => handleToggleActive(type.id, type.isActive)}
                        className={`${
                          type.isActive
                            ? 'text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300'
                            : 'text-green-500 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300'
                        }`}
                        title={type.isActive ? 'Désactiver' : 'Activer'}
                      >
                        {type.isActive ? 'Désactiver' : 'Activer'}
                      </button>
                      <button
                        onClick={() => handleEdit(type)}
                        className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                        title="Modifier"
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(type.id)}
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
      )}

      {/* Modal de création/édition */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg w-full max-w-md">
            <h3 className="text-lg font-medium mb-4 dark:text-white">
              {editingType ? 'Modifier le type de tâche' : 'Ajouter un type de tâche'}
            </h3>
            
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Type (identifiant technique)
                </label>
                <input
                  type="text"
                  value={formData.taskType}
                  onChange={(e) => setFormData({ ...formData, taskType: e.target.value })}
                  disabled={!!editingType}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm dark:bg-gray-700 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-600"
                  required
                  placeholder="declaration_chantier"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Format: lettres minuscules, chiffres et underscore uniquement
                </p>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Libellé (affiché à l&apos;utilisateur)
                </label>
                <input
                  type="text"
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm dark:bg-gray-700 dark:text-white"
                  required
                  placeholder="Déclaration de chantier"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Catégorie
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm dark:bg-gray-700 dark:text-white"
                >
                  <option value="administrative">Administrative</option>
                  <option value="technique">Technique</option>
                  <option value="juridique">Juridique</option>
                  <option value="securite">Sécurité</option>
                  <option value="autre">Autre</option>
                </select>
              </div>
              
              <div className="mb-6">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Actif
                  </span>
                </label>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-blue-700 dark:hover:bg-blue-600"
                >
                  {editingType ? 'Mettre à jour' : 'Ajouter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
} 