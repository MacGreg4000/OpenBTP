'use client'

import { Fragment, useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import {
  BellIcon,
  EnvelopeIcon,
  DevicePhoneMobileIcon,
  CheckIcon,
  XMarkIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline'
import { toast } from 'react-hot-toast'

interface NotificationType {
  id: string
  code: string
  libelle: string
  description?: string
  categorie: string
}

interface NotificationConfig {
  id: string
  notificationTypeId: string
  activeMail: boolean
  activeInApp: boolean
  notificationType: NotificationType
}

interface User {
  id: string
  name?: string
  email: string
  role: string
}

export default function NotificationsConfigPage() {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [types, setTypes] = useState<NotificationType[]>([])
  const [configs, setConfigs] = useState<NotificationConfig[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL')
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isSeeding, setIsSeeding] = useState(false)
  const [needsSeeding, setNeedsSeeding] = useState(false)

  const isAdmin = session?.user?.role === 'ADMIN'

  // Charger les données
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)

        // Charger les types de notifications
        const typesRes = await fetch('/api/notifications/types')
        if (typesRes.ok) {
          const typesData = await typesRes.json()
          setTypes(typesData)
          // Si aucun type n'existe, il faut seeder
          setNeedsSeeding(typesData.length === 0)
        }

        // Charger les utilisateurs si ADMIN
        if (isAdmin) {
          const usersRes = await fetch('/api/users')
          if (usersRes.ok) {
            const usersData = await usersRes.json()
            // Gérer les formats { users: [...] } ou [...]
            if (Array.isArray(usersData)) {
              setUsers(usersData)
            } else if (Array.isArray(usersData?.users)) {
              setUsers(usersData.users)
            } else {
              setUsers([])
            }
          }
        }

        // Charger la config de l'utilisateur actuel par défaut
        if (session?.user?.id) {
          await loadUserConfig(session.user.id)
        }
      } catch (error) {
        console.error('Erreur lors du chargement:', error)
      } finally {
        setLoading(false)
      }
    }

    if (session) {
      loadData()
    }
  }, [session, isAdmin])

  // Charger la config d'un utilisateur
  const loadUserConfig = async (userId: string) => {
    try {
      const configRes = await fetch(`/api/notifications/config?userId=${userId}`)
      if (configRes.ok) {
        const configData = await configRes.json()
        setConfigs(configData)
        setSelectedUserId(userId)
      }
    } catch (error) {
      console.error('Erreur lors du chargement de la config:', error)
    }
  }

  // Changer d'utilisateur
  const handleUserChange = async (userId: string) => {
    await loadUserConfig(userId)
  }

  // Obtenir la config pour un type de notification
  const getConfig = (typeId: string) => {
    return configs.find(c => c.notificationTypeId === typeId)
  }

  // Toggle une option
  const toggleOption = async (typeId: string, option: 'activeMail' | 'activeInApp') => {
    const currentConfig = getConfig(typeId)
    const newValue = currentConfig ? !currentConfig[option] : true

    // Mise à jour optimiste
    setConfigs(prev => {
      const existing = prev.find(c => c.notificationTypeId === typeId)
      if (existing) {
        return prev.map(c =>
          c.notificationTypeId === typeId ? { ...c, [option]: newValue } : c
        )
      } else {
        // Créer une nouvelle config
        const type = types.find(t => t.id === typeId)!
        return [
          ...prev,
          {
            id: `temp-${typeId}`,
            notificationTypeId: typeId,
            activeMail: option === 'activeMail' ? newValue : true,
            activeInApp: option === 'activeInApp' ? newValue : true,
            notificationType: type,
          },
        ]
      }
    })
  }

  // Sauvegarder toutes les modifications
  const saveAll = async () => {
    try {
      setSaving(true)

      // Préparer les données
      const configsToSave = types.map(type => {
        const config = getConfig(type.id)
        return {
          notificationTypeId: type.id,
          activeMail: config?.activeMail ?? true,
          activeInApp: config?.activeInApp ?? true,
        }
      })

      const response = await fetch('/api/notifications/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUserId,
          configs: configsToSave,
        }),
      })

      if (response.ok) {
        setSuccessMessage('Configuration sauvegardée avec succès !')
        setTimeout(() => setSuccessMessage(null), 3000)
        // Recharger
        await loadUserConfig(selectedUserId)
      } else {
        toast.error('Erreur lors de la sauvegarde')
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error)
      toast.error('Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  // Filtrer les types
  const filteredTypes = types.filter(type => {
    const matchesSearch =
      type.libelle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      type.description?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'ALL' || type.categorie === selectedCategory
    return matchesSearch && matchesCategory
  })

  // Grouper par catégorie
  const groupedTypes = filteredTypes.reduce((acc, type) => {
    if (!acc[type.categorie]) {
      acc[type.categorie] = []
    }
    acc[type.categorie].push(type)
    return acc
  }, {} as Record<string, NotificationType[]>)

  // Initialiser le système (seeder)
  const handleSeed = async () => {
    try {
      setIsSeeding(true)
      const response = await fetch('/api/notifications/seed', {
        method: 'POST',
      })

      if (response.ok) {
        const result = await response.json()
        setSuccessMessage(`✅ ${result.count} types de notifications initialisés avec succès !`)
        setNeedsSeeding(false)
        // Recharger les types
        const typesRes = await fetch('/api/notifications/types')
        if (typesRes.ok) {
          const typesData = await typesRes.json()
          setTypes(typesData)
        }
        // Si utilisateur connecté, charger sa config
        if (session?.user?.id) {
          await loadUserConfig(session.user.id)
        }
      } else {
        toast.error('Erreur lors de l\'initialisation')
      }
    } catch (error) {
      console.error('Erreur lors du seeding:', error)
      toast.error('Erreur lors de l\'initialisation')
    } finally {
      setIsSeeding(false)
    }
  }

  // Catégories uniques
  const categories = ['ALL', ...Array.from(new Set(types.map(t => t.categorie)))]

  // Traduction des catégories
  const translateCategory = (cat: string) => {
    const translations: Record<string, string> = {
      ALL: 'Toutes',
      CHANTIER: 'Chantier',
      METRE: 'Métré',
      RECEPTION: 'Réception',
      DOCUMENT: 'Document',
      SAV: 'SAV',
      PLANNING: 'Planning',
      COMMANDE: 'Commande',
      SOUS_TRAITANT: 'Sous-traitant',
      ADMINISTRATIF: 'Administratif',
      SYSTEME: 'Système',
    }
    return translations[cat] || cat
  }

  // Icône de catégorie
  const getCategoryIcon = (cat: string) => {
    const icons: Record<string, string> = {
      CHANTIER: '🏗️',
      METRE: '📊',
      RECEPTION: '✅',
      DOCUMENT: '📄',
      SAV: '🔧',
      PLANNING: '📅',
      COMMANDE: '🛒',
      SOUS_TRAITANT: '👷',
      ADMINISTRATIF: '📋',
      SYSTEME: '⚙️',
    }
    return icons[cat] || '📌'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <ArrowPathIcon className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Chargement...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
            <BellIcon className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-gray-900 dark:text-white">
              Gestion des notifications
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Configurez vos préférences de notifications par email et in-app
            </p>
          </div>
        </div>
      </div>

      {/* Message de succès */}
      {successMessage && (
        <div className="mb-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 flex items-center gap-3">
          <CheckIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
          <p className="text-green-800 dark:text-green-200 font-medium">{successMessage}</p>
        </div>
      )}

      {/* Bouton d'initialisation si besoin de seeder */}
      {needsSeeding && isAdmin && !loading && (
        <div className="mb-8 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-900/20 dark:via-indigo-900/20 dark:to-purple-900/20 border-2 border-blue-200 dark:border-blue-700 rounded-2xl p-8 text-center">
          <div className="mb-4">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto shadow-2xl">
              <BellIcon className="h-10 w-10 text-white" />
            </div>
          </div>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-3">
            🚀 Initialiser le système de notifications
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-2xl mx-auto">
            Le système de notifications n'est pas encore configuré. Cliquez sur le bouton ci-dessous pour créer
            automatiquement les <strong>61 types de notifications</strong> prédéfinis (chantiers, métrés, réceptions, SAV, etc.).
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mb-6">
            ⚠️ Cette opération est nécessaire une seule fois et ne peut être effectuée que par un administrateur.
          </p>
          <button
            onClick={handleSeed}
            disabled={isSeeding}
            className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white font-bold rounded-xl hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-2xl hover:shadow-3xl hover:scale-105 text-lg"
          >
            {isSeeding ? (
              <>
                <ArrowPathIcon className="h-6 w-6 animate-spin" />
                Initialisation en cours...
              </>
            ) : (
              <>
                <BellIcon className="h-6 w-6" />
                Initialiser maintenant
              </>
            )}
          </button>
        </div>
      )}

      {/* Message si pas admin et needs seeding */}
      {needsSeeding && !isAdmin && !loading && (
        <div className="mb-8 bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-200 dark:border-yellow-700 rounded-2xl p-8 text-center">
          <div className="mb-4">
            <div className="w-16 h-16 bg-yellow-500 rounded-full flex items-center justify-center mx-auto">
              <span className="text-3xl">⚠️</span>
            </div>
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
            Système non initialisé
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Le système de notifications n'est pas encore configuré. Veuillez contacter un administrateur pour l'initialiser.
          </p>
        </div>
      )}

      {/* Sélection utilisateur (ADMIN uniquement) - Masqué si needs seeding */}
      {isAdmin && !needsSeeding && (
        <div className="mb-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">
            📋 Configurer pour l'utilisateur :
          </label>
          <select
            value={selectedUserId}
            onChange={(e) => handleUserChange(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 font-medium"
          >
            <option value="">Sélectionner un utilisateur</option>
            {Array.isArray(users) && users.map(user => (
              <option key={user.id} value={user.id}>
                {user.name || user.email} ({user.role})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Filtres et recherche - Masqué si needs seeding */}
      {!needsSeeding && (
      <div className="mb-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Recherche */}
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
              <MagnifyingGlassIcon className="h-4 w-4" />
              Rechercher
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher une notification..."
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Filtre catégorie */}
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
              <FunnelIcon className="h-4 w-4" />
              Catégorie
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>
                  {translateCategory(cat)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
      )}

      {/* Tableau des notifications - Masqué si needs seeding */}
      {!needsSeeding && (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Notification
                </th>
                <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  <div className="flex items-center justify-center gap-2">
                    <EnvelopeIcon className="h-4 w-4" />
                    Email
                  </div>
                </th>
                <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  <div className="flex items-center justify-center gap-2">
                    <DevicePhoneMobileIcon className="h-4 w-4" />
                    In-App
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {Object.entries(groupedTypes).map(([category, catTypes]) => (
                <Fragment key={category}>
                  {/* En-tête de catégorie */}
                  <tr key={`cat-${category}`} className="bg-gradient-to-r from-blue-50/50 to-purple-50/50 dark:from-blue-900/10 dark:to-purple-900/10">
                    <td colSpan={3} className="px-6 py-3">
                      <div className="flex items-center gap-2 font-bold text-gray-900 dark:text-white">
                        <span className="text-xl">{getCategoryIcon(category)}</span>
                        {translateCategory(category)}
                        <span className="text-xs font-normal text-gray-500 dark:text-gray-400">
                          ({catTypes.length})
                        </span>
                      </div>
                    </td>
                  </tr>

                  {/* Notifications de la catégorie */}
                  {catTypes.map((type) => {
                    const config = getConfig(type.id)
                    return (
                      <tr
                        key={type.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {type.libelle}
                            </p>
                            {type.description && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {type.description}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => toggleOption(type.id, 'activeMail')}
                            className={`inline-flex items-center justify-center w-10 h-10 rounded-lg transition-all ${
                              config?.activeMail ?? true
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600'
                            }`}
                          >
                            {config?.activeMail ?? true ? (
                              <CheckIcon className="h-5 w-5" />
                            ) : (
                              <XMarkIcon className="h-5 w-5" />
                            )}
                          </button>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => toggleOption(type.id, 'activeInApp')}
                            className={`inline-flex items-center justify-center w-10 h-10 rounded-lg transition-all ${
                              config?.activeInApp ?? true
                                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600'
                            }`}
                          >
                            {config?.activeInApp ?? true ? (
                              <CheckIcon className="h-5 w-5" />
                            ) : (
                              <XMarkIcon className="h-5 w-5" />
                            )}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* Bouton sauvegarder - Masqué si needs seeding */}
      {!needsSeeding && (
      <div className="mt-6 flex justify-end">
        <button
          onClick={saveAll}
          disabled={saving || !selectedUserId}
          className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
        >
          {saving ? (
            <>
              <ArrowPathIcon className="h-5 w-5 animate-spin" />
              Sauvegarde...
            </>
          ) : (
            <>
              <CheckIcon className="h-5 w-5" />
              Sauvegarder les modifications
            </>
          )}
        </button>
      </div>
      )}
    </div>
  )
}

