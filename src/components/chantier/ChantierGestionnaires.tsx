'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { UserPlusIcon, TrashIcon, UserIcon } from '@heroicons/react/24/outline'
import { toast } from 'react-hot-toast'

interface Gestionnaire {
  id: string
  userId: string
  user: {
    id: string
    name: string | null
    email: string
    role: string
  }
}

interface User {
  id: string
  name: string | null
  email: string
  role: string
}

interface ChantierGestionnairesProps {
  chantierId: string
}

export default function ChantierGestionnaires({ chantierId }: ChantierGestionnairesProps) {
  const { data: session } = useSession()
  const [gestionnaires, setGestionnaires] = useState<Gestionnaire[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const canManage = session?.user?.role === 'ADMIN' || session?.user?.role === 'MANAGER'

  useEffect(() => {
    const load = async () => {
      await loadGestionnaires()
      if (canManage) {
        await loadUsers()
      }
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chantierId, canManage])

  const loadGestionnaires = async () => {
    try {
      const response = await fetch(`/api/chantiers/${chantierId}/gestionnaires`)
      if (response.ok) {
        const data = await response.json()
        setGestionnaires(data)
      }
    } catch (error) {
      console.error('Erreur lors du chargement des gestionnaires:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadUsers = async () => {
    try {
      // Récupérer tous les utilisateurs avec une limite élevée pour avoir la liste complète
      const response = await fetch('/api/users?page=1&limit=1000')
      if (response.ok) {
        const data = await response.json()
        // L'API retourne un objet paginé { users: [], total, page, limit }
        const usersArray = Array.isArray(data) ? data : (data.users || [])
        setUsers(Array.isArray(usersArray) ? usersArray : [])
      } else {
        // Si l'API retourne une erreur (par exemple si l'utilisateur n'est pas ADMIN)
        // on initialise avec un tableau vide
        setUsers([])
      }
    } catch (error) {
      console.error('Erreur lors du chargement des utilisateurs:', error)
      setUsers([])
    }
  }

  const handleAddGestionnaire = async () => {
    if (!selectedUserId) {
      toast.error('Veuillez sélectionner un utilisateur')
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/chantiers/${chantierId}/gestionnaires`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: selectedUserId }),
      })

      if (response.ok) {
        toast.success('Gestionnaire ajouté avec succès')
        setShowAddForm(false)
        setSelectedUserId('')
        loadGestionnaires()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Erreur lors de l\'ajout du gestionnaire')
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors de l\'ajout du gestionnaire')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRemoveGestionnaire = async (userId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir retirer ce gestionnaire ?')) {
      return
    }

    try {
      const response = await fetch(
        `/api/chantiers/${chantierId}/gestionnaires?userId=${userId}`,
        {
          method: 'DELETE',
        }
      )

      if (response.ok) {
        toast.success('Gestionnaire retiré avec succès')
        loadGestionnaires()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Erreur lors de la suppression')
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors de la suppression du gestionnaire')
    }
  }

  const availableUsers = Array.isArray(users) 
    ? users.filter((user) => !gestionnaires.some((g) => g.userId === user.id))
    : []

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-3 mb-4">
          <UserIcon className="h-6 w-6 text-purple-600 dark:text-purple-400" />
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            Gestionnaires du chantier
          </h2>
        </div>
        <div className="animate-pulse space-y-3">
          <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <UserIcon className="h-6 w-6 text-purple-600 dark:text-purple-400" />
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            Gestionnaires du chantier
          </h2>
        </div>
        {canManage && !showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <UserPlusIcon className="h-4 w-4" />
            Ajouter
          </button>
        )}
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Les gestionnaires seront mentionnés comme contacts dans les emails envoyés aux clients.
      </p>

      {showAddForm && (
        <div className="mb-4 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3">
            Ajouter un gestionnaire
          </h3>
          <div className="flex gap-2">
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
              disabled={isSubmitting}
            >
              <option value="">Sélectionner un utilisateur</option>
              {availableUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name || user.email} ({user.role})
                </option>
              ))}
            </select>
            <button
              onClick={handleAddGestionnaire}
              disabled={isSubmitting || !selectedUserId}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors"
            >
              {isSubmitting ? 'Ajout...' : 'Ajouter'}
            </button>
            <button
              onClick={() => {
                setShowAddForm(false)
                setSelectedUserId('')
              }}
              disabled={isSubmitting}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-medium rounded-lg transition-colors"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {gestionnaires.length === 0 ? (
        <div className="text-center py-8">
          <UserIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">
            Aucun gestionnaire assigné à ce chantier
          </p>
          {canManage && (
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
              Ajoutez un gestionnaire pour qu'il apparaisse comme contact dans les emails
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {gestionnaires.map((gestionnaire) => (
            <div
              key={gestionnaire.id}
              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                  <UserIcon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {gestionnaire.user.name || gestionnaire.user.email}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {gestionnaire.user.email}
                  </p>
                </div>
                <span className="px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded">
                  {gestionnaire.user.role}
                </span>
              </div>
              {canManage && (
                <button
                  onClick={() => handleRemoveGestionnaire(gestionnaire.userId)}
                  className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  title="Retirer le gestionnaire"
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

