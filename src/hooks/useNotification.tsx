'use client'
import { useState, useCallback } from 'react'
import NotificationModal from '@/components/ui/NotificationModal'

interface NotificationState {
  isOpen: boolean
  title: string
  message: string
  type: 'success' | 'error' | 'warning' | 'info'
}

export function useNotification() {
  const [notification, setNotification] = useState<NotificationState>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info'
  })

  const showNotification = useCallback((title: string, message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    setNotification({
      isOpen: true,
      title,
      message,
      type
    })
  }, [])

  const closeNotification = useCallback(() => {
    setNotification(prev => ({ ...prev, isOpen: false }))
  }, [])

  const NotificationComponent = () => (
    <NotificationModal
      isOpen={notification.isOpen}
      onClose={closeNotification}
      title={notification.title}
      message={notification.message}
      type={notification.type}
    />
  )

  return {
    showNotification,
    NotificationComponent
  }
}

