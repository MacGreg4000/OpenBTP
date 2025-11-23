'use client'
import { ExclamationTriangleIcon, XMarkIcon } from '@heroicons/react/24/outline'

interface ConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  type?: 'danger' | 'warning' | 'info'
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmer',
  cancelText = 'Annuler',
  type = 'warning'
}: ConfirmModalProps) {
  if (!isOpen) return null

  const getColors = () => {
    switch (type) {
      case 'danger':
        return {
          bg: 'bg-red-50 dark:bg-red-900/20',
          border: 'border-red-200 dark:border-red-800',
          text: 'text-red-900 dark:text-red-100',
          gradient: 'from-red-600/10 via-rose-700/10 to-pink-800/10',
          button: 'bg-red-600 hover:bg-red-700 text-white'
        }
      case 'warning':
        return {
          bg: 'bg-amber-50 dark:bg-amber-900/20',
          border: 'border-amber-200 dark:border-amber-800',
          text: 'text-amber-900 dark:text-amber-100',
          gradient: 'from-amber-600/10 via-orange-700/10 to-yellow-800/10',
          button: 'bg-amber-600 hover:bg-amber-700 text-white'
        }
      default:
        return {
          bg: 'bg-blue-50 dark:bg-blue-900/20',
          border: 'border-blue-200 dark:border-blue-800',
          text: 'text-blue-900 dark:text-blue-100',
          gradient: 'from-blue-600/10 via-indigo-700/10 to-purple-800/10',
          button: 'bg-blue-600 hover:bg-blue-700 text-white'
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
              <ExclamationTriangleIcon className={`h-6 w-6 ${colors.text.replace('text-', 'text-').replace('dark:text-', 'dark:text-')}`} />
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
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors font-medium"
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm()
              onClose()
            }}
            className={`px-4 py-2 ${colors.button} rounded-lg transition-colors font-medium`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

