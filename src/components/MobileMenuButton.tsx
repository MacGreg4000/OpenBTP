'use client'

import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline'

interface MobileMenuButtonProps {
  isOpen: boolean
  onClick: () => void
}

export function MobileMenuButton({ isOpen, onClick }: MobileMenuButtonProps) {
  return (
    <button
      type="button"
      className="lg:hidden p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
      onClick={onClick}
    >
      <span className="sr-only">
        {isOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
      </span>
      {isOpen ? (
        <XMarkIcon className="h-6 w-6" />
      ) : (
        <Bars3Icon className="h-6 w-6" />
      )}
    </button>
  )
} 