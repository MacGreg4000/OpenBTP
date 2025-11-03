'use client'
import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { PlusIcon, PencilSquareIcon, TrashIcon, UserGroupIcon } from '@heroicons/react/24/outline'
import UserModal from '@/components/UserModal'
import { Pagination } from '@/components/Pagination'
import { PageHeader } from '@/components/PageHeader'

interface User {
  id: string
  name: string | null
  email: string
  role: 'ADMIN' | 'MANAGER' | 'USER'
  createdAt: string
}

interface UserFormData {
  name: string
  email: string
  password?: string
  role: 'ADMIN' | 'MANAGER' | 'USER'
}

interface DeleteModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
  isDeleting: boolean
}

function DeleteModal({ isOpen, onClose, onConfirm, isDeleting }: DeleteModalProps) {
  return isOpen ? (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Confirmer la suppression
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Êtes-vous sûr de vouloir supprimer cet utilisateur ? Cette action est irréversible.
        </p>
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded-md text-gray-700 dark:text-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
          >
            {isDeleting ? 'Suppression...' : 'Supprimer'}
          </button>
        </div>
      </div>
    </div>
  ) : null
}

export default function UsersPage() {
  const { data: session } = useSession()
  const [users, setUsers] = useState<User[]>([])
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const itemsPerPage = 10

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/users?page=${currentPage}&limit=${itemsPerPage}`)
      if (!response.ok) {
        throw new Error('Erreur lors de la récupération des utilisateurs')
      }
      const data = await response.json()
      if (data.users && Array.isArray(data.users)) {
        setUsers(data.users)
        setTotalPages(Math.ceil(data.total / itemsPerPage))
      } else {
        setError('Format de données invalide')
      }
    } catch (error) {
      console.error('Erreur:', error)
      setError('Erreur lors de la récupération des utilisateurs')
    } finally {
      setLoading(false)
    }
  }, [currentPage, itemsPerPage])

  useEffect(() => {
    if (!session) return
    fetchUsers()
  }, [session, fetchUsers])

  

  const handleAddUser = async (userData: UserFormData) => {
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      })

      if (!response.ok) throw new Error('Erreur lors de la création')

      const newUser = await response.json()
      setUsers(prev => [...prev, newUser])
      setShowAddModal(false)
    } catch (error) {
      console.error('Erreur:', error)
      throw error
    }
  }

  const handleEditUser = async (userData: UserFormData) => {
    if (!selectedUser) return
    try {
      const response = await fetch(`/api/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      })

      if (!response.ok) throw new Error('Erreur lors de la mise à jour')

      const updatedUser = await response.json()
      setUsers(prev => prev.map(user => 
        user.id === selectedUser.id ? updatedUser : user
      ))
      setShowEditModal(false)
    } catch (error) {
      console.error('Erreur:', error)
      throw error
    }
  }

  const handleDeleteUser = async () => {
    if (!selectedUser) return
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/users/${selectedUser.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erreur lors de la suppression')
      }

      setUsers(prev => prev.filter(user => user.id !== selectedUser.id))
      setShowDeleteModal(false)
    } catch (error) {
      console.error('Erreur:', error)
      setError(error instanceof Error ? error.message : 'Erreur lors de la suppression')
    } finally {
      setIsDeleting(false)
    }
  }

  if (!session) {
    return <div className="p-8 text-red-600">Accès non autorisé</div>
  }

  // Calculer les statistiques
  const stats = {
    total: users.length,
    admins: users.filter(u => u.role === 'ADMIN').length,
    managers: users.filter(u => u.role === 'MANAGER').length,
    users: users.filter(u => u.role === 'USER').length
  }

  // Stats cards pour le header
  const statsCards = !loading && users.length > 0 ? (
    <div className="flex items-center gap-2">
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl px-3 py-2 border border-gray-200/50 dark:border-gray-700/50 shadow-lg">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
            <UserGroupIcon className="h-4 w-4 text-white" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase">Total</div>
            <div className="text-sm font-black text-gray-900 dark:text-white">{stats.total}</div>
          </div>
        </div>
      </div>
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl px-3 py-2 border border-gray-200/50 dark:border-gray-700/50 shadow-lg">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-rose-600 rounded-lg flex items-center justify-center">
            <UserGroupIcon className="h-4 w-4 text-white" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase">Admins</div>
            <div className="text-sm font-black text-gray-900 dark:text-white">{stats.admins}</div>
          </div>
        </div>
      </div>
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl px-3 py-2 border border-gray-200/50 dark:border-gray-700/50 shadow-lg">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg flex items-center justify-center">
            <UserGroupIcon className="h-4 w-4 text-white" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase">Managers</div>
            <div className="text-sm font-black text-gray-900 dark:text-white">{stats.managers}</div>
          </div>
        </div>
      </div>
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl px-3 py-2 border border-gray-200/50 dark:border-gray-700/50 shadow-lg">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
            <UserGroupIcon className="h-4 w-4 text-white" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase">Utilisateurs</div>
            <div className="text-sm font-black text-gray-900 dark:text-white">{stats.users}</div>
          </div>
        </div>
      </div>
    </div>
  ) : undefined

  if (loading) return <div className="p-8">Chargement...</div>
  if (error) return <div className="p-8 text-red-600">Erreur: {error}</div>

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/20 to-indigo-50/10 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
      <PageHeader
        title="Utilisateurs"
        subtitle="Liste des utilisateurs et leurs droits d'accès"
        icon={UserGroupIcon}
        badgeColor="from-blue-600 via-indigo-600 to-purple-700"
        gradientColor="from-blue-600/10 via-indigo-600/10 to-purple-700/10"
        stats={statsCards}
        actions={
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center px-3 py-2 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white rounded-md shadow-lg hover:shadow-xl transition-all duration-200 text-sm font-semibold"
          >
            <PlusIcon className="h-4 w-4 mr-1.5" />
            <span className="hidden sm:inline">Ajouter un utilisateur</span>
            <span className="sm:hidden">Ajouter</span>
          </button>
        }
      />

      {/* Contenu principal */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">

      {/* Table des utilisateurs */}
      <div className="mt-8 flex flex-col">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-200">
                      Nom
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-200">
                      Email
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-200">
                      Rôle
                    </th>
                    <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900 dark:text-gray-200">
                        {user.name || '-'}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900 dark:text-gray-200">
                        {user.email}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900 dark:text-gray-200">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          user.role === 'ADMIN' 
                            ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' 
                            : user.role === 'MANAGER' 
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' 
                              : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                        <button
                          onClick={() => {
                            setSelectedUser(user)
                            setShowEditModal(true)
                          }}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 mr-4"
                        >
                          <PencilSquareIcon className="h-5 w-5" />
                          <span className="sr-only">Modifier {user.name}</span>
                        </button>
                        <button
                          onClick={() => {
                            setSelectedUser(user)
                            setShowDeleteModal(true)
                          }}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                          disabled={user.email === session?.user?.email}
                        >
                          <TrashIcon className="h-5 w-5" />
                          <span className="sr-only">Supprimer {user.name}</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Pagination */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />

      {/* Modales */}
      <UserModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={(data: UserFormData) => handleAddUser(data)}
        title="Ajouter un utilisateur"
        buttonText="Créer"
      />

      <UserModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSubmit={handleEditUser}
        initialData={selectedUser ? {
          name: selectedUser.name || undefined,
          email: selectedUser.email,
          role: selectedUser.role
        } : undefined}
        title="Modifier l'utilisateur"
        buttonText="Enregistrer"
        isEdit
      />

      <DeleteModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteUser}
        isDeleting={isDeleting}
      />
      </div>
    </div>
  )
} 