'use client'
import { useEffect } from 'react'
import { XMarkIcon, CheckCircleIcon, ExclamationTriangleIcon, InformationCircleIcon } from '@heroicons/react/24/outline'

interface NotificationModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  message: string
  type?: 'success' | 'error' | 'warning' | 'info'
  duration?: number
}

export default function NotificationModal({
  isOpen,
  onClose,
  title,
  message,
  type = 'info',
  duration = 3000
}: NotificationModalProps) {
  useEffect(() => {
    if (isOpen && duration > 0) {
      const timer = setTimeout(() => {
        onClose()
      }, duration)
      return () => clearTimeout(timer)
    }
  }, [isOpen, duration, onClose])

  if (!isOpen) return null

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircleIcon className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
      case 'error':
        return <ExclamationTriangleIcon className="h-6 w-6 text-red-600 dark:text-red-400" />
      case 'warning':
        return <ExclamationTriangleIcon className="h-6 w-6 text-amber-600 dark:text-amber-400" />
      default:
        return <InformationCircleIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
    }
  }

  const getColors = () => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-emerald-50 dark:bg-emerald-900/20',
          border: 'border-emerald-200 dark:border-emerald-800',
          text: 'text-emerald-900 dark:text-emerald-100',
          gradient: 'from-emerald-600/10 via-teal-700/10 to-cyan-800/10'
        }
      case 'error':
        return {
          bg: 'bg-red-50 dark:bg-red-900/20',
          border: 'border-red-200 dark:border-red-800',
          text: 'text-red-900 dark:text-red-100',
          gradient: 'from-red-600/10 via-rose-700/10 to-pink-800/10'
        }
      case 'warning':
        return {
          bg: 'bg-amber-50 dark:bg-amber-900/20',
          border: 'border-amber-200 dark:border-amber-800',
          text: 'text-amber-900 dark:text-amber-100',
          gradient: 'from-amber-600/10 via-orange-700/10 to-yellow-800/10'
        }
      default:
        return {
          bg: 'bg-blue-50 dark:bg-blue-900/20',
          border: 'border-blue-200 dark:border-blue-800',
          text: 'text-blue-900 dark:text-blue-100',
          gradient: 'from-blue-600/10 via-indigo-700/10 to-purple-800/10'
        }
    }
  }

  const colors = getColors()

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full border-2 ${colors.border}`}>
        <div className={`relative px-6 py-4 bg-gradient-to-br ${colors.gradient} border-b ${colors.border} overflow-hidden rounded-t-lg`}>
          <div className="absolute inset-0 bg-gradient-to-r opacity-20"></div>
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getIcon()}
              <h3 className={`text-lg font-bold ${colors.text}`}>
                {title}
              </h3>
            </div>
            <button
              onClick={onClose}
              className={`${colors.text} hover:opacity-70 transition-opacity`}
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="px-6 py-4">
          <p className="text-gray-700 dark:text-gray-300">{message}</p>
        </div>
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
          <button
            onClick={onClose}
            className={`px-4 py-2 ${colors.bg} ${colors.text} rounded-lg hover:opacity-80 transition-opacity font-medium`}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  )
}

