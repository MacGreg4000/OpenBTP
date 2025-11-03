'use client'

import { Fragment, useEffect, useState } from 'react'
import { Menu, Transition } from '@headlessui/react'
import { BellIcon, CheckIcon } from '@heroicons/react/24/outline'
import { BellAlertIcon } from '@heroicons/react/24/solid'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Notification {
  id: string
  titre: string
  message: string
  lien?: string | null
  estLue: boolean
  createdAt: string
  notificationType: {
    code: string
    libelle: string
    categorie: string
  }
}

export function NotificationBell() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)

  // Charger les notifications
  const loadNotifications = async () => {
    try {
      const response = await fetch('/api/notifications?limit=10')
      if (response.ok) {
        const data = await response.json()
        setNotifications(data.notifications)
        setUnreadCount(data.unreadCount)
      }
    } catch (error) {
      console.error('Erreur lors du chargement des notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  // Charger au montage et polling toutes les 30 secondes
  useEffect(() => {
    loadNotifications()
    const interval = setInterval(loadNotifications, 30000)
    return () => clearInterval(interval)
  }, [])

  // Marquer une notification comme lue
  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PATCH',
      })
      if (response.ok) {
        setNotifications(prev =>
          prev.map(n => (n.id === notificationId ? { ...n, estLue: true } : n))
        )
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
    } catch (error) {
      console.error('Erreur lors du marquage:', error)
    }
  }

  // Marquer toutes comme lues
  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications/read-all', {
        method: 'POST',
      })
      if (response.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, estLue: true })))
        setUnreadCount(0)
      }
    } catch (error) {
      console.error('Erreur lors du marquage:', error)
    }
  }

  // Gérer le clic sur une notification
  const handleNotificationClick = (notification: Notification) => {
    if (!notification.estLue) {
      markAsRead(notification.id)
    }
    if (notification.lien) {
      router.push(notification.lien)
    }
  }

  // Icône de catégorie
  const getCategoryIcon = (categorie: string) => {
    const iconMap: Record<string, string> = {
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
    return iconMap[categorie] || '📌'
  }

  // Couleur de badge selon la catégorie
  const getCategoryColor = (categorie: string) => {
    const colorMap: Record<string, string> = {
      CHANTIER: 'bg-blue-500',
      METRE: 'bg-purple-500',
      RECEPTION: 'bg-green-500',
      DOCUMENT: 'bg-yellow-500',
      SAV: 'bg-red-500',
      PLANNING: 'bg-indigo-500',
      COMMANDE: 'bg-pink-500',
      SOUS_TRAITANT: 'bg-orange-500',
      ADMINISTRATIF: 'bg-gray-500',
      SYSTEME: 'bg-cyan-500',
    }
    return colorMap[categorie] || 'bg-gray-500'
  }

  // Formater la date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMs = now.getTime() - date.getTime()
    const diffInMinutes = Math.floor(diffInMs / 60000)
    const diffInHours = Math.floor(diffInMinutes / 60)
    const diffInDays = Math.floor(diffInHours / 24)

    if (diffInMinutes < 1) return "À l'instant"
    if (diffInMinutes < 60) return `Il y a ${diffInMinutes} min`
    if (diffInHours < 24) return `Il y a ${diffInHours}h`
    if (diffInDays < 7) return `Il y a ${diffInDays}j`
    
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  }

  return (
    <Menu as="div" className="relative">
      {() => (
          <>
            <Menu.Button className="relative p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
              {unreadCount > 0 ? (
                <BellAlertIcon className="h-6 w-6 text-blue-600 dark:text-blue-400 animate-pulse" />
              ) : (
                <BellIcon className="h-6 w-6" />
              )}
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 flex h-5 w-5 items-center justify-center">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-5 w-5 bg-red-500 text-white text-xs font-bold items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                </span>
              )}
            </Menu.Button>

            <Transition
              as={Fragment}
              enter="transition ease-out duration-200"
              enterFrom="transform opacity-0 scale-95"
              enterTo="transform opacity-100 scale-100"
              leave="transition ease-in duration-150"
              leaveFrom="transform opacity-100 scale-100"
              leaveTo="transform opacity-0 scale-95"
            >
              <Menu.Items className="absolute right-0 mt-2 w-96 origin-top-right rounded-xl bg-white dark:bg-gray-800 shadow-2xl ring-1 ring-black ring-opacity-5 focus:outline-none border border-gray-200 dark:border-gray-700 max-h-[600px] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-500/10 to-purple-500/10">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <BellIcon className="h-5 w-5" />
                      Notifications
                      {unreadCount > 0 && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                          {unreadCount} nouvelle{unreadCount > 1 ? 's' : ''}
                        </span>
                      )}
                    </h3>
                    {unreadCount > 0 && (
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          markAllAsRead()
                        }}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
                      >
                        Tout marquer lu
                      </button>
                    )}
                  </div>
                </div>

                {/* Liste des notifications */}
                <div className="overflow-y-auto flex-1">
                  {loading ? (
                    <div className="p-8 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Chargement...</p>
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="p-8 text-center">
                      <BellIcon className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Aucune notification
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                      {notifications.map((notification) => (
                        <Menu.Item key={notification.id}>
                          {({ active }) => (
                            <div
                              onClick={() => handleNotificationClick(notification)}
                              className={`
                                relative px-4 py-3 cursor-pointer transition-all
                                ${active ? 'bg-gray-50 dark:bg-gray-700/50' : ''}
                                ${!notification.estLue ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}
                                hover:bg-gray-50 dark:hover:bg-gray-700/50
                              `}
                            >
                              {/* Badge non lu */}
                              {!notification.estLue && (
                                <div className="absolute left-2 top-5 w-2 h-2 bg-blue-500 rounded-full"></div>
                              )}

                              <div className="flex gap-3">
                                {/* Icône de catégorie */}
                                <div className={`flex-shrink-0 w-8 h-8 rounded-lg ${getCategoryColor(notification.notificationType.categorie)} flex items-center justify-center text-sm`}>
                                  {getCategoryIcon(notification.notificationType.categorie)}
                                </div>

                                {/* Contenu */}
                                <div className="flex-1 min-w-0">
                                  <p className={`text-sm font-medium ${!notification.estLue ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                                    {notification.titre}
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                                    {notification.message}
                                  </p>
                                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                    {formatDate(notification.createdAt)}
                                  </p>
                                </div>

                                {/* Actions */}
                                <div className="flex-shrink-0">
                                  {!notification.estLue && (
                                    <button
                                      onClick={(e) => {
                                        e.preventDefault()
                                        e.stopPropagation()
                                        markAsRead(notification.id)
                                      }}
                                      className="p-1 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded transition-colors"
                                      title="Marquer comme lu"
                                    >
                                      <CheckIcon className="h-4 w-4" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </Menu.Item>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer */}
                {notifications.length > 0 && (
                  <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                    <Link
                      href="/configuration/notifications"
                      className="block text-center text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium"
                    >
                      Gérer les notifications →
                    </Link>
                  </div>
                )}
              </Menu.Items>
            </Transition>
          </>
      )}
    </Menu>
  )
}

